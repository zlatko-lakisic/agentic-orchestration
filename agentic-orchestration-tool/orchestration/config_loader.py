from __future__ import annotations

from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class TaskDefinition:
    id: str
    provider_id: str
    description: str
    expected_output: str


@dataclass(frozen=True)
class WorkflowConfig:
    name: str
    process: str
    topic: str
    providers: list[dict[str, Any]]
    tasks: list[TaskDefinition]
    task_sequence: list[str]


def load_workflow_config(
    config_path: Path,
    topic_override: str | None = None,
) -> WorkflowConfig:
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    with config_path.open("r", encoding="utf-8") as file:
        raw: dict[str, Any] = yaml.safe_load(file) or {}

    workflow = raw.get("workflow", {})
    if not isinstance(workflow, dict):
        raise ValueError("Top-level 'workflow' key must be a mapping.")

    name = str(workflow.get("name", "yaml-driven-crew")).strip()
    process = str(workflow.get("process", "sequential")).strip().lower()
    topic = str(workflow.get("topic", "")).strip()

    providers = workflow.get("providers", [])
    tasks = workflow.get("tasks", [])
    sequence = workflow.get("task_sequence", [])

    if not isinstance(providers, list) or not providers:
        raise ValueError("'workflow.providers' must be a non-empty list.")
    if not isinstance(tasks, list) or not tasks:
        raise ValueError("'workflow.tasks' must be a non-empty list.")
    if not isinstance(sequence, list) or not sequence:
        raise ValueError("'workflow.task_sequence' must be a non-empty list.")

    task_definitions: list[TaskDefinition] = []
    for item in tasks:
        if not isinstance(item, dict):
            raise ValueError("Each item in 'workflow.tasks' must be a mapping.")
        task_id = str(item.get("id", "")).strip()
        provider_id = str(item.get("provider_id", "")).strip()
        description = str(item.get("description", "")).strip()
        expected_output = str(item.get("expected_output", "")).strip()

        if not task_id:
            raise ValueError("Each task must include a non-empty 'id'.")
        if not provider_id:
            raise ValueError(f"Task '{task_id}' is missing 'provider_id'.")
        if not description:
            raise ValueError(f"Task '{task_id}' is missing 'description'.")
        if not expected_output:
            raise ValueError(f"Task '{task_id}' is missing 'expected_output'.")

        task_definitions.append(
            TaskDefinition(
                id=task_id,
                provider_id=provider_id,
                description=description,
                expected_output=expected_output,
            )
        )

    cfg = WorkflowConfig(
        name=name,
        process=process,
        topic=topic,
        providers=providers,
        tasks=task_definitions,
        task_sequence=[str(task_id).strip() for task_id in sequence],
    )
    if topic_override is not None and str(topic_override).strip():
        cfg = replace(cfg, topic=str(topic_override).strip())
    return cfg
