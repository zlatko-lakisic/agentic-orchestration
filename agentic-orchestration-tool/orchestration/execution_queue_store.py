"""File-backed execution queue state for cross-process admission (CLI / web spawn)."""

from __future__ import annotations

import json
import os
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from orchestration.run_store import shared_run_store_mount_path


def new_ticket_id() -> str:
    return uuid.uuid4().hex


def queue_root(run_store_mount: str | None = None) -> Path:
    mount = (run_store_mount or shared_run_store_mount_path()).rstrip("\\/")
    return Path(mount) / "execution-queue"


def _pending_dir(root: Path, phase: str) -> Path:
    return root / "pending" / phase


def _granted_dir(root: Path) -> Path:
    return root / "granted"


def _preempt_dir(root: Path) -> Path:
    return root / "preempt"


def _state_path(root: Path) -> Path:
    return root / "state.json"


def ensure_queue_dirs(run_store_mount: str | None = None) -> Path:
    root = queue_root(run_store_mount)
    for sub in ("planning", "execution", "steps"):
        _pending_dir(root, sub).mkdir(parents=True, exist_ok=True)
    _granted_dir(root).mkdir(parents=True, exist_ok=True)
    _preempt_dir(root).mkdir(parents=True, exist_ok=True)
    return root


def atomic_write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
    finally:
        try:
            if os.path.exists(tmp):
                os.unlink(tmp)
        except OSError:
            pass


@dataclass
class StoredTicket:
    ticket_id: str
    run_id: str
    phase: str
    kind: str
    priority: int
    priority_label: str | None
    enqueued_at: float
    client_id: str | None
    requirements: dict[str, Any] = field(default_factory=dict)
    tenant_id: str | None = None
    step_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "ticket_id": self.ticket_id,
            "run_id": self.run_id,
            "phase": self.phase,
            "kind": self.kind,
            "priority": self.priority,
            "priority_label": self.priority_label,
            "enqueued_at": self.enqueued_at,
            "client_id": self.client_id,
            "tenant_id": self.tenant_id,
            "requirements": dict(self.requirements),
        }
        if self.step_id:
            out["step_id"] = self.step_id
        return out

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> StoredTicket:
        return cls(
            ticket_id=str(data.get("ticket_id") or uuid.uuid4().hex),
            run_id=str(data.get("run_id") or ""),
            phase=str(data.get("phase") or "planning"),
            kind=str(data.get("kind") or data.get("phase") or "run_planning"),
            priority=int(data.get("priority") or 50),
            priority_label=(
                str(data["priority_label"]).strip()
                if data.get("priority_label") is not None
                else None
            )
            or None,
            enqueued_at=float(data.get("enqueued_at") or time.time()),
            client_id=str(data["client_id"]).strip() if data.get("client_id") else None,
            tenant_id=str(data["tenant_id"]).strip() if data.get("tenant_id") else None,
            requirements=dict(data.get("requirements") or {}),
            step_id=str(data["step_id"]).strip() if data.get("step_id") else None,
        )


def ticket_filename(*, priority: int, enqueued_at: float, ticket_id: str | None = None) -> str:
    tid = ticket_id or uuid.uuid4().hex
    ts = int(enqueued_at * 1000)
    return f"{priority:03d}-{ts:013d}-{tid}.json"


class ExecutionQueueStore:
    """File-backed queue operations under ``{root}/execution-queue/``."""

    def __init__(self, root: Path) -> None:
        self._root = Path(root)
        if self._root.name != "execution-queue":
            self._root = self._root / "execution-queue"
        for sub in ("planning", "execution", "steps"):
            (_pending_dir(self._root, sub)).mkdir(parents=True, exist_ok=True)
        _granted_dir(self._root).mkdir(parents=True, exist_ok=True)
        _preempt_dir(self._root).mkdir(parents=True, exist_ok=True)

    def submit_ticket(self, ticket: StoredTicket) -> Path:
        phase_dir = _pending_dir(self._root, ticket.phase)
        name = ticket_filename(
            priority=ticket.priority,
            enqueued_at=ticket.enqueued_at,
            ticket_id=ticket.ticket_id,
        )
        path = phase_dir / name
        atomic_write_json(path, ticket.to_dict())
        return path

    def list_pending(self, phase: str) -> list[tuple[Path, StoredTicket]]:
        phase_dir = _pending_dir(self._root, phase)
        if not phase_dir.is_dir():
            return []
        out: list[tuple[Path, StoredTicket]] = []
        for path in sorted(phase_dir.glob("*.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    out.append((path, StoredTicket.from_dict(data)))
            except (OSError, json.JSONDecodeError, TypeError, ValueError):
                continue
        out.sort(key=lambda pair: (-pair[1].priority, pair[1].enqueued_at))
        return out

    def write_grant(self, ticket_id: str, payload: dict[str, Any] | None = None) -> Path:
        path = _granted_dir(self._root) / f"{ticket_id}.json"
        body = dict(payload or {})
        body["ticket_id"] = ticket_id
        body["granted_at"] = time.time()
        atomic_write_json(path, body)
        return path

    def read_grant(self, ticket_id: str) -> dict[str, Any] | None:
        path = _granted_dir(self._root) / f"{ticket_id}.json"
        if not path.is_file():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError, TypeError, ValueError):
            return None
        return data if isinstance(data, dict) else None

    def write_state(self, snapshot: dict[str, Any]) -> None:
        payload = dict(snapshot)
        payload["updatedAt"] = time.time()
        atomic_write_json(_state_path(self._root), payload)

    def read_state(self) -> dict[str, Any]:
        path = _state_path(self._root)
        if not path.is_file():
            return {}
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError, TypeError, ValueError):
            return {}
        return data if isinstance(data, dict) else {}


def read_state(run_store_mount: str | None = None) -> dict[str, Any]:
    return ExecutionQueueStore(queue_root(run_store_mount)).read_state()


def write_state(snapshot: dict[str, Any], *, run_store_mount: str | None = None) -> None:
    ExecutionQueueStore(queue_root(run_store_mount)).write_state(snapshot)


def submit_pending_ticket(
    ticket: StoredTicket,
    *,
    run_store_mount: str | None = None,
) -> Path:
    return ExecutionQueueStore(queue_root(run_store_mount)).submit_ticket(ticket)


def list_pending_tickets(
    phase: str,
    *,
    run_store_mount: str | None = None,
) -> list[tuple[Path, StoredTicket]]:
    return ExecutionQueueStore(queue_root(run_store_mount)).list_pending(phase)


def remove_pending(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


def write_grant(
    ticket_id: str,
    payload: dict[str, Any] | None = None,
    *,
    run_store_mount: str | None = None,
) -> Path:
    return ExecutionQueueStore(queue_root(run_store_mount)).write_grant(ticket_id, payload)


def poll_grant(
    ticket_id: str,
    *,
    run_store_mount: str | None = None,
) -> dict[str, Any] | None:
    return ExecutionQueueStore(queue_root(run_store_mount)).read_grant(ticket_id)


def clear_grant(ticket_id: str, *, run_store_mount: str | None = None) -> None:
    path = _granted_dir(queue_root(run_store_mount)) / f"{ticket_id}.json"
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


def write_preempt_signal(run_id: str, *, run_store_mount: str | None = None) -> Path:
    root = ensure_queue_dirs(run_store_mount)
    path = _preempt_dir(root) / f"{run_id.replace('/', '_')}.json"
    atomic_write_json(path, {"run_id": run_id, "preempted_at": time.time()})
    return path


def poll_preempt_signal(run_id: str, *, run_store_mount: str | None = None) -> bool:
    path = _preempt_dir(queue_root(run_store_mount)) / f"{run_id.replace('/', '_')}.json"
    return path.is_file()


def clear_preempt_signal(run_id: str, *, run_store_mount: str | None = None) -> None:
    path = _preempt_dir(queue_root(run_store_mount)) / f"{run_id.replace('/', '_')}.json"
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass
