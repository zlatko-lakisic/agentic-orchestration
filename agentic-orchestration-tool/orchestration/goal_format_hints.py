"""Detect strict output-format constraints from natural-language goals."""

from __future__ import annotations


def goal_requires_machine_readable_only(user_text: str) -> bool:
    """
    True when the user clearly wants only structured/machine output (typically one JSON),
    not explanatory prose suitable for iterative synthesis expansions.

    Conservative: avoids matching generic "respond with …" wording without anti-prose guards.
    """
    t = user_text.strip().lower()
    if not t:
        return False

    anti_prose = (
        "no markdown",
        "no prose",
        "no extra keys",
        "no explanation",
        "no commentary",
        "only one json",
        "single json object",
        "exactly one json",
        '{"minutes":',
    )
    cues = ("json object", "return only", "respond with only", "output only")

    prose_hits = sum(1 for p in anti_prose if p in t)
    if prose_hits >= 2:
        return True

    cue_hits = sum(1 for c in cues if c in t)
    if prose_hits >= 1 and cue_hits >= 1:
        return True

    if "only" in t and "json" in t and prose_hits >= 1:
        return True

    return False
