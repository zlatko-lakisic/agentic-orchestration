"""Thinking-only LLM replies must become CrewAI-visible content."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from orchestration.llm_usage import (
    EMPTY_LLM_MESSAGE,
    EmptyLlmResponseError,
    apply_thinking_coalesce,
    looks_like_empty_llm_error,
    looks_like_planning_speak,
    near_context_limit,
)


def _resp(**msg: object) -> SimpleNamespace:
    message = SimpleNamespace(**msg)
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])


def test_coalesce_reasoning_content_when_content_empty() -> None:
    out = apply_thinking_coalesce(
        _resp(content="", reasoning_content="The list is empty.", tool_calls=None)
    )
    assert out.choices[0].message.content == "The list is empty."


def test_coalesce_think_tags_only() -> None:
    out = apply_thinking_coalesce(
        _resp(content="<think>use the file</think>", tool_calls=None)
    )
    assert out.choices[0].message.content == "use the file"


def test_tool_calls_leave_empty_content() -> None:
    out = apply_thinking_coalesce(
        _resp(content="", tool_calls=[{"id": "1"}], reasoning_content="thinking")
    )
    assert out.choices[0].message.content == ""


def test_real_content_unchanged() -> None:
    out = apply_thinking_coalesce(_resp(content="Ship it.", tool_calls=None))
    assert out.choices[0].message.content == "Ship it."


def test_still_empty_raises() -> None:
    with pytest.raises(EmptyLlmResponseError, match="no text"):
        apply_thinking_coalesce(_resp(content="", tool_calls=None))


def test_empty_error_detector() -> None:
    assert looks_like_empty_llm_error(ValueError("Invalid response from LLM call - None or empty."))
    assert looks_like_empty_llm_error(EMPTY_LLM_MESSAGE)
    assert not looks_like_empty_llm_error(ValueError("connection refused"))


def test_planning_speak() -> None:
    assert looks_like_planning_speak("I should read more files via the tool.")
    assert not looks_like_planning_speak("Bug in foo.py: def add(a, b) misses None.")


def test_near_context_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_CONTEXT_LENGTH", "16384")
    assert near_context_limit(prompt_tokens=16000) is True
    assert near_context_limit(prompt_tokens=1000) is False
