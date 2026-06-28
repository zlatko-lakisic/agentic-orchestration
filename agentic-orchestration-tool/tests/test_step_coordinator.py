from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.backends.base import RunOptions, StepResult, StepSpec
from orchestration.run_store import FileSystemRunStore
from orchestration.step_coordinator import StepCoordinator


@pytest.mark.unit
def test_step_coordinator_runs_sequential_success(tmp_path: Path) -> None:
    store = FileSystemRunStore(tmp_path)
    coordinator = StepCoordinator(store=store)
    specs = [
        StepSpec(
            schema_version="0.1",
            run_id="run1",
            step_id="a",
            step_index=0,
            workflow_name="wf",
            topic="t",
            task_description="d1",
            task_expected_output="o1",
            agent_provider={"id": "p1"},
            mcp_providers=[],
            prior_output="",
            inputs={"topic": "t"},
        ),
        StepSpec(
            schema_version="0.1",
            run_id="run1",
            step_id="b",
            step_index=1,
            workflow_name="wf",
            topic="t",
            task_description="d2",
            task_expected_output="o2",
            agent_provider={"id": "p2"},
            mcp_providers=[],
            prior_output="",
            inputs={"topic": "t"},
        ),
    ]
    order: list[str] = []

    def execute_step(spec: StepSpec) -> StepResult:
        order.append(spec.step_id)
        return StepResult(
            run_id=spec.run_id,
            step_id=spec.step_id,
            exit_code=0,
            result_text=f"out-{spec.step_id}",
        )

    result = coordinator.run_sequential(
        specs,
        execute_step=execute_step,
        options=RunOptions(quiet=True, emit_stdout_summary=False),
    )

    assert result.exit_code == 0
    assert result.result_text == "out-b"
    assert order == ["a", "b"]
    assert len(result.step_results) == 2
    assert store.read_step_result("run1", "a") is not None
    assert store.read_step_result("run1", "b") is not None


@pytest.mark.unit
def test_step_coordinator_retries_once_when_recovery_succeeds(tmp_path: Path) -> None:
    store = FileSystemRunStore(tmp_path)
    coordinator = StepCoordinator(store=store)
    spec = StepSpec(
        schema_version="0.1",
        run_id="run1",
        step_id="a",
        step_index=0,
        workflow_name="wf",
        topic="t",
        task_description="d",
        task_expected_output="o",
        agent_provider={"id": "p1"},
        mcp_providers=[],
        prior_output="",
        inputs={"topic": "t"},
    )
    calls = {"n": 0}

    def execute_step(_spec: StepSpec) -> StepResult:
        calls["n"] += 1
        if calls["n"] == 1:
            return StepResult(
                run_id="run1",
                step_id="a",
                exit_code=1,
                error="temporary",
                recoverable=True,
                recovery_hint="provider_recovery",
            )
        return StepResult(run_id="run1", step_id="a", exit_code=0, result_text="ok")

    def try_recover(_spec: StepSpec, _result: StepResult) -> bool:
        return True

    result = coordinator.run_sequential(
        [spec],
        execute_step=execute_step,
        try_recover=try_recover,
        options=RunOptions(quiet=True, emit_stdout_summary=False),
    )

    assert result.exit_code == 0
    assert result.result_text == "ok"
    assert calls["n"] == 2


@pytest.mark.unit
def test_step_coordinator_stops_on_failure(tmp_path: Path) -> None:
    store = FileSystemRunStore(tmp_path)
    coordinator = StepCoordinator(store=store)
    specs = [
        StepSpec(
            schema_version="0.1",
            run_id="run1",
            step_id="ok",
            step_index=0,
            workflow_name="wf",
            topic="t",
            task_description="d",
            task_expected_output="o",
            agent_provider={"id": "p"},
            mcp_providers=[],
            prior_output="",
            inputs={"topic": "t"},
        ),
        StepSpec(
            schema_version="0.1",
            run_id="run1",
            step_id="fail",
            step_index=1,
            workflow_name="wf",
            topic="t",
            task_description="d",
            task_expected_output="o",
            agent_provider={"id": "p"},
            mcp_providers=[],
            prior_output="",
            inputs={"topic": "t"},
        ),
    ]
    calls = 0

    def execute_step(spec: StepSpec) -> StepResult:
        nonlocal calls
        calls += 1
        if spec.step_id == "fail":
            return StepResult(
                run_id=spec.run_id,
                step_id=spec.step_id,
                exit_code=1,
                error="boom",
            )
        return StepResult(
            run_id=spec.run_id,
            step_id=spec.step_id,
            exit_code=0,
            result_text="ok",
        )

    result = coordinator.run_sequential(
        specs,
        execute_step=execute_step,
        options=RunOptions(quiet=True, emit_stdout_summary=False),
    )

    assert result.exit_code == 1
    assert calls == 2
    assert len(result.step_results) == 2
    assert result.step_results[-1].error == "boom"
    assert store.read_step_result("run1", "fail") is not None


@pytest.mark.unit
def test_step_coordinator_empty_specs(tmp_path: Path) -> None:
    coordinator = StepCoordinator(store=FileSystemRunStore(tmp_path))
    result = coordinator.run_sequential(
        [],
        execute_step=lambda spec: StepResult(
            run_id="r", step_id=spec.step_id, exit_code=0
        ),
        options=RunOptions(quiet=True),
    )
    assert result.exit_code == 1
    assert result.error is not None
