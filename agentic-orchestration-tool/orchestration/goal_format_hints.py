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


def goal_suggests_irrigation_bundle(user_text: str) -> bool:
    """
    True when the goal looks like HA zone + weather + irrigation minutes (not generic “gardening” chat).

    Used with AGENTIC_DYNAMIC_IRRIGATION_AUTO_ROUTE to deterministically restrict planner providers.
    """
    t = user_text.strip().lower()
    if not t:
        return False

    score = 0
    if (
        "valve." in t
        or "bhyve" in t
        or "zone label" in t
        or "zone entity" in t
        or "zone data json" in t
    ):
        score += 3
    if any(x in t for x in ("open-meteo", "open_meteo", "openmeteo")):
        score += 2
    if any(
        x in t
        for x in (
            "precipitation_mm",
            "rained_in_past",
            "accuweather_home",
            "openweathermap forecast",
        )
    ):
        score += 2
    if any(x in t for x in ("irrigation", "sprinkler", "watering", "lawn", "fescue")):
        score += 1
    if '"minutes"' in t and "json" in t:
        score += 2

    return score >= 5
