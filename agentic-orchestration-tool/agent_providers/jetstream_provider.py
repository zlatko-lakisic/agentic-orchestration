"""JetStream OpenAI-compatible provider wrapper for TPU-serving endpoints."""

from __future__ import annotations

import os
from typing import Any, Sequence

from crewai import Agent

from agent_providers.base import AgentProvider, augment_backstory_for_mcp_tools
from agent_providers.openai_provider import (
    _is_likely_local_url,
    _normalize_openai_base,
    _openai_models_reachable,
)

try:
    from crewai import LLM
except ImportError:  # pragma: no cover
    from crewai.llm import LLM  # type: ignore[attr-defined,no-redef]


def _clean_model(model: str) -> str:
    m = model.strip()
    for prefix in ("jetstream/", "openai/"):
        if m.startswith(prefix):
            return m[len(prefix) :].strip() or m
    return m


class JetstreamProvider(AgentProvider):
    PROVIDER_TYPE = "jetstream"

    def initialize(self) -> None:
        raw = str(self.config.provider_options.get("jetstream_base_url", "")).strip()
        if not raw:
            raw = str(self.config.provider_options.get("base_url", "")).strip()
        if not raw:
            raw = os.getenv("JETSTREAM_BASE_URL", "").strip()
        self._base_url = _normalize_openai_base(raw) if raw else None

        if self._base_url and _is_likely_local_url(self._base_url):
            os.environ.setdefault(
                "OPENAI_API_KEY",
                os.getenv("JETSTREAM_API_KEY", "local").strip() or "local",
            )

    def health_check(self) -> None:
        if not self._base_url:
            raise RuntimeError(
                "JetStream provider requires a base URL. Set provider option "
                "jetstream_base_url/base_url or JETSTREAM_BASE_URL."
            )
        if not _openai_models_reachable(self._base_url):
            raise RuntimeError(
                f"JetStream endpoint not reachable at {self._base_url} (GET .../v1/models). "
                "Start your endpoint or fix JETSTREAM_BASE_URL."
            )

    def build_agent(
        self,
        *,
        mcps: Sequence[Any] | None = None,
        role_suffix: str | None = None,
    ) -> Agent:
        llm_kwargs: dict[str, Any] = {
            "model": f"openai/{_clean_model(self.config.model)}",
            "base_url": self._base_url,
        }
        api_key = os.getenv("JETSTREAM_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
        if api_key:
            llm_kwargs["api_key"] = api_key
        llm = LLM(**llm_kwargs)

        role = self.config.role if not role_suffix else f"{self.config.role} ({role_suffix})"
        kwargs: dict[str, Any] = dict(
            role=role,
            goal=self.config.goal,
            backstory=augment_backstory_for_mcp_tools(self.config.backstory, mcps),
            llm=llm,
            verbose=self.config.verbose,
            allow_delegation=self.config.allow_delegation,
        )
        if mcps:
            kwargs["mcps"] = list(mcps)
        return Agent(**kwargs)
