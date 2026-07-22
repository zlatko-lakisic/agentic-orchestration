"""RAG inject budgets, provenance, and zero-result annotation."""

from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.knowledge_base import add_document, kb_path
from orchestration.rag_retrieve import (
    RagChunk,
    apply_token_budgets,
    format_inject_block,
    prepare_inject_context,
    search_sqlite_fts_at_path,
)


@pytest.mark.unit
def test_zero_result_annotation() -> None:
    block = format_inject_block([("docs", [])], zero_result_source_ids=["docs"])
    assert "[rag:docs] no results" in block


@pytest.mark.unit
def test_provenance_tags_in_block() -> None:
    chunks = [
        RagChunk(source_id="docs", chunk_id="1", text="alpha", score=0.9),
        RagChunk(source_id="docs", chunk_id="2", text="beta", score=0.8),
    ]
    block = format_inject_block([("docs", chunks)])
    assert "[rag:docs#1]" in block
    assert "[rag:docs#2]" in block


@pytest.mark.unit
def test_token_budget_deterministic_order(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_RAG_INJECT_MAX_TOKENS", "40")
    entries = [
        (
            {"id": "a", "max_tokens": 100},
            [
                RagChunk("a", "1", "word " * 40, 1.0),
                RagChunk("a", "2", "word " * 40, 0.5),
            ],
        ),
        (
            {"id": "b", "max_tokens": 100},
            [RagChunk("b", "9", "short", 1.0)],
        ),
    ]
    kept, events = apply_token_budgets(source_chunks=entries, global_max_tokens=40)
    assert kept[0][0] == "a"
    # First source consumes budget; second may be truncated/empty
    assert events
    assert any(e["source_id"] in ("a", "b") for e in events)


@pytest.mark.unit
def test_per_source_budget(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_RAG_INJECT_MAX_TOKENS", "100000")
    entries = [
        (
            {"id": "a", "max_tokens": 30},
            [
                RagChunk("a", "1", "x" * 80, 1.0),
                RagChunk("a", "2", "y" * 80, 0.9),
            ],
        ),
    ]
    kept, events = apply_token_budgets(source_chunks=entries)
    assert len(kept[0][1]) <= 1
    assert events and events[0]["source_id"] == "a"


@pytest.mark.unit
def test_inject_from_sqlite_kb(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_KB", "1")
    tool_root = tmp_path
    add_document(
        tool_root=tool_root,
        session_slug="s1",
        user_goal="irrigation minutes for zone A",
        content="Zone A needs 12 minutes of irrigation based on soil moisture.",
        provider_id="test",
    )
    db = kb_path(tool_root)
    hits = search_sqlite_fts_at_path(db_path=db, query="irrigation zone", limit=3)
    assert hits

    entry = {
        "id": "orchestrator_kb",
        "backend": "sqlite-fts",
        "mode": "inject",
        "top_k": 3,
        "max_tokens": 2000,
        "_resolved_path": str(db),
    }
    block, audit = prepare_inject_context(
        entries=[entry],
        query="irrigation zone",
        tool_root=tool_root,
    )
    assert "[rag:orchestrator_kb#" in block
    assert audit.retrieved_chunks
    assert audit.queries[0].mode == "inject"
