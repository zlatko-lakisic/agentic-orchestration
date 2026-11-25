"""Installation-wide execution queue: planning, execution, and step admission."""

from __future__ import annotations

import os
import threading
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Callable, Iterator, Literal

from orchestration.execution_queue_fair_share import (
    FairShareTracker,
    QueueQuota,
    fair_share_enabled,
    get_fair_share_tracker,
    parse_queue_quota,
    reset_fair_share_for_tests,
)
from orchestration.execution_queue_preempt import (
    ActiveLeaseInfo,
    register_preempt_hook,
    reset_preempt_hooks_for_tests,
    try_preempt_for_admit,
    unregister_preempt_hook,
)
from orchestration.execution_queue_store import (
    StoredTicket,
    clear_grant,
    clear_preempt_signal,
    clear_stale_grants,
    count_pending_tickets,
    list_pending_tickets,
    poll_grant,
    poll_preempt_signal,
    read_state,
    reclaim_stale_claims,
    remove_pending,
    submit_pending_ticket,
    write_grant,
    write_state,
)

PhaseKind = Literal["planning", "execution", "step"]
TicketKind = Literal["run_planning", "run_execution", "step"]

PRIORITY_LABELS: dict[str, int] = {
    "realtime": 100,
    "high": 75,
    "normal": 50,
    "low": 25,
    "background": 0,
}

LABEL_FOR_PRIORITY: dict[int, str] = {v: k for k, v in PRIORITY_LABELS.items()}

_VRAM_BUDGET_CACHE_SECONDS = 30.0


def _env_truthy(name: str, *, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    return str(raw).strip().lower() not in ("0", "false", "no", "off")


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def execution_queue_enabled() -> bool:
    return _env_truthy("AGENTIC_EXECUTION_QUEUE_ENABLED", default=False)


def queue_backend() -> str:
    raw = os.getenv("AGENTIC_EXEC_QUEUE_BACKEND", "hybrid").strip().lower()
    if raw in ("inprocess", "file", "hybrid"):
        return raw
    return "hybrid"


def wait_seconds() -> float:
    return max(1.0, min(_env_float("AGENTIC_EXEC_QUEUE_WAIT_SECONDS", 600.0), 7200.0))


def queue_max() -> int:
    return max(1, min(_env_int("AGENTIC_EXEC_QUEUE_MAX", 64), 512))


def max_planning_slots() -> int:
    return max(1, min(_env_int("AGENTIC_EXEC_QUEUE_MAX_PLANNING", 2), 64))


def max_execution_slots() -> int:
    return max(1, min(_env_int("AGENTIC_EXEC_QUEUE_MAX_EXECUTION", 2), 64))


def plan_vram_gb() -> float:
    return max(0.0, _env_float("AGENTIC_EXEC_QUEUE_PLAN_VRAM_GB", 0.5))


def plan_cpu_cores() -> float:
    return max(0.05, _env_float("AGENTIC_EXEC_QUEUE_PLAN_CPU_CORES", 0.25))


def total_cpu_cores() -> float:
    raw = os.getenv("AGENTIC_EXEC_QUEUE_CPU_CORES", "").strip()
    if raw:
        try:
            return max(0.25, float(raw))
        except ValueError:
            pass
    try:
        return max(1.0, float(os.cpu_count() or 4))
    except (TypeError, ValueError):
        return 4.0


def total_vram_gb() -> float | None:
    from orchestration.hardware_profile import detect_vram_gb_available

    override = os.getenv("AGENTIC_EXEC_QUEUE_VRAM_GB", "").strip()
    if override:
        try:
            return max(0.0, float(override))
        except ValueError:
            pass
    return detect_vram_gb_available()


def max_gpu_runs() -> int:
    return max(0, min(_env_int("AGENTIC_EXEC_QUEUE_MAX_GPU_RUNS", 1), 32))


def priority_aging_seconds() -> float:
    return max(0.0, _env_float("AGENTIC_EXEC_QUEUE_PRIORITY_AGING_SECONDS", 300.0))


def default_priority() -> int:
    return max(0, min(_env_int("AGENTIC_EXEC_QUEUE_DEFAULT_PRIORITY", 50), 100))


def step_sublease_enabled() -> bool:
    return _env_truthy("AGENTIC_EXEC_QUEUE_STEP_SUBLEASE", default=True)


def unify_warm_pool_enabled() -> bool:
    return _env_truthy("AGENTIC_EXEC_QUEUE_UNIFY_WARM_POOL", default=True)


def host_headroom_cpu_pct() -> float:
    return max(0.0, min(_env_float("AGENTIC_EXEC_QUEUE_HOST_HEADROOM_CPU_PCT", 20.0), 95.0))


@dataclass(frozen=True)
class ResourceRequirements:
    phase: PhaseKind
    vram_gb: float
    cpu_cores: float
    gpu_slots: int
    agent_provider_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class WaitSnapshot:
    phase: PhaseKind
    position: int
    length: int
    priority: int
    priority_label: str | None
    elapsed_ms: float
    quota_reason: str | None = None


@dataclass
class _Waiter:
    ticket: StoredTicket
    event: threading.Event = field(default_factory=threading.Event)
    done: bool = False
    error: str | None = None
    lease_id: str | None = None
    quota_reason: str | None = None
    quota: QueueQuota | None = None


@dataclass
class _ActiveLease:
    lease_id: str
    ticket_id: str
    run_id: str
    phase: PhaseKind
    kind: TicketKind
    priority: int
    started_at: float
    requirements: ResourceRequirements
    client_id: str | None = None
    step_id: str | None = None
    #: Set on step sub-leases that run under their run's execution lease: the
    #: parent already reserved CPU/VRAM/GPU and already counts for fair share.
    parent_lease_id: str | None = None


class QueueFullError(RuntimeError):
    code = "queue_full"


class QueueTimeoutError(TimeoutError):
    code = "queue_timeout"


class QueueQuotaError(RuntimeError):
    def __init__(self, message: str, *, code: str = "quota_concurrent") -> None:
        super().__init__(message)
        self.code = code


def normalize_priority(
    raw: str | int | None,
    *,
    app_max: int | None = None,
    label: str | None = None,
) -> tuple[int, str | None]:
    """Return ``(numeric, label)`` clamped to 0–100 and optional app cap."""
    numeric: int | None = None
    resolved_label: str | None = None
    if label is not None:
        key = str(label).strip().lower()
        if key in PRIORITY_LABELS:
            numeric = PRIORITY_LABELS[key]
            resolved_label = key
    if raw is not None and str(raw).strip():
        text = str(raw).strip().lower()
        if text in PRIORITY_LABELS:
            numeric = PRIORITY_LABELS[text]
            resolved_label = text
        else:
            try:
                numeric = int(float(text))
            except (TypeError, ValueError):
                pass
    if numeric is None:
        numeric = default_priority()
    numeric = max(0, min(int(numeric), 100))
    if app_max is not None:
        numeric = min(numeric, max(0, min(int(app_max), 100)))
    if resolved_label is None and numeric in LABEL_FOR_PRIORITY:
        resolved_label = LABEL_FOR_PRIORITY[numeric]
    return numeric, resolved_label


def infer_priority(
    *,
    explicit: str | int | None,
    label: str | None = None,
    kind: str | None = None,
    has_images: bool = False,
    overlay_default: int | None = None,
    app_max: int | None = None,
) -> tuple[int, str | None]:
    if explicit is not None or label is not None:
        return normalize_priority(explicit, app_max=app_max, label=label)
    if has_images and kind in ("chat", "direct_agent"):
        return normalize_priority("high", app_max=app_max)
    if overlay_default is not None:
        return normalize_priority(overlay_default, app_max=app_max)
    return normalize_priority(None, app_max=app_max)


def planning_requirements() -> ResourceRequirements:
    return ResourceRequirements(
        phase="planning",
        vram_gb=plan_vram_gb(),
        cpu_cores=plan_cpu_cores(),
        gpu_slots=0,
    )


def _effective_priority(ticket: StoredTicket, *, now: float) -> int:
    base = int(ticket.priority)
    aging = priority_aging_seconds()
    if aging <= 0 or base >= PRIORITY_LABELS["normal"]:
        return base
    waited = max(0.0, now - ticket.enqueued_at)
    boost = int(waited // aging)
    return min(PRIORITY_LABELS["normal"], base + boost)


class ExecutionQueueManager:
    """Process-local scheduler with optional file-backed hybrid sync."""

    def __init__(
        self,
        *,
        run_store_mount: str | None = None,
        clock: Callable[[], float] | None = None,
        fair_share: FairShareTracker | None = None,
    ) -> None:
        self._run_store_mount = run_store_mount
        self._clock = clock or time.time
        self._fair_share = fair_share or get_fair_share_tracker()
        self._lock = threading.RLock()
        self._cond = threading.Condition(self._lock)
        self._active: dict[str, _ActiveLease] = {}
        self._pending: list[_Waiter] = []
        self._admits = 0
        self._rejects = 0
        self._preempts = 0
        self._wait_ms_total = 0.0
        self._closed = False
        # Detected VRAM budget is cached: detection may shell out to nvidia-smi
        # (seconds) and admission is evaluated often, sometimes under the lock.
        self._vram_budget_cache: tuple[float, float | None] | None = None

    def close(self) -> None:
        with self._lock:
            self._closed = True
            for waiter in list(self._pending):
                waiter.error = "execution queue shutting down"
                waiter.done = True
                waiter.event.set()
            self._pending.clear()
            self._cond.notify_all()

    def _usage(self) -> dict[str, float | int]:
        planning = execution = steps = 0
        vram = cpu = 0.0
        gpu = 0
        # Snapshot under the lock: grants/releases mutate ``_active`` concurrently.
        with self._lock:
            leases = list(self._active.values())
        for lease in leases:
            req = lease.requirements
            vram += req.vram_gb
            cpu += req.cpu_cores
            gpu += req.gpu_slots
            if lease.phase == "planning":
                planning += 1
            elif lease.phase == "execution":
                execution += 1
            else:
                steps += 1
        return {
            "planning": planning,
            "execution": execution,
            "steps": steps,
            "vram_gb": vram,
            "cpu_cores": cpu,
            "gpu_slots": gpu,
        }

    def _host_cpu_ok(self) -> bool:
        threshold = host_headroom_cpu_pct()
        if threshold <= 0:
            return True
        try:
            # Dedicated cached sampler: one cheap /proc read at most every couple
            # of seconds, with its own delta window (does not disturb the
            # metrics stream) and no GPU / jtop / nvidia-smi work.
            from orchestration.host_metrics import cpu_percent_snapshot

            cpu = cpu_percent_snapshot()
            if isinstance(cpu, (int, float)):
                return float(cpu) <= (100.0 - threshold)
        except Exception:  # noqa: BLE001
            pass
        return True

    def _budget_vram_gb(self) -> float | None:
        """VRAM budget; the (possibly slow) hardware detection is cached per manager."""
        if os.getenv("AGENTIC_EXEC_QUEUE_VRAM_GB", "").strip():
            return total_vram_gb()
        now = time.monotonic()
        cached = self._vram_budget_cache
        if cached is not None and now - cached[0] < _VRAM_BUDGET_CACHE_SECONDS:
            return cached[1]
        value = total_vram_gb()
        self._vram_budget_cache = (now, value)
        return value

    def _parent_execution_lease(self, run_id: str) -> _ActiveLease | None:
        """Active execution lease of ``run_id`` (the parent of its step sub-leases)."""
        if not run_id:
            return None
        with self._lock:
            for lease in self._active.values():
                if lease.phase == "execution" and lease.run_id == run_id:
                    return lease
        return None

    def parent_client_id(self, run_id: str) -> tuple[bool, str | None]:
        """``(has_parent_execution_lease, its client_id)`` for a run's step tickets."""
        parent = self._parent_execution_lease(run_id)
        return (parent is not None, parent.client_id if parent is not None else None)

    def _can_admit(self, ticket: StoredTicket, *, ignore_preempt: bool = False) -> bool:
        if ticket.phase == "step" and self._parent_execution_lease(ticket.run_id) is not None:
            # The run's execution lease already reserved CPU/VRAM/GPU for its
            # steps; charging the sub-lease again could make a run unable to
            # admit its own first step.
            return True
        if not self._host_cpu_ok():
            return False
        req = ResourceRequirements(
            phase=ticket.phase,  # type: ignore[arg-type]
            vram_gb=float(ticket.requirements.get("vram_gb") or 0.0),
            cpu_cores=float(ticket.requirements.get("cpu_cores") or 0.0),
            gpu_slots=int(ticket.requirements.get("gpu_slots") or 0),
        )
        usage = self._usage()
        if ticket.phase == "planning":
            if int(usage["planning"]) >= max_planning_slots():
                return False
        elif ticket.phase == "execution":
            if int(usage["execution"]) >= max_execution_slots():
                return False
        budget_vram = self._budget_vram_gb()
        if budget_vram is not None and float(usage["vram_gb"]) + req.vram_gb > budget_vram + 1e-6:
            return False
        if float(usage["cpu_cores"]) + req.cpu_cores > total_cpu_cores() + 1e-6:
            return False
        if int(usage["gpu_slots"]) + req.gpu_slots > max_gpu_runs():
            return False
        return True

    def _active_infos(self) -> list[ActiveLeaseInfo]:
        with self._lock:
            leases = list(self._active.values())
        return [
            ActiveLeaseInfo(
                run_id=lease.run_id,
                ticket_id=lease.ticket_id,
                phase=lease.phase,
                priority=lease.priority,
                started_at=lease.started_at,
                client_id=lease.client_id,
            )
            for lease in leases
        ]

    def _release_lease_obj(self, lease: _ActiveLease) -> None:
        removed = self._active.pop(lease.lease_id, None)
        if removed is None:
            # Already released (cancel / preemption): do not decrement the
            # tenant's counters a second time.
            return
        if removed.parent_lease_id is None:
            self._fair_share.record_active(removed.client_id, phase=removed.phase, delta=-1)

    def _quota_block_reason(self, ticket: StoredTicket, quota: QueueQuota | None) -> str | None:
        """Concurrency-quota reason that blocks granting ``ticket`` right now, else ``None``."""
        if quota is None or not fair_share_enabled():
            return None
        return self._fair_share.check_quota(
            ticket.client_id,
            quota,
            phase=ticket.phase,
            pending_add=False,
        )

    def _grant(self, ticket: StoredTicket) -> _ActiveLease:
        parent = (
            self._parent_execution_lease(ticket.run_id) if ticket.phase == "step" else None
        )
        req = ResourceRequirements(
            phase=ticket.phase,  # type: ignore[arg-type]
            vram_gb=0.0 if parent is not None else float(ticket.requirements.get("vram_gb") or 0.0),
            cpu_cores=(
                0.0 if parent is not None else float(ticket.requirements.get("cpu_cores") or 0.0)
            ),
            gpu_slots=0 if parent is not None else int(ticket.requirements.get("gpu_slots") or 0),
            agent_provider_ids=tuple(ticket.requirements.get("agent_provider_ids") or ()),
        )
        lease_client_id = ticket.client_id or (parent.client_id if parent is not None else None)
        lease_id = uuid.uuid4().hex
        lease = _ActiveLease(
            lease_id=lease_id,
            ticket_id=ticket.ticket_id,
            run_id=ticket.run_id,
            phase=ticket.phase,  # type: ignore[arg-type]
            kind=ticket.kind,  # type: ignore[arg-type]
            priority=ticket.priority,
            started_at=self._clock(),
            requirements=req,
            client_id=lease_client_id,
            step_id=ticket.step_id,
            parent_lease_id=parent.lease_id if parent is not None else None,
        )
        self._active[lease_id] = lease
        if parent is None:
            self._fair_share.record_active(lease_client_id, phase=ticket.phase, delta=1)
        self._admits += 1
        try:
            from orchestration.metrics import record_execution_queue_admit

            record_execution_queue_admit(phase=ticket.phase)
        except Exception:  # noqa: BLE001
            pass
        return lease

    def _sorted_pending(self) -> list[_Waiter]:
        now = self._clock()

        def sort_key(w: _Waiter) -> tuple[int, float]:
            return (-_effective_priority(w.ticket, now=now), w.ticket.enqueued_at)

        return sorted(self._pending, key=sort_key)

    def _position_snapshot(self, waiter: _Waiter) -> WaitSnapshot:
        ordered = self._sorted_pending()
        pos = 1
        for idx, w in enumerate(ordered, start=1):
            if w is waiter:
                pos = idx
                break
        now = self._clock()
        eff = _effective_priority(waiter.ticket, now=now)
        return WaitSnapshot(
            phase=waiter.ticket.phase,  # type: ignore[arg-type]
            position=pos,
            length=len(ordered),
            priority=eff,
            priority_label=waiter.ticket.priority_label,
            elapsed_ms=max(0.0, (now - waiter.ticket.enqueued_at) * 1000.0),
            quota_reason=waiter.quota_reason,
        )

    def _drain(self) -> None:
        while True:
            with self._cond:
                if not self._pending:
                    return
                # Highest-priority waiter whose tenant is not at its concurrency
                # quota (quota is re-checked at grant time, not only at submit).
                head = None
                for candidate in self._sorted_pending():
                    reason = self._quota_block_reason(candidate.ticket, candidate.quota)
                    candidate.quota_reason = reason
                    if reason is None:
                        head = candidate
                        break
                if head is None:
                    return
                ticket = head.ticket
            if not self._can_admit(ticket):
                eff_pri = _effective_priority(ticket, now=self._clock())
                victims = try_preempt_for_admit(
                    self._active_infos(),
                    incoming_priority=eff_pri,
                    release_fn=lambda v: self._release_by_run(v.run_id),
                    fits_after=lambda: self._can_admit(ticket),
                    run_store_mount=self._run_store_mount,
                )
                if victims:
                    with self._cond:
                        self._preempts += len(victims)
                    try:
                        from orchestration.metrics import record_execution_queue_preempt

                        record_execution_queue_preempt()
                    except Exception:  # noqa: BLE001
                        pass
                if not self._can_admit(ticket):
                    return
            with self._cond:
                if head not in self._pending:
                    continue
                # Re-check under the lock: another thread may have granted since
                # the off-lock admission check above.
                if self._quota_block_reason(ticket, head.quota) is not None:
                    continue
                if not self._can_admit(ticket):
                    return
                lease = self._grant(ticket)
                self._pending.remove(head)
                wait_ms = max(0.0, (self._clock() - ticket.enqueued_at) * 1000.0)
                self._wait_ms_total += wait_ms
                head.lease_id = lease.lease_id
                head.done = True
                head.event.set()
                self._fair_share.record_pending(ticket.client_id, delta=-1)
                self._cond.notify_all()
                if queue_backend() in ("file", "hybrid"):
                    write_grant(
                        ticket.ticket_id,
                        {"run_id": ticket.run_id, "lease_id": lease.lease_id},
                        run_store_mount=self._run_store_mount,
                    )

    def _release_by_run(self, run_id: str) -> None:
        with self._cond:
            for lease_id, lease in list(self._active.items()):
                if lease.run_id == run_id:
                    self._release_lease_obj(lease)

    def acquire(
        self,
        ticket: StoredTicket,
        *,
        timeout_seconds: float | None = None,
        on_wait: Callable[[WaitSnapshot], None] | None = None,
        quota: QueueQuota | None = None,
    ) -> _ActiveLease:
        wait_s = wait_seconds() if timeout_seconds is None else float(timeout_seconds)
        deadline = self._clock() + wait_s
        waiter: _Waiter | None = None
        last_emit = 0.0

        def maybe_emit() -> None:
            nonlocal last_emit
            if on_wait is None or waiter is None:
                return
            now = self._clock()
            if now - last_emit < 2.0 and waiter not in self._sorted_pending()[:1]:
                return
            last_emit = now
            on_wait(self._position_snapshot(waiter))

        while True:
            with self._cond:
                if self._closed:
                    raise RuntimeError("execution queue is closed")
                if waiter is not None and waiter.done:
                    if waiter.error:
                        raise RuntimeError(waiter.error)
                    if waiter.lease_id:
                        lease = self._active.get(waiter.lease_id)
                        if lease is not None:
                            return lease

            if fair_share_enabled() and quota is not None:
                reason = self._fair_share.check_quota(
                    ticket.client_id,
                    quota,
                    phase=ticket.phase,
                    pending_add=waiter is None,
                )
                if reason and waiter is None:
                    self._rejects += 1
                    raise QueueQuotaError(f"tenant quota exceeded: {reason}", code=reason)

            with self._cond:
                pending_count = len(self._pending)
            if pending_count == 0 and waiter is None and self._can_admit(ticket):
                eff_pri = _effective_priority(ticket, now=self._clock())
                try_preempt_for_admit(
                    self._active_infos(),
                    incoming_priority=eff_pri,
                    release_fn=lambda v: self._release_by_run(v.run_id),
                    fits_after=lambda: self._can_admit(ticket),
                    run_store_mount=self._run_store_mount,
                )
                if self._can_admit(ticket):
                    with self._cond:
                        if len(self._pending) == 0 and self._can_admit(ticket):
                            # Quota re-check at grant: two requests from one tenant
                            # can both pass the submit-time check above.
                            reason = self._quota_block_reason(ticket, quota)
                            if reason:
                                self._rejects += 1
                                raise QueueQuotaError(
                                    f"tenant quota exceeded: {reason}", code=reason
                                )
                            return self._grant(ticket)

            with self._cond:
                if waiter is None:
                    if len(self._pending) >= queue_max():
                        self._rejects += 1
                        try:
                            from orchestration.metrics import record_execution_queue_reject

                            record_execution_queue_reject(code="queue_full")
                        except Exception:  # noqa: BLE001
                            pass
                        raise QueueFullError(f"execution queue full (max={queue_max()})")
                    waiter = _Waiter(ticket=ticket, quota=quota)
                    self._pending.append(waiter)
                    self._fair_share.record_pending(ticket.client_id, delta=1)

                # Granted by another thread's drain since the check at the top
                # of the loop: return the lease instead of timing out with it live.
                if waiter.done and waiter.lease_id and not waiter.error:
                    granted = self._active.get(waiter.lease_id)
                    if granted is not None:
                        return granted
                remaining = deadline - self._clock()
                if remaining <= 0:
                    if waiter in self._pending:
                        self._pending.remove(waiter)
                        self._fair_share.record_pending(ticket.client_id, delta=-1)
                    self._rejects += 1
                    try:
                        from orchestration.metrics import record_execution_queue_reject

                        record_execution_queue_reject(code="queue_timeout")
                    except Exception:  # noqa: BLE001
                        pass
                    raise QueueTimeoutError(
                        f"timed out after {wait_s:.0f}s waiting for {ticket.phase} slot"
                    )
                maybe_emit()
                self._cond.wait(timeout=min(1.0, remaining))

            if not waiter.done:
                # Re-evaluate admission (and preemption) from the waiting thread:
                # otherwise it only happens on release/cancel, so an urgent
                # ticket behind a long-running low-priority lease never preempts
                # and host-headroom / VRAM changes are never noticed.
                self._drain()

            if waiter.done and waiter.lease_id:
                lease = self._active.get(waiter.lease_id)
                if lease is not None:
                    return lease
            if waiter.done and waiter.error:
                raise RuntimeError(waiter.error)

        raise QueueTimeoutError("unexpected queue wait exit")

    def release(self, lease: _ActiveLease | None) -> None:
        if lease is None:
            return
        with self._cond:
            self._release_lease_obj(lease)
        try:
            clear_grant(lease.ticket_id, run_store_mount=self._run_store_mount)
        except Exception:  # noqa: BLE001
            pass
        self._drain()
        with self._cond:
            self._cond.notify_all()
        self._sync_state()

    def cancel_ticket(self, ticket_id: str) -> bool:
        with self._cond:
            for waiter in list(self._pending):
                if waiter.ticket.ticket_id == ticket_id:
                    self._pending.remove(waiter)
                    self._fair_share.record_pending(waiter.ticket.client_id, delta=-1)
                    waiter.error = "cancelled"
                    waiter.done = True
                    waiter.event.set()
                    self._cond.notify_all()
                    return True
        return False

    def cancel_run(self, run_id: str) -> None:
        with self._cond:
            for waiter in list(self._pending):
                if waiter.ticket.run_id == run_id:
                    self._pending.remove(waiter)
                    self._fair_share.record_pending(waiter.ticket.client_id, delta=-1)
                    waiter.error = "cancelled"
                    waiter.done = True
                    waiter.event.set()
            self._release_by_run(run_id)
            self._cond.notify_all()
        self._drain()

    def _sync_state(self) -> None:
        if queue_backend() == "inprocess":
            return
        usage = self._usage()
        file_steps = 0
        try:
            file_steps = count_pending_tickets("step", run_store_mount=self._run_store_mount)
        except Exception:  # noqa: BLE001
            file_steps = 0
        write_state(
            {
                "active": usage,
                "pending": {
                    "planning": sum(1 for w in self._pending if w.ticket.phase == "planning"),
                    "execution": sum(1 for w in self._pending if w.ticket.phase == "execution"),
                    "steps": sum(1 for w in self._pending if w.ticket.phase == "step") + file_steps,
                },
            },
            run_store_mount=self._run_store_mount,
        )

    def reconcile_file_pending(self) -> None:
        """Hybrid/file mode: recover claims, GC grants, sync state; never invent ghost leases.

        Warm-pool step tickets live under ``pending/step`` and are claimed by workers —
        they must **not** be admitted into in-memory ``_active`` (that created ghost
        ``active.steps`` slots with no Job/pod). Planning/execution file tickets are
        only granted when a matching in-process waiter already owns them.
        """
        if queue_backend() == "inprocess":
            return
        try:
            reclaim_stale_claims(
                "step",
                max_age_seconds=_env_float("AGENTIC_EXEC_QUEUE_CLAIM_STALE_SECONDS", 120.0),
                run_store_mount=self._run_store_mount,
            )
        except Exception:  # noqa: BLE001
            pass
        try:
            clear_stale_grants(
                max_age_seconds=_env_float("AGENTIC_EXEC_QUEUE_GRANT_STALE_SECONDS", 3600.0),
                run_store_mount=self._run_store_mount,
            )
        except Exception:  # noqa: BLE001
            pass

        for phase in ("planning", "execution"):
            pending = list_pending_tickets(phase, run_store_mount=self._run_store_mount)
            for path, stored in pending:
                with self._cond:
                    waiter = next(
                        (w for w in self._pending if w.ticket.ticket_id == stored.ticket_id),
                        None,
                    )
                    if waiter is None:
                        # Orphan file ticket with no in-process waiter — leave on disk.
                        continue
                    if not self._can_admit(stored):
                        continue
                    lease = self._grant(stored)
                    remove_pending(path)
                    write_grant(
                        stored.ticket_id,
                        {"run_id": stored.run_id, "lease_id": lease.lease_id},
                        run_store_mount=self._run_store_mount,
                    )
                    waiter.lease_id = lease.lease_id
                    waiter.done = True
                    waiter.event.set()
                    try:
                        self._pending.remove(waiter)
                        self._fair_share.record_pending(waiter.ticket.client_id, delta=-1)
                    except ValueError:
                        pass
                    self._cond.notify_all()
        self._drain()
        self._sync_state()

    def queue_status(self) -> dict[str, Any]:
        usage = self._usage()
        with self._lock:
            # Prefer live file pending for steps (warm-pool), in-memory for the rest.
            file_steps = 0
            try:
                file_steps = count_pending_tickets("step", run_store_mount=self._run_store_mount)
            except Exception:  # noqa: BLE001
                file_steps = 0
            pending = {
                "planning": sum(1 for w in self._pending if w.ticket.phase == "planning"),
                "execution": sum(1 for w in self._pending if w.ticket.phase == "execution"),
                "steps": sum(1 for w in self._pending if w.ticket.phase == "step") + file_steps,
            }
            return {
                "enabled": execution_queue_enabled(),
                "backend": queue_backend(),
                "pending": pending,
                "active": {
                    "planning": int(usage["planning"]),
                    "execution": int(usage["execution"]),
                    "steps": int(usage["steps"]),
                },
                "budget": {
                    "vramGb": total_vram_gb(),
                    "cpuCores": total_cpu_cores(),
                    "maxGpuRuns": max_gpu_runs(),
                    "maxPlanning": max_planning_slots(),
                    "maxExecution": max_execution_slots(),
                },
                "usage": usage,
                "admits": self._admits,
                "rejects": self._rejects,
                "preempts": self._preempts,
                "waitMsTotal": round(self._wait_ms_total, 1),
                "fileState": read_state(self._run_store_mount),
            }


_manager: ExecutionQueueManager | None = None
_manager_lock = threading.Lock()


def get_execution_queue() -> ExecutionQueueManager:
    global _manager
    with _manager_lock:
        if _manager is None:
            from orchestration.run_store import shared_run_store_mount_path

            _manager = ExecutionQueueManager(run_store_mount=shared_run_store_mount_path())
            # Wipe stale state.json from prior process lives (ghost active slots).
            try:
                _manager.reconcile_file_pending()
            except Exception:  # noqa: BLE001
                try:
                    _manager._sync_state()
                except Exception:  # noqa: BLE001
                    pass
        return _manager


def reset_execution_queue_for_tests() -> None:
    global _manager
    with _manager_lock:
        if _manager is not None:
            _manager.close()
        _manager = None
    reset_fair_share_for_tests()
    reset_preempt_hooks_for_tests()


reset_for_tests = reset_execution_queue_for_tests


def _noop_wait(_: WaitSnapshot) -> None:
    return None


def _make_ticket(
    *,
    run_id: str,
    phase: PhaseKind,
    kind: TicketKind,
    requirements: ResourceRequirements,
    priority: int,
    priority_label: str | None,
    client_id: str | None,
    step_id: str | None = None,
) -> StoredTicket:
    return StoredTicket(
        ticket_id=uuid.uuid4().hex,
        run_id=run_id,
        phase=phase,
        kind=kind,
        priority=priority,
        priority_label=priority_label,
        enqueued_at=time.time(),
        client_id=client_id,
        step_id=step_id,
        requirements={
            "vram_gb": requirements.vram_gb,
            "cpu_cores": requirements.cpu_cores,
            "gpu_slots": requirements.gpu_slots,
            "agent_provider_ids": list(requirements.agent_provider_ids),
        },
    )


def requirements_from_step_spec(spec: Any) -> ResourceRequirements:
    agent_id = str(getattr(spec, "agent_provider", {}).get("id") or "").strip()
    return ResourceRequirements(
        phase="step",
        vram_gb=0.5,
        cpu_cores=0.5,
        gpu_slots=0,
        agent_provider_ids=(agent_id,) if agent_id else (),
    )


def _overlay_queue_policy() -> tuple[int | str | None, int | None, QueueQuota | None]:
    try:
        from orchestration.session_overlay import get_current_overlay

        overlay = get_current_overlay()
    except Exception:  # noqa: BLE001
        overlay = None
    if overlay is None:
        return None, None, None
    default_pri = getattr(overlay, "default_priority", None)
    max_pri = getattr(overlay, "max_queue_priority", None)
    quota = parse_queue_quota(getattr(overlay, "queue_quota", None))
    return default_pri, max_pri, quota


@contextmanager
def acquire_planning(
    *,
    run_id: str,
    priority: str | int | None = None,
    priority_label: str | None = None,
    client_id: str | None = None,
    on_wait: Callable[[WaitSnapshot], None] | None = None,
    timeout_seconds: float | None = None,
) -> Iterator[_ActiveLease | None]:
    if not execution_queue_enabled():
        yield None
        return
    overlay_default, app_max, quota = _overlay_queue_policy()
    pri, label = infer_priority(
        explicit=priority,
        label=priority_label,
        overlay_default=overlay_default,
        app_max=app_max,
    )
    ticket = _make_ticket(
        run_id=run_id,
        phase="planning",
        kind="run_planning",
        requirements=planning_requirements(),
        priority=pri,
        priority_label=label,
        client_id=client_id,
    )
    mgr = get_execution_queue()
    pending_path = None
    if queue_backend() == "file":
        pending_path = submit_pending_ticket(ticket, run_store_mount=mgr._run_store_mount)
    try:
        lease = mgr.acquire(
            ticket,
            timeout_seconds=timeout_seconds,
            on_wait=on_wait or _noop_wait,
            quota=quota,
        )
    finally:
        # Granted (fast path / drain / reconcile), rejected or timed out: the
        # pending file is done either way. Leaving it made the broker re-parse
        # one file per finished run forever.
        if pending_path is not None:
            remove_pending(pending_path)
    try:
        yield lease
    finally:
        mgr.release(lease)


@contextmanager
def acquire_execution(
    *,
    run_id: str,
    requirements: ResourceRequirements,
    priority: str | int | None = None,
    priority_label: str | None = None,
    client_id: str | None = None,
    on_wait: Callable[[WaitSnapshot], None] | None = None,
    timeout_seconds: float | None = None,
) -> Iterator[_ActiveLease | None]:
    if not execution_queue_enabled():
        yield None
        return
    overlay_default, app_max, quota = _overlay_queue_policy()
    pri, label = infer_priority(
        explicit=priority,
        label=priority_label,
        overlay_default=overlay_default,
        app_max=app_max,
    )
    ticket = _make_ticket(
        run_id=run_id,
        phase="execution",
        kind="run_execution",
        requirements=requirements,
        priority=pri,
        priority_label=label,
        client_id=client_id,
    )
    mgr = get_execution_queue()
    lease = mgr.acquire(
        ticket,
        timeout_seconds=timeout_seconds,
        on_wait=on_wait or _noop_wait,
        quota=quota,
    )
    try:
        yield lease
    finally:
        mgr.release(lease)


@contextmanager
def acquire_step(
    *,
    run_id: str,
    step_id: str,
    spec: Any | None = None,
    requirements: ResourceRequirements | None = None,
    priority: str | int | None = None,
    priority_label: str | None = None,
    client_id: str | None = None,
    on_wait: Callable[[WaitSnapshot], None] | None = None,
    timeout_seconds: float | None = None,
) -> Iterator[_ActiveLease | None]:
    if not execution_queue_enabled() or not step_sublease_enabled():
        yield None
        return
    req = requirements or (requirements_from_step_spec(spec) if spec is not None else ResourceRequirements(
        phase="step", vram_gb=0.25, cpu_cores=0.25, gpu_slots=0
    ))
    overlay_default, app_max, quota = _overlay_queue_policy()
    pri, label = infer_priority(
        explicit=priority,
        label=priority_label,
        overlay_default=overlay_default,
        app_max=app_max,
    )
    step_req = ResourceRequirements(
        phase="step",
        vram_gb=req.vram_gb,
        cpu_cores=max(0.1, req.cpu_cores * 0.5),
        gpu_slots=min(1, req.gpu_slots),
        agent_provider_ids=req.agent_provider_ids,
    )
    ticket = _make_ticket(
        run_id=run_id,
        phase="step",
        kind="step",
        requirements=step_req,
        priority=pri,
        priority_label=label,
        client_id=client_id,
        step_id=step_id,
    )
    mgr = get_execution_queue()
    # A step of an already-admitted run is a child of that run's execution
    # lease: it inherits the tenant, is not charged again for CPU/VRAM, and is
    # not a second "concurrent run" for the tenant's quota.
    has_parent, parent_client = mgr.parent_client_id(run_id)
    if has_parent:
        if ticket.client_id is None:
            ticket.client_id = parent_client
        quota = None
    # When unify is on, warm-pool workers claim the ticket written by
    # ``_enqueue_global_step`` (with ``spec_container_path``). Do **not** also
    # submit a bare step ticket here — workers silently deleted those and the
    # real ticket could be stranded / racey.
    pending_path = None
    if (
        queue_backend() in ("file", "hybrid")
        and not unify_warm_pool_enabled()
    ):
        pending_path = submit_pending_ticket(ticket, run_store_mount=mgr._run_store_mount)
    try:
        lease = mgr.acquire(
            ticket,
            timeout_seconds=timeout_seconds,
            on_wait=on_wait or _noop_wait,
            quota=quota,
        )
    finally:
        if pending_path is not None:
            remove_pending(pending_path)
    try:
        yield lease
    finally:
        mgr.release(lease)


def queue_status() -> dict[str, Any]:
    if not execution_queue_enabled():
        return {"enabled": False}
    return get_execution_queue().queue_status()


def cancel_run_queue(run_id: str) -> None:
    """Release queue tickets / leases for a cancelled run."""
    if not execution_queue_enabled():
        return
    get_execution_queue().cancel_run(run_id)


def cancel_run(run_id: str) -> None:
    cancel_run_queue(run_id)


def check_preempted(run_id: str) -> bool:
    from orchestration.run_store import shared_run_store_mount_path

    return poll_preempt_signal(run_id, run_store_mount=shared_run_store_mount_path())


def clear_preempted(run_id: str) -> None:
    """Drop a run's preempt signal once the run has stopped (or is being re-admitted)."""
    from orchestration.run_store import shared_run_store_mount_path

    try:
        clear_preempt_signal(run_id, run_store_mount=shared_run_store_mount_path())
    except Exception:  # noqa: BLE001
        pass


class RunPreemptedError(RuntimeError):
    """Raised when a run notices it was preempted by higher-priority work."""

    code = "preempted"

    def __init__(self, run_id: str = "") -> None:
        super().__init__("preempted")
        self.run_id = run_id


def raise_if_preempted(run_id: str) -> None:
    """Cooperative preemption checkpoint (call between steps / rounds)."""
    if run_id and execution_queue_enabled() and check_preempted(run_id):
        raise RunPreemptedError(run_id)


def run_with_execution_queue(
    *,
    run_id: str,
    priority: str | int | None = None,
    priority_label: str | None = None,
    client_id: str | None = None,
    tenant_id: str | None = None,
    quota: QueueQuota | None = None,
    on_wait: Callable[[WaitSnapshot], None] | None = None,
    plan_fn: Callable[[], Any],
    catalog_entries: list[dict[str, Any]] | None = None,
    exec_requirements_fn: Callable[[Any], ResourceRequirements] | None = None,
    execute_fn: Callable[[Any], Any],
    on_planned: Callable[[Any], None] | None = None,
) -> Any:
    """Two-phase wrapper: planning acquire → plan → execution acquire → execute."""
    from orchestration.hardware_profile import requirements_from_workflow_config

    effective_tenant = tenant_id or client_id
    if quota is None:
        _, _, quota = _overlay_queue_policy()

    def _requirements(config: Any) -> ResourceRequirements:
        if exec_requirements_fn is not None:
            return exec_requirements_fn(config)
        return requirements_from_workflow_config(config, catalog_entries or [])

    if not execution_queue_enabled():
        config = plan_fn()
        if on_planned is not None:
            on_planned(config)
        return execute_fn(config)

    config = None
    # A signal left by an earlier life of this run id must not kill this one.
    clear_preempted(run_id)
    try:
        with acquire_planning(
            run_id=run_id,
            priority=priority,
            priority_label=priority_label,
            client_id=effective_tenant,
            on_wait=on_wait,
        ):
            config = plan_fn()
            if on_planned is not None:
                on_planned(config)
            # Preempted while planning: stop before taking an execution slot.
            raise_if_preempted(run_id)
        req = _requirements(config)
        with acquire_execution(
            run_id=run_id,
            requirements=req,
            priority=priority,
            priority_label=priority_label,
            client_id=effective_tenant,
            on_wait=on_wait,
        ):
            raise_if_preempted(run_id)
            return execute_fn(config)
    finally:
        clear_preempted(run_id)


def run_with_execution_only_queue(
    *,
    run_id: str,
    requirements: ResourceRequirements,
    priority: str | int | None = None,
    priority_label: str | None = None,
    client_id: str | None = None,
    tenant_id: str | None = None,
    quota: QueueQuota | None = None,
    on_wait: Callable[[WaitSnapshot], None] | None = None,
    execute_fn: Callable[[], Any],
) -> Any:
    """Single-phase wrapper: execution acquire → execute (no planning)."""
    if not execution_queue_enabled():
        return execute_fn()

    effective_tenant = tenant_id or client_id
    if quota is None:
        _, _, quota = _overlay_queue_policy()

    clear_preempted(run_id)
    try:
        with acquire_execution(
            run_id=run_id,
            requirements=requirements,
            priority=priority,
            priority_label=priority_label,
            client_id=effective_tenant,
            on_wait=on_wait,
        ):
            raise_if_preempted(run_id)
            return execute_fn()
    finally:
        clear_preempted(run_id)


def resolve_app_max_priority(app_id: str | None) -> int | None:
    try:
        from orchestration.session_overlay import get_current_overlay

        overlay = get_current_overlay()
        if overlay is not None and getattr(overlay, "app_id", None) == app_id:
            return getattr(overlay, "max_queue_priority", None)
    except Exception:  # noqa: BLE001
        pass
    return None


def resolve_default_priority(app_id: str | None) -> int | None:
    try:
        from orchestration.session_overlay import get_current_overlay

        overlay = get_current_overlay()
        if overlay is None:
            return None
        raw = getattr(overlay, "default_priority", None)
        if raw is None:
            return None
        pri, _ = normalize_priority(raw)
        return pri
    except Exception:  # noqa: BLE001
        return None


def resolve_tenant_id(*, app_id: str | None, user_id: str | None) -> str | None:
    if app_id:
        return str(app_id)
    if user_id:
        return str(user_id)
    return None


def resolve_tenant_quota(app_id: str | None, user_id: str | None) -> QueueQuota | None:
    try:
        from orchestration.session_overlay import get_current_overlay

        overlay = get_current_overlay()
    except Exception:  # noqa: BLE001
        overlay = None
    if overlay is None:
        return None
    return parse_queue_quota(getattr(overlay, "queue_quota", None))


