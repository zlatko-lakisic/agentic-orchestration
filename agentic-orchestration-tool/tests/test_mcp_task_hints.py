"""Tests for MCP task hints and tool-call leak detection."""

from orchestration.mcp_task_hints import (
    augment_task_description_for_mcps,
    augment_task_description_for_mcp_leak_retry,
    looks_like_mcp_tool_call_leak,
)


def test_looks_like_mcp_tool_call_leak_detects_fetch_parameters() -> None:
    leaked = (
        "name: python_m_mcp_server_fetch\n"
        'parameters: {"url":"https://github.com/zlatko-lakisic/agentic-orchestration",'
        '"max_length":5000}'
    )
    assert looks_like_mcp_tool_call_leak(leaked)


def test_looks_like_mcp_tool_call_leak_ignores_normal_prose() -> None:
    assert not looks_like_mcp_tool_call_leak(
        "This repo is about agentic AI orchestration with CrewAI and MCP."
    )


def test_augment_task_description_for_fetch_url() -> None:
    out = augment_task_description_for_mcps("Summarize the repo.", ["fetch_url"])
    assert "fetch MCP tool" in out
    assert "fetch_url" not in out.split("[agentic: MCP task instructions]")[0]


def test_augment_task_description_idempotent() -> None:
    once = augment_task_description_for_mcps("Do it.", ["fetch_url"])
    twice = augment_task_description_for_mcps(once, ["fetch_url"])
    assert once == twice


def test_augment_task_description_for_mcp_leak_retry() -> None:
    out = augment_task_description_for_mcp_leak_retry("Summarize.", ["fetch_url"])
    assert "[agentic: MCP retry]" in out
    assert "Invoke the fetch tool now" in out
