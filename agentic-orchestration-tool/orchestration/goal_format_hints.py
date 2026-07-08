"""Detect strict output-format constraints from natural-language goals."""

from __future__ import annotations

import os
import re

WEB_PROSE_GOAL_SUFFIX = (
    "\n\n[Delivery format: Write the user-facing answer in clear, natural language "
    "(short paragraphs or bullet lists). Do not use JSON, raw object dumps, LaTeX, "
    r"$\boxed{}$ wrappers, or meta-commentary about these rules — just answer the question.]"
)

# Home Assistant agentic-watering chat-completions contract.
_MINUTES_LINE_RE = re.compile(
    r"(?im)^\s*minutes:\s*<[^>\n]+>\s*$|^\s*minutes:\s*(?:<integer|\d)",
)
_MINUTES_LITERAL_RE = re.compile(r"(?i)\bminutes:\s*<\s*integer\s*0\s*-\s*25\s*>")
_MINUTES_OUTPUT_RE = re.compile(
    r"(?is)output format:.*?minutes:\s*<|final line exactly:\s*\n?\s*minutes:",
)


def goal_requests_irrigation_minutes_line(user_text: str) -> bool:
    """
    True for Home Assistant watering prompts that require a final ``MINUTES: N`` line.

    These clients are plain chat completions (no tool loop). Attaching plant-knowledge
    MCP causes small/local models to emit tool-call JSON instead of parseable minutes.
    """
    t = str(user_text or "").strip()
    if not t:
        return False
    lower = t.lower()
    if "minutes:" not in lower:
        return False
    if _MINUTES_LITERAL_RE.search(t) or _MINUTES_OUTPUT_RE.search(t):
        return True
    if _MINUTES_LINE_RE.search(t):
        return True
    # Heuristic: irrigation decision + MINUTES contract language.
    if "minutes:" in lower and any(
        k in lower
        for k in (
            "irrigation decision-maker",
            "zone profile",
            "run_minutes",
            "integer 0-25",
            "integer 0–25",
            "0-25",
            "0–25",
            "home assistant only supplies",
            "never applying more water",
        )
    ):
        return True
    return False


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
- **Irrigation minutes:** If the goal requires a final line ``MINUTES: <integer>``, do not attach MCP tools; the client has no tool loop. Expected output must end with ``MINUTES: N``.
"""


def goal_requires_machine_readable_only(user_text: str) -> bool:
    """
    True when the user clearly wants only structured/machine output (typically one JSON),
    not explanatory prose suitable for iterative synthesis expansions.

    Conservative: avoids matching generic "respond with …" wording without anti-prose guards.
    Also true for Home Assistant ``MINUTES: N`` irrigation decisions (plain text contract).
    """
    if goal_requests_irrigation_minutes_line(user_text):
        return True

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
