"""Lightweight Ollama HTTP health checks (no CrewAI / provider imports)."""

from __future__ import annotations

import threading
import time
import urllib.error
import urllib.request

from orchestration.ollama_catalog_filter import normalize_ollama_host


def is_ollama_healthy(host: str) -> bool:
    try:
        host_n = normalize_ollama_host(host)
        with urllib.request.urlopen(f"{host_n}/api/tags", timeout=2) as response:
            return 200 <= response.status < 300
    except (urllib.error.URLError, TimeoutError, ValueError):
        return False


def wait_for_ollama_healthy(
    host: str,
    *,
    attempts: int = 3,
    delays_s: tuple[float, ...] = (0.5, 1.0, 2.0),
    cancel_event: threading.Event | None = None,
) -> bool:
    """Retry ``is_ollama_healthy`` for brief broker restart flaps.

    Used by session-overlay ensure so a liveness restart of the resource-broker
    does not immediately fail overlay register.
    """
    host_n = normalize_ollama_host(host)
    max_attempts = max(1, int(attempts))
    for i in range(max_attempts):
        if cancel_event is not None and cancel_event.is_set():
            return False
        if is_ollama_healthy(host_n):
            return True
        if i + 1 >= max_attempts:
            break
        delay = delays_s[min(i, len(delays_s) - 1)] if delays_s else 0.5
        if cancel_event is not None:
            if cancel_event.wait(timeout=delay):
                return False
        else:
            time.sleep(delay)
    return False
