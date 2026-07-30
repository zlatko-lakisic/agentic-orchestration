"""Keep Ollama models resident on the host via periodic /api/generate pings."""

from __future__ import annotations

import os
import sys
import threading
import time
from datetime import datetime, timezone
from typing import Any

import httpx

#: Last keepalive tick — exposed on engine ``/health`` for warm-set diagnostics.
_last_status: dict[str, Any] = {
    "models": [],
    "ok": None,
    "ts": None,
    "base": None,
}


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


def _normalize_model_tag(raw: str) -> str:
    text = str(raw or "").strip()
    if not text:
        return ""
    lower = text.lower()
    if lower.startswith("ollama/"):
        return text[len("ollama/") :].strip()
    if lower.startswith("ollama:"):
        return text[len("ollama:") :].strip()
    return text


def resolve_keepalive_model_tag() -> str:
    """Single model tag for /api/generate (no ollama/ prefix). Prefer multi-model helper."""
    raw = (
        os.getenv("AGENTIC_OLLAMA_KEEPALIVE_MODEL", "").strip()
        or os.getenv("AGENTIC_PLANNER_MODEL", "").strip()
    )
    return _normalize_model_tag(raw)


def resolve_keepalive_model_tags() -> list[str]:
    """
    Model tags to keep resident.

    ``AGENTIC_OLLAMA_KEEPALIVE_MODELS`` (comma-separated) wins when set — use for a
    meeting pair that shares or lists small chat models. Otherwise falls back to the
    single ``AGENTIC_OLLAMA_KEEPALIVE_MODEL`` / planner model.
    """
    multi = os.getenv("AGENTIC_OLLAMA_KEEPALIVE_MODELS", "").strip()
    if multi:
        out: list[str] = []
        seen: set[str] = set()
        for part in multi.split(","):
            tag = _normalize_model_tag(part)
            key = tag.casefold()
            if tag and key not in seen:
                seen.add(key)
                out.append(tag)
        return out
    single = resolve_keepalive_model_tag()
    return [single] if single else []


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


def keepalive_status() -> dict[str, Any]:
    """Snapshot of the last keepalive tick (for ``/health``)."""
    return dict(_last_status)


def _record_status(*, models: list[str], ok: bool | None, base: str) -> None:
    _last_status["models"] = list(models)
    _last_status["ok"] = ok
    _last_status["base"] = base
    _last_status["ts"] = datetime.now(timezone.utc).isoformat()


def ping_ollama_keepalive(*, timeout_seconds: float = 120.0) -> bool:
    if not ollama_keepalive_enabled():
        _record_status(models=[], ok=None, base=resolve_ollama_api_base())
        return False
    models = resolve_keepalive_model_tags()
    base = resolve_ollama_api_base()
    if not models:
        _record_status(models=[], ok=None, base=base)
        return False
    all_ok = True
    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            for model in models:
                body: dict[str, Any] = {
                    "model": model,
                    "prompt": " ",
                    "stream": False,
                    "keep_alive": ollama_keepalive_duration(),
                    "options": {"num_predict": 1},
                }
                res = client.post(f"{base}/api/generate", json=body)
                if not res.is_success:
                    all_ok = False
    except httpx.HTTPError:
        all_ok = False
    _record_status(models=models, ok=all_ok, base=base)
    return all_ok


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
    models = resolve_keepalive_model_tags()
    if not models:
        print(
            f"{_log_prefix}: skipped (set AGENTIC_OLLAMA_KEEPALIVE_MODELS=qwen2.5:3b "
            "or AGENTIC_PLANNER_MODEL=ollama/...)",
            file=sys.stderr,
        )
        return
    if log_prefix:
        _log_prefix = log_prefix

    interval_s = ollama_keepalive_interval_seconds()
    base = resolve_ollama_api_base()
    print(
        f"{_log_prefix}: models={models} base={base} interval_s={interval_s:.0f}",
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
