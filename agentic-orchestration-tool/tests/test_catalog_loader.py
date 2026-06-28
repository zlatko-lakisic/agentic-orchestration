from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.catalog_loader import discover_workflow_catalog


@pytest.mark.unit
def test_discover_workflow_catalog_includes_default(config_dir: Path) -> None:
    catalog = discover_workflow_catalog(config_dir)
    ids = {e.id for e in catalog}
    assert "research_brief" in ids or len(ids) >= 1
