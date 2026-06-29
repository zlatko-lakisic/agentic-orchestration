from __future__ import annotations

import json
from pathlib import Path

import pytest

from orchestration.agent_skills_context import BACKSTORY_SKILLS_MARKER, SKILLS_MARKER
from orchestration.worker_step_skills import (
    prepare_worker_agent_provider_for_skills,
    prepare_worker_task_description_for_skills,
    resolve_agent_skills_catalog_path_for_worker,
)


@pytest.mark.unit
def test_resolve_agent_skills_catalog_path_from_spec_paths(
    config_dir: Path,
    tmp_path: Path,
) -> None:
    catalog = config_dir / "agent_skills"
    data = {"paths": {"agent_skills_catalog": str(catalog)}}
    resolved = resolve_agent_skills_catalog_path_for_worker(
        data,
        tool_root=tmp_path,
    )
    assert resolved == catalog.resolve()


@pytest.mark.unit
def test_resolve_agent_skills_catalog_path_defaults_to_tool_config(
    config_dir: Path,
) -> None:
    tool_root = config_dir.parent
    resolved = resolve_agent_skills_catalog_path_for_worker({}, tool_root=tool_root)
    assert resolved == (tool_root / "config" / "agent_skills").resolve()


@pytest.mark.unit
def test_prepare_worker_strips_baked_skills_before_reresolve() -> None:
    baked_desc = f"Base task{SKILLS_MARKER}\n\n## echo\n\nOld body\n"
    stripped = prepare_worker_task_description_for_skills(baked_desc, skill_ids=["echo_skill"])
    assert stripped == "Base task"
    assert SKILLS_MARKER not in stripped

    baked_backstory = f"Base backstory\n\n{BACKSTORY_SKILLS_MARKER}\n\nold"
    provider = prepare_worker_agent_provider_for_skills(
        {"id": "writer", "backstory": baked_backstory},
        skill_ids=["echo_backstory_skill"],
    )
    assert provider["backstory"] == "Base backstory"
    assert BACKSTORY_SKILLS_MARKER not in provider["backstory"]


@pytest.mark.unit
def test_step_spec_json_includes_skills_catalog_path(
    config_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from orchestration.config_loader import TaskDefinition, WorkflowConfig
    from orchestration.workflow_materializer import build_step_specs

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    catalog = config_dir / "agent_skills"
    cfg = WorkflowConfig(
        name="worker-skills",
        process="sequential",
        topic="skills",
        instance_key="worker-skills",
        agent_providers=[
            {
                "id": "writer",
                "type": "openai",
                "role": "Writer",
                "goal": "Write",
                "backstory": "Test",
                "model": "gpt-4o-mini",
            }
        ],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id="t1",
                agent_provider_id="writer",
                description="Describe {topic}",
                expected_output="text",
                skills=["echo_skill"],
            )
        ],
        task_sequence=["t1"],
    )
    specs = build_step_specs(
        cfg,
        run_id="run-worker",
        agent_skills_catalog_path=catalog,
        quiet=True,
    )
    assert specs[0].skills == ["echo_skill"]
    assert specs[0].agent_skills_catalog_path == str(catalog.resolve())
    payload = specs[0].to_dict()
    assert payload["paths"]["agent_skills_catalog"] == str(catalog.resolve())

    roundtrip = json.loads(json.dumps(payload))
    assert roundtrip["skills"] == ["echo_skill"]
    assert "agent_skills_catalog" in roundtrip["paths"]
