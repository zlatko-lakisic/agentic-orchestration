from __future__ import annotations

import sys
from pathlib import Path

import pytest

TOOL_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def tool_root() -> Path:
    return TOOL_ROOT


@pytest.fixture(scope="session")
def config_dir(tool_root: Path) -> Path:
    return tool_root / "config"


@pytest.fixture(scope="session")
def default_workflow_path(config_dir: Path) -> Path:
    return config_dir / "workflows" / "workflow.yaml"
