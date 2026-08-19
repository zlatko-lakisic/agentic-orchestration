"""Per-agent num_ctx from catalog YAML reaches the CrewAI LLM kwargs."""

from __future__ import annotations

import sys
import types
from typing import Any
from unittest.mock import MagicMock

import pytest

# Local/dev hosts may lack crewai; stub enough for provider imports.
if "crewai" not in sys.modules:
    _crewai = types.ModuleType("crewai")
    _crewai.Agent = MagicMock(name="Agent")  # type: ignore[attr-defined]
    _crewai.LLM = MagicMock(name="LLM")  # type: ignore[attr-defined]
    _crewai_llm = types.ModuleType("crewai.llm")
    _crewai_llm.LLM = MagicMock(name="LLM")  # type: ignore[attr-defined]
    _crewai_tools = types.ModuleType("crewai.tools")
    _crewai_tools.BaseTool = object  # type: ignore[attr-defined]
    sys.modules["crewai"] = _crewai
    sys.modules["crewai.llm"] = _crewai_llm
    sys.modules["crewai.tools"] = _crewai_tools

from agent_providers.base import AgentProviderConfig  # noqa: E402
from agent_providers.ollama_provider import OllamaProvider  # noqa: E402


def _stub_fetch_url_tool(monkeypatch: pytest.MonkeyPatch) -> None:
    mod = types.ModuleType("orchestration.fetch_url_tool")
    mod.partition_fetch_stdio_mcps = lambda mcps: (list(mcps) if mcps else [], [])  # type: ignore[attr-defined]
    mod.attach_fetch_url_tool_to_agents = lambda _agents: None  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "orchestration.fetch_url_tool", mod)
    fs_mod = types.ModuleType("orchestration.filesystem_tunnel_tool")
    fs_mod.partition_filesystem_tunnel_mcps = lambda mcps: (list(mcps) if mcps else [], [])  # type: ignore[attr-defined]
    fs_mod.attach_filesystem_tunnel_tools_to_agents = lambda *_a, **_k: False  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "orchestration.filesystem_tunnel_tool", fs_mod)


@pytest.mark.unit
def test_ollama_build_agent_forwards_num_ctx(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    def _fake_llm(**kwargs: Any) -> MagicMock:
        captured.update(kwargs)
        return MagicMock(name="LLM")

    fake_agent = MagicMock(name="Agent")
    _stub_fetch_url_tool(monkeypatch)
    monkeypatch.setattr("agent_providers.ollama_provider.ThinkingAwareLLM", _fake_llm)
    monkeypatch.setattr("agent_providers.ollama_provider.Agent", lambda **_k: fake_agent)
    monkeypatch.setattr(
        "agent_providers.ollama_provider.litellm_api_base_for_ollama",
        lambda: "http://agentic-ollama:11434",
    )

    cfg = AgentProviderConfig(
        id="ollama_granite_code",
        role="Software Engineer",
        goal="Write code",
        backstory="You write code.",
        model="granite-code",
        provider_type="ollama",
        provider_options={"num_ctx": 16384},
        ollama_host="workflow",
        selfcontained=False,
    )
    provider = OllamaProvider(cfg)
    agent = provider.build_agent()
    assert agent is fake_agent
    assert captured["model"] == "ollama/granite-code"
    assert captured["api_base"] == "http://agentic-ollama:11434"
    assert captured["is_litellm"] is True
    assert captured["num_ctx"] == 16384


@pytest.mark.unit
def test_ollama_build_agent_sets_max_iter(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    def _fake_agent(**kwargs: Any) -> MagicMock:
        captured.update(kwargs)
        agent = MagicMock(name="Agent")
        agent.mcps = None
        return agent

    _stub_fetch_url_tool(monkeypatch)
    monkeypatch.setattr("agent_providers.ollama_provider.ThinkingAwareLLM", lambda **_k: MagicMock(name="LLM"))
    monkeypatch.setattr("agent_providers.ollama_provider.Agent", _fake_agent)
    monkeypatch.setattr(
        "agent_providers.ollama_provider.litellm_api_base_for_ollama",
        lambda: "http://127.0.0.1:11434",
    )
    monkeypatch.delenv("AGENTIC_OLLAMA_MAX_ITER", raising=False)

    cfg = AgentProviderConfig(
        id="ollama_llama",
        role="Assistant",
        goal="Help",
        backstory="Helpful.",
        model="llama3.2:3b",
        provider_type="ollama",
        provider_options={},
    )
    OllamaProvider(cfg).build_agent()
    assert captured["max_iter"] == 6

    captured.clear()
    monkeypatch.setenv("AGENTIC_OLLAMA_MAX_ITER", "4")
    OllamaProvider(cfg).build_agent()
    assert captured["max_iter"] == 4


@pytest.mark.unit
def test_ollama_build_agent_partitions_fetch_stdio(monkeypatch: pytest.MonkeyPatch) -> None:
    from types import SimpleNamespace

    captured: dict[str, Any] = {}

    def _fake_agent(**kwargs: Any) -> MagicMock:
        captured.update(kwargs)
        agent = MagicMock(name="Agent")
        agent.mcps = kwargs.get("mcps")
        return agent

    monkeypatch.setattr("agent_providers.ollama_provider.ThinkingAwareLLM", lambda **_k: MagicMock(name="LLM"))
    monkeypatch.setattr("agent_providers.ollama_provider.Agent", _fake_agent)
    monkeypatch.setattr(
        "agent_providers.ollama_provider.litellm_api_base_for_ollama",
        lambda: "http://127.0.0.1:11434",
    )
    monkeypatch.setattr(
        "orchestration.mcp_stdio_hygiene.drop_stdio_mcps_that_fail_handshake",
        lambda mcps: list(mcps) if mcps else [],
    )
    monkeypatch.delenv("AGENTIC_OLLAMA_MAX_ITER", raising=False)

    cfg = AgentProviderConfig(
        id="ollama_llama",
        role="Assistant",
        goal="Help",
        backstory="Helpful.",
        model="llama3.2:3b",
        provider_type="ollama",
        provider_options={},
    )
    fetch = SimpleNamespace(command="uvx", args=["mcp-server-fetch"])
    other = SimpleNamespace(command="python", args=["-m", "mcp_servers.media_understand"])
    OllamaProvider(cfg).build_agent(mcps=[fetch, other])
    assert captured.get("mcps") == [other]
    assert captured["max_iter"] == 6


@pytest.mark.unit
def test_ollama_build_agent_omits_num_ctx_when_unset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    def _fake_llm(**kwargs: Any) -> MagicMock:
        captured.update(kwargs)
        return MagicMock(name="LLM")

    _stub_fetch_url_tool(monkeypatch)
    monkeypatch.setattr("agent_providers.ollama_provider.ThinkingAwareLLM", _fake_llm)
    monkeypatch.setattr(
        "agent_providers.ollama_provider.Agent", lambda **_k: MagicMock(name="Agent")
    )
    monkeypatch.setattr(
        "agent_providers.ollama_provider.litellm_api_base_for_ollama",
        lambda: "http://127.0.0.1:11434",
    )

    cfg = AgentProviderConfig(
        id="ollama_llama",
        role="Assistant",
        goal="Help",
        backstory="Helpful.",
        model="llama3.2:3b",
        provider_type="ollama",
        provider_options={},
    )
    OllamaProvider(cfg).build_agent()
    assert "num_ctx" not in captured
    assert "think" not in captured


@pytest.mark.unit
def test_ollama_build_agent_disables_think_for_filesystem_tunnel(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    def _fake_llm(**kwargs: Any) -> MagicMock:
        captured.update(kwargs)
        return MagicMock(name="LLM")

    _stub_fetch_url_tool(monkeypatch)
    monkeypatch.setattr("agent_providers.ollama_provider.ThinkingAwareLLM", _fake_llm)
    monkeypatch.setattr(
        "agent_providers.ollama_provider.Agent", lambda **_k: MagicMock(name="Agent")
    )
    monkeypatch.setattr(
        "agent_providers.ollama_provider.litellm_api_base_for_ollama",
        lambda: "http://127.0.0.1:11434",
    )
    monkeypatch.setattr(
        "orchestration.mcp_stdio_hygiene.drop_stdio_mcps_that_fail_handshake",
        lambda mcps: list(mcps) if mcps else [],
    )

    cfg = AgentProviderConfig(
        id="client.code_assistant",
        role="Assistant",
        goal="Help",
        backstory="Helpful.",
        model="qwen3.6:27b",
        provider_type="ollama",
        provider_options={},
    )
    OllamaProvider(cfg).build_agent(
        mcps=[{"url": "http://localhost:8766/t/abc/filesystem"}]
    )
    assert captured.get("think") is False


@pytest.mark.unit
def test_num_ctx_lands_in_provider_options_from_yaml() -> None:
    from agent_providers.factory import agent_provider_from_dict

    provider = agent_provider_from_dict(
        {
            "id": "ollama_granite_code",
            "type": "ollama",
            "role": "Software Engineer",
            "goal": "Write code",
            "backstory": "You write code.",
            "model": "granite-code",
            "num_ctx": 16384,
            "min_vram_gb": 8,
        },
        default_model="llama3.2:3b",
    )
    assert provider.config.provider_options.get("num_ctx") == 16384
