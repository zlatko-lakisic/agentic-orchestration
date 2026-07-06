from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

from orchestration.backends.base import StepResult
from orchestration.config_loader import WorkflowConfig, TaskDefinition
from orchestration.mcp_task_hints import (
    augment_task_description_for_mcp_leak_retry,
    augment_task_description_for_mcps,
    looks_like_mcp_tool_call_leak,
    mcp_ids_from_step_spec,
)
from orchestration.output_artifacts import workflow_result_to_extractable_text
from orchestration.text_normalize import sanitize_user_facing_prose
from orchestration.runner import build_workflow, crew_kickoff_context
from orchestration.worker_logging import worker_log_context
from orchestration.worker_step_skills import (
    prepare_worker_agent_provider_for_skills,
    prepare_worker_task_description_for_skills,
    resolve_agent_skills_catalog_path_for_worker,
    skill_ids_from_step_spec,
)


def _tool_root() -> Path:
    return Path(__file__).resolve().parent.parent


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
    data: dict[str, Any] = json.loads(spec_path.read_text(encoding="utf-8-sig"))
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

        tool_root = _tool_root()
        mcp_resolved = _resolved_mcps_from_spec(data)
        mcp_ids = mcp_ids_from_step_spec(data)
        skill_ids = skill_ids_from_step_spec(data)
        skills_catalog_path = resolve_agent_skills_catalog_path_for_worker(
            data,
            tool_root=tool_root,
        )
        reresolve_skills = bool(skill_ids and skills_catalog_path is not None)
        if reresolve_skills:
            task_description = prepare_worker_task_description_for_skills(
                str(task.get("description", "")),
                skill_ids=skill_ids,
            )
            provider_payload = prepare_worker_agent_provider_for_skills(
                agent_provider,
                skill_ids=skill_ids,
            )
            task_skill_ids: list[str] | None = skill_ids
            workflow_skill_ids = skill_ids
            catalog_for_build = skills_catalog_path
        else:
            task_description = str(task.get("description", ""))
            provider_payload = deepcopy(agent_provider)
            task_skill_ids = None
            workflow_skill_ids = []
            catalog_for_build = None

        task_description = augment_task_description_for_mcps(task_description, mcp_ids)

        cfg = WorkflowConfig(
            name=str(data.get("workflow_name", "execute-step")),
            process="sequential",
            topic=topic,
            instance_key="execute-step",
            agent_providers=[provider_payload],
            mcp_providers=[],
            skills=workflow_skill_ids,
            tasks=[
                TaskDefinition(
                    id=step_id,
                    agent_provider_id=str(agent_provider["id"]),
                    description=task_description,
                    expected_output=str(task.get("expected_output", "")),
                    mcp_providers=[],
                    skills=task_skill_ids,
                )
            ],
            task_sequence=[step_id],
        )

        from orchestration.simple_chat import is_simple_chat_prompt

        simple_chat = (
            is_simple_chat_prompt(topic)
            and str(agent_provider.get("type", "")).strip().lower() == "ollama"
            and not mcp_resolved
            and not skill_ids
        )

        try:
            built = build_workflow(
                cfg,
                crew_verbose=False,
                quiet=True,
                emit_progress_lines=False,
                agent_skills_catalog_path=catalog_for_build,
                task_mcp_overrides={step_id: mcp_resolved} if mcp_resolved else None,
            )
            if run_store and not simple_chat:
                from orchestration.k8s_delegation_tool import attach_k8s_delegation_tool

                attach_k8s_delegation_tool(
                    built,
                    parent_run_id=run_id,
                    parent_step_id=step_id,
                    run_store_mount=run_store,
                    topic=topic,
                )
            elif simple_chat:
                for agent in built.crew.agents:
                    agent.tools = []
                print(
                    "(execute-step) simple chat: k8s warm-pool crew without tools",
                    file=sys.stderr,
                )
            print("kickoff", file=sys.stderr)
            with crew_kickoff_context(built):
                workflow_result = built.crew.kickoff(inputs={"topic": topic})
            text = sanitize_user_facing_prose(
                workflow_result_to_extractable_text(workflow_result)
            )
            if looks_like_mcp_tool_call_leak(text) and mcp_resolved:
                retry_desc = augment_task_description_for_mcp_leak_retry(task_description, mcp_ids)
                for crew_task in built.crew.tasks:
                    crew_task.description = retry_desc
                print(
                    "(execute-step) detected MCP tool-call text; retrying with stronger MCP hints",
                    file=sys.stderr,
                )
                with crew_kickoff_context(built):
                    workflow_result = built.crew.kickoff(inputs={"topic": topic})
                text = sanitize_user_facing_prose(
                workflow_result_to_extractable_text(workflow_result)
            )
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
            from orchestration.step_recovery import recovery_hint_for_exception

            recoverable, recovery_hint = recovery_hint_for_exception(exc, agent_provider)
            step_result = StepResult(
                run_id=run_id,
                step_id=step_id,
                exit_code=1,
                error=str(exc),
                recoverable=recoverable,
                recovery_hint=recovery_hint,
            )
            if result_path is not None:
                _write_step_result(result_path, step_result)
            print(f"error: step {step_id!r} failed: {exc}", file=sys.stderr)
            return 1
