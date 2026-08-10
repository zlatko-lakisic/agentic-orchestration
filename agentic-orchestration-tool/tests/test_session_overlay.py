"""Unit tests for ephemeral session overlays (client.* namespace)."""

from __future__ import annotations

import time
from pathlib import Path

import pytest

from orchestration.direct_agent import load_agent_entry
from orchestration.session_overlay import (
    SessionOverlayDeniedError,
    SessionOverlayError,
    clear_overlay,
    clear_overlay_for_connection,
    get_overlay,
    list_active_overlays,
    overlay_run_context,
    register_overlay,
    reset_overlays_for_tests,
)

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _clean_overlays(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("AGENTIC_SERVE_MCP_TUNNEL", "1")
    reset_overlays_for_tests()
    yield
    reset_overlays_for_tests()


def _agent(pid: str = "client.kb_researcher") -> dict:
    return {
        "id": pid,
        "type": "ollama",
        "role": "researcher",
        "goal": "research",
        "backstory": "test",
        "model": "qwen2.5:7b",
        "ollama_host": "workflow",
    }


def _mcp(pid: str = "client.filesystem_local", alias: str = "filesystem") -> dict:
    return {
        "id": pid,
        "description": "tunnel mcp",
        "streamable_http": {"url": f"tunnel://session-mcp/{alias}", "headers": {}},
    }


def test_register_client_agent_visible_via_load_agent_entry(tmp_path: Path) -> None:
    catalog = tmp_path / "agents"
    catalog.mkdir()
    (catalog / "stock.yaml").write_text(
        "id: stock_agent\ntype: ollama\nmodel: x\nrole: r\ngoal: g\nbackstory: b\n",
        encoding="utf-8",
    )
    register_overlay(
        user_id="ada",
        session_id="s1",
        connection_id="c1",
        app_id="testapp",
        agents=[_agent()],
        stock_ids={"stock_agent", "filesystem_local"},
    )
    with overlay_run_context(user_id="ada", session_id="s1", connection_id="c1"):
        entry = load_agent_entry(agent_provider_id="client.kb_researcher", catalog_path=catalog)
    assert entry["id"] == "client.kb_researcher"

    with overlay_run_context(user_id="bob", session_id="s1", connection_id="c2"):
        with pytest.raises(LookupError):
            load_agent_entry(agent_provider_id="client.kb_researcher", catalog_path=catalog)


def test_reject_missing_client_prefix_and_stock_collision() -> None:
    with pytest.raises(SessionOverlayError, match="client\\."):
        register_overlay(
            user_id="ada",
            session_id="s1",
            connection_id="c1",
            app_id="testapp",
            agents=[{"id": "kb_researcher", "type": "ollama"}],
            stock_ids=set(),
        )
    with pytest.raises(SessionOverlayError, match="collide"):
        register_overlay(
            user_id="ada",
            session_id="s1",
            connection_id="c1",
            app_id="testapp",
            agents=[_agent("client.dup")],
            stock_ids={"client.dup", "filesystem_local"},
        )


def test_reject_stdio_in_session_mcp() -> None:
    with pytest.raises(SessionOverlayError, match="stdio"):
        register_overlay(
            user_id="ada",
            session_id="s1",
            connection_id="c1",
            app_id="testapp",
            mcps=[
                {
                    "id": "client.fs",
                    "stdio": {"command": "npx", "args": []},
                }
            ],
            stock_ids=set(),
        )


def test_evict_on_clear_and_disconnect() -> None:
    register_overlay(
        user_id="ada",
        session_id="s1",
        connection_id="c1",
        app_id="testapp",
        agents=[_agent()],
        stock_ids=set(),
    )
    assert get_overlay("ada", "s1") is not None
    assert clear_overlay(user_id="ada", session_id="s1", connection_id="c1") is True
    assert get_overlay("ada", "s1") is None

    register_overlay(
        user_id="ada",
        session_id="s1",
        connection_id="c1",
        app_id="testapp",
        agents=[_agent()],
        stock_ids=set(),
    )
    clear_overlay_for_connection("c1")
    assert get_overlay("ada", "s1") is None


def test_two_identities_isolated() -> None:
    register_overlay(
        user_id="ada",
        session_id="s1",
        connection_id="c1",
        app_id="testapp",
        agents=[_agent("client.a")],
        stock_ids=set(),
    )
    register_overlay(
        user_id="bob",
        session_id="s1",
        connection_id="c2",
        app_id="testapp",
        agents=[_agent("client.b")],
        stock_ids=set(),
    )
    assert get_overlay("ada", "s1").agents[0]["id"] == "client.a"  # type: ignore[union-attr]
    assert get_overlay("bob", "s1").agents[0]["id"] == "client.b"  # type: ignore[union-attr]


def test_ttl_expiry() -> None:
    overlay = register_overlay(
        user_id="ada",
        session_id="s1",
        connection_id="c1",
        app_id="testapp",
        agents=[_agent()],
        ttl_seconds=30,
        stock_ids=set(),
    )
    overlay.expires_at = time.time() - 1
    assert get_overlay("ada", "s1") is None


def test_disabled_flag_rejects(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_SERVE_SESSION_OVERLAY", raising=False)
    with pytest.raises(SessionOverlayError, match="disabled"):
        register_overlay(
            user_id="ada",
            session_id="s1",
            connection_id="c1",
            app_id="testapp",
            agents=[_agent()],
            stock_ids=set(),
        )


def test_mcp_requires_tunnel_flag(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_SERVE_MCP_TUNNEL", raising=False)
    with pytest.raises(SessionOverlayError, match="MCP tunnel is disabled"):
        register_overlay(
            user_id="ada",
            session_id="s1",
            connection_id="c1",
            app_id="testapp",
            mcps=[_mcp()],
            stock_ids=set(),
        )


def test_list_active_overlays_summarizes_sessions() -> None:
    register_overlay(
        user_id="ada",
        session_id="s1",
        connection_id="c1",
        app_id="testapp",
        agents=[_agent()],
        mcps=[_mcp()],
        stock_ids=set(),
    )
    rows = list_active_overlays()
    assert len(rows) == 1
    assert rows[0]["appId"] == "testapp"
    assert rows[0]["sessionId"] == "s1"
    assert rows[0]["agentCount"] == 1
    assert rows[0]["mcpCount"] == 1
    assert rows[0]["tunnelMcpCount"] == 1
    assert rows[0]["agentIds"] == ["client.kb_researcher"]
    assert rows[0]["mcpIds"] == ["client.filesystem_local"]
    assert rows[0].get("clientIp") is None


def test_list_active_overlays_includes_client_ip() -> None:
    register_overlay(
        user_id="ada",
        session_id="s1",
        connection_id="c1",
        app_id="testapp",
        agents=[_agent()],
        stock_ids=set(),
        client_ip="10.0.10.50",
    )
    rows = list_active_overlays()
    assert rows[0]["clientIp"] == "10.0.10.50"

    with pytest.raises(SessionOverlayDeniedError, match="appId is required") as exc:
        register_overlay(
            user_id="ada",
            session_id="s1",
            connection_id="c1",
            app_id="",
            agents=[_agent()],
            stock_ids=set(),
        )
    assert exc.value.error == "app_id_required"
