"""Detect strict output-format constraints from natural-language goals."""

from __future__ import annotations

import os
import re

WEB_PROSE_GOAL_SUFFIX = (
    "\n\n[Delivery format: Write the user-facing answer in clear, natural language "
    "(short paragraphs or bullet lists). Match the user's language; default to English. "
    "Do not mix scripts or switch into Chinese, Japanese, or Korean unless the user wrote "
    "in that language. Do not use JSON, raw object dumps, LaTeX, "
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


_GATE_PEOPLE_TOKEN_RE = re.compile(r"(?i)\b(?:no)?people\b")
_NO_TOOLS_RE = re.compile(
    r"(?i)\b(?:do\s+not|don't|never)\s+call\s+tools\b|"
    r"\b(?:do\s+not|don't)\s+output\s+json\b|"
    r"\bno\s+tool(?:s|-call)?\b|"
    r"\btool_choice\b",
)


def goal_requests_gate_people_lines(user_text: str) -> bool:
    """True for HA gate LLM Vision prompts that require PEOPLE/NOPEOPLE line output."""
    t = str(user_text or "").strip()
    if not t:
        return False
    lower = t.lower()
    compact = re.sub(r"\s+", "", lower)
    if "people|nopeople" in compact or "nopeople|people" in compact:
        return True
    if "people" in lower and "nopeople" in lower:
        return True
    # Common HA phrasing: "PEOPLE or NOPEOPLE" / "NOPEOPLE or PEOPLE"
    if _GATE_PEOPLE_TOKEN_RE.search(t) and (
        "exactly 3" in lower
        or "exactly three" in lower
        or "3 lines" in lower
        or "three lines" in lower
        or "line1" in compact
        or "mobile alert" in lower
    ):
        return True
    return False


def goal_requests_direct_vision_completion(user_text: str) -> bool:
    """
    True for multimodal clients (esp. HA LLM Vision) that want a plain-text answer
    with no tool loop — tool-call JSON must never be the final ``message.content``.
    """
    t = str(user_text or "").strip()
    if not t:
        return False
    lower = t.lower()
    gate = goal_requests_gate_people_lines(t)
    no_tools = bool(_NO_TOOLS_RE.search(t))
    if gate:
        return True
    if no_tools and (
        "image" in lower
        or "## attached files" in lower
        or "[agentic: media grounding evidence]" in lower
        or "vision" in lower
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
- **Direct vision / gate PEOPLE lines:** If the goal forbids tools or requires ``PEOPLE``/``NOPEOPLE`` plain-text lines, do not attach MCP tools and do not emit tool-call JSON — answer from harness media evidence only.
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
    if goal_requests_gate_people_lines(user_text):
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
