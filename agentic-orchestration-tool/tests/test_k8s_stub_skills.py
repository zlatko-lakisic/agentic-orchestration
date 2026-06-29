from __future__ import annotations

import json
from pathlib import Path

import pytest

from orchestration.agent_skills_context import SKILLS_MARKER
from orchestration.k8s_stub_skills import verify_agent_skills_step_spec
from orchestration.workflow_materializer import build_step_specs
from orchestration.config_loader import load_workflow_config


@pytest.mark.unit
def test_verify_agent_skills_step_spec_accepts_materialized_spec(
    config_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    cfg = load_workflow_config(config_dir / "workflows" / "workflow_agent_skills_smoke.yaml")
    specs = build_step_specs(
        cfg,
        run_id="stub-verify",
        agent_skills_catalog_path=config_dir / "agent_skills",
        quiet=True,
    )
    data = specs[0].to_dict()
    verify_agent_skills_step_spec(
        data,
        embedded_catalog_dir=config_dir / "agent_skills",
    )


@pytest.mark.unit
def test_verify_agent_skills_step_spec_rejects_missing_catalog_path() -> None:
    data = {
        "skills": ["echo_skill"],
        "task": {"description": f"base{SKILLS_MARKER}\n\nSKILL_ECHO_OK"},
        "paths": {},
    }
    with pytest.raises(ValueError, match="agent_skills_catalog"):
        verify_agent_skills_step_spec(data)


@pytest.mark.unit
def test_verify_agent_skills_step_spec_rejects_missing_baked_marker() -> None:
    data = {
        "skills": ["echo_skill"],
        "task": {"description": "base task without injection"},
        "paths": {"agent_skills_catalog": "/tmp/catalog"},
    }
    with pytest.raises(ValueError, match="skills marker"):
        verify_agent_skills_step_spec(data)


@pytest.mark.unit
def test_k8s_stub_worker_script_verifies_spec_file(
    tool_root: Path,
    config_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AGENTIC_K8S_STUB_SKILLS_CATALOG", str(config_dir / "agent_skills"))
    cfg = load_workflow_config(config_dir / "workflows" / "workflow_agent_skills_smoke.yaml")
    specs = build_step_specs(
        cfg,
        run_id="stub-run",
        agent_skills_catalog_path=config_dir / "agent_skills",
        quiet=True,
        run_store_path=str(tmp_path / "store"),
    )
    spec_path = tmp_path / "skills_echo-spec.json"
    spec_dict = specs[0].to_dict()
    spec_dict["paths"]["run_store"] = str(tmp_path / "store")
    spec_path.write_text(json.dumps(spec_dict), encoding="utf-8")

    import subprocess
    import sys

    proc = subprocess.run(
        [sys.executable, str(tool_root / "scripts" / "k8s-stub-worker.py"), str(spec_path)],
        cwd=str(tool_root),
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr
    assert "SKILL_ECHO_OK" in proc.stdout
    result_path = tmp_path / "store" / "stub-run" / "skills_echo" / "result.json"
    assert result_path.is_file()
