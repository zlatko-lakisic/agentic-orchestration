"""Tests for Reach/public catalog metadata."""

from __future__ import annotations

from pathlib import Path

from orchestration.catalog_public import build_reach_catalog
from orchestration.session_env import (
    agent_type_required_secrets,
    entry_required_secrets,
    normalize_session_env,
    session_env_allowed_keys,
)


def test_agent_type_required_secrets_openai_any_of() -> None:
    fields = agent_type_required_secrets("openai")
    names = {f["name"] for f in fields}
    assert "OPENAI_API_KEY" in names
    assert any(f.get("anyOfGroup") == "openai_auth" for f in fields)


def test_entry_required_secrets_all_and_any() -> None:
    all_only = entry_required_secrets({"id": "x", "required_env": ["FOO_KEY"]})
    assert all_only[0]["name"] == "FOO_KEY"
    assert all_only[0]["required"] is True

    any_only = entry_required_secrets(
        {"id": "search_tavily", "required_env_any": ["TAVILY_API_KEY", "ALT_KEY"]}
    )
    assert {f["name"] for f in any_only} == {"TAVILY_API_KEY", "ALT_KEY"}
    assert all(f["required"] is False for f in any_only)
    assert all(f["anyOfGroup"] == "required_env_any:search_tavily" for f in any_only)


def test_build_reach_catalog_includes_stock_and_secrets(tool_root: Path | None = None) -> None:
    root = Path(__file__).resolve().parents[1]
    cat = build_reach_catalog(root)
    assert cat["ok"] is True
    assert cat["counts"]["agents"] >= 1
    assert cat["counts"]["mcps"] >= 1
    assert any(a["id"] for a in cat["agents"])
    tavily = next((m for m in cat["mcps"] if m["id"] == "search_tavily"), None)
    assert tavily is not None
    secret_names = {s["name"] for s in tavily["requiredSecrets"]}
    assert "TAVILY_API_KEY" in secret_names
    assert tavily["enableField"] == "allowedMcpProviderIds"
    assert "TAVILY_API_KEY" in cat["sessionEnvAllowedKeys"]


def test_normalize_session_env_allows_catalog_mcp_keys() -> None:
    root = Path(__file__).resolve().parents[1]
    allowed = session_env_allowed_keys(root)
    assert "TAVILY_API_KEY" in allowed
    env = normalize_session_env({"TAVILY_API_KEY": "tvly-test"}, tool_root=root)
    assert env["TAVILY_API_KEY"] == "tvly-test"
