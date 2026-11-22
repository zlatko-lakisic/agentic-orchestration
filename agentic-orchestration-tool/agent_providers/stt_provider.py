"""STT agent provider — managed OpenAI-compatible transcription."""

from __future__ import annotations

import json
from typing import Any, Sequence

from crewai import Agent
from crewai.llms.base_llm import BaseLLM

from agent_providers.base import AgentProvider, resolve_agent_backstory


class _SttLLM(BaseLLM):
    def __init__(self, *, entry: dict[str, Any]) -> None:
        super().__init__(model="stt", provider="stt")
        self._entry = entry

    def call(
        self,
        messages: str | list[Any],
        tools: list[Any] | None = None,
        callbacks: list[Any] | None = None,
        available_functions: dict[str, Any] | None = None,
        from_task: Any = None,
        from_agent: Any = None,
        response_model: Any = None,
    ) -> str | Any:
        del messages, tools, callbacks, available_functions, from_task, from_agent, response_model
        return json.dumps(
            {
                "ok": False,
                "error": "stt requires direct_agent / WS with JSON {audio_file_id}",
                "provider": str(self._entry.get("id") or ""),
            },
            sort_keys=True,
        )


class SttProvider(AgentProvider):
    PROVIDER_TYPE = "stt"

    def validate_config(self) -> None:
        opts = self.config.provider_options or {}
        if not str(opts.get("endpoint_env") or "").strip():
            raise ValueError(
                f"Agent provider '{self.config.id}' (type stt) is missing 'endpoint_env'."
            )

    def initialize(self) -> None:
        self.validate_config()

    def cleanup(self) -> None:
        return None

    def build_agent(
        self,
        *,
        mcps: Sequence[Any] | None = None,
        skill_backstory_blocks: Sequence[tuple[str, str]] | None = None,
        role_suffix: str | None = None,
    ) -> Agent:
        self.validate_config()
        entry = {
            "id": self.config.id,
            "type": "stt",
            "provider_options": dict(self.config.provider_options or {}),
        }
        return Agent(
            role=self.crew_agent_role_label(role_suffix),
            goal=self.config.goal,
            backstory=resolve_agent_backstory(
                self.config.backstory,
                mcps=mcps,
                skill_backstory_blocks=skill_backstory_blocks,
            ),
            llm=_SttLLM(entry=entry),
            verbose=bool(self.config.verbose),
            allow_delegation=False,
            tools=[],
        )
