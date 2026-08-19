"""Per-tenant fair-share quotas for the global execution queue."""

from __future__ import annotations

import os
import threading
from dataclasses import dataclass, field
from typing import Any


def fair_share_enabled() -> bool:
    raw = os.getenv("AGENTIC_EXEC_QUEUE_FAIR_SHARE_ENABLED", "1").strip().lower()
    return raw not in ("0", "false", "no", "off")


@dataclass(frozen=True)
class QueueQuota:
    max_concurrent_runs: int | None = None
    max_queued_runs: int | None = None
    max_concurrent_planning: int | None = None
    weight: float = 1.0


def parse_queue_quota(raw: Any) -> QueueQuota | None:
    if not isinstance(raw, dict):
        return None
    def _int(key: str) -> int | None:
        val = raw.get(key)
        if val is None:
            return None
        try:
            return max(0, int(val))
        except (TypeError, ValueError):
            return None

    weight_raw = raw.get("weight", 1.0)
    try:
        weight = float(weight_raw)
    except (TypeError, ValueError):
        weight = 1.0
    weight = max(0.1, min(weight, 100.0))
    return QueueQuota(
        max_concurrent_runs=_int("maxConcurrentRuns"),
        max_queued_runs=_int("maxQueuedRuns"),
        max_concurrent_planning=_int("maxConcurrentPlanning"),
        weight=weight,
    )


# Alias for callers expecting TenantQuota naming.
TenantQuota = QueueQuota


@dataclass
class _TenantCounts:
    active_runs: int = 0
    active_planning: int = 0
    pending_runs: int = 0


class FairShareTracker:
    """Track per-tenant active + pending counts for quota enforcement."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._counts: dict[str, _TenantCounts] = {}
        self._last_admit_index: dict[int, int] = {}

    def _bucket(self, tenant_id: str | None) -> _TenantCounts:
        key = str(tenant_id or "").strip() or "__default__"
        if key not in self._counts:
            self._counts[key] = _TenantCounts()
        return self._counts[key]

    def record_active(
        self,
        tenant_id: str | None,
        *,
        phase: str,
        delta: int,
    ) -> None:
        with self._lock:
            b = self._bucket(tenant_id)
            if phase == "planning":
                b.active_planning = max(0, b.active_planning + delta)
            else:
                b.active_runs = max(0, b.active_runs + delta)

    def record_pending(self, tenant_id: str | None, *, delta: int) -> None:
        with self._lock:
            b = self._bucket(tenant_id)
            b.pending_runs = max(0, b.pending_runs + delta)

    def tenant_snapshot(self, tenant_id: str | None) -> dict[str, int]:
        with self._lock:
            b = self._bucket(tenant_id)
            return {
                "tenantActive": b.active_runs,
                "tenantPlanning": b.active_planning,
                "tenantQueued": b.pending_runs,
            }

    def check_quota(
        self,
        tenant_id: str | None,
        quota: QueueQuota | None,
        *,
        phase: str,
        pending_add: bool = False,
    ) -> str | None:
        """Return a quota reason code when blocked, else None."""
        if not fair_share_enabled() or quota is None:
            return None
        with self._lock:
            b = self._bucket(tenant_id)
            if pending_add and quota.max_queued_runs is not None:
                if b.pending_runs >= quota.max_queued_runs:
                    return "quota_queue_full"
            if phase == "planning" and quota.max_concurrent_planning is not None:
                if b.active_planning >= quota.max_concurrent_planning:
                    return "quota_concurrent_planning"
            if phase in ("execution", "step") and quota.max_concurrent_runs is not None:
                if b.active_runs >= quota.max_concurrent_runs:
                    return "quota_concurrent"
        return None

    def pick_weighted(
        self,
        candidates: list[tuple[str, float]],
        *,
        priority: int,
    ) -> int:
        """Round-robin among tenants at the same priority tier (returns index)."""
        if len(candidates) <= 1:
            return 0
        with self._lock:
            idx = self._last_admit_index.get(priority, -1) + 1
            if idx >= len(candidates):
                idx = 0
            self._last_admit_index[priority] = idx
        return idx


_tracker: FairShareTracker | None = None
_tracker_lock = threading.Lock()


def get_fair_share_tracker() -> FairShareTracker:
    global _tracker
    with _tracker_lock:
        if _tracker is None:
            _tracker = FairShareTracker()
        return _tracker


def reset_fair_share_for_tests() -> None:
    global _tracker
    with _tracker_lock:
        _tracker = None
