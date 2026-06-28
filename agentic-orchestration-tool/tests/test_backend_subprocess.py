from __future__ import annotations

import json
import subprocess
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from orchestration.backends.base import RunOptions, WorkflowExecutionResult
from orchestration.config_loader import load_workflow_config
from orchestration.execution_dispatch import execute_workflow_config_resolved


@pytest.mark.unit
def test_dispatch_uses_execute_config_for_subprocess_workers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "subprocess")
    monkeypatch.setenv("AGENTIC_SUBPROCESS_WORKERS", "1")

    calls: list[str] = []

    class FakeBackend:
        name = "subprocess"
        supports_distributed_steps = True

        def execute_config(self, config, *, options) -> WorkflowExecutionResult:
            calls.append("config")
            return WorkflowExecutionResult(exit_code=0, result_text="via-config")

        def execute_built(self, built, *, options) -> WorkflowExecutionResult:
            calls.append("built")
            return WorkflowExecutionResult(exit_code=0, result_text="via-built")

    monkeypatch.setattr(
        "orchestration.execution_dispatch.execution_backend_from_env",
        lambda: FakeBackend(),
    )
    monkeypatch.setattr(
        "orchestration.execution_dispatch.build_workflow",
        lambda *a, **k: (_ for _ in ()).throw(AssertionError("build_workflow should not run")),
    )

    from orchestration.config_loader import WorkflowConfig, TaskDefinition

    cfg = WorkflowConfig(
        name="t",
        process="sequential",
        topic="x",
        instance_key="k",
        agent_providers=[{"id": "p", "type": "ollama", "model": "m"}],
        mcp_providers=[],
        tasks=[
            TaskDefinition(
                id="s",
                agent_provider_id="p",
                description="d",
                expected_output="o",
            )
        ],
        task_sequence=["s"],
    )
    result = execute_workflow_config_resolved(cfg, options=RunOptions(quiet=True))
    assert result.result_text == "via-config"
    assert calls == ["config"]


@pytest.mark.unit
def test_dispatch_uses_execute_built_when_workers_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "subprocess")
    monkeypatch.delenv("AGENTIC_SUBPROCESS_WORKERS", raising=False)

    calls: list[str] = []

    class FakeBackend:
        name = "subprocess"
        supports_distributed_steps = True

        def execute_config(self, config, *, options) -> WorkflowExecutionResult:
            calls.append("config")
            return WorkflowExecutionResult(exit_code=0, result_text="via-config")

        def execute_built(self, built, *, options) -> WorkflowExecutionResult:
            calls.append("built")
            return WorkflowExecutionResult(exit_code=0, result_text="via-built")

    monkeypatch.setattr(
        "orchestration.execution_dispatch.execution_backend_from_env",
        lambda: FakeBackend(),
    )
    monkeypatch.setattr(
        "orchestration.execution_dispatch.build_workflow",
        lambda *a, **k: MagicMock(crew=MagicMock(verbose=True)),
    )

    from orchestration.config_loader import WorkflowConfig, TaskDefinition

    cfg = WorkflowConfig(
        name="t",
        process="sequential",
        topic="x",
        instance_key="k",
        agent_providers=[{"id": "p", "type": "ollama", "model": "m"}],
        mcp_providers=[],
        tasks=[
            TaskDefinition(
                id="s",
                agent_provider_id="p",
                description="d",
                expected_output="o",
            )
        ],
        task_sequence=["s"],
    )
    result = execute_workflow_config_resolved(cfg, options=RunOptions(quiet=True))
    assert result.result_text == "via-built"
    assert calls == ["built"]


@pytest.mark.integration
@pytest.mark.backend_subprocess
def test_two_step_subprocess_workflow(
    default_workflow_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """F4.3: coordinator runs two steps via mocked worker subprocess (no LLM)."""
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "subprocess")
    monkeypatch.setenv("AGENTIC_SUBPROCESS_WORKERS", "1")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-for-unit-tests")

    step_outputs = {
        "research_topic": "bullet one\nbullet two",
        "write_brief": "Final briefing with action items.",
    }

    def _fake_subprocess_run(cmd, **kwargs):
        spec_idx = cmd.index("--execute-step") + 1
        spec_path = Path(cmd[spec_idx])
        data = json.loads(spec_path.read_text(encoding="utf-8"))
        step_id = str(data["step_id"])
        run_id = str(data["run_id"])
        run_store = Path(str(data["paths"]["run_store"]))
        text = step_outputs[step_id]
        result_path = run_store / run_id / step_id / "result.json"
        result_path.parent.mkdir(parents=True, exist_ok=True)
        result_path.write_text(
            json.dumps(
                {
                    "schema_version": "0.1",
                    "run_id": run_id,
                    "step_id": step_id,
                    "exit_code": 0,
                    "result_text": text,
                    "result_format": "plain",
                    "error": None,
                    "recoverable": False,
                    "recovery_hint": None,
                    "artifacts": [],
                }
            ),
            encoding="utf-8",
        )
        return subprocess.CompletedProcess(cmd, 0, stdout=text, stderr="")

    monkeypatch.setattr(
        "orchestration.backends.subprocess_runner.subprocess.run",
        _fake_subprocess_run,
    )

    cfg = load_workflow_config(default_workflow_path)
    result = execute_workflow_config_resolved(cfg, options=RunOptions(quiet=True))

    assert result.exit_code == 0
    assert result.result_text == step_outputs["write_brief"]
    assert len(result.step_results) == 2
    assert [s.step_id for s in result.step_results] == ["research_topic", "write_brief"]
    assert result.step_results[0].result_text == step_outputs["research_topic"]
    assert result.step_results[1].result_text == step_outputs["write_brief"]
