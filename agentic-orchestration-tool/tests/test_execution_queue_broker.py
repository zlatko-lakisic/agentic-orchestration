"""Execution queue broker tests."""

from __future__ import annotations

import pytest

from orchestration.execution_queue_broker import ExecutionQueueBroker, stop_broker


@pytest.fixture(autouse=True)
def _reset(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    stop_broker()
    monkeypatch.setenv("AGENTIC_EXECUTION_QUEUE_ENABLED", "1")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_BACKEND", "inprocess")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_AUTOSCALE_ENABLED", "0")
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(tmp_path / "run-store"))
    from orchestration import execution_queue as eq

    eq.reset_execution_queue_for_tests()
    yield
    stop_broker()
    eq.reset_execution_queue_for_tests()


@pytest.mark.unit
def test_broker_status_shape() -> None:
    broker = ExecutionQueueBroker(reconcile_interval_s=10.0, autoscale_interval_s=10.0)
    status = broker.status()
    assert "pending" in status
    assert "active" in status
