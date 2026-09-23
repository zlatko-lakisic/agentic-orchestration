"""Detect short identity/greeting prompts (mirrors web perf-options.js)."""

from __future__ import annotations

from orchestration.current_turn import (
    extract_current_turn,
    last_chat_role_block,
    strip_web_prose_delivery_suffix,
)
from orchestration.social_turn import is_social_turn

# Re-export for existing imports.
__all__ = [
    "strip_web_prose_delivery_suffix",
    "last_chat_role_block",
    "user_turn_for_simple_chat",
    "is_simple_chat_prompt",
]


def user_turn_for_simple_chat(text: str) -> str:
    """
    Prefer the real user turn when hosts prepend context (COMSTAR ``<user>``,
    OpenClaw ``User message:``, guard suffixes).
    """
    return extract_current_turn(text)


def is_simple_chat_prompt(text: str) -> bool:
    """True for short greetings/identity questions that should not use crew tools."""
    return is_social_turn(text)
