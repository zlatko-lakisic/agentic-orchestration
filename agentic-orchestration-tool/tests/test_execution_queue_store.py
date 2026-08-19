"""File-backed execution queue store tests."""

from __future__ import annotations

import pytest

from orchestration.execution_queue_store import (
    StoredTicket,
    list_pending_tickets,
    new_ticket_id,
    submit_pending_ticket,
    write_grant,
    write_state,
)


@pytest.mark.unit
def test_submit_and_list_pending(tmp_path) -> None:
    mount = str(tmp_path)
    low = StoredTicket(
        ticket_id=new_ticket_id(),
        run_id="r1",
        kind="run_planning",
        phase="planning",
        priority=25,
        priority_label="low",
        enqueued_at=1.0,
        client_id=None,
        tenant_id=None,
        step_id=None,
        requirements={},
    )
    high = StoredTicket(
        ticket_id=new_ticket_id(),
        run_id="r2",
        kind="run_planning",
        phase="planning",
        priority=100,
        priority_label="realtime",
        enqueued_at=2.0,
        client_id=None,
        tenant_id=None,
        step_id=None,
        requirements={},
    )
    submit_pending_ticket(low, run_store_mount=mount)
    submit_pending_ticket(high, run_store_mount=mount)
    pending = list_pending_tickets("planning", run_store_mount=mount)
    assert len(pending) == 2
    assert pending[0][1].priority == 100


@pytest.mark.unit
def test_grant_and_state(tmp_path) -> None:
    mount = str(tmp_path)
    tid = new_ticket_id()
    write_grant(tid, {}, run_store_mount=mount)
    write_state({"active": {"planning": 0, "execution": 0, "steps": 0}}, run_store_mount=mount)
