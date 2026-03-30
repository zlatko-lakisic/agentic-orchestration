"""OpenAI (cloud or fixed base URL) via CrewAI LLM — no install/pull/bootstrap."""

from __future__ import annotations

import os
import urllib.error
import urllib.request
from typing import Any

from crewai import Agent

from providers.base import Provider

try:
    from crewai import LLM
except ImportError:  # pragma: no cover
    from crewai.llm import LLM  # type: ignore[attr-defined,no-redef]


def _strip_openai_model_prefix(model: str) -> str:
    m = model.strip()
    if m.startswith("openai/"):
        return m[len("openai/") :].strip() or m
    if m.startswith("ollama/"):
        return m[len("ollama/") :].strip() or m
    return m


def _normalize_openai_base(url: str) -> str:
    u = url.strip().rstrip("/")
    if not u.startswith("http://") and not u.startswith("https://"):
        u = f"http://{u}"
    if not u.endswith("/v1"):
        u = f"{u}/v1"
    return u


def _is_likely_local_url(url: str) -> bool:
    u = url.lower()
    return "localhost" in u or "127.0.0.1" in u or "0.0.0.0" in u


def _openai_models_reachable(base: str) -> bool:
    url = base.rstrip("/") + "/models"
    try:
        with urllib.request.urlopen(url, timeout=4) as response:
            return 200 <= response.status < 300
    except urllib.error.HTTPError as exc:
        # Server is up but may require auth (common for cloud OpenAI-compatible endpoints).
        return exc.code in (401, 403)
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return False


class OpenAIProvider(Provider):
    """
    Same *shape* as ``OllamaProvider``: read base URL from YAML + env, health check, build ``Agent``.

    - **Base URL**: ``openai_base_url`` in YAML, else ``OPENAI_BASE_URL``, else ``OPENAI_API_BASE``.
      When set, ``/v1`` is appended if missing and ``OPENAI_BASE_URL`` is updated for the process.
    - **Cloud** (no base URL): requires ``OPENAI_API_KEY``; no bootstrap or server management.
    - **Local OpenAI-compatible servers**: set the base URL; if it looks loopback and no key is set,
      ``OPENAI_API_KEY`` defaults to ``local`` so the client can connect.
    """

    def initialize(self) -> None:
        raw = (self.config.openai_base_url or "").strip()
        if not raw:
            raw = os.getenv("OPENAI_BASE_URL", "").strip() or os.getenv("OPENAI_API_BASE", "").strip()
        if raw:
            normalized = _normalize_openai_base(raw)
            os.environ["OPENAI_BASE_URL"] = normalized
            self._base_url = normalized
            if _is_likely_local_url(normalized) and not os.getenv("OPENAI_API_KEY", "").strip():
                os.environ.setdefault("OPENAI_API_KEY", "local")
        else:
            self._base_url = None

    def health_check(self) -> None:
        if self._base_url is not None:
            if not _openai_models_reachable(self._base_url):
                raise RuntimeError(
                    f"OpenAI API base not reachable at {self._base_url} (GET …/v1/models). "
                    "Start the server or fix openai_base_url / OPENAI_BASE_URL."
                )
            return
        if not os.getenv("OPENAI_API_KEY", "").strip():
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Set it for cloud OpenAI, or set openai_base_url / "
                "OPENAI_BASE_URL for a local OpenAI-compatible server."
            )

    def build_agent(self) -> Agent:
        clean = _strip_openai_model_prefix(self.config.model)
        llm_id = f"openai/{clean}"

        llm_kwargs: dict[str, Any] = {"model": llm_id}
        if self._base_url:
            llm_kwargs["base_url"] = self._base_url
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if api_key:
            llm_kwargs["api_key"] = api_key

        llm = LLM(**llm_kwargs)
        return Agent(
            role=self.config.role,
            goal=self.config.goal,
            backstory=self.config.backstory,
            llm=llm,
            verbose=self.config.verbose,
            allow_delegation=self.config.allow_delegation,
        )
