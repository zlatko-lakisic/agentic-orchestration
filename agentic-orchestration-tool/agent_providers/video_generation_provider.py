"""Video generation agent provider — ComfyUI clip generator, not a chat model."""

from __future__ import annotations

from typing import Any, Sequence

from crewai import Agent
from crewai.llms.base_llm import BaseLLM

from agent_providers.base import AgentProvider, resolve_agent_backstory


class _VideoGenerationLLM(BaseLLM):
    """CrewAI shim — generation is prompt-first via direct_agent / WS."""

    def __init__(self, *, entry: dict[str, Any]) -> None:
        super().__init__(model="video_generation", provider="video_generation")
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
        import json

        return json.dumps(
            {
                "ok": False,
                "error": "video_generation requires direct_agent / WS with a JSON prompt payload",
                "provider": str(self._entry.get("id") or ""),
                "synthetic_media": True,
            },
            sort_keys=True,
        )


class VideoGenerationProvider(AgentProvider):
    """Catalog ``type: video_generation`` — remote ComfyUI workflows."""

    PROVIDER_TYPE = "video_generation"

    def _entry_dict(self) -> dict[str, Any]:
        opts = dict(self.config.provider_options or {})
        entry: dict[str, Any] = {
            "id": self.config.id,
            "type": "video_generation",
            "model": self.config.model or "video_generation",
            "provider_options": opts,
        }
        for key in (
            "backend",
            "endpoint_env",
            "token_env",
            "workflows",
            "bindings",
            "defaults",
            "limits",
            "residency",
            "synthetic_media",
            "min_vram_gb",
        ):
            if key in opts:
                entry[key] = opts[key]
            elif key in self.config.provider_options:
                entry[key] = self.config.provider_options[key]
        return entry

    def validate_config(self) -> None:
        opts = self.config.provider_options or {}
        workflows = opts.get("workflows")
        if not isinstance(workflows, dict) or not workflows:
            raise ValueError(
                f"Agent provider '{self.config.id}' (type video_generation) "
                "is missing workflows mapping"
            )
        endpoint_env = str(opts.get("endpoint_env") or "AGENTIC_VIDEO_COMFYUI_URL").strip()
        if not endpoint_env:
            raise ValueError(
                f"Agent provider '{self.config.id}' is missing endpoint_env"
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
        llm = _VideoGenerationLLM(entry=self._entry_dict())
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
