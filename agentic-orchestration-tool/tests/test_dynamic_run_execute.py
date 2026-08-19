"""Regression tests for dynamic execution helpers."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest

from orchestration.backends.base import WorkflowExecutionResult
from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.dynamic_run import CatalogPaths, _execute_planned_dynamic


def _minimal_workflow_config() -> WorkflowConfig:
    return WorkflowConfig(
        name="test-dynamic",
        process="sequential",
        topic="test topic",
        instance_key="test",
        agent_providers=[
            {
                "id": "researcher",
                "type": "openai",
                "role": "Researcher",
                "goal": "Research",
                "backstory": "Test",
                "model": "gpt-4o-mini",
            }
        ],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id="step_one",
                agent_provider_id="researcher",
                description="Do one thing.",
                expected_output="Output.",
            )
        ],
        task_sequence=["step_one"],
    )


def test_execute_planned_dynamic_emits_structured_logs(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """_execute_planned_dynamic must import emit_log (2.6.0 regression)."""
    import orchestration.dynamic_run as dynamic_run
    import orchestration.execution_dispatch as execution_dispatch
    import orchestration.run_trace as run_trace
    import orchestration.structured_logging as structured_logging

    emit_log = MagicMock()
    monkeypatch.setattr(structured_logging, "emit_log", emit_log)
    monkeypatch.setattr(
        execution_dispatch,
        "execute_workflow_config_resolved",
        lambda _cfg, *, options: WorkflowExecutionResult(
            exit_code=0,
            result_text="done",
        ),
    )
    monkeypatch.setattr(run_trace, "append_run_event", lambda *_a, **_k: None)
    monkeypatch.setattr(
        dynamic_run,
        "_record_dynamic_run_state",
        lambda **_kw: None,
    )

    root = tmp_path
    session_path = tmp_path / "session.json"
    session_path.write_text("{}", encoding="utf-8")
    paths = CatalogPaths(
        agent_providers=root / "agents.yaml",
        mcp_providers=root / "mcps.yaml",
        agent_skills=root / "skills.yaml",
        rag_sources=root / "rag.yaml",
    )
    progress_calls: list[str] = []

    result = _execute_planned_dynamic(
        config=_minimal_workflow_config(),
        plan={"plan_summary": "one step", "steps": [], "mcp_provider_ids": [], "skill_ids": []},
        root=root,
        paths=paths,
        session_path=session_path,
        slug="default",
        text="hello",
        user_id=None,
        rid="run-test-emit-log",
        backend_name="inprocess",
        quiet=True,
        on_progress=None,
        progress=progress_calls.append,
    )

    assert result == "done"
    messages = [str(c.args[0]) for c in emit_log.call_args_list if c.args]
    assert any("dynamic executing" in m for m in messages)
    assert any(m == "dynamic done" for m in messages)
