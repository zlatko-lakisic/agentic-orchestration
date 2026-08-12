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
def test_xquik_mcp_catalog_entry_requires_api_key(
    config_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("XQUIK_API_KEY", raising=False)
    entries = load_mcp_providers_catalog(config_dir / "mcp_providers")
    xquik = next(e for e in entries if e.get("id") == "xquik")

    assert not mcp_entry_has_api_credentials(xquik)

    monkeypatch.setenv("XQUIK_API_KEY", "xq_test")

    assert mcp_entry_has_api_credentials(xquik)


@pytest.mark.unit
def test_bargo_congress_mcp_catalog_entry_requires_api_key(
    config_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("BARGO_API_KEY", raising=False)
    entries = load_mcp_providers_catalog(config_dir / "mcp_providers")
    bargo = next(e for e in entries if e.get("id") == "bargo_congress")

    assert not mcp_entry_has_api_credentials(bargo)

    monkeypatch.setenv("BARGO_API_KEY", "bargo_test")

    assert mcp_entry_has_api_credentials(bargo)


@pytest.mark.unit
def test_weather_mcp_catalog_entry_opt_in(
    config_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("AGENTIC_MCP_WEATHER_ENABLED", raising=False)
    entries = load_mcp_providers_catalog(config_dir / "mcp_providers")
    weather = next(e for e in entries if e.get("id") == "weather_mcp")

    assert not mcp_entry_has_api_credentials(weather)
    assert weather.get("stdio", {}).get("command") == "npx"
    assert "@dangahagan/weather-mcp@latest" in weather.get("stdio", {}).get("args", [])

    monkeypatch.setenv("AGENTIC_MCP_WEATHER_ENABLED", "1")
    assert mcp_entry_has_api_credentials(weather)


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
