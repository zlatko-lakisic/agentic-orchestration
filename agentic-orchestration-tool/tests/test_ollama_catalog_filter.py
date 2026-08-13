"""Tests for filtering the agent catalog by pulled Ollama models."""

from __future__ import annotations

import json
import urllib.error

import pytest

from orchestration import ollama_catalog_filter as ocf


def test_filter_catalog_by_pulled_ollama_models(monkeypatch: pytest.MonkeyPatch) -> None:
    class _Resp:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def read(self):
            return json.dumps({"models": [{"name": "llama3.2:3b"}]}).encode()

    monkeypatch.setattr(ocf.urllib.request, "urlopen", lambda *_a, **_k: _Resp())
    monkeypatch.delenv("AGENTIC_DISABLE_OLLAMA_PULL_FILTER", raising=False)
    entries = [
        {"id": "ollama_llama3_2_3b", "type": "ollama", "model": "llama3.2:3b"},
        {"id": "ollama_mistral_nemo", "type": "ollama", "model": "mistral-nemo"},
        {"id": "client.custom", "type": "ollama", "model": "not-pulled"},
        {"id": "openai_gpt", "type": "openai", "model": "gpt-4o-mini"},
    ]
    kept = ocf.filter_catalog_by_pulled_ollama_models(entries, host="http://h:11434", verbose=False)
    assert [e["id"] for e in kept] == [
        "ollama_llama3_2_3b",
        "client.custom",
        "openai_gpt",
    ]


def test_filter_catalog_keeps_all_when_tags_unreachable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def _boom(*_a, **_k):
        raise urllib.error.URLError("down")

    monkeypatch.setattr(ocf.urllib.request, "urlopen", _boom)
    monkeypatch.delenv("AGENTIC_DISABLE_OLLAMA_PULL_FILTER", raising=False)
    entries = [{"id": "ollama_mistral_nemo", "type": "ollama", "model": "mistral-nemo"}]
    kept = ocf.filter_catalog_by_pulled_ollama_models(entries, host="http://h:11434", verbose=False)
    assert kept == entries


def test_ollama_model_aliases_match_latest() -> None:
    names = ocf.ollama_model_name_aliases("llama3.2:latest")
    assert "llama3.2" in names
    assert ocf.ollama_model_pulled(names, "llama3.2") is True
