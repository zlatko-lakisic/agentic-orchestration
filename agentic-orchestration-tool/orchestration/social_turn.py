"""Detect short social / phatic / closing-ack turns that should skip the planner LLM."""

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

# Closing / decline / "I'm fine" answers to offers like "anything else?" / "how about you?"
_CLOSING_OR_ACK = re.compile(
    r"^(?:"
    r"no(?:pe)?"
    r"(?:[,.]?\s+(?:thanks|thank you|"
    r"i(?:'m| am) (?:good|fine|okay|ok|all set)(?: for now)?|"
    r"i(?:'m| am) good))?"
    r"|"
    r"no thanks|no thank you|"
    r"(?:i(?:'m| am) )?(?:good|fine|okay|ok|all set)(?: for now)?"
    r"(?:[,.]?\s+(?:thanks|thank you))?"
    r"|"
    r"nothing(?: else)?(?: for now)?|"
    r"that(?:'s| is) (?:all|it|enough)|"
    r"not right now|maybe later|all good|nah|"
    r"(?:i(?:'m| am) )?(?:doing )?(?:well|pretty good|great)"
    r"(?:[,.]?\s+(?:thanks|thank you|too))?"
    r")[\s!.?]*$",
    re.IGNORECASE,
)

# Short answers when the prior assistant turn ended in a question.
_SHORT_REPLY = re.compile(
    r"^(?:"
    r"yes|yeah|yep|yup|sure|ok(?:ay)?|please|do it|go ahead|"
    r"no|nope|nah|not really|not now|"
    r"i(?:'m| am) (?:good|fine|okay|ok|all set|well)(?: for now)?"
    r")[\s!.?]*$",
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


def _normalize_turn(text: str) -> str:
    t = extract_current_turn(text)
    if not t or "\n" in t or len(t) > 80:
        return ""
    if len(t.split()) > 12:
        return ""
    return _TRAILING_NAME_PUNCT.sub("", t).strip(" !.?,")


def is_closing_ack(text: str) -> bool:
    """True for declines / 'I'm good' closings (answers to offers, not new goals)."""
    cleaned = _normalize_turn(text)
    if not cleaned:
        return False
    if _TASK_OR_DOMAIN.search(cleaned):
        return False
    return bool(_CLOSING_OR_ACK.match(cleaned))


def prior_assistant_asked_question(prior_assistant: str | None) -> bool:
    """True when the last assistant utterance looks like a question to the user."""
    body = str(prior_assistant or "").strip()
    if not body:
        return False
    # Prefer the last non-empty line (voice replies often end with "How about you?").
    lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
    tail = lines[-1] if lines else body
    if "?" in tail[-40:]:
        return True
    # Soft cues without '?': offers / check-ins common on hallway voice.
    return bool(
        re.search(
            r"\b(?:how about you|anything (?:else|you need)|need (?:anything|help)|"
            r"what else|can i help)\b",
            tail,
            re.IGNORECASE,
        )
    )


def is_reply_to_assistant_question(text: str, prior_assistant: str | None) -> bool:
    """Short yes/no/ack when the prior assistant turn asked the user something."""
    if not prior_assistant_asked_question(prior_assistant):
        return False
    cleaned = _normalize_turn(text)
    if not cleaned:
        return False
    if _TASK_OR_DOMAIN.search(cleaned):
        return False
    if is_closing_ack(text) or is_social_turn(text):
        return True
    return bool(_SHORT_REPLY.match(cleaned))


def is_social_turn(text: str) -> bool:
    """True for short greetings / phatic questions (no tools, no planner history)."""
    cleaned = _normalize_turn(text)
    if not cleaned:
        return False
    if not _SOCIAL_START.match(cleaned):
        # Closing acks are also treated as social for simple_chat / pruning.
        return is_closing_ack(text)
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


def should_short_circuit_turn(
    text: str,
    *,
    prior_assistant: str | None = None,
) -> bool:
    """Planner short-circuit: greetings, closings, or short answers to assistant questions."""
    if is_social_turn(text) or is_closing_ack(text):
        return True
    return is_reply_to_assistant_question(text, prior_assistant)
