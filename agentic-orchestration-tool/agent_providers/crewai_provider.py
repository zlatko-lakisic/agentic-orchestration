from __future__ import annotations

from typing import Any

from crewai import Agent

from agent_providers.base import AgentProvider


class CrewAIProvider(AgentProvider):
    """Default provider implementation backed by CrewAI Agent."""

    def initialize(self) -> None:
        # No provider-specific bootstrap required for default CrewAI provider.
        return None

    def build_agent(self, *, mcps: list[str] | None = None) -> Agent:
        kwargs: dict[str, Any] = dict(
            role=self.config.role,
            goal=self.config.goal,
            backstory=self.config.backstory,
            llm=self.config.model,
            verbose=self.config.verbose,
            allow_delegation=self.config.allow_delegation,
        )
        if mcps:
            kwargs["mcps"] = mcps
        return Agent(**kwargs)
