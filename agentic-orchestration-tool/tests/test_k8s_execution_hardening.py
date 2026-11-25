"""Regression tests for the Kubernetes execution path (Jobs, warm pool, delegation, autoscale)."""

from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
import yaml

from orchestration.backends import kubernetes_warm_pool as wp
from orchestration.backends.base import RunOptions, StepResult
from orchestration.backends.k8s_settings import (
    K8sSettings,
    is_secret_like_env,
    withheld_worker_secret_names,
    worker_env_from_process,
)
from orchestration.backends.k8s_worker_pod import build_worker_job_pod_spec
from orchestration.backends.kubernetes_jobs import (
    K8sJobRecord,
    K8sJobWaitResult,
    KubernetesJobRunner,
    job_name_for_step,
)
from orchestration.backends.kubernetes_types import write_json_atomic
from orchestration.config_loader import TaskDefinition, WorkflowConfig

pytestmark = pytest.mark.unit


def _settings(**overrides: Any) -> K8sSettings:
    base: dict[str, Any] = {
        "namespace": "ns",
        "worker_image": "worker:tag",
        "run_store_pvc": "pvc",
        "run_store_mount": "/run/store",
        "job_ttl_seconds": 3600,
        "job_timeout_seconds": 60,
        "env_secret_name": "agentic-orchestrator-env",
    }
    base.update(overrides)
    return K8sSettings(**base)


class _FakeBatch:
    """Minimal BatchV1Api stand-in driven by a list of status replies."""

    def __init__(self, statuses: list[Any] | None = None, *, create_error: Exception | None = None):
        self.created: list[dict[str, Any]] = []
        self.deleted: list[dict[str, Any]] = []
        self._statuses = list(statuses or [])
        self._create_error = create_error

    def create_namespaced_job(self, *, namespace: str, body: dict[str, Any]) -> None:
        if self._create_error is not None:
            raise self._create_error
        self.created.append(body)

    def read_namespaced_job_status(self, *, name: str, namespace: str) -> Any:
        reply = self._statuses.pop(0) if len(self._statuses) > 1 else self._statuses[0]
        if isinstance(reply, Exception):
            raise reply
        return SimpleNamespace(status=reply)

    def delete_namespaced_job(self, **kwargs: Any) -> None:
        self.deleted.append(kwargs)


class _FakeCore:
    def __init__(self, pods: list[Any] | None = None) -> None:
        self._pods = pods or []

    def list_namespaced_pod(self, *, namespace: str, label_selector: str) -> Any:
        return SimpleNamespace(items=self._pods)


def _running() -> Any:
    return SimpleNamespace(succeeded=None, failed=None)


def _pod(*, waiting_reason: str | None = None, unschedulable: bool = False) -> Any:
    statuses = []
    if waiting_reason:
        statuses.append(
            SimpleNamespace(
                state=SimpleNamespace(
                    waiting=SimpleNamespace(reason=waiting_reason, message="detail")
                )
            )
        )
    conditions = []
    if unschedulable:
        conditions.append(
            SimpleNamespace(
                type="PodScheduled", status="False", reason="Unschedulable", message="0/1 nodes"
            )
        )
    return SimpleNamespace(
        metadata=SimpleNamespace(name="pod-1"),
        status=SimpleNamespace(
            phase="Pending",
            container_statuses=statuses,
            init_container_statuses=None,
            conditions=conditions,
        ),
    )


def _runner(batch: _FakeBatch, core: _FakeCore | None = None, **settings: Any) -> KubernetesJobRunner:
    runner = KubernetesJobRunner(batch, core or _FakeCore(), settings=_settings(**settings))
    runner._poll_interval = 0.01
    return runner


# --------------------------------------------------------------------------- Jobs


def test_job_name_keeps_attempt_suffix_within_limit() -> None:
    long_step = "s" * 80
    name = job_name_for_step(run_id="r" * 40, step_id=long_step, suffix="ab12cd")
    assert len(name) <= 63
    assert name.endswith("-ab12cd")
    # No suffix: unchanged deterministic name (callers and tests still rely on it).
    assert job_name_for_step(run_id="abc", step_id="step1") == "agentic-abc-step1"


def test_retry_gets_a_new_job_name_and_job_has_active_deadline(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("AGENTIC_K8S_WARM_POOL_ENABLED", raising=False)
    batch = _FakeBatch([SimpleNamespace(succeeded=1, failed=None)])
    runner = _runner(batch, job_timeout_seconds=123)
    names = []
    for _ in range(2):
        record, wait = runner.run_step_job(
            run_id="run-1",
            step_id="step-1",
            spec_container_path="/run/store/run-1/step-1-spec.json",
            agent_provider_id="agent",
        )
        assert wait.succeeded
        names.append(record.job_name)
    # Same (run_id, step_id) twice: the second attempt must not collide (409).
    assert names[0] != names[1]
    assert [b["metadata"]["name"] for b in batch.created] == names
    for body in batch.created:
        assert body["spec"]["activeDeadlineSeconds"] == 123
        assert body["spec"]["backoffLimit"] == 0


def test_job_create_error_is_a_failed_step_not_an_exception(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("AGENTIC_K8S_WARM_POOL_ENABLED", raising=False)

    class ApiError(Exception):
        status = 409
        reason = "AlreadyExists"

    runner = _runner(_FakeBatch(create_error=ApiError()))
    _record, wait = runner.run_step_job(
        run_id="run-1",
        step_id="step-1",
        spec_container_path="/x",
        agent_provider_id="agent",
    )
    assert wait.failed and not wait.succeeded
    assert "failed to create Job" in (wait.message or "")
    assert "409" in (wait.message or "")


def test_job_timeout_deletes_the_job(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_K8S_JOB_START_TIMEOUT_SECONDS", "0")
    batch = _FakeBatch([_running()])
    runner = _runner(batch, job_timeout_seconds=0.2)
    wait = runner._wait_for_job(job_name="agentic-run-step-abc123")
    assert wait.failed
    assert "timed out" in (wait.message or "")
    assert batch.deleted == [
        {
            "name": "agentic-run-step-abc123",
            "namespace": "ns",
            "propagation_policy": "Foreground",
        }
    ]


def test_transient_status_error_does_not_abort_the_wait(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_K8S_JOB_START_TIMEOUT_SECONDS", "0")
    batch = _FakeBatch(
        [ConnectionError("api blip"), _running(), SimpleNamespace(succeeded=1, failed=None)]
    )
    wait = _runner(batch)._wait_for_job(job_name="job")
    assert wait.succeeded
    assert batch.deleted == []


def test_pod_that_cannot_start_fails_fast_and_is_deleted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Fatal reason: no grace needed.
    monkeypatch.setenv("AGENTIC_K8S_JOB_START_TIMEOUT_SECONDS", "600")
    batch = _FakeBatch([_running()])
    runner = _runner(batch, _FakeCore([_pod(waiting_reason="InvalidImageName")]))
    wait = runner._wait_for_job(job_name="job")
    assert wait.failed
    assert "InvalidImageName" in (wait.message or "")
    assert len(batch.deleted) == 1

    # Possibly transient reasons fail only after the start timeout.
    monkeypatch.setenv("AGENTIC_K8S_JOB_START_TIMEOUT_SECONDS", "1")
    for pod in (_pod(waiting_reason="ImagePullBackOff"), _pod(unschedulable=True)):
        batch = _FakeBatch([_running()])
        runner = _runner(batch, _FakeCore([pod]), job_timeout_seconds=30)
        started = time.time()
        wait = runner._wait_for_job(job_name="job")
        assert wait.failed
        assert "did not start within 1s" in (wait.message or "")
        assert time.time() - started < 10
        assert len(batch.deleted) == 1


def test_start_check_can_be_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_K8S_JOB_START_TIMEOUT_SECONDS", "0")
    batch = _FakeBatch([_running(), _running(), SimpleNamespace(succeeded=1, failed=None)])
    runner = _runner(batch, _FakeCore([_pod(waiting_reason="InvalidImageName")]))
    assert runner._wait_for_job(job_name="job").succeeded


# --------------------------------------------------------------------------- runner


def _one_step_config() -> WorkflowConfig:
    return WorkflowConfig(
        name="one",
        process="sequential",
        topic="t",
        instance_key="k",
        agent_providers=[
            {
                "id": "local_agent",
                "type": "ollama",
                "model": "ollama/llava",
                "role": "r",
                "goal": "g",
                "backstory": "b",
            }
        ],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id="only_step",
                agent_provider_id="local_agent",
                description="d",
                expected_output="o",
            )
        ],
        task_sequence=["only_step"],
    )


def _k8s_env(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    store = tmp_path / "store"
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(store))
    monkeypatch.setenv("AGENTIC_K8S_WORKER_IMAGE", "agentic-orchestrator-worker:ci")
    monkeypatch.setenv("AGENTIC_K8S_RUN_STORE_PVC", "agentic-run-store")
    monkeypatch.setenv("AGENTIC_K8S_RUN_STORE_MOUNT", "/run/store")
    monkeypatch.delenv("AGENTIC_RUN_STORE_BACKEND", raising=False)
    return store


def test_succeeded_job_without_result_json_is_a_failure(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    from orchestration.backends.kubernetes_runner import run_config_via_kubernetes

    _k8s_env(monkeypatch, tmp_path)

    class SilentRunner:
        def __init__(self) -> None:
            self._settings = K8sSettings.from_env()

        def run_step_job(self, **_: Any):
            record = K8sJobRecord(job_name="j", namespace="ns", pod_name="p")
            # Job reported success but the worker never wrote result.json.
            return record, K8sJobWaitResult(
                succeeded=True, failed=False, pod_name="p", message=None
            )

    result = run_config_via_kubernetes(
        _one_step_config(),
        options=RunOptions(quiet=True, run_id="run-silent"),
        job_runner=SilentRunner(),  # type: ignore[arg-type]
    )
    assert result.exit_code != 0
    assert result.step_results and result.step_results[-1].exit_code == 1
    assert "no result.json" in str(result.step_results[-1].error)


def test_stale_result_from_previous_attempt_is_not_reused(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    from orchestration.backends.kubernetes_runner import run_config_via_kubernetes
    from orchestration.run_store import FileSystemRunStore

    store_root = _k8s_env(monkeypatch, tmp_path)
    # A success left behind by an earlier run/round with the same run_id + step_id.
    FileSystemRunStore(store_root).write_step_result(
        "run-reuse",
        "only_step",
        StepResult(run_id="run-reuse", step_id="only_step", exit_code=0, result_text="OLD"),
    )

    class DeadRunner:
        def __init__(self) -> None:
            self._settings = K8sSettings.from_env()

        def run_step_job(self, **_: Any):
            # Worker died before writing anything (OOM-kill, node loss).
            record = K8sJobRecord(job_name="j", namespace="ns", pod_name=None)
            return record, K8sJobWaitResult(
                succeeded=False, failed=True, pod_name=None, message="Job j failed"
            )

    result = run_config_via_kubernetes(
        _one_step_config(),
        options=RunOptions(quiet=True, run_id="run-reuse"),
        job_runner=DeadRunner(),  # type: ignore[arg-type]
    )
    assert result.exit_code != 0
    assert result.result_text != "OLD"
    assert "Job j failed" in str(result.step_results[-1].error)


def test_inprocess_engine_step_without_result_reports_exit_code(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """The MCP-tunnel in-process path used to raise AttributeError on ``wait.failed``."""
    from orchestration.backends import kubernetes_runner

    _k8s_env(monkeypatch, tmp_path)
    monkeypatch.setattr(kubernetes_runner, "spec_requires_engine_mcp_tunnel", lambda _spec: True)
    monkeypatch.setattr(
        "orchestration.execute_step.execute_step_from_spec_file", lambda _path: 2
    )

    class NeverCalled:
        def __init__(self) -> None:
            self._settings = K8sSettings.from_env()

        def run_step_job(self, **_: Any):
            raise AssertionError("in-process step must not spawn a Job")

    result = kubernetes_runner.run_config_via_kubernetes(
        _one_step_config(),
        options=RunOptions(quiet=True, run_id="run-inproc"),
        job_runner=NeverCalled(),  # type: ignore[arg-type]
    )
    assert result.exit_code != 0
    assert "exit code 2" in str(result.step_results[-1].error)


# --------------------------------------------------------------------------- env / pod spec


@pytest.mark.parametrize(
    ("name", "value", "expected"),
    [
        ("OPENAI_API_KEY", "x", True),
        ("HF_TOKEN", "x", True),
        ("HOME_ASSISTANT_TOKEN", "x", True),
        ("AGENTIC_ORCHESTRATE_API_KEY", "x", True),
        ("AGENTIC_RUN_STORE_S3_SECRET_ACCESS_KEY", "x", True),
        ("AGENTIC_RUN_STORE_S3_ACCESS_KEY_ID", "x", True),
        ("AGENTIC_SENTRY_DSN", "https://example.invalid/1", True),
        ("AGENTIC_RUN_STORE_REDIS_URL", "redis://user:pw@redis:6379/0", True),
        ("AGENTIC_RUN_STORE_REDIS_URL", "redis://redis:6379/0", False),
        ("AGENTIC_RAG_INJECT_MAX_TOKENS", "4000", False),
        ("AGENTIC_API_TOKEN_ID", "tok_123", False),
        ("AGENTIC_API_TOKENS_DIR", "/data/tokens", False),
        ("AGENTIC_CREDENTIAL_SKIP_VERBOSE", "1", False),
        ("OLLAMA_API_BASE", "http://ollama:11434", False),
        ("AGENTIC_PLANNER_MODEL", "ollama/qwen", False),
    ],
)
def test_is_secret_like_env(name: str, value: str, expected: bool) -> None:
    assert is_secret_like_env(name, value) is expected


def test_worker_job_spec_carries_no_secret_literals(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_K8S_WORKER_ENV_LITERAL_SECRETS", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-not-a-real-key")
    monkeypatch.setenv("HOME_ASSISTANT_TOKEN", "ha-token")
    monkeypatch.setenv("AGENTIC_ORCHESTRATE_API_KEY", "inbound-key")
    monkeypatch.setenv("AGENTIC_PLANNER_MODEL", "ollama/qwen")
    monkeypatch.setenv("OLLAMA_API_BASE", "http://ollama:11434")

    pod = build_worker_job_pod_spec(
        settings=_settings(),
        spec_container_path="/run/store/r/s-spec.json",
    )
    worker = pod["containers"][0]
    env = {e["name"]: e["value"] for e in worker["env"]}
    assert "OPENAI_API_KEY" not in env
    assert "HOME_ASSISTANT_TOKEN" not in env
    assert "AGENTIC_ORCHESTRATE_API_KEY" not in env
    rendered = json.dumps(pod)
    for secret in ("sk-test-not-a-real-key", "ha-token", "inbound-key"):
        assert secret not in rendered
    # Non-secret configuration still travels as literals; secrets come via envFrom.
    assert env["AGENTIC_PLANNER_MODEL"] == "ollama/qwen"
    assert env["OLLAMA_API_BASE"] == "http://ollama:11434"
    assert worker["envFrom"] == [{"secretRef": {"name": "agentic-orchestrator-env"}}]
    assert {"OPENAI_API_KEY", "HOME_ASSISTANT_TOKEN"} <= set(withheld_worker_secret_names())


def test_literal_secret_escape_hatch(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-not-a-real-key")
    monkeypatch.setenv("AGENTIC_K8S_WORKER_ENV_LITERAL_SECRETS", "1")
    names = {e["name"] for e in worker_env_from_process()}
    assert "OPENAI_API_KEY" in names
    # The switch itself is AGENTIC_K8S_*: never forwarded.
    assert "AGENTIC_K8S_WORKER_ENV_LITERAL_SECRETS" not in names


def test_worker_container_security_context(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_K8S_WORKER_HARDENED", raising=False)
    pod = build_worker_job_pod_spec(settings=_settings(), spec_container_path="/x")
    assert pod["containers"][0]["securityContext"] == {"allowPrivilegeEscalation": False}
    assert "securityContext" not in pod  # no uid change unless the operator asks

    monkeypatch.setenv("AGENTIC_K8S_WORKER_HARDENED", "1")
    pod = build_worker_job_pod_spec(
        settings=_settings(worker_run_as_user=10001), spec_container_path="/x"
    )
    ctx = pod["containers"][0]["securityContext"]
    assert ctx["capabilities"] == {"drop": ["ALL"]}
    assert ctx["seccompProfile"] == {"type": "RuntimeDefault"}
    assert pod["securityContext"] == {"runAsUser": 10001, "runAsNonRoot": True}


def test_bad_timeout_env_falls_back_to_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_K8S_JOB_TIMEOUT_SECONDS", "ten minutes")
    monkeypatch.setenv("AGENTIC_K8S_JOB_TTL_SECONDS", "-5")
    settings = K8sSettings.from_env()
    assert settings.job_timeout_seconds == 3600
    assert settings.job_ttl_seconds == 3600


def test_sidecar_package_can_be_pinned(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.k8s_mcp_compat import sidecar_containers_for_mcps

    monkeypatch.setenv("AGENTIC_K8S_MCP_FETCH_PACKAGE", "mcp-server-fetch==1.2.3")
    args = sidecar_containers_for_mcps(["fetch_url"])[0]["args"]
    assert "uvx mcp-server-fetch==1.2.3" in args
    # Anything that is not a plain package spec is ignored (value is joined into a command).
    monkeypatch.setenv("AGENTIC_K8S_MCP_FETCH_PACKAGE", "mcp-server-fetch; rm -rf /")
    args = sidecar_containers_for_mcps(["fetch_url"])[0]["args"]
    assert "uvx mcp-server-fetch" in args


# --------------------------------------------------------------------------- warm pool


def test_write_json_atomic_leaves_no_temp_and_keeps_umask_mode(tmp_path: Path) -> None:
    target = tmp_path / "q" / "a.json"
    old_umask = os.umask(0o022)
    try:
        write_json_atomic(target, {"a": 1})
    finally:
        os.umask(old_umask)
    assert json.loads(target.read_text(encoding="utf-8")) == {"a": 1}
    assert [p.name for p in target.parent.iterdir()] == ["a.json"]
    # Readable by a worker running under another uid (mkstemp would give 0600).
    assert target.stat().st_mode & 0o044 == 0o044


def test_unreadable_warm_pool_request_is_set_aside_not_fatal(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("HOSTNAME", "pod-a")
    mount = str(tmp_path)
    queue = wp.warm_pool_queue_dir(mount)
    queue.mkdir(parents=True)
    (queue / "aaa__broken.json").write_text('{"run_id": "r", "step', encoding="utf-8")
    good = wp.enqueue_warm_pool_request(
        run_store_mount=mount,
        run_id="run-b",
        step_id="s2",
        spec_container_path=f"{mount}/spec.json",
        agent_provider_id="p",
    )
    claimed = wp.claim_next_warm_pool_request(mount)  # used to raise JSONDecodeError
    assert claimed is not None
    _path, req = claimed
    assert req.run_id == "run-b"
    assert not good.exists()
    assert (queue / "aaa__broken.json.invalid").is_file()
    # The broken file is never offered again.
    assert wp.claim_next_warm_pool_request(mount) is None


def test_legacy_queue_reclaims_claims_of_dead_workers(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("HOSTNAME", "dead-pod")
    mount = str(tmp_path)
    wp.enqueue_warm_pool_request(
        run_store_mount=mount,
        run_id="run-c",
        step_id="s1",
        spec_container_path=f"{mount}/spec.json",
        agent_provider_id="p",
    )
    claimed = wp.claim_next_warm_pool_request(mount)
    assert claimed is not None
    claim_path, _req = claimed

    # Fresh (heartbeating) claim: left alone.
    assert wp.reclaim_stale_warm_pool_claims(mount, max_age_seconds=30.0) == 0
    assert claim_path.is_file()

    # The pod died: its claim stops being touched and is handed back.
    old = time.time() - 300
    os.utime(claim_path, (old, old))
    assert wp.reclaim_stale_warm_pool_claims(mount, max_age_seconds=30.0) == 1
    assert not claim_path.exists()

    monkeypatch.setenv("HOSTNAME", "new-pod")
    again = wp.claim_next_warm_pool_request(mount)
    assert again is not None
    assert again[1].step_id == "s1"


def test_heartbeat_is_at_most_a_third_of_every_reclaim_threshold() -> None:
    shortest = min(wp.CLAIM_RECLAIM_STARTUP_SECONDS, wp.CLAIM_RECLAIM_PERIODIC_SECONDS)
    assert wp.CLAIM_HEARTBEAT_SECONDS * 3 <= shortest


def test_partially_written_result_is_not_reported_as_failure(tmp_path: Path) -> None:
    mount = str(tmp_path)
    result_path = wp.warm_pool_result_path(run_store_mount=mount, run_id="r", step_id="s")
    result_path.parent.mkdir(parents=True)
    result_path.write_text('{"exit_code": 0, "result_te', encoding="utf-8")  # mid-write

    def _finish() -> None:
        time.sleep(0.3)
        result_path.write_text('{"exit_code": 0, "result_text": "done"}', encoding="utf-8")

    threading.Thread(target=_finish, daemon=True).start()
    wait = wp.wait_for_warm_pool_result(
        run_store_mount=mount, run_id="r", step_id="s", timeout_seconds=10, poll_interval=0.05
    )
    assert wait.succeeded


def test_sigterm_during_step_writes_failure_and_releases_claim(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    mount = str(tmp_path)
    claim = tmp_path / "claim.json.claimed-pod"
    claim.write_text("{}", encoding="utf-8")

    def _terminated(_spec: Path) -> int:
        raise wp.WarmPoolWorkerTerminated(143)

    monkeypatch.setattr("orchestration.execute_step.execute_step_from_spec_file", _terminated)
    released: list[Path] = []

    def _release(path: Path) -> None:
        released.append(path)
        path.unlink(missing_ok=True)

    with pytest.raises(wp.WarmPoolWorkerTerminated):
        wp._run_claimed_step(
            mount=mount,
            claim_path=claim,
            run_id="run-t",
            step_id="step-t",
            spec_path=tmp_path / "spec.json",
            release_claim=_release,
        )
    result = json.loads(
        wp.warm_pool_result_path(run_store_mount=mount, run_id="run-t", step_id="step-t").read_text(
            encoding="utf-8"
        )
    )
    assert result["exit_code"] == 1
    assert "SIGTERM" in result["error"]
    # Claim released: the step is not re-run after the coordinator saw the failure.
    assert released == [claim]
    assert not claim.exists()


def test_system_exit_from_step_code_fails_the_step_not_the_worker(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    mount = str(tmp_path)
    claim = tmp_path / "claim.json.claimed-pod"
    claim.write_text("{}", encoding="utf-8")

    def _bails(_spec: Path) -> int:
        raise SystemExit("object_detection execute-step requires a non-empty images list")

    monkeypatch.setattr("orchestration.execute_step.execute_step_from_spec_file", _bails)
    # Returns normally: the worker loop keeps serving other steps.
    wp._run_claimed_step(
        mount=mount,
        claim_path=claim,
        run_id="run-x",
        step_id="step-x",
        spec_path=tmp_path / "spec.json",
        release_claim=lambda path: path.unlink(missing_ok=True),
    )
    result = json.loads(
        wp.warm_pool_result_path(run_store_mount=mount, run_id="run-x", step_id="step-x").read_text(
            encoding="utf-8"
        )
    )
    assert result["exit_code"] == 1
    assert "non-empty images list" in result["error"]
    assert not claim.exists()


def test_sigterm_handler_only_installs_in_main_thread() -> None:
    import signal

    previous = signal.getsignal(signal.SIGTERM)
    out: list[bool] = []
    thread = threading.Thread(target=lambda: out.append(wp._install_sigterm_handler()))
    thread.start()
    thread.join()
    assert out == [False]
    try:
        assert wp._install_sigterm_handler() is True
        handler = signal.getsignal(signal.SIGTERM)
        with pytest.raises(wp.WarmPoolWorkerTerminated):
            handler(signal.SIGTERM, None)  # type: ignore[misc,operator]
    finally:
        signal.signal(signal.SIGTERM, previous)


# --------------------------------------------------------------------------- delegation


def _delegation_request(request_id: str) -> Any:
    from orchestration.backends.kubernetes_delegation import DelegationRequest

    return DelegationRequest(
        request_id=request_id,
        parent_run_id="run-p",
        parent_step_id="step-p",
        agent_provider={"id": "gpt_write"},
        task_description="d",
        task_expected_output="o",
        topic="t",
        mcp_providers=[],
        enqueued_at=0.0,
    )


def test_delegation_child_never_goes_through_the_warm_pool(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from orchestration.backends import kubernetes_delegation as kd

    monkeypatch.setenv("AGENTIC_K8S_WARM_POOL_ENABLED", "1")
    seen: dict[str, Any] = {}

    class FakeRunner:
        def run_step_job(self, **kwargs: Any):
            seen.update(kwargs)
            return (
                K8sJobRecord(job_name="j", namespace="ns"),
                K8sJobWaitResult(succeeded=True, failed=False, pod_name=None, message=None),
            )

    monkeypatch.setattr(
        "orchestration.backends.kubernetes_jobs.KubernetesJobRunner.from_env",
        classmethod(lambda cls: FakeRunner()),
    )
    ok, err = kd._spawn_child_job(
        request=_delegation_request("abcdef0123456789"), spec_container_path="/x"
    )
    assert ok and err is None
    assert seen["use_warm_pool"] is False


def test_use_warm_pool_false_creates_a_job_even_when_pool_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_K8S_WARM_POOL_ENABLED", "1")
    batch = _FakeBatch([SimpleNamespace(succeeded=1, failed=None)])
    record, wait = _runner(batch).run_step_job(
        run_id="run-1",
        step_id="delegate-abc",
        spec_container_path="/x",
        agent_provider_id="agent",
        use_warm_pool=False,
    )
    assert wait.succeeded
    assert len(batch.created) == 1
    assert record.job_name != "warm-pool"


def test_unreadable_delegation_request_fails_the_parent_not_the_broker(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from orchestration.backends import kubernetes_delegation as kd

    monkeypatch.setenv("HOSTNAME", "broker")
    mount = str(tmp_path)
    queue = kd.delegation_queue_dir(mount)
    queue.mkdir(parents=True)
    (queue / "brokenreq0001.json").write_text('{"request_id": "brok', encoding="utf-8")

    assert kd.claim_next_delegation_request(mount) is None  # used to raise
    response = json.loads(
        (kd.delegation_response_dir(mount) / "brokenreq0001.json").read_text(encoding="utf-8")
    )
    assert response["succeeded"] is False
    assert "unreadable delegation request" in response["error"]
    assert list(queue.iterdir()) == []


def test_delegation_claims_of_a_dead_broker_are_reclaimed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from orchestration.backends import kubernetes_delegation as kd

    monkeypatch.setenv("HOSTNAME", "old-broker")
    mount = str(tmp_path)
    queue = kd.delegation_queue_dir(mount)
    write_json_atomic(queue / "req0000000001.json", _delegation_request("req0000000001").to_dict())
    claimed = kd.claim_next_delegation_request(mount)
    assert claimed is not None
    claim_path, _req = claimed

    assert kd.reclaim_stale_delegation_claims(mount, max_age_seconds=60.0) == 0
    old = time.time() - 600
    os.utime(claim_path, (old, old))
    assert kd.reclaim_stale_delegation_claims(mount, max_age_seconds=60.0) == 1

    monkeypatch.setenv("HOSTNAME", "new-broker")
    again = kd.claim_next_delegation_request(mount)
    assert again is not None and again[1].request_id == "req0000000001"


def test_parent_timeout_withdraws_request_and_response_is_consumed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from orchestration.backends import kubernetes_delegation as kd

    monkeypatch.delenv("AGENTIC_K8S_DELEGATION_INLINE", raising=False)
    mount = str(tmp_path)
    response = kd.submit_delegation_request(
        run_store_mount=mount,
        parent_run_id="run-p",
        parent_step_id="step-p",
        agent_provider={"id": "a"},
        task_description="d",
        task_expected_output="o",
        topic="t",
        timeout_seconds=1,
    )
    assert response.succeeded is False
    assert "timed out" in (response.error or "")
    # Not left queued for a broker to run after the parent has given up.
    assert list(kd.delegation_queue_dir(mount).iterdir()) == []


def test_broker_serves_requests_concurrently(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Two parents delegating at once must not wait on each other's child."""
    from orchestration.backends import kubernetes_delegation as kd

    monkeypatch.setenv("AGENTIC_K8S_DELEGATION_CONCURRENCY", "2")
    monkeypatch.delenv("AGENTIC_K8S_DELEGATION_INLINE", raising=False)
    mount = str(tmp_path)
    queue = kd.delegation_queue_dir(mount)
    for rid in ("reqaaaaaaaaaa1", "reqbbbbbbbbbb2"):
        write_json_atomic(queue / f"{rid}.json", _delegation_request(rid).to_dict())

    both_running = threading.Barrier(2, timeout=10)
    overlapped: list[bool] = []

    def _spawn(*, request: Any, spec_container_path: str):
        try:
            both_running.wait()  # only passes if both children run at the same time
            overlapped.append(True)
        except threading.BrokenBarrierError:
            overlapped.append(False)
        child = kd.child_step_id_for_request(request.request_id)
        write_json_atomic(
            Path(mount) / request.parent_run_id / child / "result.json",
            {"exit_code": 0, "result_text": f"done {request.request_id}"},
        )
        return True, None

    monkeypatch.setattr(kd, "_spawn_child_job", _spawn)
    stop = threading.Event()
    broker = threading.Thread(
        target=kd.run_delegation_broker_loop,
        kwargs={"run_store_mount": mount, "poll_interval": 0.02, "stop": stop},
        daemon=True,
    )
    broker.start()
    try:
        responses = kd.delegation_response_dir(mount)
        deadline = time.time() + 15
        while time.time() < deadline and len(list(responses.glob("*.json"))) < 2:
            time.sleep(0.05)
    finally:
        stop.set()
        broker.join(timeout=15)
    assert not broker.is_alive()
    assert overlapped == [True, True]
    for rid in ("reqaaaaaaaaaa1", "reqbbbbbbbbbb2"):
        data = json.loads((responses / f"{rid}.json").read_text(encoding="utf-8"))
        assert data["succeeded"] is True
    assert list(queue.iterdir()) == []


# --------------------------------------------------------------------------- autoscale


def test_autoscale_uses_scale_subresource_and_default_namespace(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from orchestration.execution_queue_broker import ExecutionQueueBroker, warm_pool_namespace

    monkeypatch.delenv("AGENTIC_K8S_NAMESPACE", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_WARM_POOL_DEPLOYMENT", raising=False)
    assert warm_pool_namespace() == "agentic-orchestration"

    calls: list[dict[str, Any]] = []

    class FakeApps:
        def patch_namespaced_deployment_scale(self, **kwargs: Any) -> None:
            calls.append(kwargs)

    broker = ExecutionQueueBroker()
    broker._apps = FakeApps()
    assert broker._patch_replicas(3) is True
    assert calls == [
        {
            "name": "agentic-warm-pool",
            "namespace": "agentic-orchestration",
            "body": {"spec": {"replicas": 3}},
        }
    ]


def test_autoscale_failure_is_logged_not_swallowed(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    from orchestration.execution_queue_broker import ExecutionQueueBroker

    monkeypatch.setenv("AGENTIC_LOG_FORMAT", "text")

    class Forbidden(Exception):
        status = 403
        reason = "Forbidden"

    class FakeApps:
        def patch_namespaced_deployment_scale(self, **_: Any) -> None:
            raise Forbidden()

    broker = ExecutionQueueBroker()
    broker._apps = FakeApps()
    assert broker._patch_replicas(2) is False
    err = capsys.readouterr().err
    assert "warm pool autoscale failed" in err
    assert "403 Forbidden" in err


def test_coordinator_role_allows_what_the_code_calls(tool_root: Path) -> None:
    role = yaml.safe_load(
        (tool_root / "deploy" / "k8s" / "coordinator" / "role.yaml").read_text(encoding="utf-8")
    )
    rules = {
        (group, resource): set(rule["verbs"])
        for rule in role["rules"]
        for group in rule["apiGroups"]
        for resource in rule["resources"]
    }
    # execution_queue_broker._patch_replicas -> patch_namespaced_deployment_scale
    assert "patch" in rules[("apps", "deployments/scale")]
    # KubernetesJobRunner creates, reads and (on timeout) deletes Jobs.
    assert {"create", "get", "delete"} <= rules[("batch", "jobs")]
    # No wildcards, no secrets, no exec.
    for (_group, resource), verbs in rules.items():
        assert "*" not in verbs and resource not in ("*", "secrets", "pods/exec")
