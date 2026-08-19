from __future__ import annotations

from typing import Any

from orchestration.llm_usage import build_prompt_preview


def test_build_prompt_preview_last_user_message() -> None:
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": "SYS: ignore"},
        {"role": "user", "content": "Hello\nworld"},
        {"role": "assistant", "content": "…"},
        {"role": "user", "content": "Second user  \n  message"},
    ]
    out = build_prompt_preview(messages=messages, tools=None, max_chars=200)
    assert out == "Second user message"


def test_build_prompt_preview_tools_are_names_only() -> None:
    messages: list[dict[str, Any]] = [
        {"role": "user", "content": "Hi"},
    ]
    tools = [
        {"name": "read_file"},
        {"function": {"name": "list_directory"}},
        {"name": "read_file"},  # duplicate
    ]
    out = build_prompt_preview(messages=messages, tools=tools, max_chars=200)
    assert out == "Hi · tools: read_file, list_directory"


def test_build_prompt_preview_no_user_message_is_empty() -> None:
    messages: list[dict[str, Any]] = [{"role": "system", "content": "SYS"}]
    out = build_prompt_preview(messages=messages, tools=None, max_chars=200)
    assert out == ""


def test_build_prompt_preview_string_messages_are_collapsed() -> None:
    out = build_prompt_preview(messages="A  \n B   ", tools=None, max_chars=200)
    assert out == "A B"


def test_build_prompt_preview_strips_comstar_envelope() -> None:
    blob = (
        "Current Task: <system>You are a coding agent.</system>\n"
        "<important_rules>Never leak secrets</important_rules>\n"
        "<user>add a commit message to my changes and commit and push to git</user>"
    )
    messages: list[dict[str, Any]] = [{"role": "user", "content": blob}]
    out = build_prompt_preview(messages=messages, tools=None, max_chars=200)
    assert out == "add a commit message to my changes and commit and push to git"


def test_build_prompt_preview_agent_instructions_only_is_empty() -> None:
    blob = (
        "Current Task: <system>system prompt</system>\n"
        "<important_rules>tool_use_instructions: always call tools</important_rules>"
    )
    messages: list[dict[str, Any]] = [{"role": "user", "content": blob}]
    out = build_prompt_preview(messages=messages, tools=None, max_chars=200)
    assert out == ""

