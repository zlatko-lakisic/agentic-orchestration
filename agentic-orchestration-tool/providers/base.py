from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from crewai import Agent


@dataclass(frozen=True)
class ProviderConfig:
    """Structured provider definition loaded from YAML."""

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
    verbose: bool = True
    allow_delegation: bool = False


class Provider(ABC):
    """Abstract provider that knows how to create a CrewAI agent."""

    def __init__(self, config: ProviderConfig) -> None:
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
    def build_agent(self) -> Agent:
        """Build and return a CrewAI agent instance."""
