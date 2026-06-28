from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from orchestration.backends.base import StepResult
from orchestration.config_loader import WorkflowConfig, TaskDefinition
from orchestration.output_artifacts import workflow_result_to_extractable_text
from orchestration.runner import build_workflow, crew_kickoff_context
from orchestration.worker_logging import worker_log_context


def _resolved_mcps_from_spec(data: dict[str, Any]) -> list[Any]:
    out: list[Any] = []
    for item in data.get("mcp_providers") or []:
        if not isinstance(item, dict):
            continue
        resolved = item.get("resolved")
        if resolved is not None:
            out.append(resolved)
    return out


def _write_step_result(path: Path, result: StepResult) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result.to_dict(), indent=2), encoding="utf-8")


def execute_step_from_spec_file(spec_path: Path) -> int:
    """Run a single step from a ``StepSpec`` JSON file (worker entrypoint)."""
    data: dict[str, Any] = json.loads(spec_path.read_text(encoding="utf-8"))
    task = data.get("task") or {}
    agent_provider = data.get("agent_provider") or {}
    step_id = str(data.get("step_id", "step"))
    run_id = str(data.get("run_id", ""))

    with worker_log_context(run_id=run_id, step_id=step_id):
        if not agent_provider.get("id"):
            print("error: step spec missing agent_provider.id", file=sys.stderr)
            return 2

        topic = str(data.get("topic") or data.get("inputs", {}).get("topic") or "")
        paths = data.get("paths") or {}
        run_store = str(paths.get("run_store") or "").strip()
        result_path = (
            Path(run_store) / run_id / step_id / "result.json" if run_store and run_id else None
        )

        print(f"loading spec {spec_path.name}", file=sys.stderr)

        mcp_resolved = _resolved_mcps_from_spec(data)
        cfg = WorkflowConfig(
            name=str(data.get("workflow_name", "execute-step")),
            process="sequential",
            topic=topic,
            instance_key="execute-step",
            agent_providers=[agent_provider],
            mcp_providers=[],
            tasks=[
                TaskDefinition(
                    id=step_id,
                    agent_provider_id=str(agent_provider["id"]),
                    description=str(task.get("description", "")),
                    expected_output=str(task.get("expected_output", "")),
                    mcp_providers=[],
                )
            ],
            task_sequence=[step_id],
        )

        try:
            built = build_workflow(
                cfg,
                crew_verbose=False,
                quiet=True,
                emit_progress_lines=False,
                task_mcp_overrides={step_id: mcp_resolved} if mcp_resolved else None,
            )
            print("kickoff", file=sys.stderr)
            with crew_kickoff_context(built):
                workflow_result = built.crew.kickoff(inputs={"topic": topic})
            text = workflow_result_to_extractable_text(workflow_result)
            step_result = StepResult(
                run_id=run_id,
                step_id=step_id,
                exit_code=0,
                result_text=text,
            )
            if result_path is not None:
                _write_step_result(result_path, step_result)
                print(f"wrote {result_path}", file=sys.stderr)
            if text:
                print(text)
            return 0
        except Exception as exc:  # noqa: BLE001
            step_result = StepResult(
                run_id=run_id,
                step_id=step_id,
                exit_code=1,
                error=str(exc),
            )
            if result_path is not None:
                _write_step_result(result_path, step_result)
            print(f"error: step {step_id!r} failed: {exc}", file=sys.stderr)
            return 1
