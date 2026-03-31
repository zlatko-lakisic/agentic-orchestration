"""Hugging Face Hub inference via CrewAI LLM (LiteLLM ``huggingface/...``)."""

from __future__ import annotations

import os
from typing import Any

from crewai import Agent

from agent_providers.base import AgentProvider

try:
    from crewai import LLM
except ImportError:  # pragma: no cover
    from crewai.llm import LLM  # type: ignore[attr-defined,no-redef]


def _strip_hf_model_prefix(model: str) -> str:
    m = model.strip()
    if m.startswith("huggingface/"):
        return m[len("huggingface/") :].strip() or m
    return m


def _normalize_hf_base(url: str) -> str:
    u = url.strip().rstrip("/")
    if not u.startswith("http://") and not u.startswith("https://"):
        u = f"http://{u}"
    return u


def _hf_api_key() -> str:
    return os.getenv("HF_TOKEN", "").strip() or os.getenv("HUGGINGFACE_API_KEY", "").strip()


class HuggingfaceProvider(AgentProvider):
    """
    Models on the Hugging Face Hub via LiteLLM (serverless inference providers, Inference API,
    or a dedicated Inference Endpoint).

    - **API key**: ``HF_TOKEN`` (preferred) or ``HUGGINGFACE_API_KEY``.
    - **Model id** (YAML ``model``): Hub path or provider path, e.g. ``meta-llama/Llama-3.3-70B-Instruct``,
      ``together/deepseek-ai/DeepSeek-R1`` (see LiteLLM Hugging Face docs).
    - **Base URL**: ``huggingface_base_url`` in YAML or ``HUGGINGFACE_API_BASE`` for custom endpoints.
    """

    def initialize(self) -> None:
        key = _hf_api_key()
        if key:
            os.environ.setdefault("HF_TOKEN", key)
            if not os.getenv("HUGGINGFACE_API_KEY", "").strip():
                os.environ.setdefault("HUGGINGFACE_API_KEY", key)

        raw = (self.config.huggingface_base_url or "").strip()
        if not raw:
            raw = os.getenv("HUGGINGFACE_API_BASE", "").strip()
        self._base_url = _normalize_hf_base(raw) if raw else None

    def health_check(self) -> None:
        if not _hf_api_key():
            raise RuntimeError(
                "HF_TOKEN (or HUGGINGFACE_API_KEY) is not set. "
                "Create a token at https://huggingface.co/settings/tokens"
            )

    def build_agent(self, *, mcps: list[str] | None = None) -> Agent:
        clean = _strip_hf_model_prefix(self.config.model)
        llm_id = f"huggingface/{clean}"

        llm_kwargs: dict[str, Any] = {"model": llm_id}
        if self._base_url:
            llm_kwargs["base_url"] = self._base_url
        api_key = _hf_api_key()
        if api_key:
            llm_kwargs["api_key"] = api_key

        llm = LLM(**llm_kwargs)
        kwargs: dict[str, Any] = dict(
            role=self.config.role,
            goal=self.config.goal,
            backstory=self.config.backstory,
            llm=llm,
            verbose=self.config.verbose,
            allow_delegation=self.config.allow_delegation,
        )
        if mcps:
            kwargs["mcps"] = mcps
        return Agent(**kwargs)
