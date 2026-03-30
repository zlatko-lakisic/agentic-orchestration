from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
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
    verbose: bool = True
    allow_delegation: bool = False


class Provider(ABC):
    """Abstract provider that knows how to create a CrewAI agent."""

    def __init__(self, config: ProviderConfig) -> None:
        self.config = config

    @abstractmethod
    def build_agent(self) -> Agent:
        """Build and return a CrewAI agent instance."""


class CrewAIProvider(Provider):
    """Default provider implementation backed by CrewAI Agent."""

    def build_agent(self) -> Agent:
        return Agent(
            role=self.config.role,
            goal=self.config.goal,
            backstory=self.config.backstory,
            llm=self.config.model,
            verbose=self.config.verbose,
            allow_delegation=self.config.allow_delegation,
        )


def provider_from_dict(data: dict[str, Any], default_model: str) -> Provider:
    provider_id = str(data.get("id", "")).strip()
    if not provider_id:
        raise ValueError("Each provider must include a non-empty 'id'.")

    config = ProviderConfig(
        id=provider_id,
        role=str(data.get("role", "")).strip(),
        goal=str(data.get("goal", "")).strip(),
        backstory=str(data.get("backstory", "")).strip(),
        model=str(data.get("model", default_model)).strip(),
        verbose=bool(data.get("verbose", True)),
        allow_delegation=bool(data.get("allow_delegation", False)),
    )

    if not config.role:
        raise ValueError(f"Provider '{config.id}' is missing 'role'.")
    if not config.goal:
        raise ValueError(f"Provider '{config.id}' is missing 'goal'.")
    if not config.backstory:
        raise ValueError(f"Provider '{config.id}' is missing 'backstory'.")
    if not config.model:
        raise ValueError(f"Provider '{config.id}' is missing 'model'.")

    return CrewAIProvider(config)
