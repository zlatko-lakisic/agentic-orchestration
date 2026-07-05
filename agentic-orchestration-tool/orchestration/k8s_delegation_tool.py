"""CrewAI tool that delegates a sub-task to a child K8s worker Job (K5.5)."""

from __future__ import annotations

import os
from typing import Any

from crewai.tools import BaseTool

from orchestration.agent_providers_catalog import load_agent_providers_catalog_merged
from orchestration.backends.kubernetes_delegation import (
    delegation_enabled_from_env,
    submit_delegation_request,
)
from orchestration.catalog_credentials import filter_entries_by_api_credentials


class K8sDelegateTaskTool(BaseTool):
    name: str = "k8s_delegate_task"
    description: str = (
        "Delegate a sub-task to another agent running in an isolated Kubernetes worker Job. "
        "Use when the work needs a different specialist agent provider. "
        "Provide agent_provider_id from the catalog, a clear task_description, "
        "and expected_output describing success."
    )

    def __init__(
        self,
        *,
        parent_run_id: str,
        parent_step_id: str,
        run_store_mount: str,
        topic: str,
        agent_catalog: list[dict[str, Any]],
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self._parent_run_id = parent_run_id
        self._parent_step_id = parent_step_id
        self._run_store_mount = run_store_mount
        self._topic = topic
        self._agent_catalog = agent_catalog

    def _resolve_agent_provider(self, agent_provider_id: str) -> dict[str, Any]:
        agent_id = agent_provider_id.strip()
        for entry in self._agent_catalog:
            if str(entry.get("id") or "").strip() == agent_id:
                return dict(entry)
        raise ValueError(f"unknown agent_provider_id {agent_id!r}")

    def _run(
        self,
        agent_provider_id: str,
        task_description: str,
        expected_output: str = "A concise answer to the delegated sub-task.",
    ) -> str:
        provider = self._resolve_agent_provider(agent_provider_id)
        response = submit_delegation_request(
            run_store_mount=self._run_store_mount,
            parent_run_id=self._parent_run_id,
            parent_step_id=self._parent_step_id,
            agent_provider=provider,
            task_description=task_description,
            task_expected_output=expected_output,
            topic=self._topic,
        )
        if not response.succeeded:
            return f"Delegation failed: {response.error or 'unknown error'}"
        return response.result_text or "(empty delegation result)"


def attach_k8s_delegation_tool(
    built: Any,
    *,
    parent_run_id: str,
    parent_step_id: str,
    run_store_mount: str,
    topic: str,
) -> None:
    """Add ``k8s_delegate_task`` to every agent in a built single-step crew."""
    if not delegation_enabled_from_env():
        return
    if not run_store_mount:
        return
    if parent_step_id.startswith("delegate-"):
        return

    from orchestration.simple_chat import is_simple_chat_prompt

    if is_simple_chat_prompt(topic):
        return

    from pathlib import Path

    catalog_path = os.getenv("AGENTIC_AGENT_PROVIDERS_CATALOG", "config/agent_providers")
    root = Path(__file__).resolve().parents[1]
    path = Path(catalog_path)
    if not path.is_absolute():
        path = root / catalog_path
    entries = load_agent_providers_catalog_merged(path)
    usable, _skipped = filter_entries_by_api_credentials(
        entries,
        verbose=False,
        log_prefix="delegation tool",
    )

    tool = K8sDelegateTaskTool(
        parent_run_id=parent_run_id,
        parent_step_id=parent_step_id,
        run_store_mount=run_store_mount,
        topic=topic,
        agent_catalog=usable,
    )
    for agent in built.crew.agents:
        existing = list(getattr(agent, "tools", None) or [])
        agent.tools = [*existing, tool]
