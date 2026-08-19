"""Execution queue broker tests."""

from __future__ import annotations

import pytest

from orchestration.execution_queue_broker import ExecutionQueueBroker, stop_broker


@pytest.fixture(autouse=True)
def _reset(monkeypatch: pytest.MonkeyPatch) -> None:
    stop_broker()
    monkeypatch.setenv("AGENTIC_EXECUTION_QUEUE_ENABLED", "1")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_AUTOSCALE_ENABLED", "0")
    yield
    stop_broker()


@pytest.mark.unit
def test_broker_status_shape() -> None:
    broker = ExecutionQueueBroker(reconcile_interval_s=10.0, autoscale_interval_s=10.0)
    status = broker.status()
    assert "pending" in status
    assert "active" in status
