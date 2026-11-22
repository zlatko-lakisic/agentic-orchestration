"""Answer-cache helpers — detection must never replay prior-frame boxes."""

from __future__ import annotations

from typing import Any, Sequence


def entry_is_object_detection(entry: dict[str, Any] | None) -> bool:
    if not isinstance(entry, dict):
        return False
    return str(entry.get("type") or entry.get("provider_type") or "").strip().lower() == (
        "object_detection"
    )


def entry_is_video_generation(entry: dict[str, Any] | None) -> bool:
    if not isinstance(entry, dict):
        return False
    return str(entry.get("type") or entry.get("provider_type") or "").strip().lower() == (
        "video_generation"
    )


def entry_is_speech_io(entry: dict[str, Any] | None) -> bool:
    if not isinstance(entry, dict):
        return False
    return str(entry.get("type") or entry.get("provider_type") or "").strip().lower() in (
        "tts",
        "stt",
    )


def answer_cache_bypass_for_entries(entries: Sequence[dict[str, Any]] | None) -> bool:
    """True when any catalog entry is object_detection, video_generation, tts, or stt."""
    for entry in entries or []:
        if (
            entry_is_object_detection(entry)
            or entry_is_video_generation(entry)
            or entry_is_speech_io(entry)
        ):
            return True
    return False
