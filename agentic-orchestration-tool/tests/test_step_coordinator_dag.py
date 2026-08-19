"""StepCoordinator DAG parallel wave tests."""

from __future__ import annotations

import threading
import time
from pathlib import Path

import pytest

from orchestration.backends.base import RunOptions, StepResult, StepSpec
from orchestration.run_store import FileSystemRunStore
from orchestration.step_coordinator import StepCoordinator


def _spec(step_id: str, *, depends_on: tuple[str, ...] = (), index: int = 0) -> StepSpec:
    return StepSpec(
        schema_version="0.1",
        run_id="r1",
        step_id=step_id,
        step_index=index,
        workflow_name="wf",
        topic="t",
        task_description="d",
        task_expected_output="e",
        agent_provider={"id": "a1"},
        mcp_providers=[],
        skills=[],
        prior_output="",
        inputs={},
        depends_on=depends_on,
    )


@pytest.mark.unit
def test_parallel_wave_faster_than_sequential(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_EXECUTION_QUEUE_ENABLED", "0")
    store = FileSystemRunStore(Path("/tmp/ao-step-dag-test"))
    coord = StepCoordinator(store=store)
    active = threading.Semaphore(2)
    timings: dict[str, float] = {}

    def execute_step(spec: StepSpec) -> StepResult:
        start = time.monotonic()
        with active:
            time.sleep(0.05)
        timings[spec.step_id] = time.monotonic() - start
        return StepResult(run_id=spec.run_id, step_id=spec.step_id, exit_code=0, result_text="ok")

    specs = [
        _spec("a", index=0),
        _spec("b", index=1),
        _spec("c", depends_on=("a",), index=2),
    ]
    t0 = time.monotonic()
    result = coord.run_dag(specs, execute_step=execute_step, options=RunOptions(quiet=True))
    elapsed = time.monotonic() - t0
    assert result.exit_code == 0
    assert elapsed < 0.18
