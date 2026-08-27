"""Deterministic (non-LLM) agent provider — fixed Python entrypoint per step."""

from __future__ import annotations

from typing import Any, Sequence

from crewai import Agent
from crewai.llms.base_llm import BaseLLM

from agent_providers.base import AgentProvider, resolve_agent_backstory
from orchestration.deterministic_runtime import (
    entrypoint_from_entry,
    resolve_entrypoint,
    run_deterministic_step,
)


class _DeterministicLLM(BaseLLM):
    """CrewAI LLM shim that runs a fixed entrypoint instead of a model."""

    def __init__(self, *, entry: dict[str, Any], context: str = "") -> None:
        super().__init__(model="deterministic", provider="deterministic")
        self._entry = entry
        self._context = context

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
        del tools, callbacks, available_functions, from_task, from_agent, response_model
        text = _messages_to_text(messages)
        return run_deterministic_step(
            self._entry,
            text=text,
            context=self._context,
            mcp_tool_results_or_handles=None,
        )


def _messages_to_text(messages: str | list[Any]) -> str:
    if isinstance(messages, str):
        return messages
    parts: list[str] = []
    for item in messages or []:
        if isinstance(item, str):
            parts.append(item)
            continue
        if isinstance(item, dict):
            content = item.get("content")
            if isinstance(content, str):
                parts.append(content)
            elif isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and isinstance(block.get("text"), str):
                        parts.append(block["text"])
                    elif isinstance(block, str):
                        parts.append(block)
            continue
        content = getattr(item, "content", None)
        if isinstance(content, str):
            parts.append(content)
    return "\n".join(p for p in parts if p).strip()


class DeterministicProvider(AgentProvider):
    """Catalog ``type: deterministic`` — no cloud/local LLM, fixed callable."""

    PROVIDER_TYPE = "deterministic"

    def _entry_dict(self) -> dict[str, Any]:
        return {
            "id": self.config.id,
            "type": "deterministic",
            "entrypoint": self.config.provider_options.get("entrypoint"),
            "provider_options": self.config.provider_options,
        }

    def validate_config(self) -> None:
        spec = entrypoint_from_entry(self._entry_dict())
        resolve_entrypoint(spec)

    def initialize(self) -> None:
        self.validate_config()

    def health_check(self) -> None:
        self.validate_config()

    def build_agent(
        self,
        *,
        mcps: Sequence[Any] | None = None,
        skill_backstory_blocks: Sequence[tuple[str, str]] | None = None,
        role_suffix: str | None = None,
    ) -> Agent:
        llm = _DeterministicLLM(entry=self._entry_dict())
        return Agent(
            role=self.crew_agent_role_label(role_suffix),
            goal=self.config.goal,
            backstory=resolve_agent_backstory(
                self.config.backstory,
                mcps=mcps,
                skill_backstory_blocks=skill_backstory_blocks,
            ),
            llm=llm,
            verbose=bool(self.config.verbose),
            allow_delegation=bool(self.config.allow_delegation),
            tools=[],
        )
