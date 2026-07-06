"""Detect short identity/greeting prompts (mirrors web perf-options.js)."""

from __future__ import annotations

import re

from orchestration.goal_format_hints import WEB_PROSE_GOAL_SUFFIX


def strip_web_prose_delivery_suffix(text: str) -> str:
    """Remove the web UI prose delivery suffix before classifying the user prompt."""
    t = str(text or "").strip()
    suffix = WEB_PROSE_GOAL_SUFFIX.strip()
    if suffix and t.endswith(suffix):
        return t[: -len(suffix)].strip()
    t = re.sub(r"\[Delivery format:[^\]]*\]", "", t, flags=re.IGNORECASE).strip()
    return t


def is_simple_chat_prompt(text: str) -> bool:
    """True for short greetings/identity questions that should not use crew tools."""
    t = strip_web_prose_delivery_suffix(text).strip()
    if not t or len(t) > 120:
        return False
    if "\n" in t:
        return False
    if re.match(
        r"^(who are you\??|what are you\??|hello!*|hi!*|hey!*|help\??|what can you do\??|thanks!?|thank you\.?)$",
        t,
        re.I,
    ):
        return True
    if (
        len(t) <= 48
        and re.match(r"^(who|what|hello|hi|hey|help|thanks)\b", t, re.I)
        and not re.search(r"\b(and|then|also|research|analyze|write|code|implement|plan|build|compare)\b", t, re.I)
    ):
        return True
    return False
