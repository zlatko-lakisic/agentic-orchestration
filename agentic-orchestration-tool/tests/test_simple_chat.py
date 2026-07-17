"""Tests for simple chat prompt detection."""

from orchestration.goal_format_hints import WEB_PROSE_GOAL_SUFFIX
from orchestration.simple_chat import is_simple_chat_prompt, strip_web_prose_delivery_suffix


def test_who_are_you_is_simple_chat() -> None:
    assert is_simple_chat_prompt("who are you?")
    assert is_simple_chat_prompt("Who are you?")


def test_greetings_are_simple_chat() -> None:
    assert is_simple_chat_prompt("hello")
    assert is_simple_chat_prompt("hi!")
    assert is_simple_chat_prompt("hey")


def test_long_or_multi_line_not_simple_chat() -> None:
    assert not is_simple_chat_prompt("who are you and what can you do for my project today")
    assert not is_simple_chat_prompt("hello\nworld")


def test_research_prompt_not_simple_chat() -> None:
    assert not is_simple_chat_prompt("research kubernetes networking")


def test_web_prose_suffix_stripped_before_classify() -> None:
    wrapped = "who are you?" + WEB_PROSE_GOAL_SUFFIX
    assert is_simple_chat_prompt(wrapped)
    assert strip_web_prose_delivery_suffix(wrapped) == "who are you?"


def test_openclaw_preamble_still_simple_chat() -> None:
    wrapped = (
        "[OpenClaw context]\nbrowser filesystem shell\n[/OpenClaw context]\n\n"
        "User message:\nWho are you?"
    )
    assert is_simple_chat_prompt(wrapped)
