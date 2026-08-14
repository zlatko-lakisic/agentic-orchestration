from __future__ import annotations

import json
import time
from pathlib import Path

import pytest

from orchestration.backends.kubernetes_warm_pool import (
    WarmPoolRequest,
    claim_next_warm_pool_request,
    dispatch_step_via_warm_pool,
    enqueue_warm_pool_request,
    invalidate_warm_pool_result,
    warm_pool_enabled_from_env,
    warm_pool_queue_dir,
    warm_pool_result_path,
    wait_for_warm_pool_result,
)
from orchestration.structured_logging import emit_log, log_format_from_env, structured_log_record
from orchestration.run_store import resolve_run_id
from orchestration.backends.base import RunOptions


@pytest.mark.unit
def test_structured_log_record_fields() -> None:
    rec = structured_log_record(
        "hello",
        level="info",
        run_id="r1",
        step_id="s1",
        component="coordinator",
    )
    assert rec["message"] == "hello"
    assert rec["run_id"] == "r1"
    assert rec["step_id"] == "s1"
    assert rec["component"] == "coordinator"
    assert "ts" in rec


@pytest.mark.unit
def test_emit_log_json_includes_question_id_extra(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("AGENTIC_LOG_FORMAT", "json")
    emit_log(
        "engine chat start",
        run_id="run-xyz",
        component="engine",
        extra={"question_id": "q-42"},
    )
    err = capsys.readouterr().err.strip()
    payload = json.loads(err)
    assert payload["run_id"] == "run-xyz"
    assert payload["question_id"] == "q-42"
    assert payload["component"] == "engine"


@pytest.mark.unit
def test_resolve_run_id_prefers_explicit_then_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_RUN_ID", "from-env")
    assert resolve_run_id("explicit") == "explicit"
    assert resolve_run_id("") == "from-env"
    assert resolve_run_id(None) == "from-env"
    monkeypatch.delenv("AGENTIC_RUN_ID", raising=False)
    minted = resolve_run_id(None)
    assert isinstance(minted, str) and len(minted) >= 16


@pytest.mark.unit
def test_run_options_carries_run_id() -> None:
    opts = RunOptions(run_id="abc123")
    assert opts.run_id == "abc123"


@pytest.mark.unit
def test_metrics_payload_records_runs() -> None:
    from orchestration.metrics import metrics_payload, record_run_end

    record_run_end(ok=True, elapsed_ms=12.5)
    record_run_end(ok=False, elapsed_ms=3)
    body, content_type = metrics_payload()
    text = body.decode("utf-8")
    assert "ao_runs_total" in text
    assert "text/plain" in content_type


@pytest.mark.unit
def test_log_format_default_text(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_LOG_FORMAT", raising=False)
    assert log_format_from_env() == "text"


@pytest.mark.unit
def test_warm_pool_disabled_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_K8S_WARM_POOL_ENABLED", raising=False)
    assert warm_pool_enabled_from_env() is False


@pytest.mark.unit
def test_warm_pool_enqueue_and_wait(tmp_path: Path) -> None:
    mount = str(tmp_path)
    enqueue_warm_pool_request(
        run_store_mount=mount,
        run_id="run-a",
        step_id="step-1",
        spec_container_path=f"{mount}/run-a/step-1-spec.json",
        agent_provider_id="agent",
    )
    assert (warm_pool_queue_dir(mount) / "run-a__step-1.json").is_file()

    result_path = tmp_path / "run-a" / "step-1" / "result.json"
    result_path.parent.mkdir(parents=True)

    def _write_result() -> None:
        time.sleep(0.2)
        result_path.write_text('{"exit_code":0}', encoding="utf-8")

    import threading

    threading.Thread(target=_write_result, daemon=True).start()
    wait = wait_for_warm_pool_result(
        run_store_mount=mount,
        run_id="run-a",
        step_id="step-1",
        timeout_seconds=5,
        poll_interval=0.05,
    )
    assert wait.succeeded


@pytest.mark.unit
def test_warm_pool_claim(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    mount = str(tmp_path)
    monkeypatch.setenv("HOSTNAME", "test-pod")
    req_path = enqueue_warm_pool_request(
        run_store_mount=mount,
        run_id="run-b",
        step_id="s2",
        spec_container_path=f"{mount}/spec.json",
        agent_provider_id="p",
    )
    claimed = claim_next_warm_pool_request(mount)
    assert claimed is not None
    path, req = claimed
    assert req.run_id == "run-b"
    assert req.step_id == "s2"
    assert not req_path.is_file()
    assert path.name.endswith(".claimed-test-pod")
    path.unlink()


@pytest.mark.unit
def test_warm_pool_ignores_stale_result_until_fresh(tmp_path: Path) -> None:
    """A result.json from a prior attempt must not satisfy a new wait."""
    mount = str(tmp_path)
    result_path = warm_pool_result_path(
        run_store_mount=mount, run_id="run-stale", step_id="step-1"
    )
    result_path.parent.mkdir(parents=True)
    result_path.write_text('{"exit_code":1,"error":"old failure"}', encoding="utf-8")
    # Force mtime into the past so not_before rejects it.
    past = time.time() - 30
    os_utime = __import__("os").utime
    os_utime(result_path, (past, past))

    def _write_fresh() -> None:
        time.sleep(0.25)
        result_path.write_text('{"exit_code":0}', encoding="utf-8")

    import threading

    not_before = time.time()
    threading.Thread(target=_write_fresh, daemon=True).start()
    wait = wait_for_warm_pool_result(
        run_store_mount=mount,
        run_id="run-stale",
        step_id="step-1",
        timeout_seconds=5,
        poll_interval=0.05,
        not_before=not_before,
    )
    assert wait.succeeded
    assert wait.failed is False


@pytest.mark.unit
def test_warm_pool_fresh_failure_still_reported(tmp_path: Path) -> None:
    mount = str(tmp_path)
    result_path = warm_pool_result_path(
        run_store_mount=mount, run_id="run-fail", step_id="step-1"
    )
    result_path.parent.mkdir(parents=True)

    def _write_fail() -> None:
        time.sleep(0.15)
        result_path.write_text(
            '{"exit_code":1,"error":"llama runner process has terminated"}',
            encoding="utf-8",
        )

    import threading

    not_before = time.time()
    threading.Thread(target=_write_fail, daemon=True).start()
    wait = wait_for_warm_pool_result(
        run_store_mount=mount,
        run_id="run-fail",
        step_id="step-1",
        timeout_seconds=5,
        poll_interval=0.05,
        not_before=not_before,
    )
    assert wait.failed
    assert wait.succeeded is False
    assert "llama runner" in (wait.message or "")


@pytest.mark.unit
def test_dispatch_deletes_prior_result_before_enqueue(tmp_path: Path) -> None:
    mount = str(tmp_path)
    result_path = warm_pool_result_path(
        run_store_mount=mount, run_id="run-retry", step_id="step_1"
    )
    result_path.parent.mkdir(parents=True)
    result_path.write_text('{"exit_code":1,"error":"stale"}', encoding="utf-8")
    assert result_path.is_file()

    removed = invalidate_warm_pool_result(
        run_store_mount=mount, run_id="run-retry", step_id="step_1"
    )
    assert removed is True
    assert not result_path.is_file()

    # Full dispatch path: prior result gone, then wait times out with no worker.
    _record, wait = dispatch_step_via_warm_pool(
        namespace="ns",
        run_store_mount=mount,
        run_id="run-retry",
        step_id="step_1",
        spec_container_path=f"{mount}/run-retry/step_1-spec.json",
        agent_provider_id="ollama_granite_code",
        timeout_seconds=1,
    )
    assert wait.failed
    assert "timed out" in (wait.message or "")
    assert (warm_pool_queue_dir(mount) / "run-retry__step_1.json").is_file()
