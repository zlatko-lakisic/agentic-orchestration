"""Object detection agent provider — ONNX detector, not a chat model."""

from __future__ import annotations

from typing import Any, Sequence

from crewai import Agent
from crewai.llms.base_llm import BaseLLM

from agent_providers.base import AgentProvider, resolve_agent_backstory
from orchestration.detection_artifacts import weights_spec_from_entry
from orchestration.object_detection_runtime import ensure_object_detection_ready


class _ObjectDetectionLLM(BaseLLM):
    """CrewAI shim — detection is image-first; text-only crew calls return empty list JSON."""

    def __init__(self, *, entry: dict[str, Any]) -> None:
        super().__init__(model="object_detection", provider="object_detection")
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
                "detections": [],
                "image": {"width": 0, "height": 0, "name": ""},
                "model": {
                    "provider_id": str(self._entry.get("id") or ""),
                    "note": "object_detection requires images via direct_agent / WS",
                },
            },
            sort_keys=True,
        )


class ObjectDetectionProvider(AgentProvider):
    """Catalog ``type: object_detection`` — engine-owned ONNX weights + typed boxes."""

    PROVIDER_TYPE = "object_detection"

    def _entry_dict(self) -> dict[str, Any]:
        opts = dict(self.config.provider_options or {})
        entry: dict[str, Any] = {
            "id": self.config.id,
            "type": "object_detection",
            "model": self.config.model or "object_detection",
            "provider_options": opts,
        }
        for key in (
            "weights",
            "runtime",
            "execution_providers",
            "input",
            "confidence_min",
            "iou_threshold",
            "classes",
            "class_names",
            "residency",
        ):
            if key in opts:
                entry[key] = opts[key]
        return entry

    def validate_config(self) -> None:
        weights_spec_from_entry(self._entry_dict())

    def initialize(self) -> None:
        self.validate_config()
        # Load + warmup so ready means resident (Y3).
        ensure_object_detection_ready(self._entry_dict())

    def health_check(self) -> None:
        self.validate_config()
        ensure_object_detection_ready(self._entry_dict())

    def cleanup(self) -> None:
        from orchestration.object_detection_runtime import unload_detection_session

        if str(self.config.provider_options.get("residency") or "resident").lower() == "on_demand":
            unload_detection_session(self._entry_dict())

    def build_agent(
        self,
        *,
        mcps: Sequence[Any] | None = None,
        skill_backstory_blocks: Sequence[tuple[str, str]] | None = None,
        role_suffix: str | None = None,
    ) -> Agent:
        llm = _ObjectDetectionLLM(entry=self._entry_dict())
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
