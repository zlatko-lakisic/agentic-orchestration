"""Planner local-only enforcement + cloud step redaction."""

from __future__ import annotations

import pytest

from orchestration.dynamic_planner import workflow_config_from_plan


def _catalog() -> list[dict]:
    return [
        {
            "id": "gpt_research",
            "type": "openai",
            "role": "researcher",
            "goal": "research",
            "backstory": "x",
        },
        {
            "id": "ollama_local",
            "type": "ollama",
            "role": "local",
            "goal": "local",
            "backstory": "y",
            "model": "llama3.2",
        },
    ]


def test_workflow_config_redacts_cloud_step_text(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    plan = {
        "plan_summary": "s",
        "steps": [
            {
                "agent_provider_id": "gpt_research",
                "description": "Email jane@acme.com about {topic}",
                "expected_output": "Contact 555-123-4567",
            }
        ],
    }
    cfg = workflow_config_from_plan(
        user_prompt="hello",
        plan=plan,
        catalog_entries=_catalog(),
        instance_key="t",
        max_steps=4,
        quiet=True,
    )
    assert "[EMAIL]" in cfg.tasks[0].description
    assert "jane@acme.com" not in cfg.tasks[0].description
    assert "[PHONE]" in cfg.tasks[0].expected_output


def test_workflow_config_skips_redact_for_ollama(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    plan = {
        "plan_summary": "s",
        "steps": [
            {
                "agent_provider_id": "ollama_local",
                "description": "Email jane@acme.com about {topic}",
                "expected_output": "note",
            }
        ],
    }
    cfg = workflow_config_from_plan(
        user_prompt="hello",
        plan=plan,
        catalog_entries=_catalog(),
        instance_key="t",
        max_steps=4,
        quiet=True,
    )
    assert "jane@acme.com" in cfg.tasks[0].description


def test_local_only_rejects_cloud_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    plan = {
        "plan_summary": "s",
        "steps": [
            {
                "agent_provider_id": "gpt_research",
                "description": "Do work on {topic}",
                "expected_output": "done",
            }
        ],
    }
    with pytest.raises(ValueError, match="Local-only"):
        workflow_config_from_plan(
            user_prompt="keep this private and run offline",
            plan=plan,
            catalog_entries=_catalog(),
            instance_key="t",
            max_steps=4,
            quiet=True,
        )


def test_local_only_allows_ollama(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    plan = {
        "plan_summary": "s",
        "steps": [
            {
                "agent_provider_id": "ollama_local",
                "description": "Do work on {topic}",
                "expected_output": "done",
            }
        ],
    }
    cfg = workflow_config_from_plan(
        user_prompt="use ollama only please",
        plan=plan,
        catalog_entries=_catalog(),
        instance_key="t",
        max_steps=4,
        quiet=True,
    )
    assert cfg.tasks[0].agent_provider_id == "ollama_local"
