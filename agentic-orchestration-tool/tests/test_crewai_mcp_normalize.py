"""Tests for CrewAI MCP dict → MCPServerConfig normalization."""

from __future__ import annotations

import pytest

from orchestration.crewai_mcp_normalize import normalize_mcps_for_crewai
from orchestration.dynamic_planner import user_prompt_for_goal_matching


def test_user_prompt_for_goal_matching_strips_openclaw_preamble() -> None:
    raw = (
        "[OpenClaw context]\n"
        "browser filesystem shell openclaw_bridge\n"
        "[/OpenClaw context]\n\n"
        "User message:\n"
        "Who are you?"
    )
    assert user_prompt_for_goal_matching(raw) == "Who are you?"


def test_user_prompt_for_goal_matching_passthrough() -> None:
    assert user_prompt_for_goal_matching("plain question") == "plain question"


def test_normalize_stdio_dict_to_mcp_server_stdio() -> None:
    pytest.importorskip("crewai.mcp")
    from crewai.mcp import MCPServerStdio

    out = normalize_mcps_for_crewai(
        [
            {
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
                "env": {"FOO": "bar"},
            }
        ]
    )
    assert out is not None
    assert len(out) == 1
    assert isinstance(out[0], MCPServerStdio)
    assert out[0].command == "npx"
    assert out[0].args[-1] == "/tmp"
    assert out[0].env == {"FOO": "bar"}


def test_normalize_streamable_http_dict() -> None:
    pytest.importorskip("crewai.mcp")
    from crewai.mcp import MCPServerHTTP

    out = normalize_mcps_for_crewai(
        [{"url": "https://example.com/mcp", "transport": "streamable-http", "headers": {"A": "1"}}]
    )
    assert out is not None
    assert isinstance(out[0], MCPServerHTTP)
    assert out[0].url == "https://example.com/mcp"


def test_normalize_keeps_strings() -> None:
    out = normalize_mcps_for_crewai(["https://example.com/mcp"])
    assert out == ["https://example.com/mcp"]


def test_agent_coerces_or_accepts_stdio_mcps() -> None:
    """CrewAI 1.12+ coerces stdio dicts; normalize must also produce valid Agent(mcps=...)."""
    from crewai import Agent
    from crewai.mcp import MCPServerStdio

    raw = [{"command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]}]
    agent_raw = Agent(role="r", goal="g", backstory="b", llm="ollama/llama3.2:1b", mcps=raw)
    assert isinstance(agent_raw.mcps[0], MCPServerStdio)

    mcps = normalize_mcps_for_crewai(raw)
    agent = Agent(role="r", goal="g", backstory="b", llm="ollama/llama3.2:1b", mcps=mcps)
    assert agent.mcps is not None
    assert len(agent.mcps) == 1
    assert isinstance(agent.mcps[0], MCPServerStdio)


def test_agent_accepts_normalized_stdio_mcps() -> None:
    """Regression for OpenClaw bridge: raw dicts must not be passed to Agent(mcps=...)."""
    crewai = pytest.importorskip("crewai")
    pytest.importorskip("crewai.mcp")
    from crewai import Agent

    # Skip on ancient crewai that only accepts list[str]
    import crewai as crewai_mod

    ver = getattr(crewai_mod, "__version__", "0")
    parts = [int(x) for x in str(ver).split(".")[:2] if str(x).isdigit()]
    if parts and parts[0] == 1 and len(parts) > 1 and parts[1] < 12:
        pytest.skip(f"crewai {ver} lacks MCPServerStdio; need >=1.12")

    mcps = normalize_mcps_for_crewai(
        [{"command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]}]
    )
    agent = Agent(
        role="r",
        goal="g",
        backstory="b",
        llm="ollama/llama3.2:1b",
        mcps=mcps,
    )
    assert agent.mcps is not None
    assert len(agent.mcps) == 1
