from __future__ import annotations

from crewai import Agent

from providers.base import Provider


class CrewAIProvider(Provider):
    """Default provider implementation backed by CrewAI Agent."""

    def initialize(self) -> None:
        # No provider-specific bootstrap required for default CrewAI provider.
        return None

    def build_agent(self) -> Agent:
        return Agent(
            role=self.config.role,
            goal=self.config.goal,
            backstory=self.config.backstory,
            llm=self.config.model,
            verbose=self.config.verbose,
            allow_delegation=self.config.allow_delegation,
        )
