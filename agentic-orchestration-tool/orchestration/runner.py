from __future__ import annotations

import os
from dataclasses import dataclass

from crewai import Crew, Process, Task

from orchestration.config_loader import WorkflowConfig
from providers.base import Provider, provider_from_dict


@dataclass
class BuiltWorkflow:
    crew: Crew
    inputs: dict[str, str]


def _to_process(value: str) -> Process:
    if value == "sequential":
        return Process.sequential
    if value == "hierarchical":
        return Process.hierarchical
    raise ValueError("workflow.process must be 'sequential' or 'hierarchical'.")


def build_workflow(config: WorkflowConfig) -> BuiltWorkflow:
    default_model = os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")

    providers: dict[str, Provider] = {}
    for provider_data in config.providers:
        provider = provider_from_dict(provider_data, default_model=default_model)
        if provider.config.id in providers:
            raise ValueError(f"Duplicate provider id: '{provider.config.id}'.")
        providers[provider.config.id] = provider

    agents_by_provider_id = {
        provider_id: provider.build_agent() for provider_id, provider in providers.items()
    }
    agents = list(agents_by_provider_id.values())

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

    crew = Crew(
        agents=agents,
        tasks=ordered_tasks,
        process=_to_process(config.process),
        verbose=True,
    )

    topic = config.topic or os.getenv("WORKFLOW_TOPIC", "Agentic AI orchestration")
    return BuiltWorkflow(crew=crew, inputs={"topic": topic})
