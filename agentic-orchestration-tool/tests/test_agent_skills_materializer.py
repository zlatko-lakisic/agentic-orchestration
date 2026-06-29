from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.agent_skills_context import BACKSTORY_SKILLS_MARKER, SKILLS_MARKER
from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.workflow_materializer import build_step_specs


@pytest.mark.unit
def test_build_step_specs_injects_skills(config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    cfg = WorkflowConfig(
        name="skills-materializer",
        process="sequential",
        topic="skills",
        instance_key="skills-materializer",
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
        run_id="run-skills",
        agent_skills_catalog_path=config_dir / "agent_skills",
        quiet=True,
    )
    assert len(specs) == 1
    assert SKILLS_MARKER in specs[0].task_description
    assert specs[0].skills == ["echo_skill"]


@pytest.mark.unit
def test_build_step_specs_injects_backstory_into_provider(
    config_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    cfg = WorkflowConfig(
        name="skills-materializer-backstory",
        process="sequential",
        topic="skills",
        instance_key="skills-materializer-backstory",
        agent_providers=[
            {
                "id": "writer",
                "type": "openai",
                "role": "Writer",
                "goal": "Write",
                "backstory": "Base",
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
                skills=["echo_backstory_skill"],
            )
        ],
        task_sequence=["t1"],
    )
    specs = build_step_specs(
        cfg,
        run_id="run-backstory",
        agent_skills_catalog_path=config_dir / "agent_skills",
        quiet=True,
    )
    assert BACKSTORY_SKILLS_MARKER in str(specs[0].agent_provider.get("backstory", ""))
    assert "BACKSTORY_SKILL_ECHO_OK" in str(specs[0].agent_provider.get("backstory", ""))
    assert BACKSTORY_SKILLS_MARKER not in specs[0].task_description
