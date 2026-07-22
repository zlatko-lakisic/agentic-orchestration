from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

from orchestration.backends.base import StepResult
from orchestration.config_loader import WorkflowConfig, TaskDefinition
from orchestration.fetch_url_tool import (
    extract_http_urls_from_text,
    recover_fetch_url_after_tool_leak,
    run_ollama_fetch_summarize_step,
)
from orchestration.goal_format_hints import goal_requests_irrigation_minutes_line
from orchestration.irrigation_minutes import (
    has_irrigation_minutes_line,
    irrigation_minutes_recovery_description,
)
from orchestration.mcp_task_hints import (
    augment_task_description_for_mcps,
    looks_like_mcp_tool_call_leak,
    mcp_ids_from_step_spec,
)
from orchestration.mcp_tool_leak_recovery import (
    filesystem_allowed_root,
    goal_requests_filesystem_listing,
    goal_requests_filesystem_read,
    has_filesystem_mcp,
    looks_like_unusable_crew_answer,
    needs_filesystem_recovery,
    recover_after_mcp_tool_leak,
    run_filesystem_list_summarize_step,
    run_filesystem_read_step,
)
from orchestration.simple_chat import strip_web_prose_delivery_suffix
from orchestration.output_artifacts import workflow_result_to_extractable_text
from orchestration.runner import build_workflow, crew_kickoff_context
from orchestration.text_normalize import sanitize_user_facing_prose
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


def _is_ollama_provider(agent_provider: dict[str, Any]) -> bool:
    return str(agent_provider.get("type", "")).strip().lower() == "ollama"


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
        rag_ids = [str(x).strip() for x in (data.get("rag_sources") or []) if str(x).strip()]
        rag_query = str(task.get("rag_query") or "").strip() or None
        skills_catalog_path = resolve_agent_skills_catalog_path_for_worker(
            data,
            tool_root=tool_root,
        )
        rag_catalog_path_raw = str(paths.get("rag_sources_catalog") or "").strip()
        rag_catalog_path = Path(rag_catalog_path_raw) if rag_catalog_path_raw else None
        if rag_catalog_path is None:
            default_rag = (tool_root / "config" / "rag_sources").resolve()
            if default_rag.exists():
                rag_catalog_path = default_rag

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

        from orchestration.rag_context import strip_rag_from_description

        task_description = strip_rag_from_description(task_description)
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
                    rag_sources=rag_ids if rag_ids else None,
                    rag_query=rag_query,
                )
            ],
            task_sequence=[step_id],
            rag_sources=rag_ids,
        )

        from orchestration.simple_chat import is_simple_chat_prompt

        simple_chat = (
            is_simple_chat_prompt(topic)
            and _is_ollama_provider(agent_provider)
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
                rag_sources_catalog_path=rag_catalog_path,
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

            goal_urls = extract_http_urls_from_text(topic)
            ollama_fetch_direct = (
                _is_ollama_provider(agent_provider)
                and "fetch_url" in mcp_ids
                and bool(goal_urls)
            )
            ollama_fs_list_direct = (
                _is_ollama_provider(agent_provider)
                and has_filesystem_mcp(mcp_ids)
                and goal_requests_filesystem_listing(topic)
                and filesystem_allowed_root() is not None
            )
            ollama_fs_read_direct = (
                _is_ollama_provider(agent_provider)
                and has_filesystem_mcp(mcp_ids)
                and goal_requests_filesystem_read(topic)
                and filesystem_allowed_root() is not None
            )

            if ollama_fetch_direct:
                print(
                    "(execute-step) ollama+fetch_url: direct fetch then summarize",
                    file=sys.stderr,
                )
                text = run_ollama_fetch_summarize_step(
                    built=built,
                    topic=topic,
                    task_description=task_description,
                    urls=goal_urls,
                )
            elif ollama_fs_read_direct:
                root = filesystem_allowed_root()
                assert root is not None
                print(
                    f"(execute-step) ollama+filesystem read: direct read under {root}",
                    file=sys.stderr,
                )
                text = run_filesystem_read_step(
                    built=built,
                    topic=topic,
                    root=root,
                )
            elif ollama_fs_list_direct:
                root = filesystem_allowed_root()
                assert root is not None
                print(
                    f"(execute-step) ollama+filesystem list: direct list workspace {root}",
                    file=sys.stderr,
                )
                text = run_filesystem_list_summarize_step(
                    built=built,
                    topic=topic,
                    root=root,
                    prefer_raw_listing=True,
                )
            else:
                print("kickoff", file=sys.stderr)
                with crew_kickoff_context(built):
                    workflow_result = built.crew.kickoff(inputs={"topic": topic})
                raw_text = workflow_result_to_extractable_text(workflow_result)
                text = sanitize_user_facing_prose(raw_text)
                # sanitize may strip leaks to ""; detect on raw so recovery still runs.
                needs_recovery = bool(mcp_ids) and (
                    looks_like_mcp_tool_call_leak(raw_text)
                    or looks_like_unusable_crew_answer(raw_text)
                    or looks_like_unusable_crew_answer(text or "")
                    or needs_filesystem_recovery(
                        text=text or "",
                        raw_text=raw_text,
                        topic=topic,
                        mcp_ids=mcp_ids,
                    )
                )
                if needs_recovery:
                    if "fetch_url" in mcp_ids:
                        print(
                            "(execute-step) unusable answer; fetch URL and summarize",
                            file=sys.stderr,
                        )
                        recovered = recover_fetch_url_after_tool_leak(
                            built=built,
                            topic=topic,
                            task_description=task_description,
                            leaked_text=raw_text,
                        )
                        if recovered and not looks_like_unusable_crew_answer(recovered):
                            text = recovered
                    if looks_like_unusable_crew_answer(text or "") or needs_filesystem_recovery(
                        text=text or "",
                        raw_text=raw_text,
                        topic=topic,
                        mcp_ids=mcp_ids,
                    ):
                        recovered = recover_after_mcp_tool_leak(
                            built=built,
                            topic=topic,
                            task_description=task_description,
                            mcp_ids=mcp_ids,
                            leaked_text=raw_text,
                        )
                        if recovered:
                            text = recovered
                if (
                    goal_requests_irrigation_minutes_line(topic)
                    and not has_irrigation_minutes_line(text)
                ):
                    print(
                        "(execute-step) irrigation MINUTES missing; recovery kickoff",
                        file=sys.stderr,
                    )
                    user_q = strip_web_prose_delivery_suffix(topic)
                    retry_desc = irrigation_minutes_recovery_description(user_q)
                    for crew_task in built.crew.tasks:
                        crew_task.description = retry_desc
                        crew_task.expected_output = (
                            "Brief reasoning ending with MINUTES: N (integer 0-25)."
                        )
                    for agent in built.crew.agents:
                        agent.tools = []
                    with crew_kickoff_context(built):
                        workflow_result = built.crew.kickoff(inputs={"topic": user_q})
                    text = sanitize_user_facing_prose(
                        workflow_result_to_extractable_text(workflow_result)
                    )

            step_result = StepResult(
                run_id=run_id,
                step_id=step_id,
                exit_code=0,
                result_text=text,
            )
            # Harness RAG grounding (blocking).
            rag_audits = (built.workflow_context or {}).get("task_rag_audits") or {}
            rag_audit_dict = rag_audits.get(step_id) or data.get("rag_audit")
            if rag_audit_dict or rag_ids:
                from orchestration.rag_grounding import finalize_rag_answer
                from orchestration.rag_retrieve import RagChunk, RagStepAudit

                audit = RagStepAudit(
                    granted_rag_ids=list(
                        (rag_audit_dict or {}).get("granted_rag_ids") or rag_ids
                    ),
                    cited_chunk_ids=[],
                )
                for ch in (rag_audit_dict or {}).get("returned_chunks") or []:
                    audit.retrieved_chunks.append(
                        RagChunk(
                            source_id=str(ch.get("source_id", "")),
                            chunk_id=str(ch.get("chunk_id", "")),
                            text="",
                            score=float(ch.get("score") or 0),
                        )
                    )
                # Merge live audits from in-process tool calls if present.
                live = rag_audits.get(step_id)
                if isinstance(live, dict):
                    for ch in live.get("returned_chunks") or []:
                        key = (str(ch.get("source_id", "")), str(ch.get("chunk_id", "")))
                        if key not in audit.retrieved_chunk_key_set():
                            audit.retrieved_chunks.append(
                                RagChunk(
                                    source_id=key[0],
                                    chunk_id=key[1],
                                    text="",
                                    score=float(ch.get("score") or 0),
                                )
                            )
                text2, accepted, reject = finalize_rag_answer(
                    text or "",
                    audit,
                    granted_rag_ids=list(audit.granted_rag_ids),
                )
                step_result.rag_audit = audit.to_dict()
                if not accepted:
                    step_result.exit_code = 1
                    step_result.error = f"rag_grounding:{reject}"
                    step_result.result_text = text2
                    if result_path is not None:
                        _write_step_result(result_path, step_result)
                    print(f"error: RAG grounding failed: {reject}", file=sys.stderr)
                    return 1
                text = text2
                step_result.result_text = text

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
