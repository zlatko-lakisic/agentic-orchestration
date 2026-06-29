from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.dynamic_planner import workflow_config_from_plan


@pytest.mark.unit
def test_workflow_config_from_plan_parses_skill_ids(config_dir: Path) -> None:
    from orchestration.agent_skills_catalog import load_agent_skills_catalog

    skill_entries = load_agent_skills_catalog(config_dir / "agent_skills")
    plan = {
        "plan_summary": "smoke",
        "skill_ids": ["echo_skill"],
        "mcp_provider_ids": [],
        "steps": [
            {
                "agent_provider_id": "writer",
                "description": "Do {topic}",
                "expected_output": "text",
            }
        ],
    }
    cfg = workflow_config_from_plan(
        user_prompt="skills smoke test",
        plan=plan,
        catalog_entries=[
            {
                "id": "writer",
                "type": "openai",
                "role": "Writer",
                "goal": "Write",
                "backstory": "Test",
                "model": "gpt-4o-mini",
            }
        ],
        instance_key="dyn",
        max_steps=3,
        skill_catalog_entries=skill_entries,
        quiet=True,
    )
    assert cfg.skills == ["echo_skill"]
    assert cfg.tasks[0].skills is None


@pytest.mark.unit
def test_prune_irrelevant_skills_from_user_goal() -> None:
    from orchestration.dynamic_planner import _prune_irrelevant_skills_from_user_goal

    cfg = WorkflowConfig(
        name="prune-skills",
        process="sequential",
        topic="t",
        instance_key="prune-skills",
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
        skills=["echo_skill", "unrelated_skill"],
        tasks=[
            TaskDefinition(
                id="t1",
                agent_provider_id="writer",
                description="d",
                expected_output="o",
            )
        ],
        task_sequence=["t1"],
    )
    catalog = [
        {
            "id": "echo_skill",
            "user_goal_keywords": ["skills", "smoke"],
            "content": {"body": "x"},
        },
        {
            "id": "unrelated_skill",
            "user_goal_keywords": ["kubernetes"],
            "content": {"body": "y"},
        },
    ]
    pruned = _prune_irrelevant_skills_from_user_goal(
        cfg,
        user_prompt="run skills smoke test",
        skill_catalog=catalog,
        quiet=True,
    )
    assert pruned.skills == ["echo_skill"]


@pytest.mark.unit
def test_prune_drops_all_skills_when_none_match_goal() -> None:
    from orchestration.dynamic_planner import _prune_irrelevant_skills_from_user_goal

    cfg = WorkflowConfig(
        name="prune-skills-none",
        process="sequential",
        topic="t",
        instance_key="prune-skills-none",
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
        skills=["echo_skill"],
        tasks=[
            TaskDefinition(
                id="t1",
                agent_provider_id="writer",
                description="d",
                expected_output="o",
            )
        ],
        task_sequence=["t1"],
    )
    catalog = [
        {
            "id": "echo_skill",
            "user_goal_keywords": ["skills"],
            "content": {"body": "x"},
        },
    ]
    pruned = _prune_irrelevant_skills_from_user_goal(
        cfg,
        user_prompt="what is the weather in paris",
        skill_catalog=catalog,
        quiet=True,
    )
    assert pruned.skills == []


@pytest.mark.unit
def test_prune_irrelevant_per_task_skills_from_user_goal() -> None:
    from orchestration.dynamic_planner import _prune_irrelevant_skills_from_user_goal

    cfg = WorkflowConfig(
        name="prune-task-skills",
        process="sequential",
        topic="t",
        instance_key="prune-task-skills",
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
                description="d",
                expected_output="o",
                skills=["echo_skill", "unrelated_skill"],
            )
        ],
        task_sequence=["t1"],
    )
    catalog = [
        {
            "id": "echo_skill",
            "user_goal_keywords": ["skills", "smoke"],
            "content": {"body": "x"},
        },
        {
            "id": "unrelated_skill",
            "user_goal_keywords": ["kubernetes"],
            "content": {"body": "y"},
        },
    ]
    pruned = _prune_irrelevant_skills_from_user_goal(
        cfg,
        user_prompt="run skills smoke test",
        skill_catalog=catalog,
        quiet=True,
    )
    assert pruned.tasks[0].skills == ["echo_skill"]


@pytest.mark.unit
def test_suggest_pr_review_from_user_goal(config_dir: Path) -> None:
    from orchestration.agent_skills_catalog import (
        filter_skill_entries_by_credentials,
        load_agent_skills_catalog_merged,
        suggest_skill_ids_from_user_goal,
    )

    entries = load_agent_skills_catalog_merged(config_dir / "agent_skills")
    kept, _skipped = filter_skill_entries_by_credentials(entries, verbose=False)
    suggested = suggest_skill_ids_from_user_goal("review this pull request for merge readiness", kept)
    assert "pr_review" in suggested

