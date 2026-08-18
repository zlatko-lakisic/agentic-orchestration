"""In-process snapshot of long-running engine work (overlay prep, model pull, …).

Reach / host-metrics / admin session lists read the same object so a Comstar pull
or MCP handshake is visible even before a ``run_id`` exists.
"""

from __future__ import annotations

import re
import threading
import time
from typing import Any

_lock = threading.Lock()
_state: dict[str, Any] = {
    "active": False,
    "kind": None,
    "message": "",
    "percent": None,
    "model": None,
    "mcpId": None,
    "appId": None,
    "connectionId": None,
    "startedAt": None,
}
_last_emit_message = ""
_last_emit_monotonic = 0.0
_sticky_model = ""

_PERCENT_RE = re.compile(r"(\d+)\s*%")
_PULL_START_RE = re.compile(r"ollama pull:\s+starting\s+(\S+)", re.I)
_MODEL_MISSING_RE = re.compile(r"ollama model missing:\s+([^;]+)", re.I)
_MODEL_READY_RE = re.compile(r"ollama model ready:\s+(\S+)", re.I)
_MCP_RE = re.compile(r"stdio MCP\s+(\S+)", re.I)

STATUS_THROTTLE_SECONDS = 2.0


def reset_for_tests() -> None:
    """Clear snapshot (unit tests)."""
    global _last_emit_message, _last_emit_monotonic, _sticky_model
    with _lock:
        _state.update(
            {
                "active": False,
                "kind": None,
                "message": "",
                "percent": None,
                "model": None,
                "mcpId": None,
                "appId": None,
                "connectionId": None,
                "startedAt": None,
            }
        )
        _last_emit_message = ""
        _last_emit_monotonic = 0.0
        _sticky_model = ""


def snapshot() -> dict[str, Any]:
    """Copy of the current activity (always includes ``active``)."""
    with _lock:
        return dict(_state)


def clear_activity(*, connection_id: str | None = None) -> None:
    """Clear the snapshot. If ``connection_id`` is set, only clear when it matches."""
    global _last_emit_message, _sticky_model
    with _lock:
        if connection_id:
            current = str(_state.get("connectionId") or "")
            if current and current != str(connection_id):
                return
        _state.update(
            {
                "active": False,
                "kind": None,
                "message": "",
                "percent": None,
                "model": None,
                "mcpId": None,
                "appId": None,
                "connectionId": None,
                "startedAt": None,
            }
        )
        _last_emit_message = ""
        _sticky_model = ""


def set_activity(
    *,
    kind: str,
    message: str,
    percent: int | None = None,
    model: str | None = None,
    mcp_id: str | None = None,
    app_id: str | None = None,
    connection_id: str | None = None,
) -> dict[str, Any]:
    """Replace the snapshot with a new active activity."""
    global _sticky_model
    msg = str(message or "").strip()
    with _lock:
        if not _state.get("startedAt"):
            started = time.time()
        else:
            started = _state["startedAt"]
        model_s = str(model or "").strip() or _sticky_model or None
        if model_s:
            _sticky_model = model_s
        _state.update(
            {
                "active": True,
                "kind": str(kind or "info"),
                "message": msg,
                "percent": percent,
                "model": model_s,
                "mcpId": str(mcp_id or "").strip() or None,
                "appId": str(app_id or "").strip() or None,
                "connectionId": str(connection_id or "").strip() or None,
                "startedAt": started,
            }
        )
        return dict(_state)


def observe_progress(
    line: str,
    *,
    connection_id: str | None = None,
    app_id: str | None = None,
) -> dict[str, Any]:
    """Update the snapshot from a legacy progress / stderr line."""
    from orchestration.run_status import map_progress_line

    global _sticky_model
    text = str(line or "").strip()
    if not text:
        return snapshot()

    start = _PULL_START_RE.search(text)
    missing = _MODEL_MISSING_RE.search(text)
    ready = _MODEL_READY_RE.search(text)
    if start:
        _sticky_model = start.group(1).strip()
    elif missing:
        _sticky_model = missing.group(1).strip()
    elif ready:
        _sticky_model = ready.group(1).strip()

    mapped = map_progress_line(text) or {}
    message = str(mapped.get("message") or text)
    percent = mapped.get("percent")
    if percent is None:
        pm = _PERCENT_RE.search(text)
        if pm:
            percent = min(100, max(0, int(pm.group(1))))
    kind = _kind_from_line(text, str(mapped.get("phase") or ""))
    model = mapped.get("model") or _sticky_model or None
    mcp_m = _MCP_RE.search(text)
    mcp_id = mcp_m.group(1) if mcp_m else None
    if kind in ("model_pull", "overlay_prepare", "mcp_handshake", "planning", "generating"):
        return set_activity(
            kind=kind,
            message=message,
            percent=int(percent) if isinstance(percent, int) else None,
            model=str(model) if model else None,
            mcp_id=mcp_id,
            app_id=app_id,
            connection_id=connection_id,
        )
    return snapshot()


def should_emit_status(message: str, *, percent: int | None = None) -> bool:
    """Throttle identical overlay/pull status frames (percent change or 2s)."""
    global _last_emit_message, _last_emit_monotonic
    msg = str(message or "").strip()
    now = time.monotonic()
    with _lock:
        changed = msg != _last_emit_message
        elapsed = now - _last_emit_monotonic
        if changed or elapsed >= STATUS_THROTTLE_SECONDS or percent == 100:
            _last_emit_message = msg
            _last_emit_monotonic = now
            return True
        return False


def _kind_from_line(text: str, phase: str) -> str:
    low = text.lower()
    if "ollama pull" in low or "pulling" in low or "downloading" in low:
        return "model_pull"
    if "handshake" in low or "stdio mcp" in low:
        return "mcp_handshake"
    if phase in ("planning", "planned"):
        return "planning"
    if phase in ("generating", "executing", "step"):
        return "generating"
    if phase in ("warming_agent", "preparing") or "overlay" in low or "warming" in low:
        if "model" in low or "ollama" in low:
            return "model_pull"
        return "overlay_prepare"
    return phase or "info"
