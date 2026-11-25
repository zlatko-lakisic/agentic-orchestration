"""Regression tests for execution-queue admission, quota and preemption defects."""

from __future__ import annotations

import sys
import threading
import time
from pathlib import Path

import pytest

from orchestration import execution_queue as eq
from orchestration.backends.base import RunOptions, StepResult, StepSpec
from orchestration.execution_queue_fair_share import QueueQuota
from orchestration.execution_queue_store import (
    StoredTicket,
    count_pending_tickets,
    poll_preempt_signal,
    write_preempt_signal,
)


@pytest.fixture(autouse=True)
def _reset(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    eq.reset_execution_queue_for_tests()
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(tmp_path / "store"))
    monkeypatch.setenv("AGENTIC_EXECUTION_QUEUE_ENABLED", "1")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_BACKEND", "inprocess")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_MAX_PLANNING", "2")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_MAX_EXECUTION", "2")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_VRAM_GB", "16")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_CPU_CORES", "4")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_WAIT_SECONDS", "5")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_MAX", "8")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_FAIR_SHARE_ENABLED", "0")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_PREEMPT_ENABLED", "0")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_HOST_HEADROOM_CPU_PCT", "0")
    yield
    eq.reset_execution_queue_for_tests()


def _exec_req(cpu: float = 1.0) -> eq.ResourceRequirements:
    return eq.ResourceRequirements(phase="execution", vram_gb=0.0, cpu_cores=cpu, gpu_slots=0)


def _ticket(
    run_id: str,
    *,
    phase: str = "execution",
    cpu: float = 0.25,
    priority: int = 50,
    client_id: str | None = None,
) -> StoredTicket:
    return eq._make_ticket(
        run_id=run_id,
        phase=phase,  # type: ignore[arg-type]
        kind="run_execution" if phase == "execution" else "run_planning",  # type: ignore[arg-type]
        requirements=eq.ResourceRequirements(
            phase=phase, vram_gb=0.0, cpu_cores=cpu, gpu_slots=0  # type: ignore[arg-type]
        ),
        priority=priority,
        priority_label=None,
        client_id=client_id,
    )


def _wait_until(predicate, timeout: float = 5.0) -> bool:  # noqa: ANN001
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(0.02)
    return predicate()


# --------------------------------------------------------------------- finding 5


@pytest.mark.unit
def test_step_sublease_is_covered_by_its_runs_execution_lease(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A run whose execution lease takes the whole CPU budget can still admit its own steps."""
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_CPU_CORES", "2")
    with eq.acquire_execution(run_id="run-a", requirements=_exec_req(cpu=2.0)):
        t0 = time.monotonic()
        with eq.acquire_step(run_id="run-a", step_id="step_1", timeout_seconds=1.5) as lease:
            assert lease is not None
            assert lease.parent_lease_id is not None
            usage = eq.get_execution_queue()._usage()
            # Not charged a second time on top of the parent.
            assert usage["cpu_cores"] == pytest.approx(2.0)
            assert usage["steps"] == 1
        assert time.monotonic() - t0 < 1.0


@pytest.mark.unit
def test_step_without_parent_lease_is_still_charged(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_CPU_CORES", "2")
    with eq.acquire_execution(run_id="run-a", requirements=_exec_req(cpu=2.0)):
        with pytest.raises(eq.QueueTimeoutError):
            with eq.acquire_step(run_id="some-other-run", step_id="s", timeout_seconds=0.4):
                pass


@pytest.mark.unit
def test_steps_do_not_trip_another_tenants_concurrency_quota(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Steps used to land in the ``__default__`` bucket and count as concurrent *runs*."""
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_FAIR_SHARE_ENABLED", "1")
    quota = QueueQuota(max_concurrent_runs=1)
    monkeypatch.setattr(eq, "_overlay_queue_policy", lambda: (None, None, quota))

    with eq.acquire_execution(run_id="run-a", requirements=_exec_req(), client_id="app-a"):
        with eq.acquire_execution(run_id="run-b", requirements=_exec_req(), client_id="app-b"):
            with eq.acquire_step(run_id="run-a", step_id="s1", timeout_seconds=1.0) as step_a:
                with eq.acquire_step(run_id="run-b", step_id="s1", timeout_seconds=1.0) as step_b:
                    assert step_a is not None and step_b is not None
                    assert step_a.client_id == "app-a"
                    assert step_b.client_id == "app-b"
                    tracker = eq.get_execution_queue()._fair_share
                    # One run each: the step is not a second concurrent run.
                    assert tracker.tenant_snapshot("app-a")["tenantActive"] == 1
                    assert tracker.tenant_snapshot("app-b")["tenantActive"] == 1
                    assert tracker.tenant_snapshot(None)["tenantActive"] == 0
    tracker = eq.get_execution_queue()._fair_share
    assert tracker.tenant_snapshot("app-a")["tenantActive"] == 0


# -------------------------------------------------------------------- finding 10


@pytest.mark.unit
def test_waiting_high_priority_ticket_triggers_preemption(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Preemption used to be evaluated only on release/cancel, so an urgent
    ticket behind a long-running low-priority lease just timed out."""
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_MAX_EXECUTION", "1")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_PREEMPT_ENABLED", "1")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_PREEMPT_PROTECT_SECONDS", "0")
    mgr = eq.get_execution_queue()

    hook_hits: list[str] = []
    eq.register_preempt_hook("low-run", hook_hits.append)
    low = mgr.acquire(_ticket("low-run", priority=0), timeout_seconds=1.0)
    assert low is not None

    t0 = time.monotonic()
    high = mgr.acquire(_ticket("high-run", priority=100), timeout_seconds=6.0)
    elapsed = time.monotonic() - t0
    assert high.run_id == "high-run"
    assert elapsed < 4.0
    assert mgr.queue_status()["preempts"] == 1
    assert hook_hits == ["low-run"]
    assert poll_preempt_signal("low-run", run_store_mount=str(tmp_path / "store"))

    # The victim's own (late) release must be a harmless no-op.
    mgr.release(low)
    assert mgr.queue_status()["active"]["execution"] == 1
    mgr.release(high)


@pytest.mark.unit
def test_release_after_cancel_does_not_double_decrement_tenant_counts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_FAIR_SHARE_ENABLED", "1")
    mgr = eq.get_execution_queue()
    first = mgr.acquire(_ticket("run-1", client_id="app-a"), timeout_seconds=1.0)
    second = mgr.acquire(_ticket("run-2", client_id="app-a"), timeout_seconds=1.0)
    tracker = mgr._fair_share
    assert tracker.tenant_snapshot("app-a")["tenantActive"] == 2

    mgr.cancel_run("run-1")  # e.g. preempted / cancelled: lease already dropped
    assert tracker.tenant_snapshot("app-a")["tenantActive"] == 1
    mgr.release(first)  # the run's own ``finally``
    # Used to drop to 0 with ``run-2`` still live, bypassing maxConcurrentRuns.
    assert tracker.tenant_snapshot("app-a")["tenantActive"] == 1
    mgr.release(second)
    assert tracker.tenant_snapshot("app-a")["tenantActive"] == 0


@pytest.mark.unit
def test_tenant_quota_is_rechecked_when_queued_tickets_are_granted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """N tickets queued while the tenant is at 0 active must not all be admitted."""
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_FAIR_SHARE_ENABLED", "1")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_MAX_EXECUTION", "4")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_CPU_CORES", "1")
    mgr = eq.get_execution_queue()
    quota = QueueQuota(max_concurrent_runs=1)

    # Another tenant uses the whole CPU budget, so app-a's tickets must queue.
    blocker = mgr.acquire(_ticket("blocker", cpu=1.0, client_id="app-z"), timeout_seconds=1.0)

    leases: dict[str, object] = {}
    errors: list[BaseException] = []

    def submit(run_id: str) -> None:
        try:
            leases[run_id] = mgr.acquire(
                _ticket(run_id, cpu=0.25, client_id="app-a"),
                timeout_seconds=8.0,
                quota=quota,
            )
        except BaseException as exc:  # noqa: BLE001
            errors.append(exc)

    threads = [threading.Thread(target=submit, args=(rid,)) for rid in ("a-1", "a-2")]
    for t in threads:
        t.start()
    assert _wait_until(lambda: len(mgr._pending) == 2)

    mgr.release(blocker)
    assert _wait_until(lambda: len(leases) == 1)
    time.sleep(1.3)  # at least one periodic re-drain by the remaining waiter
    assert len(leases) == 1, "second ticket admitted past maxConcurrentRuns=1"
    assert mgr._fair_share.tenant_snapshot("app-a")["tenantActive"] == 1
    assert len(mgr._pending) == 1
    assert mgr._pending[0].quota_reason == "quota_concurrent"

    first_run = next(iter(leases))
    mgr.release(leases[first_run])  # type: ignore[arg-type]
    assert _wait_until(lambda: len(leases) == 2)
    for t in threads:
        t.join(5)
    assert not errors, errors
    for lease in leases.values():
        mgr.release(lease)  # type: ignore[arg-type]


@pytest.mark.unit
def test_file_backend_does_not_leave_planning_tickets_behind(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    eq.reset_execution_queue_for_tests()
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_BACKEND", "file")
    mount = str(tmp_path / "store")
    for i in range(5):
        with eq.acquire_planning(run_id=f"run-{i}"):
            pass
    assert count_pending_tickets("planning", run_store_mount=mount) == 0


@pytest.mark.unit
def test_stored_ticket_keeps_priority_zero() -> None:
    ticket = _ticket("bg", priority=0)
    restored = StoredTicket.from_dict(ticket.to_dict())
    assert restored.priority == 0
    assert StoredTicket.from_dict({"run_id": "x"}).priority == 50


@pytest.mark.unit
def test_preempt_signal_is_cleared_when_the_run_ends(tmp_path: Path) -> None:
    mount = str(tmp_path / "store")
    seen: list[bool] = []

    def execute(_config: object) -> str:
        # Preempted mid-execution; the signal must not outlive the run.
        write_preempt_signal("run-x", run_store_mount=mount)
        seen.append(eq.check_preempted("run-x"))
        return "done"

    out = eq.run_with_execution_queue(
        run_id="run-x",
        plan_fn=lambda: object(),
        exec_requirements_fn=lambda _cfg: _exec_req(),
        execute_fn=execute,
    )
    assert out == "done"
    assert seen == [True]
    assert not eq.check_preempted("run-x")


@pytest.mark.unit
def test_run_preempted_during_planning_stops_before_execution(tmp_path: Path) -> None:
    mount = str(tmp_path / "store")
    executed: list[bool] = []

    def plan() -> object:
        write_preempt_signal("run-y", run_store_mount=mount)
        return object()

    with pytest.raises(RuntimeError, match="preempted"):
        eq.run_with_execution_queue(
            run_id="run-y",
            plan_fn=plan,
            exec_requirements_fn=lambda _cfg: _exec_req(),
            execute_fn=lambda _cfg: executed.append(True),
        )
    assert executed == []
    assert not eq.check_preempted("run-y")
    assert eq.get_execution_queue().queue_status()["active"]["planning"] == 0


def _step_spec(run_id: str, step_id: str = "s1") -> StepSpec:
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


@pytest.mark.unit
def test_step_coordinator_stops_a_preempted_run_between_steps(tmp_path: Path) -> None:
    from orchestration.run_store import FileSystemRunStore
    from orchestration.step_coordinator import StepCoordinator

    mount = str(tmp_path / "store")
    write_preempt_signal("run-p", run_store_mount=mount)
    ran: list[str] = []

    def execute_step(spec: StepSpec) -> StepResult:
        ran.append(spec.step_id)
        return StepResult(run_id=spec.run_id, step_id=spec.step_id, exit_code=0, result_text="x")

    result = StepCoordinator(store=FileSystemRunStore(tmp_path / "results")).run_dag(
        [_step_spec("run-p")],
        execute_step=execute_step,
        options=RunOptions(quiet=True, emit_stdout_summary=False),
    )
    assert ran == []
    assert result.exit_code == 1
    assert "preempted" in str(result.error)


@pytest.mark.unit
def test_step_coordinator_honours_cancel_event(tmp_path: Path) -> None:
    from orchestration.run_store import FileSystemRunStore
    from orchestration.step_coordinator import StepCoordinator

    cancel = threading.Event()
    cancel.set()
    ran: list[str] = []
    result = StepCoordinator(store=FileSystemRunStore(tmp_path / "results")).run_dag(
        [_step_spec("run-c")],
        execute_step=lambda spec: ran.append(spec.step_id),  # type: ignore[arg-type,return-value]
        options=RunOptions(quiet=True, emit_stdout_summary=False, cancel_event=cancel),
    )
    assert ran == []
    assert result.exit_code == 1
    assert "cancelled" in str(result.error)


# -------------------------------------------------------------------- finding 14


@pytest.mark.unit
def test_host_cpu_headroom_actually_gates_admission(monkeypatch: pytest.MonkeyPatch) -> None:
    """``_host_cpu_ok`` used to read a key the sampler never returns, so it was a no-op."""
    from orchestration import host_metrics

    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_HOST_HEADROOM_CPU_PCT", "20")
    mgr = eq.get_execution_queue()
    ticket = _ticket("run-cpu", phase="planning")

    monkeypatch.setattr(host_metrics, "cpu_percent_snapshot", lambda **_kw: 95.0)
    assert mgr._can_admit(ticket) is False

    monkeypatch.setattr(host_metrics, "cpu_percent_snapshot", lambda **_kw: 50.0)
    assert mgr._can_admit(ticket) is True

    # Unknown load (first sample) never blocks.
    monkeypatch.setattr(host_metrics, "cpu_percent_snapshot", lambda **_kw: None)
    assert mgr._can_admit(ticket) is True


@pytest.mark.unit
def test_admission_does_not_run_full_host_sampling(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration import host_metrics

    def _boom() -> dict:
        raise AssertionError("admission must not call the full host metrics sampler")

    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_HOST_HEADROOM_CPU_PCT", "20")
    monkeypatch.setattr(host_metrics, "sample_host_metrics", _boom)
    monkeypatch.setattr(host_metrics, "cpu_percent_snapshot", lambda **_kw: 10.0)
    assert eq.get_execution_queue()._can_admit(_ticket("r", phase="planning")) is True


@pytest.mark.unit
def test_detected_vram_budget_is_cached(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_EXEC_QUEUE_VRAM_GB", raising=False)
    calls: list[int] = []

    def fake_total() -> float:
        calls.append(1)
        return 8.0

    monkeypatch.setattr(eq, "total_vram_gb", fake_total)
    mgr = eq.get_execution_queue()
    calls.clear()
    for _ in range(6):
        assert mgr._can_admit(_ticket("r", phase="planning")) is True
    assert len(calls) == 1


@pytest.mark.unit
@pytest.mark.skipif(not sys.platform.startswith("linux"), reason="/proc/stat sampler")
def test_cpu_percent_snapshot_has_its_own_delta_window(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from orchestration import host_metrics

    stat = tmp_path / "stat"

    def write(idle: int, busy: int) -> None:
        stat.write_text(f"cpu  {busy} 0 0 {idle} 0 0 0 0 0 0\n", encoding="utf-8")

    monkeypatch.setattr(host_metrics, "proc_root", lambda: tmp_path)
    host_metrics.reset_cpu_sample()
    host_metrics.reset_cpu_percent_snapshot()

    write(idle=1000, busy=1000)
    assert host_metrics.sample_cpu_percent() is None  # metrics stream: first tick
    stream_prev = host_metrics._prev_cpu

    assert host_metrics.cpu_percent_snapshot(min_interval_seconds=0.0) is None
    write(idle=1100, busy=1300)  # +100 idle, +300 busy → 75%
    assert host_metrics.cpu_percent_snapshot(min_interval_seconds=0.0) == pytest.approx(75.0)
    # Cached within the interval, even though counters moved on.
    write(idle=2000, busy=1300)
    assert host_metrics.cpu_percent_snapshot(min_interval_seconds=60.0) == pytest.approx(75.0)

    # The metrics stream's own window was not advanced by the queue's sampling.
    assert host_metrics._prev_cpu is stream_prev
    host_metrics.reset_cpu_sample()
    host_metrics.reset_cpu_percent_snapshot()
