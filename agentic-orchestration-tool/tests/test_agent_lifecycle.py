"""Unit tests for agent lifecycle frame helpers."""

from __future__ import annotations

import pytest

from orchestration.agent_lifecycle import (
    AGENT_STATE_LOADING,
    AGENT_STATE_PULLING,
    AGENT_STATE_READY,
    agent_state_frame,
    looks_like_ollama_pull_line,
    ollama_agent_ids_for_model,
    parse_pull_progress,
)


@pytest.mark.unit
def test_agent_state_frame_pulling_is_first_class() -> None:
    frame = agent_state_frame(
        "client.campaign_director",
        AGENT_STATE_PULLING,
        reason="ollama_pull",
        model="qwen3.5:9b",
        progress=0.42,
        detail="pulling qwen3.5:9b 42%",
    )
    assert frame["type"] == "agent_state"
    assert frame["state"] == "pulling"
    assert frame["agentProviderId"] == "client.campaign_director"
    assert frame["model"] == "qwen3.5:9b"
    assert frame["progress"] == pytest.approx(0.42)


@pytest.mark.unit
def test_agent_state_frame_loading_is_first_class() -> None:
    frame = agent_state_frame(
        "client.campaign_director",
        AGENT_STATE_LOADING,
        reason="vram_warmup",
        model="qwen3.5:4b",
        detail="loading qwen3.5:4b into VRAM",
    )
    assert frame["state"] == "loading"
    assert frame["reason"] == "vram_warmup"


@pytest.mark.unit
def test_agent_state_frame_rejects_unknown_state() -> None:
    with pytest.raises(ValueError):
        agent_state_frame("client.x", "warming")


@pytest.mark.unit
def test_ollama_agent_ids_for_model() -> None:
    agents = [
        {"id": "client.a", "type": "ollama", "model": "qwen3.5:9b"},
        {"id": "client.b", "type": "openai", "model": "gpt-4o"},
        {"id": "client.c", "type": "ollama", "model": "llava:7b"},
    ]
    assert ollama_agent_ids_for_model(agents, "qwen3.5:9b") == ["client.a"]
    assert ollama_agent_ids_for_model(agents, "llava:7b") == ["client.c"]


@pytest.mark.unit
def test_parse_pull_progress_and_detect() -> None:
    assert looks_like_ollama_pull_line("ollama model missing: x; pulling via http://…")
    assert parse_pull_progress("pulling manifest 42%") == pytest.approx(0.42)
    assert agent_state_frame("client.a", AGENT_STATE_READY)["state"] == "ready"
