"""Unit tests for orchestration.agent_allowlist (stdlib-only)."""

from __future__ import annotations

from orchestration.agent_allowlist import (
    filter_entries_by_allowlist,
    partition_allowlist,
)


def test_partition_allowlist_survivors_and_dropped() -> None:
    entries = [
        {"id": "ollama_llama3_2_3b"},
        {"id": "ollama_gemma4_e2b"},
        {"id": "client.custom"},
    ]
    survivors, dropped = partition_allowlist(
        entries,
        ["ollama_codestral", "ollama_llama3_2_3b", "ollama_olmo2", "ollama_gemma4_e2b"],
    )
    assert survivors == ["ollama_llama3_2_3b", "ollama_gemma4_e2b"]
    assert dropped == ["ollama_codestral", "ollama_olmo2"]


def test_partition_allowlist_all_missing() -> None:
    survivors, dropped = partition_allowlist(
        [{"id": "ollama_llama3_2_3b"}],
        ["ollama_codestral", "ollama_olmo2"],
    )
    assert survivors == []
    assert dropped == ["ollama_codestral", "ollama_olmo2"]


def test_partition_allowlist_empty_selection() -> None:
    assert partition_allowlist([{"id": "a"}], None) == ([], [])
    assert partition_allowlist([{"id": "a"}], []) == ([], [])


def test_filter_entries_keeps_client_namespace() -> None:
    entries = [
        {"id": "ollama_llama3_2_3b"},
        {"id": "client.custom"},
        {"id": "other"},
    ]
    kept = filter_entries_by_allowlist(entries, ["ollama_llama3_2_3b"])
    assert [e["id"] for e in kept] == ["ollama_llama3_2_3b", "client.custom"]
