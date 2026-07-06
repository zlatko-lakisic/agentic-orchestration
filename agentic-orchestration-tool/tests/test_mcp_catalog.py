from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.mcp_providers_catalog import (
    load_mcp_providers_catalog,
    mcp_entry_has_api_credentials,
    suggest_mcp_ids_from_user_goal,
    substitute_mcp_env_vars,
)


@pytest.mark.unit
def test_substitute_mcp_env_vars(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MY_TOKEN", "secret")
    raw = "Bearer ${MY_TOKEN} and ${MISSING}"
    assert substitute_mcp_env_vars(raw) == "Bearer secret and "


@pytest.mark.unit
def test_load_mcp_catalog_has_known_ids(config_dir: Path) -> None:
    entries = load_mcp_providers_catalog(config_dir / "mcp_providers")
    ids = {str(e.get("id", "")).strip() for e in entries}
    assert "fetch_url" in ids or len(ids) >= 1


@pytest.mark.unit
def test_suggest_fetch_url_when_goal_has_http_url(
    config_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_MCP_FETCH_ENABLED", "1")
    entries = load_mcp_providers_catalog(config_dir / "mcp_providers")
    fetch = next(e for e in entries if e.get("id") == "fetch_url")
    assert mcp_entry_has_api_credentials(fetch)
    ids = suggest_mcp_ids_from_user_goal(
        "what is https://github.com/zlatko-lakisic/agentic-orchestration about?",
        entries,
    )
    assert "fetch_url" in ids
