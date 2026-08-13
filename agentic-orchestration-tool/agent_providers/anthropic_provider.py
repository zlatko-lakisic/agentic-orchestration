"""Anthropic Claude via CrewAI LLM (LiteLLM ``anthropic/...``)."""

from __future__ import annotations

import os
from typing import Any, Sequence

from crewai import Agent

from agent_providers.base import AgentProvider, resolve_agent_backstory

try:
    from crewai import LLM
except ImportError:  # pragma: no cover
    from crewai.llm import LLM  # type: ignore[attr-defined,no-redef]


def _strip_anthropic_model_prefix(model: str) -> str:
    m = model.strip()
    if m.startswith("anthropic/"):
        return m[len("anthropic/") :].strip() or m
    return m


def _normalize_anthropic_base(url: str) -> str:
    u = url.strip().rstrip("/")
    if not u.startswith("http://") and not u.startswith("https://"):
        u = f"http://{u}"
    return u


class AnthropicProvider(AgentProvider):
    """
    Cloud Claude through the Anthropic API (or a compatible proxy).

    - **API key**: ``ANTHROPIC_API_KEY``.
    - **Base URL**: ``anthropic_base_url`` in YAML, else ``ANTHROPIC_BASE_URL``,
      else ``ANTHROPIC_API_URL``. LiteLLM also reads ``ANTHROPIC_API_URL`` when set.
    """

    def initialize(self) -> None:
        from orchestration.session_env import getenv

        raw = (self.config.anthropic_base_url or "").strip()
        if not raw:
            raw = (
                (getenv("ANTHROPIC_BASE_URL", "") or "").strip()
                or (getenv("ANTHROPIC_API_URL", "") or "").strip()
            )
        if raw:
            normalized = _normalize_anthropic_base(raw)
            os.environ["ANTHROPIC_API_URL"] = normalized
            self._base_url = normalized
        else:
            self._base_url = None

    def health_check(self) -> None:
        from orchestration.session_env import getenv

        if not (getenv("ANTHROPIC_API_KEY", "") or "").strip():
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. Set it for Anthropic Claude, or configure "
                "anthropic_base_url / ANTHROPIC_BASE_URL for a compatible endpoint that "
                "does not require this env name "
                "(Reach clients may pass ANTHROPIC_API_KEY via session overlay env)."
            )

    def build_agent(
        self,
        *,
        mcps: Sequence[Any] | None = None,
        skill_backstory_blocks: Sequence[tuple[str, str]] | None = None,
        role_suffix: str | None = None,
    ) -> Agent:
        from orchestration.session_env import getenv

        clean = _strip_anthropic_model_prefix(self.config.model)
        llm_id = f"anthropic/{clean}"

        llm_kwargs: dict[str, Any] = {"model": llm_id}
        if self._base_url:
            llm_kwargs["base_url"] = self._base_url
        api_key = (getenv("ANTHROPIC_API_KEY", "") or "").strip()
        if api_key:
            llm_kwargs["api_key"] = api_key

        llm = LLM(**llm_kwargs)
        kwargs: dict[str, Any] = dict(
            role=self.crew_agent_role_label(role_suffix),
            goal=self.config.goal,
            backstory=resolve_agent_backstory(
                self.config.backstory,
                mcps=mcps,
                skill_backstory_blocks=skill_backstory_blocks,
            ),
            llm=llm,
            verbose=self.config.verbose,
            allow_delegation=self.config.allow_delegation,
        )
        if mcps:
            kwargs["mcps"] = list(mcps)
        return Agent(**kwargs)
