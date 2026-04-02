from __future__ import annotations

import hashlib
import os
import re
import sys
from collections import defaultdict
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from crewai import Crew, Process, Task

from agent_providers.base import AgentProvider
from agent_providers.factory import agent_provider_from_dict
from orchestration.catalog_credentials import filter_entries_by_api_credentials
from orchestration.config_loader import TaskDefinition, WorkflowConfig, raw_mcp_spec_for_task
from orchestration.mcp_providers_catalog import (
    filter_mcp_entries_by_api_credentials,
    load_mcp_providers_catalog_merged,
    mcps_list_fingerprint,
    resolve_workflow_mcp_refs,
)
from orchestration.workflow_ollama import resolve_workflow_ollama_host

_WORKFLOW_OLLAMA_HOST_TOKEN = "workflow"

_KICKOFF_CB_STATE: ContextVar[_SequentialKickoffState | None] = ContextVar(
    "_KICKOFF_CB_STATE", default=None
)


@dataclass
class _SequentialKickoffState:
    """Mutable state for module-level Crew callbacks (sequential task order)."""

    task_run_order: list[tuple[str, Task, AgentProvider]]
    inputs_holder: dict[str, Any]
    last_completed: int = field(default=-1)
    last_output_text: str = field(default="")
    progress_enabled: bool = field(default=False)


@dataclass
class BuiltWorkflow:
    crew: Crew
    inputs: dict[str, str]
    agent_providers: dict[str, AgentProvider]
    workflow_context: dict[str, Any]
    kickoff_callback_state: _SequentialKickoffState | None = None


@contextmanager
def crew_kickoff_context(built: BuiltWorkflow):
    """Bind sequential callbacks for the duration of crew.kickoff()."""
    st = built.kickoff_callback_state
    if st is None:
        yield
        return
    st.last_completed = -1
    token = _KICKOFF_CB_STATE.set(st)
    try:
        yield
    finally:
        _KICKOFF_CB_STATE.reset(token)


def _progress(msg: str) -> None:
    """
    Emit a short progress line for UIs that don't stream verbose Crew logs.
    Written to the original stdout so it still appears when caller redirects stdout.
    """
    state = _KICKOFF_CB_STATE.get()
    if state is None or not state.progress_enabled:
        return
    text = str(msg).strip()
    if not text:
        return
    try:
        sys.__stdout__.write(f"(progress) {text}\n")
        sys.__stdout__.flush()
    except Exception:  # noqa: BLE001
        return


_GENERIC_STEP_ID_RE = re.compile(r"^step_\d+$", re.IGNORECASE)


def _task_human_label(task_id: str, task: Task) -> str:
    first = ""
    try:
        lines = [ln.strip() for ln in str(getattr(task, "description", "") or "").splitlines()]
        lines = [ln for ln in lines if ln]
        # Dynamic planner often prepends "{topic}" as a required marker; skip it for user-facing labels.
        if lines and lines[0] == "{topic}":
            lines = lines[1:]
        first = lines[0] if lines else ""
    except Exception:  # noqa: BLE001
        first = ""
    if _GENERIC_STEP_ID_RE.match(str(task_id or "").strip()) and first:
        return first
    if first:
        return f"{task_id}: {first}"
    return str(task_id or "").strip() or "task"


def _serial_crew_before_kickoff(inputs: dict[str, Any] | None) -> dict[str, Any]:
    state = _KICKOFF_CB_STATE.get()
    if state is None:
        return dict(inputs or {})
    merged = dict(inputs or {})
    state.inputs_holder.clear()
    state.inputs_holder.update(merged)
    state.last_completed = -1
    state.last_output_text = ""
    if state.task_run_order:
        first_id, first_task, ap = state.task_run_order[0]
        _progress(f"starting {_task_human_label(first_id, first_task)}")
        ap.before_task(first_id, first_task, dict(state.inputs_holder))
    return merged


_STEP_CONTEXT_MARKER = "\n\n---\n## Previous step output (for continuity)\n"


def _inject_previous_output_into_next_task(next_task: Task, prev_output: str) -> None:
    if not prev_output:
        return
    if os.getenv("AGENTIC_STEP_CONTEXT_INJECT", "1").strip().lower() in ("0", "false", "no", "off"):
        return

    # Try not to blow up token count.
    try:
        cap = int(os.getenv("AGENTIC_STEP_CONTEXT_CHARS", "4000"))
    except ValueError:
        cap = 4000
    cap = max(500, min(20000, cap))
    snippet = prev_output.strip()
    if len(snippet) > cap:
        snippet = snippet[: cap - 1] + "…"

    desc = str(getattr(next_task, "description", "") or "")
    if _STEP_CONTEXT_MARKER in desc:
        return
    setattr(next_task, "description", desc + _STEP_CONTEXT_MARKER + snippet + "\n")
    _progress("using previous step output to inform next step")


def _serial_crew_task_callback(output: Any) -> None:
    state = _KICKOFF_CB_STATE.get()
    if state is None or not state.task_run_order:
        return
    state.last_completed += 1
    k = state.last_completed
    if k < 0 or k >= len(state.task_run_order):
        return
    task_id, task_ref, ap = state.task_run_order[k]
    ap.after_task(task_id, task_ref, output, None)
    # Capture a best-effort textual form of the output for next-step continuity.
    try:
        state.last_output_text = str(output) if output is not None else ""
    except Exception:  # noqa: BLE001
        state.last_output_text = ""
    _progress(f"completed {_task_human_label(task_id, task_ref)}")
    if k + 1 < len(state.task_run_order):
        next_id, next_task, next_ap = state.task_run_order[k + 1]
        _inject_previous_output_into_next_task(next_task, state.last_output_text)
        _progress(f"starting {_task_human_label(next_id, next_task)}")
        next_ap.before_task(next_id, next_task, dict(state.inputs_holder))


def _to_process(value: str) -> Process:
    if value == "sequential":
        return Process.sequential
    if value == "hierarchical":
        return Process.hierarchical
    raise ValueError("workflow.process must be 'sequential' or 'hierarchical'.")


def _resolve_agent_provider_entries(config: WorkflowConfig) -> list[dict[str, Any]]:
    workflow_host = resolve_workflow_ollama_host(config.instance_key)
    resolved: list[dict[str, Any]] = []
    for entry in config.agent_providers:
        data = dict(entry)
        ptype = str(data.get("type", "")).strip().lower()
        if ptype == "ollama":
            host = str(data.get("ollama_host", "")).strip().lower()
            if host == _WORKFLOW_OLLAMA_HOST_TOKEN:
                data["ollama_host"] = workflow_host
        resolved.append(data)
    return resolved


def build_workflow(
    config: WorkflowConfig,
    *,
    crew_verbose: bool = True,
    quiet: bool = False,
    mcp_catalog_path: Path | None = None,
) -> BuiltWorkflow:
    """When ``quiet`` is False, Ollama CLI (pull/serve/install) inherits stdout/stderr."""

    if quiet:
        os.environ.pop("AGENTIC_OLLAMA_VERBOSE", None)
    else:
        os.environ["AGENTIC_OLLAMA_VERBOSE"] = "1"

    default_model = os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")

    resolved = _resolve_agent_provider_entries(config)
    usable_payloads, skipped_cred_ids = filter_entries_by_api_credentials(
        resolved,
        verbose=not quiet,
        log_prefix="workflow",
    )
    if skipped_cred_ids:
        skipped_set = frozenset(skipped_cred_ids)
        for task_def in config.tasks:
            if task_def.agent_provider_id in skipped_set:
                raise RuntimeError(
                    f"Task '{task_def.id}' references agent provider '{task_def.agent_provider_id}', "
                    "which was excluded because required API credentials are not set. "
                    "Set the provider's API key (see prior log lines), switch this task to "
                    "another agent provider, or remove it from the workflow."
                )
    if not usable_payloads:
        raise RuntimeError(
            "All workflow agent providers were excluded: missing API credentials for every "
            "cloud entry. Set the required keys or use Ollama/local agent providers."
        )

    mcp_catalog_entries: list[dict[str, Any]] = (
        load_mcp_providers_catalog_merged(mcp_catalog_path)
        if mcp_catalog_path is not None
        else []
    )
    if mcp_catalog_entries:
        mcp_catalog_entries, _skipped_mcp = filter_mcp_entries_by_api_credentials(
            mcp_catalog_entries,
            verbose=not quiet,
            log_prefix="workflow mcp catalog",
        )

    task_mcps_resolved: dict[str, list[Any]] = {}
    for tdef in config.tasks:
        raw = raw_mcp_spec_for_task(tdef, config)
        task_mcps_resolved[tdef.id] = (
            resolve_workflow_mcp_refs(raw, mcp_catalog_entries) if raw else []
        )

    fingerprint_by_task: dict[str, tuple[str, ...]] = {
        tid: mcps_list_fingerprint(mclist) for tid, mclist in task_mcps_resolved.items()
    }

    groups_by_apid: dict[str, set[tuple[str, ...]]] = defaultdict(set)
    for tdef in config.tasks:
        groups_by_apid[tdef.agent_provider_id].add(fingerprint_by_task[tdef.id])

    if not quiet and any(task_mcps_resolved[t.id] for t in config.tasks):
        for tdef in config.tasks:
            raw_spec = raw_mcp_spec_for_task(tdef, config)
            spec_label = raw_spec if raw_spec else "(none — workflow default empty)"
            print(
                f"(mcp) task {tdef.id!r} -> {len(task_mcps_resolved[tdef.id])} MCP config(s); "
                f"yaml/plan spec: {spec_label!r}",
                file=sys.stderr,
            )

    agent_providers: dict[str, AgentProvider] = {}
    for provider_data in usable_payloads:
        ap = agent_provider_from_dict(provider_data, default_model=default_model)
        if ap.config.id in agent_providers:
            raise ValueError(f"Duplicate agent provider id: '{ap.config.id}'.")
        ap.validate_config()
        ap.initialize()
        ap.health_check()
        agent_providers[ap.config.id] = ap

    crew_agent_cache: dict[tuple[str, tuple[str, ...]], Any] = {}
    for tdef in config.tasks:
        apid = tdef.agent_provider_id
        fp = fingerprint_by_task[tdef.id]
        key = (apid, fp)
        if key in crew_agent_cache:
            continue
        ap = agent_providers[apid]
        mcps_list = task_mcps_resolved[tdef.id]
        role_suffix: str | None = None
        if len(groups_by_apid[apid]) > 1:
            role_suffix = hashlib.sha256("|".join(fp).encode("utf-8")).hexdigest()[:8]
        crew_agent_cache[key] = ap.build_agent(
            mcps=mcps_list if mcps_list else None,
            role_suffix=role_suffix,
        )

    agents = list(crew_agent_cache.values())

    task_def_by_id: dict[str, TaskDefinition] = {t.id: t for t in config.tasks}
    tasks_by_id: dict[str, Task] = {}
    for task_def in config.tasks:
        apid = task_def.agent_provider_id
        fp = fingerprint_by_task[task_def.id]
        agent = crew_agent_cache.get((apid, fp))
        if agent is None:
            raise ValueError(
                f"Task '{task_def.id}' references unknown agent provider "
                f"'{task_def.agent_provider_id}'."
            )

        tasks_by_id[task_def.id] = Task(
            description=task_def.description,
            expected_output=task_def.expected_output,
            agent=agent,
        )

    ordered_tasks: list[Task] = []
    for task_id in config.task_sequence:
        task = tasks_by_id.get(task_id)
        if task is None:
            raise ValueError(f"task_sequence references unknown task id '{task_id}'.")
        ordered_tasks.append(task)

    task_run_order: list[tuple[str, Task, AgentProvider]] = []
    for task_id in config.task_sequence:
        task_obj = tasks_by_id[task_id]
        task_definition = task_def_by_id[task_id]
        ap = agent_providers[task_definition.agent_provider_id]
        task_run_order.append((task_id, task_obj, ap))

    inputs_holder: dict[str, Any] = {}
    kickoff_state = _SequentialKickoffState(
        task_run_order=task_run_order,
        inputs_holder=inputs_holder,
    )
    kickoff_state.progress_enabled = (
        os.getenv("AGENTIC_PROGRESS", "1").strip().lower() not in ("0", "false", "no", "off")
    )

    crew = Crew(
        agents=agents,
        tasks=ordered_tasks,
        process=_to_process(config.process),
        verbose=crew_verbose,
        task_callback=_serial_crew_task_callback,
        before_kickoff_callbacks=[_serial_crew_before_kickoff],
    )

    topic = config.topic or os.getenv("WORKFLOW_TOPIC", "Agentic AI orchestration")
    workflow_context: dict[str, Any] = {
        "workflow_name": config.name,
        "process": config.process,
        "topic": topic,
        "task_mcps_resolved": {k: list(v) for k, v in task_mcps_resolved.items()},
    }
    return BuiltWorkflow(
        crew=crew,
        inputs={"topic": topic},
        agent_providers=agent_providers,
        workflow_context=workflow_context,
        kickoff_callback_state=kickoff_state,
    )
