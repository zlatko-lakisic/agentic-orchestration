from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.config_loader import load_workflow_config
from orchestration.workflow_materializer import build_step_specs


@pytest.mark.unit
def test_build_step_specs_default_workflow(
    default_workflow_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-for-unit-tests")
    cfg = load_workflow_config(default_workflow_path, topic_override="unit-test-topic")
    specs = build_step_specs(cfg, run_id="run-abc", quiet=True)

    assert len(specs) == len(cfg.task_sequence)
    assert [s.step_id for s in specs] == cfg.task_sequence
    assert all(s.run_id == "run-abc" for s in specs)
    assert specs[0].topic == "unit-test-topic"
    assert specs[0].agent_provider["id"] == "researcher"
    assert specs[1].agent_provider["id"] == "writer"
    assert specs[1].prior_output == ""


@pytest.mark.unit
def test_build_step_specs_injects_prior_output(
    default_workflow_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-for-unit-tests")
    cfg = load_workflow_config(default_workflow_path)
    prior = {"research_topic": "research output snippet"}
    specs = build_step_specs(cfg, run_id="run-xyz", prior_outputs=prior, quiet=True)

    assert specs[0].prior_output == ""
    assert specs[1].prior_output == "research output snippet"
    assert "research output snippet" in specs[1].task_description
