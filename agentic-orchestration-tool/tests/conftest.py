from __future__ import annotations

import sys
import types
from pathlib import Path
from unittest.mock import MagicMock

import pytest

TOOL_ROOT = Path(__file__).resolve().parents[1]

try:
    import crewai  # noqa: F401
except ImportError:
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


@pytest.fixture(scope="session")
def tool_root() -> Path:
    return TOOL_ROOT


@pytest.fixture(scope="session")
def config_dir(tool_root: Path) -> Path:
    return tool_root / "config"


@pytest.fixture(scope="session")
def default_workflow_path(config_dir: Path) -> Path:
    return config_dir / "workflows" / "workflow.yaml"
