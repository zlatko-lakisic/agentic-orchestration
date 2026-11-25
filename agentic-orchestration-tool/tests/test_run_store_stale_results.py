"""Step results are keyed by (run_id, step_id): retries and rounds must not read stale ones."""

from __future__ import annotations

import json
import stat
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

from orchestration.backends.base import RunOptions, StepResult, StepSpec
from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.run_store import (
    FileSystemRunStore,
    write_private_json,
    write_step_spec,
)
from orchestration.run_store_backends import RedisRunStore, S3RunStore
from orchestration.step_coordinator import StepCoordinator


class _MissingKey(Exception):
    def __init__(self) -> None:
        super().__init__("missing")
        self.response = {"Error": {"Code": "NoSuchKey"}}


class _Body:
    def __init__(self, payload: bytes) -> None:
        self._payload = payload

    def read(self) -> bytes:
        return self._payload


class FakeS3:
    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], bytes] = {}

    def put_object(self, *, Bucket: str, Key: str, Body: bytes, **_: Any) -> dict[str, Any]:
        self.objects[(Bucket, Key)] = Body
        return {}

    def get_object(self, *, Bucket: str, Key: str) -> dict[str, Any]:
        try:
            return {"Body": _Body(self.objects[(Bucket, Key)])}
        except KeyError:
            raise _MissingKey() from None

    def head_object(self, *, Bucket: str, Key: str) -> dict[str, Any]:
        if (Bucket, Key) not in self.objects:
            raise _MissingKey()
        return {}

    def delete_object(self, *, Bucket: str, Key: str) -> dict[str, Any]:
        self.objects.pop((Bucket, Key), None)
        return {}


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, bytes] = {}

    def set(self, key: str, value: str, ex: int | None = None) -> bool:
        self.values[key] = value.encode("utf-8")
        return True

    def get(self, key: str) -> bytes | None:
        return self.values.get(key)

    def exists(self, key: str) -> int:
        return int(key in self.values)

    def delete(self, key: str) -> int:
        return int(self.values.pop(key, None) is not None)


def _spec(run_id: str = "run-1", step_id: str = "step_1") -> StepSpec:
    return StepSpec(
        schema_version="0.1",
        run_id=run_id,
        step_id=step_id,
        step_index=0,
        workflow_name="t",
        topic="t",
        task_description="d",
        task_expected_output="o",
        agent_provider={"id": "p"},
        mcp_providers=[],
        skills=[],
        prior_output="",
        inputs={},
    )


def _remote_stores(tmp_path: Path) -> list[Any]:
    return [
        S3RunStore(
            bucket="b", client=FakeS3(), local_mirror=FileSystemRunStore(tmp_path / "s3-mirror")
        ),
        RedisRunStore(
            client=FakeRedis(), local_mirror=FileSystemRunStore(tmp_path / "redis-mirror")
        ),
    ]


@pytest.mark.unit
def test_retry_on_remote_store_reads_the_new_attempt_not_the_stale_failure(
    tmp_path: Path,
) -> None:
    """Attempt 1's failure was promoted to the remote store and then shadowed
    the successful retry forever (reads are remote-first, workers write the mirror)."""
    for store in _remote_stores(tmp_path):
        attempts: list[int] = []

        def execute_step(spec: StepSpec, store: Any = store, attempts: list[int] = attempts) -> StepResult:
            attempts.append(1)
            failed = len(attempts) == 1
            # The worker writes only the local mirror (shared volume).
            store._mirror.write_step_result(
                spec.run_id,
                spec.step_id,
                StepResult(
                    run_id=spec.run_id,
                    step_id=spec.step_id,
                    exit_code=1 if failed else 0,
                    result_text=None if failed else "second attempt ok",
                    error="boom" if failed else None,
                ),
            )
            saved = store.read_step_result(spec.run_id, spec.step_id)
            assert saved is not None
            return saved

        result = StepCoordinator(store=store).run_dag(
            [_spec()],
            execute_step=execute_step,
            try_recover=lambda spec, res: True,
            options=RunOptions(quiet=True, emit_stdout_summary=False),
        )
        assert len(attempts) == 2
        assert result.exit_code == 0, type(store).__name__
        assert result.result_text == "second attempt ok"


@pytest.mark.unit
def test_iterative_rounds_do_not_reuse_the_previous_rounds_result(tmp_path: Path) -> None:
    """``--dynamic-iterative`` reuses run_id + ``step_1`` every round."""
    for store in [FileSystemRunStore(tmp_path / "fs"), *_remote_stores(tmp_path)]:
        coordinator = StepCoordinator(store=store)
        mirror = getattr(store, "_mirror", store)
        outputs: list[str | None] = []

        for round_no in (1, 2):
            def execute_step(spec: StepSpec, round_no: int = round_no) -> StepResult:
                if round_no == 1:
                    mirror.write_step_result(
                        spec.run_id,
                        spec.step_id,
                        StepResult(
                            run_id=spec.run_id,
                            step_id=spec.step_id,
                            exit_code=0,
                            result_text="round 1",
                        ),
                    )
                # Round 2: the worker dies before writing anything.
                saved = store.read_step_result(spec.run_id, spec.step_id)
                if saved is not None:
                    return saved
                return StepResult(
                    run_id=spec.run_id, step_id=spec.step_id, exit_code=137, error="killed"
                )

            result = coordinator.run_dag(
                [_spec()],
                execute_step=execute_step,
                options=RunOptions(quiet=True, emit_stdout_summary=False),
                max_attempts_per_step=1,
            )
            outputs.append(result.result_text if result.exit_code == 0 else None)

        assert outputs == ["round 1", None], type(store).__name__


@pytest.mark.unit
def test_clear_step_result_removes_remote_and_mirror(tmp_path: Path) -> None:
    for store in _remote_stores(tmp_path):
        store.write_step_result(
            "r", "s", StepResult(run_id="r", step_id="s", exit_code=1, error="old")
        )
        assert store.has_step_result("r", "s")
        store.clear_step_result("r", "s")
        assert not store.has_step_result("r", "s")
        assert store.read_step_result("r", "s") is None
        store.clear_step_result("r", "s")  # idempotent


def _deterministic_config() -> WorkflowConfig:
    return WorkflowConfig(
        name="t",
        process="sequential",
        topic="x",
        instance_key="k",
        agent_providers=[
            {
                "id": "det",
                "type": "deterministic",
                "role": "r",
                "goal": "g",
                "backstory": "b",
                "entrypoint": "orchestration.deterministic_runtime:serialize_deterministic_result",
            }
        ],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(id="step_1", agent_provider_id="det", description="d", expected_output="o")
        ],
        task_sequence=["step_1"],
    )


@pytest.mark.unit
def test_subprocess_runner_does_not_return_a_stale_success_when_the_worker_dies(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Persistent run store + reused ids: a previous success must not mask a dead worker."""
    from orchestration.backends import subprocess_runner

    store_root = tmp_path / "store"
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(store_root))
    monkeypatch.delenv("AGENTIC_EXECUTION_QUEUE_ENABLED", raising=False)

    stale = store_root / "run-1" / "step_1" / "result.json"
    write_private_json(
        stale,
        StepResult(run_id="run-1", step_id="step_1", exit_code=0, result_text="OLD").to_dict(),
    )

    def fake_run(cmd: list[str], **_kwargs: Any) -> subprocess.CompletedProcess[str]:
        # Worker killed before writing a result (OOM).
        return subprocess.CompletedProcess(cmd, returncode=137, stdout="", stderr="Killed")

    monkeypatch.setattr(subprocess_runner.subprocess, "run", fake_run)
    result = subprocess_runner.run_config_via_subprocess(
        _deterministic_config(),
        options=RunOptions(quiet=True, emit_stdout_summary=False, run_id="run-1"),
    )
    assert result.exit_code == 137
    assert result.result_text != "OLD"
    assert "Killed" in str(result.error)


@pytest.mark.unit
def test_subprocess_step_timeout_fails_the_step(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from orchestration.backends import subprocess_runner

    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(tmp_path / "store"))
    monkeypatch.setenv("AGENTIC_SUBPROCESS_STEP_TIMEOUT_SECONDS", "7")
    monkeypatch.delenv("AGENTIC_EXECUTION_QUEUE_ENABLED", raising=False)
    seen: dict[str, Any] = {}

    def fake_run(cmd: list[str], **kwargs: Any) -> subprocess.CompletedProcess[str]:
        seen["timeout"] = kwargs.get("timeout")
        raise subprocess.TimeoutExpired(cmd, kwargs.get("timeout") or 0)

    monkeypatch.setattr(subprocess_runner.subprocess, "run", fake_run)
    result = subprocess_runner.run_config_via_subprocess(
        _deterministic_config(),
        options=RunOptions(quiet=True, emit_stdout_summary=False, run_id="run-t"),
    )
    assert seen["timeout"] == 7.0
    assert result.exit_code == 124
    assert "timed out" in str(result.error)

    monkeypatch.setenv("AGENTIC_SUBPROCESS_STEP_TIMEOUT_SECONDS", "0")
    assert subprocess_runner.subprocess_step_timeout_seconds() is None
    monkeypatch.delenv("AGENTIC_SUBPROCESS_STEP_TIMEOUT_SECONDS")
    assert subprocess_runner.subprocess_step_timeout_seconds() == 3600.0


@pytest.mark.unit
@pytest.mark.skipif(sys.platform == "win32", reason="POSIX file modes")
def test_run_store_files_are_private_and_atomic(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("AGENTIC_RUN_STORE_PRIVATE", raising=False)
    spec_path = tmp_path / "run-1" / "step_1-spec.json"
    write_step_spec(spec_path, {"a": 1})
    assert json.loads(spec_path.read_text(encoding="utf-8")) == {"a": 1}
    assert stat.S_IMODE(spec_path.stat().st_mode) == 0o600
    assert stat.S_IMODE(spec_path.parent.stat().st_mode) == 0o700
    assert [p.name for p in spec_path.parent.iterdir()] == ["step_1-spec.json"]  # no temp left

    monkeypatch.setenv("AGENTIC_RUN_STORE_PRIVATE", "0")
    shared = tmp_path / "shared" / "x.json"
    write_step_spec(shared, {"b": 2})
    # Escape hatch for coordinator/worker pairs with different uids: the
    # directory is left at the umask default instead of being forced to 0700.
    assert stat.S_IMODE(shared.parent.stat().st_mode) != 0o700


@pytest.mark.unit
def test_worker_writes_a_failure_result_on_early_exit(tmp_path: Path) -> None:
    """A spec the worker rejects must leave a result (not nothing, not a stale file)."""
    from orchestration.execute_step import execute_step_from_spec_file

    spec = {
        "run_id": "run-e",
        "step_id": "step_1",
        "agent_provider": {},
        "task": {"description": "d"},
        "paths": {"run_store": str(tmp_path / "store")},
    }
    spec_path = tmp_path / "spec.json"
    spec_path.write_text(json.dumps(spec), encoding="utf-8")
    assert execute_step_from_spec_file(spec_path) == 2
    saved = FileSystemRunStore(tmp_path / "store").read_step_result("run-e", "step_1")
    assert saved is not None
    assert saved.exit_code == 2
    assert "agent_provider.id" in str(saved.error)
