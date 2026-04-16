from __future__ import annotations

from typing import Any, Sequence

from crewai import Agent

from agent_providers.base import AgentProvider, augment_backstory_for_mcp_tools


class CrewAIProvider(AgentProvider):
    """Default provider implementation backed by CrewAI Agent."""

    def initialize(self) -> None:
        # No provider-specific bootstrap required for default CrewAI provider.
        return None

    def build_agent(
        self,
        *,
        mcps: Sequence[Any] | None = None,
        role_suffix: str | None = None,
    ) -> Agent:
        kwargs: dict[str, Any] = dict(
            role=self.crew_agent_role_label(role_suffix),
            goal=self.config.goal,
            backstory=augment_backstory_for_mcp_tools(self.config.backstory, mcps),
            llm=self.config.model,
            verbose=self.config.verbose,
            allow_delegation=self.config.allow_delegation,
        )
        if mcps:
            kwargs["mcps"] = list(mcps)
        return Agent(**kwargs)
