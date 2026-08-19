"""Engine broker: reconcile file queue, warm-pool autoscale, step grants."""

from __future__ import annotations

import os
import subprocess
import threading
import time
from typing import Any, Callable

from orchestration.execution_queue import (
    execution_queue_enabled,
    get_execution_queue,
    queue_status,
    unify_warm_pool_enabled,
)


def autoscale_enabled() -> bool:
    return os.getenv("AGENTIC_EXEC_QUEUE_AUTOSCALE_ENABLED", "0").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def autoscale_min_replicas() -> int:
    raw = os.getenv("AGENTIC_EXEC_QUEUE_AUTOSCALE_MIN_REPLICAS", "1").strip() or "1"
    try:
        return max(1, int(raw))
    except ValueError:
        return 1


def autoscale_max_replicas() -> int:
    raw = os.getenv("AGENTIC_EXEC_QUEUE_AUTOSCALE_MAX_REPLICAS", "8").strip() or "8"
    try:
        return max(1, int(raw))
    except ValueError:
        return 8


def autoscale_slots_per_worker() -> int:
    raw = os.getenv("AGENTIC_EXEC_QUEUE_AUTOSCALE_SLOTS_PER_WORKER", "1").strip() or "1"
    try:
        return max(1, int(raw))
    except ValueError:
        return 1


def autoscale_up_threshold() -> int:
    raw = os.getenv("AGENTIC_EXEC_QUEUE_AUTOSCALE_UP_THRESHOLD", "2").strip() or "2"
    try:
        return max(1, int(raw))
    except ValueError:
        return 2


def autoscale_down_cooldown_seconds() -> float:
    raw = os.getenv("AGENTIC_EXEC_QUEUE_AUTOSCALE_DOWN_COOLDOWN_SECONDS", "300").strip() or "300"
    try:
        return max(30.0, float(raw))
    except ValueError:
        return 300.0


class ExecutionQueueBroker:
    """Background reconcile loop for hybrid/file queue + optional warm-pool autoscale."""

    def __init__(
        self,
        *,
        reconcile_interval_s: float = 0.5,
        autoscale_interval_s: float = 30.0,
        clock: Callable[[], float] | None = None,
    ) -> None:
        self._reconcile_interval = reconcile_interval_s
        self._autoscale_interval = autoscale_interval_s
        self._clock = clock or time.time
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._last_scale_at = 0.0
        self._last_idle_at: float | None = None
        self._current_replicas: int | None = None

    def start(self) -> None:
        if self._thread is not None:
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, name="execution-queue-broker", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=5.0)
            self._thread = None

    def _loop(self) -> None:
        last_autoscale = 0.0
        while not self._stop.is_set():
            try:
                if execution_queue_enabled():
                    get_execution_queue().reconcile_file_pending()
            except Exception:  # noqa: BLE001
                pass
            now = self._clock()
            if autoscale_enabled() and unify_warm_pool_enabled() and now - last_autoscale >= self._autoscale_interval:
                last_autoscale = now
                try:
                    self._maybe_autoscale()
                except Exception:  # noqa: BLE001
                    pass
            self._stop.wait(self._reconcile_interval)

    def _maybe_autoscale(self) -> None:
        status = queue_status()
        pending_steps = int((status.get("pending") or {}).get("steps") or 0)
        active_steps = int((status.get("active") or {}).get("steps") or 0)
        depth = pending_steps + active_steps
        min_r = autoscale_min_replicas()
        max_r = autoscale_max_replicas()
        slots = autoscale_slots_per_worker()
        desired = max(min_r, min(max_r, (depth + slots - 1) // slots if depth else min_r))
        if depth >= autoscale_up_threshold():
            desired = max(desired, min_r + 1)
        now = self._clock()
        if depth == 0 and active_steps == 0:
            if self._last_idle_at is None:
                self._last_idle_at = now
            elif now - self._last_idle_at >= autoscale_down_cooldown_seconds():
                desired = min_r
        else:
            self._last_idle_at = None
        if self._current_replicas == desired:
            return
        if now - self._last_scale_at < autoscale_down_cooldown_seconds() and desired < (self._current_replicas or desired):
            return
        if self._patch_replicas(desired):
            self._current_replicas = desired
            self._last_scale_at = now
            try:
                from orchestration.metrics import record_warm_pool_replicas

                record_warm_pool_replicas(desired)
            except Exception:  # noqa: BLE001
                pass

    def _patch_replicas(self, replicas: int) -> bool:
        ns = os.getenv("AGENTIC_K8S_NAMESPACE", "default").strip() or "default"
        deploy = os.getenv("AGENTIC_K8S_WARM_POOL_DEPLOYMENT", "agentic-warm-pool").strip()
        cmd = [
            "kubectl",
            "scale",
            f"deployment/{deploy}",
            f"--replicas={replicas}",
            f"-n={ns}",
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=False)
            return res.returncode == 0
        except (OSError, subprocess.TimeoutExpired):
            return False

    def status(self) -> dict[str, Any]:
        base = queue_status()
        base["warmPoolWorkers"] = {
            "replicas": self._current_replicas,
            "autoscaleEnabled": autoscale_enabled(),
        }
        return base


_broker: ExecutionQueueBroker | None = None
_broker_lock = threading.Lock()


def get_execution_queue_broker() -> ExecutionQueueBroker:
    global _broker
    with _broker_lock:
        if _broker is None:
            _broker = ExecutionQueueBroker()
        return _broker


def start_execution_queue_broker() -> None:
    if execution_queue_enabled():
        get_execution_queue_broker().start()


def stop_execution_queue_broker() -> None:
    global _broker
    with _broker_lock:
        if _broker is not None:
            _broker.stop()
        _broker = None


def reset_execution_queue_broker_for_tests() -> None:
    stop_execution_queue_broker()


def start_broker() -> ExecutionQueueBroker:
    """Start broker thread (engine lifespan)."""
    broker = get_execution_queue_broker()
    broker.start()
    return broker


def stop_broker() -> None:
    stop_execution_queue_broker()


def broker_status() -> dict[str, Any]:
    return get_execution_queue_broker().status()
