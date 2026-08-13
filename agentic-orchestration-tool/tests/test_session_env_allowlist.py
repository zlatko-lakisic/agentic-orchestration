"""Tests for session overlay env + agent allowlists."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from orchestration.agent_allowlist import (
    filter_entries_by_allowlist,
    resolve_allowed_agent_provider_ids,
)
from orchestration.catalog_credentials import catalog_entry_has_api_credentials
from orchestration.session_env import getenv, normalize_session_env, reset_session_env, set_session_env
from orchestration.session_overlay import (
    SessionOverlayError,
    overlay_run_context,
    register_overlay,
    reset_overlays_for_tests,
)


def test_normalize_session_env_allows_provider_keys_only() -> None:
    env = normalize_session_env({"OPENAI_API_KEY": "sk-test", "OPENAI_BASE_URL": "https://api.openai.com/v1"})
    assert env["OPENAI_API_KEY"] == "sk-test"
    with pytest.raises(ValueError, match="not allowed"):
        normalize_session_env({"PATH": "/bin"})


def test_register_overlay_stores_mcp_and_skill_allowlists(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    reset_overlays_for_tests()
    overlay = register_overlay(
        user_id="u1",
        session_id="s2",
        connection_id="c2",
        app_id="comstar-ha",
        env={"OPENAI_API_KEY": "sk"},
        allowed_agent_provider_ids=["gpt_research"],
        allowed_mcp_provider_ids=["search_tavily"],
        allowed_skill_ids=["web_research"],
        catalog_root=tmp_path,
        stock_ids=set(),
    )
    assert overlay.allowed_mcp_provider_ids == ["search_tavily"]
    assert overlay.allowed_skill_ids == ["web_research"]

def test_getenv_prefers_session_overlay_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    token = set_session_env({"OPENAI_API_KEY": "from-reach"})
    try:
        assert getenv("OPENAI_API_KEY") == "from-reach"
        assert catalog_entry_has_api_credentials({"type": "openai", "id": "gpt_research"})
    finally:
        reset_session_env(token)
    assert not catalog_entry_has_api_credentials({"type": "openai", "id": "gpt_research"})


def test_register_overlay_stores_env_and_allowlist(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    reset_overlays_for_tests()
    overlay = register_overlay(
        user_id="u1",
        session_id="s1",
        connection_id="c1",
        app_id="comstar-ha",
        agents=[],
        mcps=[],
        skills=[],
        env={"OPENAI_API_KEY": "sk-comstar"},
        allowed_agent_provider_ids=["gpt_research"],
        catalog_root=tmp_path,
        stock_ids=set(),
    )
    assert overlay.env["OPENAI_API_KEY"] == "sk-comstar"
    assert overlay.allowed_agent_provider_ids == ["gpt_research"]
    with overlay_run_context(user_id="u1", session_id="s1", connection_id="c1"):
        assert getenv("OPENAI_API_KEY") == "sk-comstar"


def test_register_overlay_rejects_disallowed_env(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    reset_overlays_for_tests()
    with pytest.raises(SessionOverlayError, match="not allowed"):
        register_overlay(
            user_id="u1",
            session_id="s1",
            connection_id="c1",
            app_id="comstar-ha",
            env={"HOME": "/tmp"},
            catalog_root=tmp_path,
            stock_ids=set(),
        )


def test_resolve_allowed_agent_provider_ids_intersects(tmp_path: Path) -> None:
    root = tmp_path / "__orchestrator_api_tokens__"
    root.mkdir()
    (root / "app-prefs.json").write_text(
        json.dumps(
            {
                "comstar-ha": {
                    "dynamicPlanning": True,
                    "allowedAgentProviderIds": ["gpt_research", "ollama_fast"],
                },
                "home-assistant": {
                    "allowedAgentProviderIds": ["ollama_fast"],
                },
            }
        ),
        encoding="utf-8",
    )
    assert resolve_allowed_agent_provider_ids(
        tool_root=tmp_path,
        app_id="comstar-ha",
        request_ids=None,
        overlay_ids=None,
    ) == ["gpt_research", "ollama_fast"]
    assert resolve_allowed_agent_provider_ids(
        tool_root=tmp_path,
        app_id="home-assistant",
        request_ids=["gpt_research", "ollama_fast"],
        overlay_ids=None,
    ) == ["ollama_fast"]
    assert (
        resolve_allowed_agent_provider_ids(
            tool_root=tmp_path,
            app_id="other",
            request_ids=None,
            overlay_ids=None,
        )
        is None
    )


def test_filter_entries_keeps_client_namespace() -> None:
    entries = [
        {"id": "gpt_research"},
        {"id": "client.voice"},
        {"id": "ollama_fast"},
    ]
    out = filter_entries_by_allowlist(entries, ["gpt_research"])
    assert [e["id"] for e in out] == ["gpt_research", "client.voice"]
