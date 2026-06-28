from __future__ import annotations

from typing import Any

from orchestration.config_loader import WorkflowConfig
from orchestration.workflow_ollama import resolve_workflow_ollama_host

_WORKFLOW_OLLAMA_HOST_TOKEN = "workflow"


def resolve_agent_provider_entries(config: WorkflowConfig) -> list[dict[str, Any]]:
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
