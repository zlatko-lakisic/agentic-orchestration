from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from crewai import Crew, Process, Task

from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.workflow_ollama import resolve_workflow_ollama_host
from providers.base import Provider
from providers.factory import provider_from_dict

_WORKFLOW_OLLAMA_HOST_TOKEN = "workflow"


@dataclass
class BuiltWorkflow:
    crew: Crew
    inputs: dict[str, str]
    providers: dict[str, Provider]
    workflow_context: dict[str, Any]


def _to_process(value: str) -> Process:
    if value == "sequential":
        return Process.sequential
    if value == "hierarchical":
        return Process.hierarchical
    raise ValueError("workflow.process must be 'sequential' or 'hierarchical'.")


def _make_crew_before_kickoff(
    task_run_order: list[tuple[str, Task, Provider]],
    inputs_holder: dict[str, Any],
):
    def _before(inputs: dict[str, Any] | None) -> dict[str, Any]:
        merged = dict(inputs or {})
        inputs_holder.clear()
        inputs_holder.update(merged)
        if task_run_order:
            first_id, first_task, first_provider = task_run_order[0]
            first_provider.before_task(first_id, first_task, dict(inputs_holder))
        return merged

    return _before


def _make_after_task_callback(
    task_id: str,
    task_ref: Task,
    provider: Provider,
    next_plan: tuple[str, Task, Provider] | None,
    inputs_holder: dict[str, Any],
):
    def _cb(output: Any) -> None:
        provider.after_task(task_id, task_ref, output, None)
        if next_plan is not None:
            next_id, next_task, next_provider = next_plan
            next_provider.before_task(next_id, next_task, dict(inputs_holder))

    return _cb


def _resolve_provider_entries(config: WorkflowConfig) -> list[dict[str, Any]]:
    workflow_host = resolve_workflow_ollama_host(config.instance_key)
    resolved: list[dict[str, Any]] = []
    for entry in config.providers:
        data = dict(entry)
        if str(data.get("type", "")).strip().lower() == "ollama":
            host = str(data.get("ollama_host", "")).strip().lower()
            if host == _WORKFLOW_OLLAMA_HOST_TOKEN:
                data["ollama_host"] = workflow_host
        resolved.append(data)
    return resolved


def build_workflow(config: WorkflowConfig) -> BuiltWorkflow:
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
    for index, (task_id, task_obj, provider) in enumerate(task_run_order):
        next_plan = (
            task_run_order[index + 1] if index + 1 < len(task_run_order) else None
        )
        task_obj.callback = _make_after_task_callback(
            task_id, task_obj, provider, next_plan, inputs_holder
        )

    crew = Crew(
        agents=agents,
        tasks=ordered_tasks,
        process=_to_process(config.process),
        verbose=True,
        before_kickoff_callbacks=[_make_crew_before_kickoff(task_run_order, inputs_holder)],
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
    )
