"""E2E-style execution queue tests (in-process scheduler)."""

from __future__ import annotations

import threading
import time

import pytest

from orchestration import execution_queue as eq
from orchestration.execution_queue_store import StoredTicket, new_ticket_id


@pytest.fixture(autouse=True)
def _reset(monkeypatch: pytest.MonkeyPatch) -> None:
    eq.reset_execution_queue_for_tests()
    monkeypatch.setenv("AGENTIC_EXECUTION_QUEUE_ENABLED", "1")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_BACKEND", "inprocess")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_MAX_PLANNING", "1")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_WAIT_SECONDS", "3")
    yield
    eq.reset_execution_queue_for_tests()


@pytest.mark.e2e
def test_realtime_before_low_when_both_queued() -> None:
    finished: list[str] = []
    mgr = eq.get_execution_queue()
    req = eq.planning_requirements()

    def run(priority: int, name: str) -> None:
        ticket = StoredTicket(
            ticket_id=new_ticket_id(),
            run_id=name,
            kind="run_planning",
            phase="planning",
            priority=priority,
            priority_label=None,
            enqueued_at=time.time(),
            client_id=None,
            tenant_id=None,
            step_id=None,
            requirements={
                "phase": "planning",
                "vram_gb": req.vram_gb,
                "cpu_cores": req.cpu_cores,
                "gpu_slots": req.gpu_slots,
            },
        )
        lease = mgr.acquire(ticket)
        finished.append(name)
        mgr.release(lease)

    block_ticket = StoredTicket(
        ticket_id=new_ticket_id(),
        run_id="block",
        kind="run_planning",
        phase="planning",
        priority=50,
        priority_label=None,
        enqueued_at=time.time(),
        client_id=None,
        tenant_id=None,
        step_id=None,
        requirements={
            "phase": "planning",
            "vram_gb": req.vram_gb,
            "cpu_cores": req.cpu_cores,
            "gpu_slots": req.gpu_slots,
        },
    )
    block_lease = mgr.acquire(block_ticket)
    t_low = threading.Thread(target=run, args=(25, "low"))
    t_rt = threading.Thread(target=run, args=(100, "realtime"))
    t_low.start()
    t_rt.start()
    time.sleep(0.25)
    mgr.release(block_lease)
    t_low.join(timeout=5)
    t_rt.join(timeout=5)
    assert finished[0] == "realtime"
