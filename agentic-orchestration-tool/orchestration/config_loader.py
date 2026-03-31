from __future__ import annotations

from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class TaskDefinition:
    id: str
    agent_provider_id: str
    description: str
    expected_output: str
    # When None, inherit ``WorkflowConfig.mcp_providers``. When [], no MCP for this task only.
    mcp_providers: list[Any] | None = None


@dataclass(frozen=True)
class WorkflowConfig:
    name: str
    process: str
    topic: str
    # meta.id or config filename stem (used for per-workflow Ollama port when host is "workflow").
    instance_key: str
    agent_providers: list[dict[str, Any]]
    # Catalog ids (strings) and/or inline mappings with ``ref`` / ``refs`` (CrewAI MCP DSL strings).
    mcp_providers: list[Any]
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

    meta = raw.get("meta") or {}
    if not isinstance(meta, dict):
        meta = {}
    instance_key = str(meta.get("id", "")).strip() or config_path.stem

    workflow = raw.get("workflow", {})
    if not isinstance(workflow, dict):
        raise ValueError("Top-level 'workflow' key must be a mapping.")

    name = str(workflow.get("name", "yaml-driven-crew")).strip()
    process = str(workflow.get("process", "sequential")).strip().lower()
    topic = str(workflow.get("topic", "")).strip()

    agent_providers = workflow.get("agent_providers")
    if agent_providers is None:
        agent_providers = workflow.get("providers", [])
    mcp_providers = workflow.get("mcp_providers", [])
    tasks = workflow.get("tasks", [])
    sequence = workflow.get("task_sequence", [])

    if not isinstance(agent_providers, list) or not agent_providers:
        raise ValueError(
            "'workflow.agent_providers' (or legacy 'workflow.providers') must be a non-empty list."
        )
    if not isinstance(tasks, list) or not tasks:
        raise ValueError("'workflow.tasks' must be a non-empty list.")
    if not isinstance(sequence, list) or not sequence:
        raise ValueError("'workflow.task_sequence' must be a non-empty list.")
    if not isinstance(mcp_providers, list):
        raise ValueError("'workflow.mcp_providers' must be a list when set.")
    for j, mcp_item in enumerate(mcp_providers):
        if isinstance(mcp_item, str):
            continue
        if isinstance(mcp_item, dict):
            continue
        raise ValueError(
            f"workflow.mcp_providers[{j}] must be a catalog id string or an inline mapping",
        )

    task_definitions: list[TaskDefinition] = []
    for item in tasks:
        if not isinstance(item, dict):
            raise ValueError("Each item in 'workflow.tasks' must be a mapping.")
        task_id = str(item.get("id", "")).strip()
        apid = str(item.get("agent_provider_id") or item.get("provider_id", "")).strip()
        description = str(item.get("description", "")).strip()
        expected_output = str(item.get("expected_output", "")).strip()

        if not task_id:
            raise ValueError("Each task must include a non-empty 'id'.")
        if not apid:
            raise ValueError(
                f"Task '{task_id}' is missing 'agent_provider_id' (or legacy 'provider_id')."
            )
        if not description:
            raise ValueError(f"Task '{task_id}' is missing 'description'.")
        if not expected_output:
            raise ValueError(f"Task '{task_id}' is missing 'expected_output'.")

        task_mcp: list[Any] | None
        if "mcp_providers" in item:
            tmcp = item["mcp_providers"]
            if not isinstance(tmcp, list):
                raise ValueError(f"Task '{task_id}' mcp_providers must be a list when set.")
            for j, mcp_item in enumerate(tmcp):
                if isinstance(mcp_item, str):
                    continue
                if isinstance(mcp_item, dict):
                    continue
                raise ValueError(
                    f"Task '{task_id}' mcp_providers[{j}] must be a catalog id or inline mapping",
                )
            task_mcp = list(tmcp)
        else:
            task_mcp = None

        task_definitions.append(
            TaskDefinition(
                id=task_id,
                agent_provider_id=apid,
                description=description,
                expected_output=expected_output,
                mcp_providers=task_mcp,
            )
        )

    cfg = WorkflowConfig(
        name=name,
        process=process,
        topic=topic,
        instance_key=instance_key,
        agent_providers=agent_providers,
        mcp_providers=list(mcp_providers),
        tasks=task_definitions,
        task_sequence=[str(task_id).strip() for task_id in sequence],
    )
    if topic_override is not None and str(topic_override).strip():
        cfg = replace(cfg, topic=str(topic_override).strip())
    return cfg
