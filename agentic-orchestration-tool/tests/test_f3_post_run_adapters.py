from __future__ import annotations

import json
from pathlib import Path

import pytest

from orchestration.backends.base import StepResult, WorkflowExecutionResult
from orchestration.orchestrator_session import (
    load_session,
    save_session,
    update_session_after_crew,
    update_session_after_final,
    OrchestratorSessionFile,
)
from orchestration.output_artifacts import (
    extractable_text_from_execution,
    extractable_text_from_step,
    offer_save_extracted_files_from_execution,
)


@pytest.mark.unit
def test_extractable_text_from_execution_prefers_workflow_result() -> None:
    result = WorkflowExecutionResult(
        exit_code=0,
        result_text="summary text",
        workflow_result=type("Out", (), {"__str__": lambda self: "crew raw"})(),
    )
    assert extractable_text_from_execution(result) == "crew raw"


@pytest.mark.unit
def test_extractable_text_from_execution_falls_back_to_result_text() -> None:
    result = WorkflowExecutionResult(
        exit_code=0,
        result_text="plain output",
        workflow_result=None,
    )
    assert extractable_text_from_execution(result) == "plain output"


@pytest.mark.unit
def test_extractable_text_from_step() -> None:
    step = StepResult(run_id="r", step_id="s", exit_code=0, result_text=" step out ")
    assert extractable_text_from_step(step) == "step out"


@pytest.mark.unit
def test_offer_save_from_execution_writes_artifacts(tmp_path: Path) -> None:
    execution = WorkflowExecutionResult(
        exit_code=0,
        result_text="#### `hello.txt`\n```\nworld\n```",
    )
    saved = offer_save_extracted_files_from_execution(
        tool_root=tmp_path,
        user_task="demo",
        execution=execution,
        output_dir=tmp_path / "out",
        no_save=False,
    )
    assert saved is not None
    assert (saved / "hello.txt").read_text(encoding="utf-8").strip() == "world"


@pytest.mark.unit
def test_session_records_execution_backend(tmp_path: Path) -> None:
    path = tmp_path / "sess.json"
    save_session(path, OrchestratorSessionFile(instance_key="dyn"))

    update_session_after_crew(path, "crew excerpt", execution_backend="subprocess")
    data = load_session(path)
    assert data.last_crew_output_excerpt == "crew excerpt"
    assert data.last_execution_backend == "subprocess"

    update_session_after_final(
        path,
        user_goal="goal",
        result_text="final answer",
        execution_backend="inprocess",
    )
    data = load_session(path)
    assert data.last_user_goal == "goal"
    assert data.last_final_answer_excerpt == "final answer"
    assert data.last_execution_backend == "inprocess"

    raw = json.loads(path.read_text(encoding="utf-8"))
    assert raw["last_execution_backend"] == "inprocess"
