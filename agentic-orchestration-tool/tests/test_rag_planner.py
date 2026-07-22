"""Planner rag_ids hard-fail integration."""

from __future__ import annotations

import pytest

from orchestration.dynamic_planner import workflow_config_from_plan


@pytest.mark.unit
def test_planner_unknown_rag_ids_hard_fail() -> None:
    plan = {
        "plan_summary": "test",
        "rag_ids": ["does-not-exist"],
        "steps": [
            {
                "agent_provider_id": "ollama_llama3_2_1b",
                "description": "{topic}\n\nAnswer.",
                "expected_output": "text",
            }
        ],
    }
    catalog = [
        {
            "id": "ollama_llama3_2_1b",
            "type": "ollama",
            "model": "llama3.2:1b",
            "role": "a",
            "goal": "g",
            "backstory": "b",
        }
    ]
    with pytest.raises(ValueError, match="Unknown rag_id"):
        workflow_config_from_plan(
            user_prompt="hello",
            plan=plan,
            catalog_entries=catalog,
            instance_key="t",
            max_steps=3,
            rag_catalog_entries=[],
            quiet=True,
        )


@pytest.mark.unit
def test_planner_known_rag_ids_ok(tmp_path, monkeypatch) -> None:
    import yaml
    from orchestration.rag_sources_catalog import load_rag_sources_catalog

    (tmp_path / "r.yaml").write_text(
        yaml.dump({"id": "orchestrator_kb", "backend": "sqlite-fts", "mode": "inject"}),
        encoding="utf-8",
    )
    rag_cat = load_rag_sources_catalog(tmp_path)
    plan = {
        "plan_summary": "test",
        "rag_ids": ["orchestrator_kb"],
        "steps": [
            {
                "agent_provider_id": "ollama_llama3_2_1b",
                "description": "{topic}\n\nAnswer.",
                "expected_output": "text",
                "rag_ids": ["orchestrator_kb"],
                "rag_query": "prior answers",
            }
        ],
    }
    catalog = [
        {
            "id": "ollama_llama3_2_1b",
            "type": "ollama",
            "model": "llama3.2:1b",
            "role": "a",
            "goal": "g",
            "backstory": "b",
        }
    ]
    cfg = workflow_config_from_plan(
        user_prompt="hello",
        plan=plan,
        catalog_entries=catalog,
        instance_key="t",
        max_steps=3,
        rag_catalog_entries=rag_cat,
        quiet=True,
    )
    assert cfg.rag_sources == ["orchestrator_kb"]
    assert cfg.tasks[0].rag_sources == ["orchestrator_kb"]
    assert cfg.tasks[0].rag_query == "prior answers"
