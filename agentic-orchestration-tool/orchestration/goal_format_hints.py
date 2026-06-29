"""Detect strict output-format constraints from natural-language goals."""

from __future__ import annotations

import os

WEB_PROSE_GOAL_SUFFIX = (
    "\n\n[Delivery format: Write the user-facing answer in clear, natural language "
    "(short paragraphs or bullet lists). Do not use JSON, raw object dumps, or keys "
    'like "Final Answer" unless the user explicitly asked for JSON or a data export.]'
)


def web_prose_deliverable_enabled() -> bool:
    return os.getenv("AGENTIC_WEB_PROSE_DELIVERABLE", "0").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def apply_web_prose_goal_if_enabled(user_text: str) -> str:
    if not web_prose_deliverable_enabled():
        return user_text
    if goal_requires_machine_readable_only(user_text):
        return user_text
    if WEB_PROSE_GOAL_SUFFIX.strip() in user_text:
        return user_text
    return user_text + WEB_PROSE_GOAL_SUFFIX


def web_prose_synthesis_instructions() -> str:
    return (
        "Write for a human reader: use clear prose (markdown headings and bullets are OK). "
        "Do not wrap the answer in JSON or use schema keys like Final Answer — speak naturally.\n\n"
    )


def web_prose_planner_rules() -> str:
    return """
- **Web chat default:** Unless the user explicitly requests JSON, CSV, or API-style structured output, each step's `expected_output` must require natural-language prose for the end user (markdown OK), not JSON objects or wrapper keys.
"""


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
