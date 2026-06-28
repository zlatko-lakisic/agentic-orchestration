from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.config_loader import load_workflow_config
from orchestration.workflow_materializer import (
    build_step_specs,
    resolve_task_mcp_maps,
    step_specs_resolution_fingerprint,
)
from orchestration.agent_provider_entries import resolve_agent_provider_entries
from orchestration.catalog_credentials import filter_entries_by_api_credentials


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


@pytest.mark.unit
def test_g4_resolution_fingerprint_independent_of_run_id(
    default_workflow_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """G4 / F2.7: catalog resolution does not depend on ``run_id``."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-for-unit-tests")
    cfg = load_workflow_config(default_workflow_path)
    specs_a = build_step_specs(cfg, run_id="run-alpha", quiet=True)
    specs_b = build_step_specs(cfg, run_id="run-beta", quiet=True)
    assert step_specs_resolution_fingerprint(specs_a) == step_specs_resolution_fingerprint(
        specs_b
    )


@pytest.mark.unit
def test_g4_materializer_matches_shared_catalog_resolution(
    default_workflow_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """G4 / F2.7: step specs use the same provider/MCP resolution as ``build_workflow`` loaders."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-for-unit-tests")
    cfg = load_workflow_config(default_workflow_path)
    specs = build_step_specs(cfg, run_id="parity", quiet=True)

    resolved = resolve_agent_provider_entries(cfg)
    usable, _ = filter_entries_by_api_credentials(
        resolved,
        verbose=False,
        log_prefix="workflow",
    )
    provider_by_id = {str(p["id"]): p for p in usable if p.get("id")}
    task_mcps = resolve_task_mcp_maps(cfg, mcp_catalog_path=None, quiet=True)

    for spec in specs:
        task_def = next(t for t in cfg.tasks if t.id == spec.step_id)
        assert spec.agent_provider["id"] == task_def.agent_provider_id
        assert spec.agent_provider["model"] == provider_by_id[task_def.agent_provider_id]["model"]
        assert len(spec.mcp_providers) == len(task_mcps.get(spec.step_id, []))


@pytest.mark.unit
def test_g4_subprocess_style_rebuild_matches_batch_materialization(
    default_workflow_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """G4 / F2.7: sequential rebuild (subprocess runner) matches one-shot specs with same priors."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-for-unit-tests")
    cfg = load_workflow_config(default_workflow_path)
    prior = {"research_topic": "prior step output for handoff"}

    batch = build_step_specs(cfg, run_id="run1", prior_outputs=prior, quiet=True)
    rebuilt = build_step_specs(cfg, run_id="run1", prior_outputs=prior, quiet=True)

    assert step_specs_resolution_fingerprint(batch) == step_specs_resolution_fingerprint(
        rebuilt
    )
    assert batch[1].task_description == rebuilt[1].task_description
    assert batch[1].prior_output == "prior step output for handoff"

