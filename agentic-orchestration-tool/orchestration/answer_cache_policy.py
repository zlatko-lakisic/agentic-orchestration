"""Answer-cache helpers — detection must never replay prior-frame boxes."""

from __future__ import annotations

from typing import Any, Sequence


def entry_is_object_detection(entry: dict[str, Any] | None) -> bool:
    if not isinstance(entry, dict):
        return False
    return str(entry.get("type") or entry.get("provider_type") or "").strip().lower() == (
        "object_detection"
    )


def answer_cache_bypass_for_entries(entries: Sequence[dict[str, Any]] | None) -> bool:
    """True when any catalog entry is object_detection (Y6)."""
    for entry in entries or []:
        if entry_is_object_detection(entry):
            return True
    return False
