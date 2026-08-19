"""LLM call progress lines and ReAct snippet emission."""

from __future__ import annotations

from agent_providers.ollama_provider import (
    _emit_llm_progress,
    _emit_react_snippets,
    reset_llm_call_index,
)
from orchestration.progress_sink import emit_progress, progress_callback


def test_llm_progress_dedupes_consulting_and_continuing() -> None:
    reset_llm_call_index()
    lines: list[str] = []

    with progress_callback(lines.append):
        _emit_llm_progress("ollama/qwen3.6:27b")
        _emit_llm_progress("ollama/qwen3.6:27b")
        _emit_llm_progress("ollama/qwen3.6:27b")

    assert lines == [
        "(llm) consulting qwen3.6:27b",
        "(llm) continuing qwen3.6:27b",
    ]


def test_emit_react_snippets_from_text() -> None:
    reset_llm_call_index()
    lines: list[str] = []
    blob = (
        "Thought: pre-commit hook modified package.json; re-staging before commit\n"
        "Action: run_terminal_command\n"
        "Action Input: {\"command\": \"git add package.json\"}"
    )
    with progress_callback(lines.append):
        _emit_react_snippets(blob)

    assert any("(agent) Thought:" in line for line in lines)
    assert any("(agent) Action:" in line for line in lines)
    assert any("pre-commit" in line for line in lines)
