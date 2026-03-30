from __future__ import annotations

import os
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any

from crewai import Crew, Process, Task

from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.workflow_ollama import resolve_workflow_ollama_host
from providers.base import Provider
from providers.factory import provider_from_dict

_WORKFLOW_OLLAMA_HOST_TOKEN = "workflow"

_KICKOFF_CB_STATE: ContextVar[_SequentialKickoffState | None] = ContextVar(
    "_KICKOFF_CB_STATE", default=None
)


@dataclass
class _SequentialKickoffState:
    """Mutable state for module-level Crew callbacks (sequential task order)."""

    task_run_order: list[tuple[str, Task, Provider]]
    inputs_holder: dict[str, Any]
    last_completed: int = field(default=-1)


@dataclass
class BuiltWorkflow:
    crew: Crew
    inputs: dict[str, str]
    providers: dict[str, Provider]
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


def _serial_crew_before_kickoff(inputs: dict[str, Any] | None) -> dict[str, Any]:
    state = _KICKOFF_CB_STATE.get()
    if state is None:
        return dict(inputs or {})
    merged = dict(inputs or {})
    state.inputs_holder.clear()
    state.inputs_holder.update(merged)
    state.last_completed = -1
    if state.task_run_order:
        first_id, first_task, first_provider = state.task_run_order[0]
        first_provider.before_task(first_id, first_task, dict(state.inputs_holder))
    return merged


def _serial_crew_task_callback(output: Any) -> None:
    state = _KICKOFF_CB_STATE.get()
    if state is None or not state.task_run_order:
        return
    state.last_completed += 1
    k = state.last_completed
    if k < 0 or k >= len(state.task_run_order):
        return
    task_id, task_ref, provider = state.task_run_order[k]
    provider.after_task(task_id, task_ref, output, None)
    if k + 1 < len(state.task_run_order):
        next_id, next_task, next_provider = state.task_run_order[k + 1]
        next_provider.before_task(next_id, next_task, dict(state.inputs_holder))


def _to_process(value: str) -> Process:
    if value == "sequential":
        return Process.sequential
    if value == "hierarchical":
        return Process.hierarchical
    raise ValueError("workflow.process must be 'sequential' or 'hierarchical'.")


def _resolve_provider_entries(config: WorkflowConfig) -> list[dict[str, Any]]:
    workflow_host = resolve_workflow_ollama_host(config.instance_key)
    resolved: list[dict[str, Any]] = []
    for entry in config.providers:
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
) -> BuiltWorkflow:
    """When ``quiet`` is False, Ollama CLI (pull/serve/install) inherits stdout/stderr."""

    if quiet:
        os.environ.pop("AGENTIC_OLLAMA_VERBOSE", None)
    else:
        os.environ["AGENTIC_OLLAMA_VERBOSE"] = "1"

    default_model = os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")

    providers: dict[str, Provider] = {}
    for provider_data in _resolve_provider_entries(config):
        provider = provider_from_dict(provider_data, default_model=default_model)
        if provider.config.id in providers:
            raise ValueError(f"Duplicate provider id: '{provider.config.id}'.")
        provider.validate_config()
        provider.initialize()
        provider.health_check()
        providers[provider.config.id] = provider

    agents_by_provider_id = {
        provider_id: provider.build_agent() for provider_id, provider in providers.items()
    }
    agents = list(agents_by_provider_id.values())

    task_def_by_id: dict[str, TaskDefinition] = {t.id: t for t in config.tasks}
    tasks_by_id: dict[str, Task] = {}
    for task_def in config.tasks:
        agent = agents_by_provider_id.get(task_def.provider_id)
        if agent is None:
            raise ValueError(
                f"Task '{task_def.id}' references unknown provider "
                f"'{task_def.provider_id}'."
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

    task_run_order: list[tuple[str, Task, Provider]] = []
    for task_id in config.task_sequence:
        task_obj = tasks_by_id[task_id]
        task_definition = task_def_by_id[task_id]
        provider = providers[task_definition.provider_id]
        task_run_order.append((task_id, task_obj, provider))

    inputs_holder: dict[str, Any] = {}
    kickoff_state = _SequentialKickoffState(
        task_run_order=task_run_order,
        inputs_holder=inputs_holder,
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
    }
    return BuiltWorkflow(
        crew=crew,
        inputs={"topic": topic},
        providers=providers,
        workflow_context=workflow_context,
        kickoff_callback_state=kickoff_state,
    )
