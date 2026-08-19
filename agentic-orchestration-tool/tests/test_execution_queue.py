"""Unit tests for global execution queue scheduler."""

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
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_MAX_EXECUTION", "1")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_VRAM_GB", "16")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_CPU_CORES", "4")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_WAIT_SECONDS", "3")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_MAX", "8")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_FAIR_SHARE_ENABLED", "0")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_PREEMPT_ENABLED", "0")
    yield
    eq.reset_execution_queue_for_tests()


@pytest.mark.unit
def test_normalize_priority_labels_and_clamp() -> None:
    assert eq.normalize_priority("realtime")[0] == 100
    assert eq.normalize_priority("low")[0] == 25
    assert eq.normalize_priority(120, app_max=75)[0] == 75
    assert eq.normalize_priority(None, label="high")[0] == 75


@pytest.mark.unit
def test_planning_slot_limit() -> None:
    with eq.acquire_planning(run_id="run-a"):
        with pytest.raises((RuntimeError, eq.QueueTimeoutError, TimeoutError)):
            with eq.acquire_planning(run_id="run-b", timeout_seconds=0.5):
                pass


@pytest.mark.unit
def test_disabled_passthrough(monkeypatch: pytest.MonkeyPatch) -> None:
    eq.reset_execution_queue_for_tests()
    monkeypatch.setenv("AGENTIC_EXECUTION_QUEUE_ENABLED", "0")
    with eq.acquire_planning(run_id="x"):
        with eq.acquire_planning(run_id="y"):
            pass


@pytest.mark.unit
def test_on_wait_callback() -> None:
    seen: list[int] = []

    def on_wait(snap: eq.WaitSnapshot) -> None:
        seen.append(snap.position)

    def waiter() -> None:
        with eq.acquire_planning(run_id="w", priority=50, on_wait=on_wait):
            pass

    t = threading.Thread(target=waiter)
    with eq.acquire_planning(run_id="block"):
        t.start()
        time.sleep(0.3)
    t.join(timeout=5)
    assert seen and seen[0] >= 1
