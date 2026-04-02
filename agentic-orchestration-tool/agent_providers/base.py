from __future__ import annotations

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Sequence

from crewai import Agent

# Appended to agent backstory when MCP tools are enabled—local LLMs often emit OpenAI-style
# {"tool_name": ..., "parameters": {...}} but CrewAI passes inputs straight to the MCP schema.
_MCP_TOOL_HINT_MARKER = "[agentic: MCP tool arguments]"

_MCP_TOOL_CALLING_HINT = (
    f"{_MCP_TOOL_HINT_MARKER} Use only each tool schema's parameter names as top-level "
    "fields (e.g. `question`, optional `version`). Do not nest under `parameters` or add "
    '`tool_name`. Wrong: {"tool_name": "...", "parameters": {"question": "..."}}. '
    'Right: {"question": "...", "version": "latest"}. '
    "If a tool call fails (validation/network/server error), continue the task without it: "
    "produce a best-effort answer and clearly state what could not be verified."
)


def augment_backstory_for_mcp_tools(backstory: str, mcps: Sequence[Any] | None) -> str:
    if not mcps:
        return backstory
    if os.getenv("AGENTIC_DISABLE_MCP_TOOL_HINT", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    ):
        return backstory
    if _MCP_TOOL_HINT_MARKER in backstory:
        return backstory
    return backstory.rstrip() + "\n\n" + _MCP_TOOL_CALLING_HINT


@dataclass(frozen=True)
class AgentProviderConfig:
    """Structured agent-provider definition loaded from YAML (LLM-backed CrewAI agents)."""

    id: str
    role: str
    goal: str
    backstory: str
    model: str
    provider_type: str = "crewai"
    provider_class: str = ""
    provider_options: dict[str, Any] = field(default_factory=dict)
    selfcontained: bool = False
    ollama_host: str = ""
    openai_base_url: str = ""
    anthropic_base_url: str = ""
    huggingface_base_url: str = ""
    verbose: bool = True
    allow_delegation: bool = False


class AgentProvider(ABC):
    """Abstract agent provider: builds a CrewAI ``Agent`` (contrasts with future MCP integrations)."""

    def __init__(self, config: AgentProviderConfig) -> None:
        self.config = config

    def validate_config(self) -> None:
        """Fail fast on invalid YAML-derived config before side effects."""

    @abstractmethod
    def initialize(self) -> None:
        """Run provider-specific initialization before agent creation."""

    def health_check(self) -> None:
        """Verify dependencies after initialize(); no-op unless overridden."""

    def on_workflow_start(self, context: dict[str, Any]) -> None:
        """Called once after the workflow is built, before crew kickoff."""

    def before_task(self, task_id: str, task: Any, inputs: dict[str, Any]) -> None:
        """Called immediately before a task runs (after kickoff inputs are merged)."""

    def after_task(
        self,
        task_id: str,
        task: Any,
        output: Any,
        error: BaseException | None,
    ) -> None:
        """Called after a task completes successfully (not invoked if the task raises)."""

    def on_workflow_end(
        self,
        context: dict[str, Any],
        result: Any,
        error: BaseException | None,
    ) -> None:
        """Called once after kickoff returns or raises, before cleanup."""

    def cleanup(self) -> None:
        """Run after on_workflow_end; release resources from initialize()."""

    def reset(self) -> None:
        """Clear transient state if the same provider instance is reused (runner does not call this yet)."""

    def suspend(self) -> None:
        """Pause external resources (runner does not call this yet)."""

    def resume(self) -> None:
        """Resume after suspend() (runner does not call this yet)."""

    @abstractmethod
    def build_agent(
        self,
        *,
        mcps: Sequence[Any] | None = None,
        role_suffix: str | None = None,
    ) -> Agent:
        """Build and return a CrewAI agent instance."""
