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


@pytest.mark.unit
def test_ollama_build_agent_forwards_num_ctx(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    def _fake_llm(**kwargs: Any) -> MagicMock:
        captured.update(kwargs)
        return MagicMock(name="LLM")

    fake_agent = MagicMock(name="Agent")
    _stub_fetch_url_tool(monkeypatch)
    monkeypatch.setattr("agent_providers.ollama_provider.LLM", _fake_llm)
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
def test_ollama_build_agent_omits_num_ctx_when_unset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    def _fake_llm(**kwargs: Any) -> MagicMock:
        captured.update(kwargs)
        return MagicMock(name="LLM")

    _stub_fetch_url_tool(monkeypatch)
    monkeypatch.setattr("agent_providers.ollama_provider.LLM", _fake_llm)
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
