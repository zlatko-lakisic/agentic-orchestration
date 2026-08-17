"""VRAM-aware Ollama model admission, idle unload, and FIFO wait queue.

Used by the transparent HTTP broker (``ollama_resource_broker``) so every AO
route that talks to Ollama shares one residency policy: never evict an active
model; unload idle models when pressure or idle timeout requires it.
"""

from __future__ import annotations

import os
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

import httpx

#: Paths that need a model lease before proxying to upstream Ollama.
INFERENCE_PATHS = frozenset(
    {
        "/api/generate",
        "/api/chat",
        "/api/embed",
        "/api/embeddings",
        "/v1/chat/completions",
        "/v1/completions",
        "/v1/embeddings",
    }
)


def _env_truthy(name: str, *, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    return str(raw).strip().lower() not in ("0", "false", "no", "off")


def resource_sharing_enabled() -> bool:
    return _env_truthy("AGENTIC_OLLAMA_RESOURCE_SHARING", default=False)


def normalize_model_tag(raw: str | None) -> str:
    text = str(raw or "").strip()
    if not text:
        return ""
    lower = text.lower()
    if lower.startswith("ollama/"):
        return text[len("ollama/") :].strip()
    if lower.startswith("ollama:"):
        return text[len("ollama:") :].strip()
    return text


def resolve_upstream_base() -> str:
    """Daemon behind the broker (never the broker listen address)."""
    raw = (
        os.getenv("AGENTIC_OLLAMA_UPSTREAM", "").strip()
        or os.getenv("AGENTIC_OLLAMA_DAEMON_BASE", "").strip()
        or "http://127.0.0.1:11435"
    )
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw.rstrip("/")
    return f"http://{raw.rstrip('/')}"


def idle_unload_seconds() -> float:
    raw = os.getenv("AGENTIC_OLLAMA_IDLE_UNLOAD_SECONDS", "120").strip() or "120"
    try:
        value = float(raw)
    except ValueError:
        value = 120.0
    return max(5.0, min(value, 86_400.0))


def queue_wait_seconds() -> float:
    raw = os.getenv("AGENTIC_OLLAMA_QUEUE_WAIT_SECONDS", "600").strip() or "600"
    try:
        value = float(raw)
    except ValueError:
        value = 600.0
    return max(1.0, min(value, 7_200.0))


def queue_max() -> int:
    raw = os.getenv("AGENTIC_OLLAMA_QUEUE_MAX", "32").strip() or "32"
    try:
        value = int(raw)
    except ValueError:
        value = 32
    return max(1, min(value, 256))


def broker_listen_host() -> str:
    return os.getenv("AGENTIC_OLLAMA_BROKER_HOST", "0.0.0.0").strip() or "0.0.0.0"


def broker_listen_port() -> int:
    raw = os.getenv("AGENTIC_OLLAMA_BROKER_PORT", "11434").strip() or "11434"
    try:
        return max(1, min(int(raw), 65535))
    except ValueError:
        return 11434


def estimate_model_vram_gb(model: str) -> float | None:
    """Catalog heuristic for a bare Ollama tag (no provider YAML required)."""
    from orchestration.hardware_profile import _heuristic_min_vram_gb_for_ollama_model

    return _heuristic_min_vram_gb_for_ollama_model(normalize_model_tag(model))


@dataclass
class _Lease:
    id: str
    model: str
    acquired_at: float


@dataclass
class _Waiter:
    id: str
    model: str
    event: threading.Event = field(default_factory=threading.Event)
    enqueued_at: float = field(default_factory=time.time)
    done: bool = False
    error: str | None = None
    lease: _Lease | None = None


class OllamaResourceManager:
    """Process-local admission control for one upstream Ollama daemon."""

    def __init__(
        self,
        *,
        upstream_base: str | None = None,
        http_client: httpx.Client | None = None,
        clock: Callable[[], float] | None = None,
    ) -> None:
        self.upstream_base = (upstream_base or resolve_upstream_base()).rstrip("/")
        self._client = http_client
        self._owns_client = http_client is None
        self._clock = clock or time.time
        self._lock = threading.RLock()
        self._cond = threading.Condition(self._lock)
        self._active: dict[str, int] = {}
        self._last_used: dict[str, float] = {}
        self._queue: list[_Waiter] = []
        self._evictions = 0
        self._admits = 0
        self._rejects = 0
        self._wait_ms_total = 0.0
        self._last_error: str | None = None
        self._idle_timer: threading.Timer | None = None
        self._closed = False

    def _http(self) -> httpx.Client:
        if self._client is None:
            self._client = httpx.Client(timeout=120.0)
        return self._client

    def close(self) -> None:
        with self._lock:
            self._closed = True
            if self._idle_timer is not None:
                self._idle_timer.cancel()
                self._idle_timer = None
            for waiter in list(self._queue):
                waiter.error = "broker shutting down"
                waiter.done = True
                waiter.event.set()
            self._queue.clear()
            self._cond.notify_all()
        if self._owns_client and self._client is not None:
            self._client.close()
            self._client = None

    def start_idle_reconciler(self) -> None:
        """Background loop that unloads models idle longer than the configured timeout."""
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

    # --- upstream introspection -------------------------------------------------

    def list_loaded_models(self) -> list[dict[str, Any]]:
        """Return Ollama ``/api/ps`` models (empty list when unreachable)."""
        try:
            res = self._http().get(f"{self.upstream_base}/api/ps")
            if not res.is_success:
                return []
            data = res.json()
        except (httpx.HTTPError, ValueError, TypeError):
            return []
        models = data.get("models") if isinstance(data, dict) else None
        if not isinstance(models, list):
            return []
        out: list[dict[str, Any]] = []
        for item in models:
            if not isinstance(item, dict):
                continue
            name = normalize_model_tag(
                str(item.get("name") or item.get("model") or "")
            )
            if not name:
                continue
            size_vram = item.get("size_vram")
            try:
                size_gb = float(size_vram) / (1024.0**3) if size_vram is not None else None
            except (TypeError, ValueError):
                size_gb = None
            out.append(
                {
                    "name": name,
                    "sizeVramGb": round(size_gb, 3) if size_gb is not None else None,
                    "raw": item,
                }
            )
        return out

    def _vram_budget_gb(self) -> float | None:
        from orchestration.hardware_profile import detect_vram_gb_available, _resident_headroom_gb

        available = detect_vram_gb_available()
        if available is None:
            return None
        return max(0.0, float(available) - _resident_headroom_gb())

    def _model_need_gb(self, model: str, loaded: list[dict[str, Any]]) -> float:
        key = normalize_model_tag(model).casefold()
        for item in loaded:
            if str(item.get("name") or "").casefold() == key:
                size = item.get("sizeVramGb")
                if isinstance(size, (int, float)) and size > 0:
                    return float(size)
        estimated = estimate_model_vram_gb(model)
        if estimated is not None and estimated > 0:
            return float(estimated)
        # Unknown size: treat as the whole budget so only one model family fits.
        budget = self._vram_budget_gb()
        if budget is not None and budget > 0:
            return budget
        return 8.0

    def _active_models(self) -> set[str]:
        return {m for m, n in self._active.items() if n > 0}

    def _resident_used_gb(
        self,
        loaded: list[dict[str, Any]],
        *,
        excluding: set[str] | None = None,
    ) -> float:
        skip = {normalize_model_tag(x).casefold() for x in (excluding or set())}
        used = 0.0
        seen: set[str] = set()
        for item in loaded:
            name = normalize_model_tag(str(item.get("name") or ""))
            key = name.casefold()
            if not key or key in skip or key in seen:
                continue
            seen.add(key)
            size = item.get("sizeVramGb")
            if isinstance(size, (int, float)) and size > 0:
                used += float(size)
            else:
                used += self._model_need_gb(name, loaded)
        return used

    def _fits_with_current_residents(
        self, model: str, loaded: list[dict[str, Any]]
    ) -> bool:
        """True when ``model`` fits alongside currently loaded models (no eviction)."""
        tag = normalize_model_tag(model)
        key = tag.casefold()
        loaded_keys = {
            normalize_model_tag(str(x.get("name") or "")).casefold() for x in loaded
        }
        if key in loaded_keys:
            return True
        budget = self._vram_budget_gb()
        need = self._model_need_gb(tag, loaded)
        used = self._resident_used_gb(loaded)
        if budget is None:
            return not loaded_keys
        return used + need <= budget + 1e-6

    def can_admit(self, model: str, *, loaded: list[dict[str, Any]] | None = None) -> bool:
        """True when ``model`` can run without evicting an active request's model."""
        tag = normalize_model_tag(model)
        if not tag:
            return False
        loaded = list(loaded) if loaded is not None else self.list_loaded_models()
        key = tag.casefold()
        loaded_keys = {normalize_model_tag(str(x.get("name") or "")).casefold() for x in loaded}
        if key in loaded_keys:
            return True

        budget = self._vram_budget_gb()
        need = self._model_need_gb(tag, loaded)
        with self._lock:
            active = {a.casefold() for a in self._active_models()}
        # Evict only idle loaded models when checking fit.
        idle_keys = {
            normalize_model_tag(str(x.get("name") or "")).casefold()
            for x in loaded
            if normalize_model_tag(str(x.get("name") or "")).casefold() not in active
        }
        used_without_idle = self._resident_used_gb(loaded, excluding=idle_keys)
        if budget is None:
            # Unknown budget: one local model family at a time.
            remaining_active_or_loaded = {
                normalize_model_tag(str(x.get("name") or "")).casefold()
                for x in loaded
                if normalize_model_tag(str(x.get("name") or "")).casefold() not in idle_keys
            }
            remaining_active_or_loaded |= active
            return not remaining_active_or_loaded or key in remaining_active_or_loaded
        return used_without_idle + need <= budget + 1e-6

    def unload_model(self, model: str) -> bool:
        """Ask Ollama to unload via ``keep_alive: 0``. Never unloads active models."""
        tag = normalize_model_tag(model)
        if not tag:
            return False
        with self._lock:
            if self._active.get(tag.casefold(), 0) > 0:
                return False
        body = {
            "model": tag,
            "prompt": " ",
            "stream": False,
            "keep_alive": 0,
            "options": {"num_predict": 0},
        }
        try:
            res = self._http().post(f"{self.upstream_base}/api/generate", json=body)
            ok = res.is_success
        except httpx.HTTPError as exc:
            self._last_error = f"unload {tag}: {exc}"
            return False
        if ok:
            with self._lock:
                self._evictions += 1
                self._last_used.pop(tag.casefold(), None)
        else:
            self._last_error = f"unload {tag}: HTTP {res.status_code}"
        return ok

    def _evict_idle_for(self, model: str, loaded: list[dict[str, Any]]) -> None:
        """Unload idle models until ``model`` fits alongside remaining residents."""
        tag = normalize_model_tag(model)
        key = tag.casefold()
        with self._lock:
            active = {a.casefold() for a in self._active_models()}

        def _idle_victims(current: list[dict[str, Any]]) -> list[tuple[float, str]]:
            idle: list[tuple[float, str]] = []
            for item in current:
                name = normalize_model_tag(str(item.get("name") or ""))
                nkey = name.casefold()
                if not nkey or nkey == key or nkey in active:
                    continue
                idle.append((self._last_used.get(nkey, 0.0), name))
            idle.sort(key=lambda pair: pair[0])
            return idle

        current = list(loaded)
        for _ in range(32):
            if self._fits_with_current_residents(tag, current):
                return
            victims = _idle_victims(current)
            if not victims:
                return
            victim = victims[0][1]
            if not self.unload_model(victim):
                return
            current = self.list_loaded_models()

    def reconcile_idle(self) -> list[str]:
        """Unload models with zero active leases past the idle timeout."""
        now = self._clock()
        timeout = idle_unload_seconds()
        unloaded: list[str] = []
        loaded = self.list_loaded_models()
        with self._lock:
            active = {a.casefold() for a in self._active_models()}
        for item in loaded:
            name = normalize_model_tag(str(item.get("name") or ""))
            key = name.casefold()
            if not key or key in active:
                continue
            last = self._last_used.get(key, 0.0)
            # If we never tracked it, treat as idle now (fresh ps entry after restart).
            age = now - last if last > 0 else timeout + 1.0
            if age >= timeout:
                if self.unload_model(name):
                    unloaded.append(name)
        if unloaded:
            with self._cond:
                self._cond.notify_all()
            self._drain_queue()
        return unloaded

    # --- admission --------------------------------------------------------------

    def acquire(self, model: str, *, timeout_seconds: float | None = None) -> _Lease:
        """Block until ``model`` can run; raises ``TimeoutError`` / ``RuntimeError``."""
        tag = normalize_model_tag(model)
        if not tag:
            raise ValueError("model is required")
        wait_s = queue_wait_seconds() if timeout_seconds is None else float(timeout_seconds)
        deadline = self._clock() + wait_s
        waiter: _Waiter | None = None

        while True:
            with self._lock:
                if self._closed:
                    raise RuntimeError("resource manager is closed")

            loaded = self.list_loaded_models()
            if self.can_admit(tag, loaded=loaded):
                self._evict_idle_for(tag, loaded)
                loaded2 = self.list_loaded_models()
                if self.can_admit(tag, loaded=loaded2):
                    with self._cond:
                        lease = self._grant(tag)
                        if waiter is not None and waiter in self._queue:
                            self._queue.remove(waiter)
                        return lease

            with self._cond:
                if waiter is None:
                    if len(self._queue) >= queue_max():
                        self._rejects += 1
                        raise RuntimeError(
                            f"Ollama resource queue full (max={queue_max()})"
                        )
                    waiter = _Waiter(id=uuid.uuid4().hex, model=tag)
                    self._queue.append(waiter)

                remaining = deadline - self._clock()
                if remaining <= 0:
                    if waiter in self._queue:
                        self._queue.remove(waiter)
                    self._rejects += 1
                    raise TimeoutError(
                        f"timed out after {wait_s:.0f}s waiting for VRAM for model {tag}"
                    )
                self._cond.wait(timeout=min(1.0, remaining))

            if waiter.done and waiter.lease is not None:
                return waiter.lease
            if waiter.done and waiter.error:
                raise RuntimeError(waiter.error)
            if self._clock() >= deadline:
                with self._cond:
                    if waiter in self._queue:
                        self._queue.remove(waiter)
                    self._rejects += 1
                raise TimeoutError(
                    f"timed out after {wait_s:.0f}s waiting for VRAM for model {tag}"
                )

    def _grant(self, model: str) -> _Lease:
        """Caller must hold ``_cond`` / ``_lock``."""
        key = normalize_model_tag(model).casefold()
        tag = normalize_model_tag(model)
        self._active[key] = int(self._active.get(key, 0)) + 1
        self._last_used[key] = self._clock()
        self._admits += 1
        return _Lease(id=uuid.uuid4().hex, model=tag, acquired_at=self._clock())

    def release(self, lease: _Lease | None) -> None:
        if lease is None:
            return
        key = normalize_model_tag(lease.model).casefold()
        with self._cond:
            cur = int(self._active.get(key, 0))
            if cur <= 1:
                self._active.pop(key, None)
            else:
                self._active[key] = cur - 1
            self._last_used[key] = self._clock()
            self._cond.notify_all()
        self._drain_queue()

    def _drain_queue(self) -> None:
        """Grant the head of the FIFO queue when it fits (HTTP off the lock)."""
        while True:
            with self._cond:
                if not self._queue:
                    return
                head = self._queue[0]
                model = head.model

            loaded = self.list_loaded_models()
            if not self.can_admit(model, loaded=loaded):
                return
            self._evict_idle_for(model, loaded)
            loaded2 = self.list_loaded_models()
            if not self.can_admit(model, loaded=loaded2):
                return

            with self._cond:
                if not self._queue or self._queue[0] is not head:
                    continue
                if not self.can_admit(model, loaded=loaded2):
                    return
                lease = self._grant(model)
                self._queue.pop(0)
                wait_ms = max(0.0, (self._clock() - head.enqueued_at) * 1000.0)
                self._wait_ms_total += wait_ms
                head.lease = lease
                head.done = True
                head.event.set()
                self._cond.notify_all()

    def status(self) -> dict[str, Any]:
        loaded = self.list_loaded_models()
        with self._lock:
            active = {k: v for k, v in self._active.items() if v > 0}
            queued = [
                {
                    "id": w.id,
                    "model": w.model,
                    "waitedMs": round((self._clock() - w.enqueued_at) * 1000.0),
                }
                for w in self._queue
            ]
            return {
                "enabled": True,
                "upstream": self.upstream_base,
                "loaded": [
                    {"name": x.get("name"), "sizeVramGb": x.get("sizeVramGb")} for x in loaded
                ],
                "active": active,
                "queued": queued,
                "queueDepth": len(queued),
                "budgetGb": self._vram_budget_gb(),
                "usedGb": round(self._resident_used_gb(loaded), 2),
                "idleUnloadSeconds": idle_unload_seconds(),
                "evictions": self._evictions,
                "admits": self._admits,
                "rejects": self._rejects,
                "waitMsTotal": round(self._wait_ms_total, 1),
                "lastError": self._last_error,
                "ts": datetime.now(timezone.utc).isoformat(),
            }


_manager: OllamaResourceManager | None = None
_manager_lock = threading.Lock()


def get_resource_manager() -> OllamaResourceManager:
    global _manager
    with _manager_lock:
        if _manager is None:
            _manager = OllamaResourceManager()
        return _manager


def reset_resource_manager_for_tests() -> None:
    """Drop the process singleton (unit tests only)."""
    global _manager
    with _manager_lock:
        if _manager is not None:
            _manager.close()
        _manager = None


def extract_model_from_body(body: Any) -> str:
    if not isinstance(body, dict):
        return ""
    return normalize_model_tag(
        str(body.get("model") or body.get("name") or body.get("Model") or "")
    )


def path_needs_admission(path: str) -> bool:
    clean = str(path or "").split("?", 1)[0].rstrip("/") or "/"
    if clean in INFERENCE_PATHS:
        return True
    # Tolerate trailing variants
    return any(clean.endswith(p) for p in INFERENCE_PATHS)
