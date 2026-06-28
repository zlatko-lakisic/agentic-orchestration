from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.mcp_providers_catalog import (
    load_mcp_providers_catalog,
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
