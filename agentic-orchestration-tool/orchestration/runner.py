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
from typing import Any, Callable

from crewai import Crew, Process, Task

from agent_providers.base import AgentProvider
from agent_providers.factory import agent_provider_from_dict
from orchestration.agent_provider_entries import resolve_agent_provider_entries
from orchestration.catalog_credentials import filter_entries_by_api_credentials
from orchestration.cloud_anonymize import (
    is_cloud_provider_type,
    maybe_redact_for_cloud_provider,
    redact_for_cloud,
    anonymize_cloud_enabled,
)
from orchestration.config_loader import TaskDefinition, WorkflowConfig, raw_mcp_spec_for_task, raw_skill_spec_for_task, raw_rag_spec_for_task
from orchestration.mcp_providers_catalog import (
    filter_mcp_entries_by_api_credentials,
    load_mcp_providers_catalog_merged,
    mcps_list_fingerprint,
    resolve_workflow_mcp_refs,
)
from orchestration.agent_skills_catalog import (
    partition_skill_entries,
    resolve_skill_blocks,
    resolve_task_skill_maps,
    skills_list_fingerprint,
)
from orchestration.agent_skills_context import augment_description_for_skills
from orchestration.crewai_mcp_normalize import normalize_mcps_for_crewai
from orchestration.mcp_task_hints import augment_task_description_for_mcps, mcp_ids_from_raw_spec
from orchestration.crewai_mcp_hotfix import apply_crewai_mcp_native_resolver_hotfix
from orchestration.step_context import prepare_step_description
from orchestration.rag_apply import apply_rag_for_task
from orchestration.rag_sources_catalog import load_rag_sources_catalog_merged
from orchestration.rag_tool import attach_rag_tools_to_agents
from orchestration.rag_retrieve import RagStepAudit
from orchestration.rag_grounding import finalize_rag_answer

apply_crewai_mcp_native_resolver_hotfix()

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
    emit_progress_lines: bool = True
    rag_audits: dict[str, RagStepAudit] = field(default_factory=dict)
    usage_agent_tokens: list[Any] = field(default_factory=list)


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
        try:
            from orchestration.llm_usage import reset_usage_context

            if st.usage_agent_tokens:
                reset_usage_context(st.usage_agent_tokens)
                st.usage_agent_tokens = []
        except Exception:  # noqa: BLE001
            pass
        _KICKOFF_CB_STATE.reset(token)


def _bind_task_agent_usage(ap: AgentProvider) -> None:
    """Attribute LiteLLM usage to the agent provider for the active task."""
    state = _KICKOFF_CB_STATE.get()
    if state is None:
        return
    try:
        from orchestration.llm_usage import bind_usage_context, reset_usage_context

        if state.usage_agent_tokens:
            reset_usage_context(state.usage_agent_tokens)
            state.usage_agent_tokens = []
        aid = str(getattr(ap.config, "id", "") or "").strip()
        if aid:
            state.usage_agent_tokens = bind_usage_context(agent_provider_id=aid)
    except Exception:  # noqa: BLE001
        state.usage_agent_tokens = []


def _progress(msg: str) -> None:
    """
    Emit a short progress line for UIs that don't stream verbose Crew logs.
    Written to the original stdout so it still appears when caller redirects stdout.
    Also forwards to the session progress sink (Reach / engine WS status).
    """
    state = _KICKOFF_CB_STATE.get()
    if state is None or not state.progress_enabled or not state.emit_progress_lines:
        return
    text = str(msg).strip()
    if not text:
        return
    try:
        sys.__stdout__.write(f"(progress) {text}\n")
        sys.__stdout__.flush()
    except Exception:  # noqa: BLE001
        pass
    try:
        from orchestration.progress_sink import emit_progress

        emit_progress(text)
    except Exception:  # noqa: BLE001
        return


_GENERIC_STEP_ID_RE = re.compile(r"^step_\d+$", re.IGNORECASE)
_TOOLS_UNSUPPORTED_HINTS = (
    "does not support tools",
    "tool calling is not supported",
    "tools are not supported",
)


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


def _error_means_tools_unsupported(exc: BaseException) -> bool:
    msg = str(exc or "").strip().lower()
    if not msg:
        return False
    return any(h in msg for h in _TOOLS_UNSUPPORTED_HINTS)


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
        _bind_task_agent_usage(ap)
    return merged


def _inject_previous_output_into_next_task(
    next_task: Task,
    prev_output: str,
    *,
    next_provider: AgentProvider | None = None,
) -> None:
    if not prev_output:
        return
    text = prev_output
    if next_provider is not None:
        text = maybe_redact_for_cloud_provider(
            text,
            provider_type=str(next_provider.config.provider_type or ""),
        )
    desc = str(getattr(next_task, "description", "") or "")
    new_desc = prepare_step_description(desc, text)
    if new_desc != desc:
        setattr(next_task, "description", new_desc)
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

    audit = state.rag_audits.get(task_id)
    if audit is not None and (audit.granted_rag_ids or audit.retrieved_chunks):
        _text, accepted, reject = finalize_rag_answer(state.last_output_text, audit)
        if not accepted:
            raise RuntimeError(
                f"RAG grounding failed for task {task_id!r}: {reject}",
            )

    _progress(f"completed {_task_human_label(task_id, task_ref)}")
    if k + 1 < len(state.task_run_order):
        next_id, next_task, next_ap = state.task_run_order[k + 1]
        _inject_previous_output_into_next_task(
            next_task,
            state.last_output_text,
            next_provider=next_ap,
        )
        _progress(f"starting {_task_human_label(next_id, next_task)}")
        next_ap.before_task(next_id, next_task, dict(state.inputs_holder))
        _bind_task_agent_usage(next_ap)


def _to_process(value: str) -> Process:
    if value == "sequential":
        return Process.sequential
    if value == "hierarchical":
        return Process.hierarchical
    raise ValueError("workflow.process must be 'sequential' or 'hierarchical'.")


def _resolve_agent_provider_entries(config: WorkflowConfig) -> list[dict[str, Any]]:
    return resolve_agent_provider_entries(config)


def build_workflow(
    config: WorkflowConfig,
    *,
    crew_verbose: bool = True,
    quiet: bool = False,
    mcp_catalog_path: Path | None = None,
    agent_skills_catalog_path: Path | None = None,
    rag_sources_catalog_path: Path | None = None,
    emit_progress_lines: bool = True,
    task_mcp_overrides: dict[str, list[Any]] | None = None,
    task_skill_overrides: dict[str, list[dict[str, Any]]] | None = None,
    on_progress: Callable[[str], None] | None = None,
) -> BuiltWorkflow:
    """When ``quiet`` is False, Ollama CLI (pull/serve/install) inherits stdout/stderr."""

    if quiet:
        os.environ.pop("AGENTIC_OLLAMA_VERBOSE", None)
    else:
        os.environ["AGENTIC_OLLAMA_VERBOSE"] = "1"

    default_model = os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")
    tool_root = Path(__file__).resolve().parents[1]

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
        from orchestration.k8s_mcp_compat import apply_kubernetes_mcp_catalog_policy

        mcp_catalog_entries, _k8s_excluded = apply_kubernetes_mcp_catalog_policy(
            mcp_catalog_entries,
            verbose=not quiet,
            log_prefix="workflow mcp catalog",
        )

    task_mcps_resolved: dict[str, list[Any]] = {}
    for tdef in config.tasks:
        if task_mcp_overrides is not None and tdef.id in task_mcp_overrides:
            task_mcps_resolved[tdef.id] = list(task_mcp_overrides[tdef.id])
            continue
        raw = raw_mcp_spec_for_task(tdef, config)
        task_mcps_resolved[tdef.id] = (
            resolve_workflow_mcp_refs(raw, mcp_catalog_entries) if raw else []
        )

    task_skills_resolved = resolve_task_skill_maps(
        config,
        skills_catalog_path=agent_skills_catalog_path,
        quiet=quiet,
    )
    if task_skill_overrides is not None:
        for tid, override in task_skill_overrides.items():
            task_skills_resolved[tid] = list(override)

    rag_catalog: list[dict[str, Any]] = (
        load_rag_sources_catalog_merged(rag_sources_catalog_path)
        if rag_sources_catalog_path is not None
        else []
    )
    task_rag_audits: dict[str, RagStepAudit] = {}
    task_rag_descriptions: dict[str, str] = {}
    for tdef in config.tasks:
        base_desc = tdef.description
        desc, audit, _ids = apply_rag_for_task(
            tdef,
            config,
            description=base_desc,
            catalog_entries=rag_catalog,
            tool_root=tool_root,
        )
        task_rag_audits[tdef.id] = audit
        task_rag_descriptions[tdef.id] = desc

    task_skill_blocks: dict[str, list[tuple[str, str]]] = {}
    backstory_skill_blocks: dict[str, list[tuple[str, str]]] = {}
    backstory_skill_fp_by_task: dict[str, tuple[str, ...]] = {}
    for tdef in config.tasks:
        task_entries, backstory_entries = partition_skill_entries(
            task_skills_resolved[tdef.id],
        )
        task_skill_blocks[tdef.id] = resolve_skill_blocks(task_entries)
        backstory_skill_blocks[tdef.id] = resolve_skill_blocks(backstory_entries)
        backstory_skill_fp_by_task[tdef.id] = skills_list_fingerprint(
            [str(e.get("id", "")).strip() for e in backstory_entries],
        )

    fingerprint_by_task: dict[str, tuple[str, ...]] = {
        tid: mcps_list_fingerprint(mclist) for tid, mclist in task_mcps_resolved.items()
    }
    rag_fp_by_task: dict[str, tuple[str, ...]] = {
        tdef.id: tuple(sorted(raw_rag_spec_for_task(tdef, config)))
        for tdef in config.tasks
    }
    agent_cache_fp_by_task: dict[str, tuple[tuple[str, ...], tuple[str, ...], tuple[str, ...]]] = {
        tid: (fingerprint_by_task[tid], backstory_skill_fp_by_task[tid], rag_fp_by_task[tid])
        for tid in fingerprint_by_task
    }

    groups_by_apid: dict[str, set[tuple[tuple[str, ...], tuple[str, ...], tuple[str, ...]]]] = defaultdict(set)
    for tdef in config.tasks:
        groups_by_apid[tdef.agent_provider_id].add(agent_cache_fp_by_task[tdef.id])

    if not quiet and any(task_mcps_resolved[t.id] for t in config.tasks):
        for tdef in config.tasks:
            raw_spec = raw_mcp_spec_for_task(tdef, config)
            spec_label = raw_spec if raw_spec else "(none — workflow default empty)"
            print(
                f"(mcp) task {tdef.id!r} -> {len(task_mcps_resolved[tdef.id])} MCP config(s); "
                f"yaml/plan spec: {spec_label!r}",
                file=sys.stderr,
            )

    if not quiet and any(task_skills_resolved[t.id] for t in config.tasks):
        for tdef in config.tasks:
            raw_spec = raw_skill_spec_for_task(tdef, config)
            spec_label = raw_spec if raw_spec else "(none — workflow default empty)"
            print(
                f"(skills) task {tdef.id!r} -> {len(task_skills_resolved[tdef.id])} skill(s); "
                f"yaml/plan spec: {spec_label!r}",
                file=sys.stderr,
            )

    agent_providers: dict[str, AgentProvider] = {}
    from orchestration.runtime_bootstrap import ensure_provider_payloads

    ensure_cb = on_progress
    if ensure_cb is None and not quiet:
        ensure_cb = lambda m: print(f"(progress) {m}", file=sys.stderr)
    ensure_provider_payloads(usable_payloads, progress=ensure_cb)
    for provider_data in usable_payloads:
        ap = agent_provider_from_dict(provider_data, default_model=default_model)
        if ap.config.id in agent_providers:
            raise ValueError(f"Duplicate agent provider id: '{ap.config.id}'.")
        ap.validate_config()
        ap.initialize()
        ap.health_check()
        agent_providers[ap.config.id] = ap

    crew_agent_cache: dict[tuple[str, tuple[tuple[str, ...], tuple[str, ...], tuple[str, ...]]], Any] = {}
    mcps_disabled_for_provider: set[str] = set()
    for tdef in config.tasks:
        apid = tdef.agent_provider_id
        fp = agent_cache_fp_by_task[tdef.id]
        key = (apid, fp)
        if key in crew_agent_cache:
            continue
        ap = agent_providers[apid]
        mcps_list = task_mcps_resolved[tdef.id]
        effective_mcps = mcps_list if (mcps_list and apid not in mcps_disabled_for_provider) else []
        if effective_mcps:
            effective_mcps = normalize_mcps_for_crewai(effective_mcps) or []
        role_suffix: str | None = None
        if len(groups_by_apid[apid]) > 1:
            role_suffix = hashlib.sha256(
                "|".join(fp[0]) + "||" + "|".join(fp[1])
            ).encode("utf-8").hexdigest()[:8]
        try:
            crew_agent_cache[key] = ap.build_agent(
                mcps=effective_mcps if effective_mcps else None,
                skill_backstory_blocks=backstory_skill_blocks[tdef.id] or None,
                role_suffix=role_suffix,
            )
        except Exception as exc:
            if effective_mcps and _error_means_tools_unsupported(exc):
                mcps_disabled_for_provider.add(apid)
                if not quiet:
                    print(
                        f"(mcp) provider {apid!r} model {ap.config.model!r} does not support tools; "
                        "retrying without MCP tools for this provider.",
                        file=sys.stderr,
                    )
                crew_agent_cache[key] = ap.build_agent(
                    mcps=None,
                    skill_backstory_blocks=backstory_skill_blocks[tdef.id] or None,
                    role_suffix=role_suffix,
                )
            else:
                raise
        try:
            from orchestration.llm_usage import attach_usage_agent_to_crew_agent

            attach_usage_agent_to_crew_agent(crew_agent_cache[key], apid)
        except Exception:  # noqa: BLE001
            pass

    agents = list(crew_agent_cache.values())

    # Attach tool-mode RAG tools per agent (ACL enforced inside RagQueryTool).
    for tdef in config.tasks:
        apid = tdef.agent_provider_id
        fp = agent_cache_fp_by_task[tdef.id]
        agent = crew_agent_cache.get((apid, fp))
        if agent is None:
            continue
        rag_ids = frozenset(raw_rag_spec_for_task(tdef, config))
        audit = task_rag_audits.get(tdef.id) or RagStepAudit(granted_rag_ids=list(rag_ids))
        attach_rag_tools_to_agents(
            [agent],
            allowed_source_ids=rag_ids,
            catalog_entries=rag_catalog,
            tool_root=tool_root,
            audit=audit,
        )

    task_def_by_id: dict[str, TaskDefinition] = {t.id: t for t in config.tasks}
    tasks_by_id: dict[str, Task] = {}
    for task_def in config.tasks:
        apid = task_def.agent_provider_id
        fp = agent_cache_fp_by_task[task_def.id]
        agent = crew_agent_cache.get((apid, fp))
        if agent is None:
            raise ValueError(
                f"Task '{task_def.id}' references unknown agent provider "
                f"'{task_def.agent_provider_id}'."
            )

        ptype = str(agent_providers[apid].config.provider_type or "")
        desc = augment_task_description_for_mcps(
            augment_description_for_skills(
                task_rag_descriptions.get(task_def.id, task_def.description),
                task_skill_blocks[task_def.id],
            ),
            mcp_ids_from_raw_spec(raw_mcp_spec_for_task(task_def, config)),
        )
        desc = maybe_redact_for_cloud_provider(desc, provider_type=ptype)
        expected = maybe_redact_for_cloud_provider(
            task_def.expected_output,
            provider_type=ptype,
        )

        tasks_by_id[task_def.id] = Task(
            description=desc,
            expected_output=expected,
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
        rag_audits=task_rag_audits,
    )
    kickoff_state.progress_enabled = (
        os.getenv("AGENTIC_PROGRESS", "1").strip().lower() not in ("0", "false", "no", "off")
    )
    kickoff_state.emit_progress_lines = bool(emit_progress_lines)

    crew_kwargs: dict[str, Any] = {
        "agents": agents,
        "tasks": ordered_tasks,
        "process": _to_process(config.process),
        "verbose": crew_verbose,
        "task_callback": _serial_crew_task_callback,
        "before_kickoff_callbacks": [_serial_crew_before_kickoff],
    }
    if config.process == "hierarchical":
        # CrewAI requires a manager for hierarchical crews (K6.1 reference workflow).
        crew_kwargs["manager_llm"] = (
            os.getenv("AGENTIC_CREW_MANAGER_MODEL", "").strip() or default_model
        )
    crew = Crew(**crew_kwargs)

    topic = config.topic or os.getenv("WORKFLOW_TOPIC", "Agentic AI orchestration")
    if anonymize_cloud_enabled() and any(
        is_cloud_provider_type(str(ap.config.provider_type or ""))
        for ap in agent_providers.values()
    ):
        topic = redact_for_cloud(topic, force=True)
    workflow_context: dict[str, Any] = {
        "workflow_name": config.name,
        "process": config.process,
        "topic": topic,
        "task_mcps_resolved": {k: list(v) for k, v in task_mcps_resolved.items()},
        "task_skills_resolved": {
            k: [str(e.get("id", "")).strip() for e in v] for k, v in task_skills_resolved.items()
        },
        "task_rag_audits": {k: v.to_dict() for k, v in task_rag_audits.items()},
    }
    return BuiltWorkflow(
        crew=crew,
        inputs={"topic": topic},
        agent_providers=agent_providers,
        workflow_context=workflow_context,
        kickoff_callback_state=kickoff_state,
    )
