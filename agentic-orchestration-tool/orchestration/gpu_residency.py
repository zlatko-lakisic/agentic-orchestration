"""Cross-provider GPU residency: on-demand leases, idle unload, /api/ps-like report.

Extends the Ollama-only broker model (#121) so TTS, STT, and video_generation
share admission against ``min_vram_gb``, never evict an active lease, and appear
in one memory report next to Ollama ``/api/ps`` residents.
"""

from __future__ import annotations

import os
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

__all__ = [
    "GpuResidencyError",
    "GpuLease",
    "gpu_residency_enabled",
    "get_gpu_residency_manager",
    "reset_gpu_residency_manager_for_tests",
    "residency_lease_for_entry",
]


class GpuResidencyError(RuntimeError):
    """Admission rejected or timed out."""


def _env_truthy(name: str, *, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    return str(raw).strip().lower() not in ("0", "false", "no", "off")


def gpu_residency_enabled() -> bool:
    """On by default; set ``AGENTIC_GPU_RESIDENCY=0`` to disable engine-side leases."""
    return _env_truthy("AGENTIC_GPU_RESIDENCY", default=True)


def idle_unload_seconds() -> float:
    raw = os.getenv("AGENTIC_GPU_RESIDENCY_IDLE_SECONDS", "").strip()
    if not raw:
        raw = os.getenv("AGENTIC_OLLAMA_IDLE_UNLOAD_SECONDS", "120").strip() or "120"
    try:
        value = float(raw)
    except ValueError:
        value = 120.0
    return max(5.0, min(value, 86_400.0))


def queue_wait_seconds() -> float:
    raw = os.getenv("AGENTIC_GPU_RESIDENCY_QUEUE_WAIT_SECONDS", "600").strip() or "600"
    try:
        value = float(raw)
    except ValueError:
        value = 600.0
    return max(1.0, min(value, 7_200.0))


#: How often a queued GPU waiter re-runs admission while it waits.
_WAIT_REPOLL_SECONDS = 2.0


def _iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


@dataclass
class GpuLease:
    id: str
    provider_id: str
    kind: str
    min_vram_gb: float
    acquired_at: float


@dataclass
class _Resident:
    provider_id: str
    kind: str
    model: str
    min_vram_gb: float
    active: int = 0
    loaded_at: float = field(default_factory=time.time)
    last_used_at: float = field(default_factory=time.time)
    measured_vram_gb: float | None = None
    unload: Callable[[], None] | None = None
    #: Set (under the manager lock) while the unload callback runs, so the
    #: resident cannot be granted a new lease mid-unload.
    unloading: bool = False


@dataclass
class _Waiter:
    id: str
    provider_id: str
    kind: str
    min_vram_gb: float
    model: str
    event: threading.Event = field(default_factory=threading.Event)
    enqueued_at: float = field(default_factory=time.time)
    done: bool = False
    error: str | None = None
    lease: GpuLease | None = None
    unload: Callable[[], None] | None = None


class GpuResidencyManager:
    """Process-local admission for non-Ollama GPU providers (+ Ollama eviction hook)."""

    def __init__(self, *, clock: Callable[[], float] | None = None) -> None:
        self._clock = clock or time.time
        self._lock = threading.RLock()
        self._cond = threading.Condition(self._lock)
        self._residents: dict[str, _Resident] = {}
        self._queue: list[_Waiter] = []
        self._admits = 0
        self._rejects = 0
        self._evictions = 0
        self._last_error: str | None = None
        self._idle_timer: threading.Timer | None = None
        self._closed = False

    def close(self) -> None:
        with self._lock:
            self._closed = True
            if self._idle_timer is not None:
                self._idle_timer.cancel()
                self._idle_timer = None
            for waiter in list(self._queue):
                waiter.error = "gpu residency shutting down"
                waiter.done = True
                waiter.event.set()
            self._queue.clear()
            self._cond.notify_all()

    def start_idle_reconciler(self) -> None:
        with self._lock:
            if self._idle_timer is not None or self._closed:
                return

        interval = min(30.0, max(5.0, idle_unload_seconds() / 4.0))

        def tick() -> None:
            if self._closed:
                return
            try:
                self.reconcile_idle()
            except Exception as exc:  # noqa: BLE001
                self._last_error = f"idle reconcile: {exc}"
            finally:
                with self._lock:
                    if self._closed:
                        return
                    self._idle_timer = threading.Timer(interval, tick)
                    self._idle_timer.daemon = True
                    self._idle_timer.start()

        tick()

    def stop_idle_reconciler(self) -> None:
        with self._lock:
            if self._idle_timer is not None:
                self._idle_timer.cancel()
                self._idle_timer = None

    def _vram_budget_gb(self) -> float | None:
        from orchestration.hardware_profile import detect_vram_gb_available, _resident_headroom_gb

        available = detect_vram_gb_available()
        if available is None:
            return None
        return max(0.0, float(available) - _resident_headroom_gb())

    def _ollama_used_gb(self) -> float:
        try:
            from orchestration.ollama_resource_manager import (
                get_resource_manager,
                resource_sharing_enabled,
            )

            if not resource_sharing_enabled():
                return 0.0
            mgr = get_resource_manager()
            loaded = mgr.list_loaded_models()
            used = 0.0
            for item in loaded:
                size = item.get("sizeVramGb")
                if isinstance(size, (int, float)) and size > 0:
                    used += float(size)
            return used
        except Exception:  # noqa: BLE001
            return 0.0

    def _provider_used_gb(self, *, excluding: str | None = None) -> float:
        used = 0.0
        for key, res in self._residents.items():
            if excluding and key == excluding.casefold():
                continue
            if res.measured_vram_gb is not None and res.measured_vram_gb > 0:
                used += float(res.measured_vram_gb)
            else:
                used += max(0.0, float(res.min_vram_gb))
        return used

    def _fits(self, need_gb: float, *, excluding: str | None = None) -> bool:
        budget = self._vram_budget_gb()
        if budget is None:
            # Unknown budget: only one non-Ollama resident family at a time when empty of actives.
            with self._lock:
                actives = [r for r in self._residents.values() if r.active > 0]
            return not actives
        used = self._provider_used_gb(excluding=excluding) + self._ollama_used_gb()
        return used + need_gb <= budget + 1e-6

    def _evict_idle_ollama(self) -> int:
        """Ask the Ollama broker to unload idle models. Returns unload count."""
        try:
            from orchestration.ollama_resource_manager import (
                get_resource_manager,
                resource_sharing_enabled,
            )

            if not resource_sharing_enabled():
                return 0
            mgr = get_resource_manager()
            before = {x.get("name") for x in mgr.list_loaded_models()}
            unloaded = mgr.reconcile_idle()
            # Also force-evict for pressure: unload all idle loaded models.
            loaded = mgr.list_loaded_models()
            for item in loaded:
                name = str(item.get("name") or "")
                if name:
                    mgr.unload_model(name)
            after = {x.get("name") for x in mgr.list_loaded_models()}
            n = len(before - after) + len(unloaded or [])
            if n:
                with self._lock:
                    self._evictions += n
            return n
        except Exception as exc:  # noqa: BLE001
            self._last_error = f"ollama evict: {exc}"
            return 0

    def _evict_idle_providers(self, *, need_gb: float) -> None:
        """Unload idle non-Ollama residents (oldest first) until ``need_gb`` fits."""
        for _ in range(16):
            if self._fits(need_gb):
                return
            with self._lock:
                idle = [
                    (r.last_used_at, key, r)
                    for key, r in self._residents.items()
                    if r.active <= 0 and not r.unloading
                ]
                idle.sort(key=lambda row: row[0])
            if not idle:
                self._evict_idle_ollama()
                return
            _, key, res = idle[0]
            self._unload_resident(key, res)

    def _unload_resident(self, key: str, res: _Resident) -> bool:
        """Unload an idle resident. Returns ``False`` when it is no longer idle.

        The victim was picked earlier under the lock; re-verify under the lock
        that it is still the registered, idle resident and mark it
        ``unloading`` so a concurrent "already resident" grant cannot make it
        active while its weights are being dropped.
        """
        with self._lock:
            current = self._residents.get(key)
            if current is not res or res.active > 0 or res.unloading:
                return False
            res.unloading = True
        cb = res.unload
        try:
            if cb is not None:
                cb()
        except Exception as exc:  # noqa: BLE001
            self._last_error = f"unload {res.provider_id}: {exc}"
        with self._lock:
            if self._residents.get(key) is res:
                self._residents.pop(key, None)
            self._evictions += 1
            self._cond.notify_all()
        return True

    def acquire(
        self,
        *,
        provider_id: str,
        kind: str,
        min_vram_gb: float,
        model: str | None = None,
        unload: Callable[[], None] | None = None,
        measured_vram_gb: float | None = None,
    ) -> GpuLease:
        """Block until a lease is granted or raise ``GpuResidencyError``."""
        if not gpu_residency_enabled():
            return GpuLease(
                id=uuid.uuid4().hex,
                provider_id=provider_id,
                kind=kind,
                min_vram_gb=float(min_vram_gb),
                acquired_at=self._clock(),
            )
        pid = str(provider_id or "").strip()
        if not pid:
            raise GpuResidencyError("provider_id required")
        need = max(0.1, float(min_vram_gb or 1.0))
        kind_n = str(kind or "other").strip().lower() or "other"
        model_n = str(model or pid).strip() or pid
        key = pid.casefold()

        waiter = _Waiter(
            id=uuid.uuid4().hex,
            provider_id=pid,
            kind=kind_n,
            min_vram_gb=need,
            model=model_n,
            unload=unload,
        )
        with self._cond:
            if self._closed:
                raise GpuResidencyError("gpu residency shutting down")
            self._queue.append(waiter)
            self._cond.notify_all()
        self._drain_queue()
        # Re-evaluate periodically while waiting: VRAM can free up without any
        # GPU lease being released here (Ollama unloading a model, an idle
        # unload finishing), and nothing else would wake this waiter.
        deadline = time.monotonic() + queue_wait_seconds()
        while not waiter.event.wait(
            timeout=max(0.05, min(_WAIT_REPOLL_SECONDS, deadline - time.monotonic()))
        ):
            if time.monotonic() >= deadline:
                with self._cond:
                    if waiter.done:
                        # Granted (or failed) right at the deadline.
                        break
                    if waiter in self._queue:
                        self._queue.remove(waiter)
                    self._rejects += 1
                raise GpuResidencyError(f"timed out waiting for GPU lease ({pid})")
            self._drain_queue()
        if waiter.error:
            with self._lock:
                self._rejects += 1
            raise GpuResidencyError(waiter.error)
        assert waiter.lease is not None
        if measured_vram_gb is not None:
            with self._lock:
                res = self._residents.get(key)
                if res is not None:
                    res.measured_vram_gb = float(measured_vram_gb)
        return waiter.lease

    def release(self, lease: GpuLease | None) -> None:
        if lease is None or not gpu_residency_enabled():
            return
        key = lease.provider_id.casefold()
        with self._cond:
            res = self._residents.get(key)
            if res is None:
                return
            res.active = max(0, int(res.active) - 1)
            res.last_used_at = self._clock()
            self._cond.notify_all()
        self._drain_queue()

    def _grant(self, waiter: _Waiter) -> None:
        key = waiter.provider_id.casefold()
        now = self._clock()
        res = self._residents.get(key)
        if res is None:
            res = _Resident(
                provider_id=waiter.provider_id,
                kind=waiter.kind,
                model=waiter.model,
                min_vram_gb=waiter.min_vram_gb,
                loaded_at=now,
                last_used_at=now,
                unload=waiter.unload,
            )
            self._residents[key] = res
        else:
            res.min_vram_gb = max(res.min_vram_gb, waiter.min_vram_gb)
            if waiter.unload is not None:
                res.unload = waiter.unload
            res.last_used_at = now
        res.active += 1
        lease = GpuLease(
            id=uuid.uuid4().hex,
            provider_id=waiter.provider_id,
            kind=waiter.kind,
            min_vram_gb=waiter.min_vram_gb,
            acquired_at=now,
        )
        waiter.lease = lease
        waiter.done = True
        self._admits += 1
        waiter.event.set()

    def _drain_queue(self) -> None:
        with self._cond:
            if not self._queue:
                return
            pending = list(self._queue)
        for waiter in pending:
            need = waiter.min_vram_gb
            key = waiter.provider_id.casefold()
            with self._lock:
                already = self._residents.get(key)
            if already is not None:
                with self._cond:
                    current = self._residents.get(key)
                    if current is None or current.unloading:
                        # Being unloaded right now: wait for the next drain
                        # (after the unload) instead of leasing vanishing weights.
                        continue
                    if waiter in self._queue:
                        self._queue.remove(waiter)
                        self._grant(waiter)
                continue
            if not self._fits(need):
                self._evict_idle_providers(need_gb=need)
                self._evict_idle_ollama()
            if not self._fits(need):
                continue
            with self._cond:
                if waiter in self._queue:
                    self._queue.remove(waiter)
                    self._grant(waiter)

    def reconcile_idle(self) -> list[str]:
        now = self._clock()
        timeout = idle_unload_seconds()
        unloaded: list[str] = []
        with self._lock:
            victims = [
                (key, res)
                for key, res in self._residents.items()
                if res.active <= 0 and (now - res.last_used_at) >= timeout
            ]
        for key, res in victims:
            if self._unload_resident(key, res):
                unloaded.append(res.provider_id)
        # Idle tick: give queued waiters a chance even when no GPU lease was
        # released (e.g. Ollama freed VRAM on its own).
        with self._lock:
            has_waiters = bool(self._queue)
        if has_waiters:
            self._drain_queue()
        return unloaded

    def note_measured_vram(self, provider_id: str, vram_gb: float | None) -> None:
        if vram_gb is None:
            return
        key = str(provider_id or "").strip().casefold()
        with self._lock:
            res = self._residents.get(key)
            if res is not None:
                res.measured_vram_gb = float(vram_gb)
                if res.min_vram_gb > 0 and float(vram_gb) > res.min_vram_gb * 1.25:
                    self._last_error = (
                        f"{res.provider_id} measured {vram_gb:.2f} GiB "
                        f"> min_vram_gb {res.min_vram_gb:.2f}"
                    )

    def report(self) -> dict[str, Any]:
        """``/api/ps``-like snapshot across Ollama + managed GPU providers."""
        now = self._clock()
        entries: list[dict[str, Any]] = []
        # Ollama residents
        try:
            from orchestration.ollama_resource_manager import (
                get_resource_manager,
                resource_sharing_enabled,
            )

            if resource_sharing_enabled():
                mgr = get_resource_manager()
                status = mgr.local_status()
                active_models = {
                    str(m).casefold()
                    for m, n in (status.get("active") or {}).items()
                    if int(n or 0) > 0
                }
                for item in mgr.list_loaded_models():
                    name = str(item.get("name") or "")
                    key = name.casefold()
                    state = "active" if key in active_models else "idle"
                    entries.append(
                        {
                            "providerId": f"ollama:{name}",
                            "model": name,
                            "kind": "llm",
                            "state": state,
                            "vramBytes": (
                                int(float(item["sizeVramGb"]) * (1024**3))
                                if isinstance(item.get("sizeVramGb"), (int, float))
                                else None
                            ),
                            "ramBytes": None,
                            "loadedAt": None,
                            "lastUsedAt": None,
                            "expiresAt": None,
                        }
                    )
        except Exception as exc:  # noqa: BLE001
            self._last_error = f"ollama report: {exc}"

        timeout = idle_unload_seconds()
        with self._lock:
            for res in self._residents.values():
                if res.active > 0:
                    state = "active"
                else:
                    state = "idle"
                vram_gb = (
                    res.measured_vram_gb
                    if res.measured_vram_gb is not None
                    else res.min_vram_gb
                )
                expires = res.last_used_at + timeout if res.active <= 0 else None
                entries.append(
                    {
                        "providerId": res.provider_id,
                        "model": res.model,
                        "kind": res.kind,
                        "state": state,
                        "vramBytes": int(float(vram_gb) * (1024**3)) if vram_gb else None,
                        "ramBytes": None,
                        "loadedAt": _iso(res.loaded_at),
                        "lastUsedAt": _iso(res.last_used_at),
                        "expiresAt": _iso(expires) if expires else None,
                    }
                )
            admits, rejects, evictions = self._admits, self._rejects, self._evictions
            queue_depth = len(self._queue)
            last_error = self._last_error

        # ComfyUI CUDA/RAM sample: refresh active video rows mid-run, else append idle.
        try:
            from orchestration.video_generation_runtime import probe_comfyui_idle_cuda

            probe = probe_comfyui_idle_cuda()
        except Exception as exc:  # noqa: BLE001
            probe = None
            last_error = f"comfyui idle: {exc}"
        if probe is not None:
            video_idxs = [
                i
                for i, e in enumerate(entries)
                if str(e.get("kind") or "") == "video"
            ]
            if video_idxs:
                for i in video_idxs:
                    if probe.get("vramBytes") is not None:
                        entries[i]["vramBytes"] = probe["vramBytes"]
                    if probe.get("ramBytes") is not None:
                        entries[i]["ramBytes"] = probe["ramBytes"]
                    if probe.get("state") == "unreachable":
                        entries[i]["state"] = "unreachable"
                        if probe.get("error"):
                            entries[i]["error"] = probe["error"]
            else:
                entries.append(probe)

        return {
            "ok": True,
            "enabled": gpu_residency_enabled(),
            "generatedAt": _iso(now),
            "budgetGb": self._vram_budget_gb(),
            "models": entries,
            "stats": {
                "admits": admits,
                "rejects": rejects,
                "evictions": evictions,
                "queueDepth": queue_depth,
            },
            "lastError": last_error,
        }


_MANAGER: GpuResidencyManager | None = None
_MANAGER_LOCK = threading.Lock()


def get_gpu_residency_manager() -> GpuResidencyManager:
    global _MANAGER
    with _MANAGER_LOCK:
        if _MANAGER is None:
            _MANAGER = GpuResidencyManager()
            if gpu_residency_enabled():
                _MANAGER.start_idle_reconciler()
        return _MANAGER


def reset_gpu_residency_manager_for_tests() -> None:
    global _MANAGER
    with _MANAGER_LOCK:
        if _MANAGER is not None:
            _MANAGER.close()
        _MANAGER = None


def _entry_min_vram_gb(entry: dict[str, Any]) -> float:
    from orchestration.hardware_profile import effective_min_vram_gb

    val = effective_min_vram_gb(entry)
    if val is None:
        opts = entry.get("provider_options")
        if isinstance(opts, dict) and opts.get("min_vram_gb") is not None:
            try:
                return float(opts["min_vram_gb"])
            except (TypeError, ValueError):
                pass
        raw = entry.get("min_vram_gb")
        try:
            return float(raw) if raw is not None else 1.0
        except (TypeError, ValueError):
            return 1.0
    return float(val)


def residency_lease_for_entry(
    entry: dict[str, Any],
    *,
    kind: str,
    unload: Callable[[], None] | None = None,
) -> GpuLease | None:
    """Acquire a lease when ``residency`` is on_demand (or unset for speech/video)."""
    if not gpu_residency_enabled():
        return None
    opts = entry.get("provider_options") if isinstance(entry.get("provider_options"), dict) else {}
    residency = str(
        entry.get("residency") or opts.get("residency") or "on_demand"
    ).strip().lower()
    if residency in ("always", "resident", "pinned"):
        return None
    pid = str(entry.get("id") or "").strip()
    if not pid:
        return None
    mgr = get_gpu_residency_manager()
    return mgr.acquire(
        provider_id=pid,
        kind=kind,
        min_vram_gb=_entry_min_vram_gb(entry),
        model=str(entry.get("model") or opts.get("engine") or pid),
        unload=unload,
    )
