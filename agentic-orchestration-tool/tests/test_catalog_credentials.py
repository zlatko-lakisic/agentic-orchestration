from __future__ import annotations

import pytest

from orchestration.catalog_credentials import (
    catalog_entry_has_api_credentials,
    filter_entries_by_api_credentials,
)


@pytest.mark.unit
def test_ollama_entry_always_has_credentials() -> None:
    entry = {"id": "local", "type": "ollama", "model": "llama3.1"}
    assert catalog_entry_has_api_credentials(entry) is True


@pytest.mark.unit
def test_openai_entry_without_key_skipped(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_BASE_URL", raising=False)
    monkeypatch.delenv("OPENAI_API_BASE", raising=False)
    entry = {"id": "cloud", "type": "openai", "model": "gpt-4o-mini"}
    assert catalog_entry_has_api_credentials(entry) is False


@pytest.mark.unit
def test_filter_entries_summarizes_skips(monkeypatch: pytest.MonkeyPatch) -> None:
    entries = [
        {"id": "local", "type": "ollama", "model": "llama3.1"},
        {"id": "cloud", "type": "openai", "model": "gpt-4o-mini"},
    ]
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_BASE_URL", raising=False)
    monkeypatch.delenv("OPENAI_API_BASE", raising=False)
    kept, skipped = filter_entries_by_api_credentials(entries, verbose=True, log_prefix="test")
    assert [e["id"] for e in kept] == ["local"]
    assert skipped == ["cloud"]
