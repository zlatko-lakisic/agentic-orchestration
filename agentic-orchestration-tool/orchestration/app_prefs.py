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


#: Ceiling for queue priority an identified client may request when the operator has
#: configured nothing ("high"; "realtime" must be granted explicitly).
DEFAULT_CLIENT_MAX_PRIORITY = 75

_PRIORITY_LABELS = {"realtime": 100, "high": 75, "normal": 50, "low": 25, "background": 0}

_QUOTA_INT_KEYS = ("maxConcurrentRuns", "maxQueuedRuns", "maxConcurrentPlanning")


def _parse_priority_cap(raw: Any) -> int | None:
    text = str(raw if raw is not None else "").strip().lower()
    if not text:
        return None
    if text in _PRIORITY_LABELS:
        return _PRIORITY_LABELS[text]
    try:
        return max(0, min(100, int(float(text))))
    except (TypeError, ValueError):
        return None


def _raw_app_entry(tool_root: Path | None, app_id: Any) -> dict[str, Any]:
    aid = normalize_app_id(app_id)
    path = prefs_path(tool_root)
    if not aid or not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(raw, dict):
        return {}
    for key, val in raw.items():
        if normalize_app_id(key) == aid and isinstance(val, dict):
            return val
    return {}


def operator_queue_policy(
    tool_root: Any | None,
    app_id: Any,
    *,
    user_id: str | None = None,
) -> dict[str, Any]:
    """
    Operator-owned queue limits for an app: ``{"maxQueuePriority", "queueQuota"}``.

    Sources, most specific first: the app's entry in ``app-prefs.json``
    (``maxQueuePriority`` number or label, ``queueQuota`` object), then
    ``AGENTIC_SERVE_MAX_CLIENT_PRIORITY``. With nothing configured, the implicit local
    single-user (``user_id`` ``"local"`` / empty) is uncapped and every identified
    caller is capped at :data:`DEFAULT_CLIENT_MAX_PRIORITY`.
    """
    root = Path(tool_root) if tool_root is not None else None
    entry = _raw_app_entry(root, app_id)
    cap = _parse_priority_cap(entry.get("maxQueuePriority"))
    if cap is None:
        cap = _parse_priority_cap(os.getenv("AGENTIC_SERVE_MAX_CLIENT_PRIORITY"))
    if cap is None and str(user_id or "").strip() not in ("", "local"):
        cap = DEFAULT_CLIENT_MAX_PRIORITY
    quota = entry.get("queueQuota")
    return {
        "maxQueuePriority": cap,
        "queueQuota": quota if isinstance(quota, dict) else None,
    }


def clamp_queue_quota(
    requested: dict[str, Any] | None,
    operator: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """
    Combine a client-requested quota with the operator's.

    A quota only ever limits its own tenant, so without operator config the client's
    request stands (it can only restrict itself). With operator config, each limit is
    the stricter of the two and the fair-share ``weight`` is the operator's.
    """
    if not isinstance(operator, dict) or not operator:
        return requested if isinstance(requested, dict) else None
    out: dict[str, Any] = dict(requested) if isinstance(requested, dict) else {}
    for key in _QUOTA_INT_KEYS:
        try:
            op_val = max(0, int(operator[key])) if operator.get(key) is not None else None
        except (TypeError, ValueError):
            op_val = None
        if op_val is None:
            continue
        try:
            req_val = max(0, int(out[key])) if out.get(key) is not None else None
        except (TypeError, ValueError):
            req_val = None
        out[key] = op_val if req_val is None else min(req_val, op_val)
    if operator.get("weight") is not None:
        out["weight"] = operator["weight"]
    else:
        out.pop("weight", None)
    return out


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
