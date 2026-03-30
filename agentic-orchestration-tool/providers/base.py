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
    verbose: bool = True
    allow_delegation: bool = False


class Provider(ABC):
    """Abstract provider that knows how to create a CrewAI agent."""

    def __init__(self, config: ProviderConfig) -> None:
        self.config = config

    @abstractmethod
    def initialize(self) -> None:
        """Run provider-specific initialization before agent creation."""

    def cleanup(self) -> None:
        """Run after the workflow finishes (success or failure). Override as needed."""
        return None

    @abstractmethod
    def build_agent(self) -> Agent:
        """Build and return a CrewAI agent instance."""
