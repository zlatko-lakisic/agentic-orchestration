"""Resolve planner agent allowlists from request, overlay, and app prefs."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def _clean_ids(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        parts = [p.strip() for p in raw.split(",")]
        return [p for p in parts if p]
    if not isinstance(raw, (list, tuple, set)):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in raw:
        pid = str(item or "").strip()
        if not pid or pid in seen:
            continue
        seen.add(pid)
        out.append(pid)
    return out


def intersect_allowlists(*lists: list[str] | None) -> list[str] | None:
    """
    Intersect non-empty allowlists. Empty/None lists are ignored.
    Returns None when no allowlist is active.
    """
    active = [_clean_ids(x) for x in lists if _clean_ids(x)]
    if not active:
        return None
    acc = set(active[0])
    for nxt in active[1:]:
        acc &= set(nxt)
    return sorted(acc)


def resolve_allowed_agent_provider_ids(
    *,
    tool_root: Path | None,
    app_id: Any = None,
    request_ids: Any = None,
    overlay_ids: Any = None,
) -> list[str] | None:
    """
    Precedence (intersect when multiple are set):

    1. Per-call ``selectedAgentProviderIds`` / request pin
    2. Reach overlay ``allowedAgentProviderIds`` (session)
    3. Sticky app prefs ``allowedAgentProviderIds``

    Returns ``None`` when unrestricted (current global catalog behavior).
    """
    from orchestration.app_prefs import get_app_prefs

    prefs = get_app_prefs(tool_root, app_id)
    app_ids = prefs.get("allowedAgentProviderIds")
    return intersect_allowlists(request_ids, overlay_ids, app_ids)


def partition_allowlist(
    entries: list[dict[str, Any]],
    allowed_ids: list[str] | None,
) -> tuple[list[str], list[str]]:
    """
    Split requested agent ids into those present in ``entries`` vs missing.

    Returns ``(survivors, dropped)`` preserving the order of ``allowed_ids``.
    Empty / None ``allowed_ids`` yields ``([], [])``.
    """
    cleaned = _clean_ids(allowed_ids)
    if not cleaned:
        return [], []
    present = {
        str(entry.get("id", "")).strip()
        for entry in entries
        if str(entry.get("id", "")).strip()
    }
    survivors: list[str] = []
    dropped: list[str] = []
    for pid in cleaned:
        if pid in present:
            survivors.append(pid)
        else:
            dropped.append(pid)
    return survivors, dropped


def filter_entries_by_allowlist(
    entries: list[dict[str, Any]],
    allowed_ids: list[str] | None,
    *,
    always_keep_client_namespace: bool = True,
) -> list[dict[str, Any]]:
    """Keep entries in ``allowed_ids``; optionally always keep ``client.*`` overlays."""
    cleaned = _clean_ids(allowed_ids)
    if not cleaned:
        return entries
    allowed = set(cleaned)
    out: list[dict[str, Any]] = []
    for entry in entries:
        pid = str(entry.get("id", "")).strip()
        if not pid:
            continue
        if pid in allowed:
            out.append(entry)
            continue
        if always_keep_client_namespace and pid.startswith("client."):
            out.append(entry)
    return out
