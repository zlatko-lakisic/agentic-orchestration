from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.config_loader import load_workflow_config, raw_mcp_spec_for_task


@pytest.mark.unit
def test_load_default_workflow(default_workflow_path: Path) -> None:
    cfg = load_workflow_config(default_workflow_path)
    assert cfg.process == "sequential"
    assert len(cfg.agent_providers) >= 2
    assert cfg.task_sequence == ["research_topic", "write_brief"]
    assert cfg.tasks[0].agent_provider_id == "researcher"
    assert cfg.tasks[1].agent_provider_id == "writer"


@pytest.mark.unit
def test_task_mcp_inheritance(default_workflow_path: Path) -> None:
    cfg = load_workflow_config(default_workflow_path)
    task = cfg.tasks[0]
    assert raw_mcp_spec_for_task(task, cfg) == list(cfg.mcp_providers)
