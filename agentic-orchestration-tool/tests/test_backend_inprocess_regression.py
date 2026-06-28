"""F1.4 regression: static and dynamic paths use the in-process execution backend.

Mocked kickoff — no API keys. Requires ``crewai`` (installed in CI on Python 3.12).
"""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from orchestration.backends.base import RunOptions, WorkflowExecutionResult
from orchestration.config_loader import TaskDefinition, WorkflowConfig

pytest.importorskip("crewai")


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


def _fake_built() -> SimpleNamespace:
    return SimpleNamespace(crew=SimpleNamespace(verbose=True))


@pytest.mark.unit
@pytest.mark.backend_inprocess
def test_run_built_workflow_delegates_to_inprocess_backend(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``run_built_workflow`` routes through ``execution_backend_from_env()``."""
    import main as main_mod

    seen: dict[str, object] = {}

    class FakeInprocessBackend:
        name = "inprocess"
        supports_distributed_steps = False

        def execute_built(self, built, *, options) -> WorkflowExecutionResult:
            seen["built"] = built
            seen["quiet"] = options.quiet
            return WorkflowExecutionResult(exit_code=0, result_text="mocked kickoff result")

    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "inprocess")
    monkeypatch.setattr(main_mod, "execution_backend_from_env", lambda: FakeInprocessBackend())

    built = _fake_built()
    code, text = main_mod.run_built_workflow(built, quiet=True, emit_stdout_summary=False)
    assert code == 0
    assert text == "mocked kickoff result"
    assert seen["built"] is built
    assert seen["quiet"] is True


@pytest.mark.unit
@pytest.mark.backend_inprocess
def test_run_workflow_static_path(
    default_workflow_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Static YAML workflow: load config -> build -> ``run_built_workflow``."""
    import main as main_mod

    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "inprocess")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-for-unit-tests")

    run_calls: list[object] = []

    monkeypatch.setattr(main_mod, "build_workflow", lambda config, **kwargs: _fake_built())
    monkeypatch.setattr(
        main_mod,
        "run_built_workflow",
        lambda built, **kwargs: run_calls.append(built) or (0, "static workflow ok"),
    )

    code, text = main_mod.run_workflow(default_workflow_path, quiet=True)
    assert code == 0
    assert text == "static workflow ok"
    assert len(run_calls) == 1


@pytest.mark.unit
@pytest.mark.backend_inprocess
def test_dynamic_workflow_path(
    monkeypatch: pytest.MonkeyPatch,
    tool_root: Path,
) -> None:
    """Dynamic execution helper calls ``run_built_workflow`` after build."""
    import main as main_mod

    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "inprocess")

    cfg = _minimal_workflow_config()
    run_calls: list[tuple] = []

    def _fake_build_workflow(config, **kwargs):
        assert config.name == cfg.name
        return _fake_built()

    def _fake_run_built(built, **kwargs):
        run_calls.append((built, kwargs.get("quiet")))
        return 0, "dynamic workflow ok"

    monkeypatch.setattr(main_mod, "build_workflow", _fake_build_workflow)
    monkeypatch.setattr(main_mod, "run_built_workflow", _fake_run_built)

    code, text, executed = main_mod._run_dynamic_workflow_with_hf_fallback(
        cfg,
        agent_providers_catalog_path=tool_root / "config" / "agent_providers",
        mcp_catalog_path=None,
        crew_verbose=False,
        quiet=True,
        emit_stdout_summary=False,
    )
    assert code == 0
    assert text == "dynamic workflow ok"
    assert executed is cfg
    assert len(run_calls) == 1
    assert run_calls[0][1] is True


@pytest.mark.unit
@pytest.mark.backend_inprocess
def test_crewai_backend_execute_built_mocked_kickoff(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``CrewAIExecutionBackend`` runs mocked ``crew.kickoff()`` without network."""
    from orchestration.backends.crewai import CrewAIExecutionBackend
    from orchestration.runner import BuiltWorkflow

    kickoff = MagicMock(return_value="extractable crew output")
    built = BuiltWorkflow(
        crew=MagicMock(verbose=True, kickoff=kickoff),
        inputs={"topic": "test"},
        agent_providers={},
        workflow_context={"workflow_name": "test"},
    )

    backend = CrewAIExecutionBackend()
    result = backend.execute_built(
        built,
        options=RunOptions(quiet=True, emit_stdout_summary=False),
    )

    assert result.exit_code == 0
    assert result.result_text == "extractable crew output"
    kickoff.assert_called_once_with(inputs={"topic": "test"})
