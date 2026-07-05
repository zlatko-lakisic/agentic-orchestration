"""Keep Ollama models resident on the host via periodic /api/generate pings."""

from __future__ import annotations

import os
import sys
import threading
import time
from typing import Any

import httpx


def _env_truthy(name: str, *, default: bool = True) -> bool:
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    return str(raw).strip().lower() not in ("0", "false", "no", "off")


def ollama_keepalive_enabled() -> bool:
    return _env_truthy("AGENTIC_OLLAMA_KEEPALIVE", default=True)


def resolve_ollama_api_base() -> str:
    raw = (
        os.getenv("OLLAMA_API_BASE", "").strip()
        or os.getenv("OLLAMA_HOST", "").strip()
        or "http://127.0.0.1:11434"
    )
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw.rstrip("/")
    return f"http://{raw.rstrip('/')}"


def resolve_keepalive_model_tag() -> str:
    """Model tag for /api/generate (no ollama/ prefix)."""
    raw = (
        os.getenv("AGENTIC_OLLAMA_KEEPALIVE_MODEL", "").strip()
        or os.getenv("AGENTIC_PLANNER_MODEL", "").strip()
    )
    if not raw:
        return ""
    lower = raw.lower()
    if lower.startswith("ollama/"):
        return raw[len("ollama/") :].strip()
    if lower.startswith("ollama:"):
        return raw[len("ollama:") :].strip()
    return raw


def ollama_keepalive_duration() -> str:
    return os.getenv("AGENTIC_OLLAMA_KEEP_ALIVE", "-1").strip() or "-1"


def ollama_keepalive_interval_seconds() -> float:
    raw = os.getenv("AGENTIC_OLLAMA_KEEPALIVE_INTERVAL_MS", "300000").strip()
    try:
        ms = int(raw)
    except ValueError:
        ms = 300_000
    ms = max(30_000, min(ms, 3_600_000))
    return ms / 1000.0


def ping_ollama_keepalive(*, timeout_seconds: float = 120.0) -> bool:
    if not ollama_keepalive_enabled():
        return False
    model = resolve_keepalive_model_tag()
    if not model:
        return False
    base = resolve_ollama_api_base()
    body: dict[str, Any] = {
        "model": model,
        "prompt": " ",
        "stream": False,
        "keep_alive": ollama_keepalive_duration(),
        "options": {"num_predict": 1},
    }
    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            res = client.post(f"{base}/api/generate", json=body)
        return res.is_success
    except httpx.HTTPError:
        return False


_timer: threading.Timer | None = None
_in_flight = False
_log_prefix = "(agentic) ollama keep-alive"


def start_ollama_keepalive_loop(*, log_prefix: str | None = None) -> None:
    """Background warmup + interval pings. Safe to call multiple times (no-op after first)."""
    global _timer, _log_prefix
    if _timer is not None:
        return
    if not ollama_keepalive_enabled():
        return
    model = resolve_keepalive_model_tag()
    if not model:
        print(
            f"{_log_prefix}: skipped (set AGENTIC_PLANNER_MODEL=ollama/... or "
            "AGENTIC_OLLAMA_KEEPALIVE_MODEL)",
            file=sys.stderr,
        )
        return
    if log_prefix:
        _log_prefix = log_prefix

    interval_s = ollama_keepalive_interval_seconds()
    base = resolve_ollama_api_base()
    print(
        f"{_log_prefix}: model={model} base={base} interval_s={interval_s:.0f}",
        file=sys.stderr,
    )

    def tick() -> None:
        global _in_flight, _timer
        if _in_flight:
            _schedule()
            return
        _in_flight = True
        try:
            ok = ping_ollama_keepalive()
            if not ok:
                print(f"{_log_prefix}: ping failed", file=sys.stderr)
        finally:
            _in_flight = False
            _schedule()

    def _schedule() -> None:
        global _timer
        _timer = threading.Timer(interval_s, tick)
        _timer.daemon = True
        _timer.start()

    tick()


def stop_ollama_keepalive_loop() -> None:
    global _timer
    if _timer is not None:
        _timer.cancel()
        _timer = None
