"""
Per-appId preferences shared with the web Admin / API token store.

Reads ``<toolRoot>/__orchestrator_api_tokens__/app-prefs.json`` (or
``AGENTIC_API_TOKENS_DIR/app-prefs.json``) — the same file Node writes via
``agentic-orchestration-web/lib/app-prefs.mjs``.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

_RUN_MODES = frozenset({"dynamic", "dynamic-iterative"})


def api_tokens_root(tool_root: Path | None = None) -> Path:
    override = (os.getenv("AGENTIC_API_TOKENS_DIR") or "").strip()
    if override:
        return Path(override).resolve()
    root = tool_root or Path(__file__).resolve().parents[1]
    return (root / "__orchestrator_api_tokens__").resolve()


def prefs_path(tool_root: Path | None = None) -> Path:
    return api_tokens_root(tool_root) / "app-prefs.json"


def normalize_app_id(app_id: Any) -> str:
    return str(app_id or "").strip().lower()


def normalize_default_run_mode(mode: Any) -> str | None:
    m = str(mode or "").strip().lower()
    return m if m in _RUN_MODES else None


def _normalize_id_list(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        parts = [p.strip() for p in raw.split(",")]
        items = parts
    elif isinstance(raw, (list, tuple, set)):
        items = [str(x or "").strip() for x in raw]
    else:
        return []
    out: list[str] = []
    seen: set[str] = set()
    for pid in items:
        if not pid or pid in seen:
            continue
        seen.add(pid)
        out.append(pid)
    return out


def normalize_app_prefs(raw: Any) -> dict[str, Any]:
    src = raw if isinstance(raw, dict) else {}
    dynamic_planning = bool(src.get("dynamicPlanning"))
    default_run_mode = normalize_default_run_mode(src.get("defaultRunMode"))
    if dynamic_planning and not default_run_mode:
        default_run_mode = "dynamic"
    return {
        "dynamicPlanning": dynamic_planning,
        "defaultRunMode": default_run_mode,
        "allowedAgentProviderIds": _normalize_id_list(src.get("allowedAgentProviderIds")),
    }


def load_all_app_prefs(tool_root: Path | None = None) -> dict[str, dict[str, Any]]:
    path = prefs_path(tool_root)
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(raw, dict):
        return {}
    out: dict[str, dict[str, Any]] = {}
    for key, val in raw.items():
        app_id = normalize_app_id(key)
        if not app_id:
            continue
        out[app_id] = normalize_app_prefs(val)
    return out


def get_app_prefs(tool_root: Path | None, app_id: Any) -> dict[str, Any]:
    aid = normalize_app_id(app_id)
    if not aid:
        return normalize_app_prefs({})
    return load_all_app_prefs(tool_root).get(aid) or normalize_app_prefs({})


def sticky_run_mode_from_prefs(prefs: dict[str, Any] | None) -> str | None:
    if not prefs or not prefs.get("dynamicPlanning"):
        return None
    return normalize_default_run_mode(prefs.get("defaultRunMode")) or "dynamic"


def effective_run_mode(
    explicit: Any,
    prefs: dict[str, Any] | None = None,
    *,
    fallback: str = "dynamic",
) -> str:
    from_req = normalize_default_run_mode(explicit)
    if from_req:
        return from_req
    sticky = sticky_run_mode_from_prefs(prefs)
    if sticky:
        return sticky
    return normalize_default_run_mode(fallback) or "dynamic"
