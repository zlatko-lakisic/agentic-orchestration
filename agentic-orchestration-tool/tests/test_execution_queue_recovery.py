"""Recovery tests for ghost active slots / stale warm-pool claims."""

from __future__ import annotations

import json
import time
from pathlib import Path

import pytest

from orchestration.backends.kubernetes_warm_pool import claim_next_global_step
from orchestration.execution_queue import (
    ExecutionQueueManager,
    reset_execution_queue_for_tests,
)
from orchestration.execution_queue_store import (
    StoredTicket,
    clear_stale_grants,
    list_pending_tickets,
    new_ticket_id,
    reclaim_stale_claims,
    submit_pending_ticket,
    write_grant,
    write_state,
)


@pytest.fixture(autouse=True)
def _reset_queue(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    monkeypatch.setenv("AGENTIC_EXECUTION_QUEUE_ENABLED", "1")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_BACKEND", "hybrid")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_UNIFY_WARM_POOL", "1")
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(tmp_path))
    reset_execution_queue_for_tests()
    yield
    reset_execution_queue_for_tests()


@pytest.mark.unit
def test_reclaim_stale_claimed_step_ticket(tmp_path: Path) -> None:
    mount = str(tmp_path)
    ticket = StoredTicket(
        ticket_id=new_ticket_id(),
        run_id="r1",
        kind="step",
        phase="step",
        priority=50,
        priority_label=None,
        enqueued_at=time.time(),
        client_id=None,
        requirements={"spec_container_path": "/run/store/r1/step_1-spec.json"},
        step_id="step_1",
    )
    path = submit_pending_ticket(ticket, run_store_mount=mount)
    claimed = path.with_name(f"{path.name}.claimed-dead-worker")
    path.rename(claimed)
    # Make it look old.
    old = time.time() - 600
    import os

    os.utime(claimed, (old, old))

    assert list_pending_tickets("step", run_store_mount=mount) == []
    n = reclaim_stale_claims("step", max_age_seconds=60.0, run_store_mount=mount)
    assert n == 1
    pending = list_pending_tickets("step", run_store_mount=mount)
    assert len(pending) == 1
    assert pending[0][1].ticket_id == ticket.ticket_id


@pytest.mark.unit
def test_clear_stale_grants(tmp_path: Path) -> None:
    mount = str(tmp_path)
    tid = new_ticket_id()
    gpath = write_grant(tid, {"run_id": "old"}, run_store_mount=mount)
    old = time.time() - 7200
    import os

    os.utime(gpath, (old, old))
    assert clear_stale_grants(max_age_seconds=3600.0, run_store_mount=mount) == 1
    assert not gpath.exists()


@pytest.mark.unit
def test_reconcile_does_not_grant_orphan_step_tickets(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    mount = str(tmp_path)
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", mount)
    ticket = StoredTicket(
        ticket_id=new_ticket_id(),
        run_id="r-step",
        kind="step",
        phase="step",
        priority=50,
        priority_label=None,
        enqueued_at=time.time(),
        client_id=None,
        requirements={"spec_container_path": "/x/spec.json", "vram_gb": 0.5, "cpu_cores": 0.5},
        step_id="step_1",
    )
    submit_pending_ticket(ticket, run_store_mount=mount)
    write_state(
        {"active": {"planning": 0, "execution": 1, "steps": 1, "vram_gb": 8.5}, "pending": {}},
        run_store_mount=mount,
    )

    mgr = ExecutionQueueManager(run_store_mount=mount)
    mgr.reconcile_file_pending()

    # Must not invent an in-memory lease for warm-pool step tickets.
    assert mgr._usage()["steps"] == 0
    assert mgr._usage()["execution"] == 0
    pending = list_pending_tickets("step", run_store_mount=mount)
    assert len(pending) == 1
    state = Path(mount) / "execution-queue" / "state.json"
    data = json.loads(state.read_text(encoding="utf-8"))
    assert data["active"]["steps"] == 0
    assert data["active"]["execution"] == 0
    assert data["pending"]["steps"] == 1


@pytest.mark.unit
def test_claim_global_step_skips_bare_tickets(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    mount = str(tmp_path)
    monkeypatch.setenv("HOSTNAME", "worker-a")
    bare = StoredTicket(
        ticket_id=new_ticket_id(),
        run_id="r1",
        kind="step",
        phase="step",
        priority=90,
        priority_label=None,
        enqueued_at=1.0,
        client_id=None,
        requirements={},  # no spec — legacy double-enqueue junk
        step_id="step_1",
    )
    real = StoredTicket(
        ticket_id=new_ticket_id(),
        run_id="r1",
        kind="step",
        phase="step",
        priority=50,
        priority_label=None,
        enqueued_at=2.0,
        client_id=None,
        requirements={"spec_container_path": "/run/store/r1/step_1-spec.json"},
        step_id="step_1",
    )
    submit_pending_ticket(bare, run_store_mount=mount)
    submit_pending_ticket(real, run_store_mount=mount)

    claimed = claim_next_global_step(mount)
    assert claimed is not None
    path, ticket = claimed
    assert ticket.requirements.get("spec_container_path")
    assert path.name.endswith(".claimed-worker-a")
    # Bare ticket removed; only the claim file for the real ticket remains.
    remaining = list_pending_tickets("step", run_store_mount=mount)
    assert remaining == []
