"""Detect short social / phatic turns that should skip the planner LLM."""

from __future__ import annotations

import os
import re

from orchestration.current_turn import extract_current_turn

_SOCIAL_START = re.compile(
    r"^(?:"
    r"hi|hello|hey|yo|"
    r"good (?:morning|afternoon|evening|night)|"
    r"how are you(?: doing)?(?: today)?|"
    r"how(?:'s| is) it going|"
    r"how have you been|"
    r"what(?:'s| is) up|sup|"
    r"what are you (?:up to|doing)|"
    r"are you (?:there|awake|listening)|"
    r"do you want to (?:play|talk|chat)|"
    r"want to play|"
    r"thanks|thank you|cheers|good job|nice|cool|ok(?:ay)?|"
    r"bye|good ?night|see you|"
    r"who are you|what are you|what can you do|help"
    r")\b",
    re.IGNORECASE,
)

# Task / domain cues — social if matched only as "do you want to play", not "play jazz".
_TASK_OR_DOMAIN = re.compile(
    r"\b(?:"
    r"turn|set|open|close|start|stop|water|irrigat|camera|door|lock|"
    r"temperature|thermostat|weather|news|remind|schedule|calendar|"
    r"play (?:music|song|jazz|some)|"
    r"search|find|write|summar|explain|status|"
    r"home|irrigation|security|climate|appliance"
    r")\b",
    re.IGNORECASE,
)

_TRAILING_NAME_PUNCT = re.compile(
    r"[\s,]+(?:comstar|please)[\s!.?]*$",
    re.IGNORECASE,
)


def social_short_circuit_enabled() -> bool:
    return os.getenv("AGENTIC_PLANNER_SOCIAL_SHORT_CIRCUIT", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def is_social_turn(text: str) -> bool:
    """True for short greetings / phatic questions (no tools, no planner history)."""
    t = extract_current_turn(text)
    if not t:
        return False
    if "\n" in t:
        return False
    if len(t) > 80:
        return False
    words = t.split()
    if len(words) > 12:
        return False
    cleaned = _TRAILING_NAME_PUNCT.sub("", t).strip(" !.?,")
    if not cleaned:
        return False
    if not _SOCIAL_START.match(cleaned):
        return False
    # Allow "do you want to play" but reject domain/task verbs.
    if re.search(r"\bplay\b", cleaned, re.I) and not re.search(
        r"\b(?:do you want to play|want to play)\b", cleaned, re.I
    ):
        return False
    if _TASK_OR_DOMAIN.search(cleaned):
        return False
    # Reject compound asks that start social then continue ("who are you and what can you do…").
    m = _SOCIAL_START.match(cleaned)
    assert m is not None
    leftover = cleaned[m.end() :].strip(" !.?,")
    leftover_words = [
        w
        for w in re.findall(r"[A-Za-z]+", leftover)
        if w.lower() not in {"please", "comstar", "there", "today", "now"}
    ]
    if len(leftover_words) > 2:
        return False
    return True
