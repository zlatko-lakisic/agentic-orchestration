"""Tests for execution queue gap closure (CLI + direct_agent WS)."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest

from orchestration.backends.base import WorkflowExecutionResult
from orchestration.config_loader import TaskDefinition, WorkflowConfig


@pytest.fixture(autouse=True)
def _reset_queue(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration import execution_queue as eq

    eq.reset_execution_queue_for_tests()
    monkeypatch.setenv("AGENTIC_EXECUTION_QUEUE_ENABLED", "1")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_BACKEND", "inprocess")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_MAX_PLANNING", "1")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_MAX_EXECUTION", "1")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_VRAM_GB", "16")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_CPU_CORES", "4")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_WAIT_SECONDS", "3")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_FAIR_SHARE_ENABLED", "0")
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_PREEMPT_ENABLED", "0")
    yield
    eq.reset_execution_queue_for_tests()


def _minimal_workflow_config() -> WorkflowConfig:
    return WorkflowConfig(
        name="test-dynamic",
        process="sequential",
        topic="test topic",
        instance_key="test",
        agent_providers=[
            {
                "id": "gpu_agent",
                "type": "ollama",
                "role": "Worker",
                "goal": "Work",
                "backstory": "Test",
                "model": "llama3.2:3b",
                "required_architectures": ["gpu"],
            }
        ],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id="step_one",
                agent_provider_id="gpu_agent",
                description="Do one thing.",
                expected_output="Output.",
            )
        ],
        task_sequence=["step_one"],
    )


@pytest.mark.unit
def test_requirements_from_agent_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.hardware_profile import requirements_from_agent_provider

    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_VRAM_GB", "16")
    entries = [
        {
            "id": "gpu_agent",
            "type": "ollama",
            "model": "llama3.2:3b",
            "required_architectures": ["gpu"],
            "min_vram_gb": 4,
        }
    ]
    req = requirements_from_agent_provider("gpu_agent", entries)
    assert req.gpu_slots == 1
    assert req.vram_gb >= 0.0
    assert req.agent_provider_ids == ("gpu_agent",)


@pytest.mark.unit
def test_main_dynamic_uses_queue(
    monkeypatch: pytest.MonkeyPatch,
    tool_root: Path,
    tmp_path: Path,
) -> None:
    from orchestration import dynamic_run
    from orchestration import execution_queue as eq

    cfg = _minimal_workflow_config()
    phases: list[str] = []

    def fake_run_with_queue(**kwargs: object) -> None:
        phases.append("planning_acquire")
        config = kwargs["plan_fn"]()
        phases.append("execution_acquire")
        kwargs["execute_fn"](config)
        phases.append("done")

    monkeypatch.setattr(eq, "run_with_execution_queue", fake_run_with_queue)
    monkeypatch.setattr(
        "orchestration.dynamic_planner.build_dynamic_workflow_config",
        lambda **_kw: (cfg, {"plan_summary": "test plan"}),
    )
    monkeypatch.setattr(
        dynamic_run,
        "_execute_dynamic_with_hf_fallback",
        lambda _cfg, **_kw: (0, "ok", cfg, WorkflowExecutionResult(exit_code=0, result_text="ok")),
    )

    session_path = tmp_path / "session.json"
    session_path.write_text("{}", encoding="utf-8")

    code, text, executed, _execution = dynamic_run.run_dynamic_plan_execute_queued(
        run_id="run-cli-test",
        user_prompt="hello",
        tool_root=tool_root,
        session_path=session_path,
        quiet=True,
        execute_kwargs={"run_id": "run-cli-test"},
    )
    assert code == 0
    assert text == "ok"
    assert executed is cfg
    assert phases == ["planning_acquire", "execution_acquire", "done"]


@pytest.mark.unit
def test_cli_queue_priority_flag(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    from orchestration import dynamic_run
    from orchestration import execution_queue as eq

    seen: dict[str, object] = {}
    cfg = _minimal_workflow_config()

    def fake_run_with_queue(**kwargs: object) -> None:
        seen["priority"] = kwargs.get("priority")
        seen["priority_label"] = kwargs.get("priority_label")
        config = kwargs["plan_fn"]()
        kwargs["execute_fn"](config)

    monkeypatch.setattr(eq, "run_with_execution_queue", fake_run_with_queue)
    monkeypatch.setattr(
        "orchestration.dynamic_planner.build_dynamic_workflow_config",
        lambda **_kw: (cfg, {}),
    )
    monkeypatch.setattr(
        dynamic_run,
        "_execute_dynamic_with_hf_fallback",
        lambda _cfg, **_kw: (0, "ok", cfg, WorkflowExecutionResult(exit_code=0, result_text="ok")),
    )

    import main as main_mod
    import sys

    monkeypatch.setattr(
        sys,
        "argv",
        ["main.py", "--dynamic", "test goal", "--queue-priority", "high"],
    )
    args = main_mod.parse_args()
    assert args.queue_priority == "high"

    session_path = tmp_path / "session.json"
    session_path.write_text("{}", encoding="utf-8")
    dynamic_run.run_dynamic_plan_execute_queued(
        run_id="pri-test",
        user_prompt="goal",
        tool_root=Path(main_mod.__file__).resolve().parent,
        session_path=session_path,
        quiet=True,
        priority=args.queue_priority,
        execute_kwargs={"run_id": "pri-test"},
    )
    assert seen["priority"] == 75
    assert seen["priority_label"] == "high"


@pytest.mark.unit
def test_direct_agent_ws_queue(monkeypatch: pytest.MonkeyPatch, tool_root: Path) -> None:
    from orchestration import execution_queue as eq
    from orchestration.serve.ws import WsConnection

    acquire_calls: list[str] = []

    def tracking_run_with_execution_only_queue(**kwargs: object) -> str:
        acquire_calls.append("execution")
        return kwargs["execute_fn"]()

    monkeypatch.setattr(eq, "run_with_execution_only_queue", tracking_run_with_execution_only_queue)

    handler = WsConnection(websocket=MagicMock(), tool_root=tool_root)
    handler._progress_to_status = MagicMock()  # type: ignore[method-assign]
    handler._resolve_app_id = MagicMock(return_value="test-app")  # type: ignore[method-assign]
    handler._make_queue_wait_callback = MagicMock(return_value=lambda _s: None)  # type: ignore[method-assign]

    import orchestration.direct_agent as direct_agent

    monkeypatch.setattr(direct_agent, "run_direct_agent", lambda **_kw: "direct answer")

    answer = handler._execute_text(
        {
            "agent_provider_id": "gpu_agent",
            "priority": "normal",
        },
        kind="direct_agent",
        text="hello",
        tag={"question_id": "q1"},
        user_id=None,
        session_slug="default",
        run_id="ws-direct-test",
    )
    assert answer == "direct answer"
    assert acquire_calls == ["execution"]
