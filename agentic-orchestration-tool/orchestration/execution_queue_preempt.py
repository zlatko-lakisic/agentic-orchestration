"""Run preemption: cancel lower-priority active jobs to admit urgent work."""

from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass
from typing import Any, Callable


def preempt_enabled() -> bool:
    return os.getenv("AGENTIC_EXEC_QUEUE_PREEMPT_ENABLED", "0").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def preempt_threshold() -> int:
    raw = os.getenv("AGENTIC_EXEC_QUEUE_PREEMPT_THRESHOLD", "75").strip() or "75"
    try:
        return max(0, min(int(raw), 100))
    except ValueError:
        return 75


def preempt_min_gap() -> int:
    raw = os.getenv("AGENTIC_EXEC_QUEUE_PREEMPT_MIN_GAP", "25").strip() or "25"
    try:
        return max(0, min(int(raw), 100))
    except ValueError:
        return 25


def preempt_protect_seconds() -> float:
    raw = os.getenv("AGENTIC_EXEC_QUEUE_PREEMPT_PROTECT_SECONDS", "30").strip() or "30"
    try:
        return max(0.0, float(raw))
    except ValueError:
        return 30.0


@dataclass(frozen=True)
class ActiveLeaseInfo:
    run_id: str
    ticket_id: str
    phase: str
    priority: int
    started_at: float
    client_id: str | None = None


PreemptHook = Callable[[str], None]

_hooks_lock = threading.RLock()
_preempt_hooks: dict[str, PreemptHook] = {}


def register_preempt_hook(run_id: str, callback: PreemptHook) -> None:
    with _hooks_lock:
        _preempt_hooks[str(run_id)] = callback


def unregister_preempt_hook(run_id: str) -> None:
    with _hooks_lock:
        _preempt_hooks.pop(str(run_id), None)


def invoke_preempt_hook(run_id: str) -> bool:
    with _hooks_lock:
        hook = _preempt_hooks.get(str(run_id))
    if hook is None:
        return False
    try:
        try:
            hook(run_id)
        except TypeError:
            hook()  # type: ignore[misc]
        return True
    except Exception:  # noqa: BLE001
        return False


def select_victims(
    active: list[ActiveLeaseInfo],
    *,
    incoming_priority: int,
    now: float | None = None,
) -> list[ActiveLeaseInfo]:
    """Pick running leases eligible for preemption (lowest priority, oldest first)."""
    if not preempt_enabled():
        return []
    if incoming_priority < preempt_threshold():
        return []
    clock = now if now is not None else time.time()
    gap = preempt_min_gap()
    protect = preempt_protect_seconds()
    eligible = [
        lease
        for lease in active
        if lease.priority <= incoming_priority - gap
        and (clock - lease.started_at) >= protect
    ]
    # Prefer planning-phase victims (cheaper to cancel).
    eligible.sort(key=lambda x: (x.priority, 0 if x.phase == "planning" else 1, x.started_at))
    return eligible


def try_preempt_for_admit(
    active: list[ActiveLeaseInfo],
    *,
    incoming_priority: int,
    release_fn: Callable[[ActiveLeaseInfo], None],
    fits_after: Callable[[], bool],
    run_store_mount: str | None = None,
) -> list[str]:
    """Preempt victims until ``fits_after()`` or no victims remain. Returns preempted run ids."""
    from orchestration.execution_queue_store import write_preempt_signal

    victims = select_victims(active, incoming_priority=incoming_priority)
    preempted: list[str] = []
    for victim in victims:
        if fits_after():
            break
        invoked = invoke_preempt_hook(victim.run_id)
        write_preempt_signal(victim.run_id, run_store_mount=run_store_mount)
        release_fn(victim)
        preempted.append(victim.run_id)
        if not invoked:
            # Subprocess path: signal file is enough; remove from active set anyway.
            pass
    return preempted


def reset_preempt_hooks_for_tests() -> None:
    with _hooks_lock:
        _preempt_hooks.clear()
