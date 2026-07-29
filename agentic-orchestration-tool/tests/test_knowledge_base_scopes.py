"""KB two-tier scoping, upsert-by-source, delete lifecycle, and the additive migration."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from orchestration.knowledge_base import (
    SCOPE_DEAL,
    SCOPE_GLOBAL,
    add_document,
    delete_by_scope,
    delete_by_source,
    ensure_schema,
    fast_ingest,
    kb_path,
    sanitize_fts5_query,
    search,
    upsert_by_source,
)

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def kb_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_KB", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "0")


def _columns(root: Path) -> set[str]:
    con = sqlite3.connect(str(kb_path(root)))
    try:
        return {str(row[1]) for row in con.execute("PRAGMA table_info(docs);").fetchall()}
    finally:
        con.close()


def test_legacy_insert_still_works_and_defaults_to_global(tmp_path: Path) -> None:
    add_document(
        tool_root=tmp_path,
        session_slug="default",
        user_goal="pricing question",
        content="Standard discount is ten percent",
    )
    hits = search(tool_root=tmp_path, query="discount")
    assert len(hits) == 1
    assert hits[0].scope == SCOPE_GLOBAL
    assert hits[0].deal_id == ""


def test_ensure_schema_migrates_a_v1_database(tmp_path: Path) -> None:
    """A pre-existing append-only kb.sqlite3 gains the new columns without losing rows."""
    path = kb_path(tmp_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path))
    con.execute(
        """
        CREATE TABLE docs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ts REAL NOT NULL,
          session_slug TEXT,
          user_goal TEXT NOT NULL,
          provider_id TEXT,
          mcp_fingerprint TEXT,
          content TEXT NOT NULL
        );
        """
    )
    con.execute(
        "INSERT INTO docs(ts, session_slug, user_goal, content) VALUES(1.0,'legacy','old goal','legacy payload');"
    )
    con.commit()
    ensure_schema(con)
    con.commit()
    row = con.execute("SELECT scope, content FROM docs;").fetchone()
    con.close()

    assert row[0] == SCOPE_GLOBAL
    assert row[1] == "legacy payload"
    assert {"user_id", "deal_id", "scope", "source_id", "vintage", "content_hash"} <= _columns(
        tmp_path
    )


def test_search_without_scope_is_unchanged_behavior(tmp_path: Path) -> None:
    add_document(tool_root=tmp_path, session_slug=None, user_goal="g", content="alpha global fact")
    add_document(
        tool_root=tmp_path,
        session_slug=None,
        user_goal="g",
        content="alpha deal fact",
        deal_id="acme",
    )
    hits = search(tool_root=tmp_path, query="alpha")
    assert len(hits) == 2


def test_deal_hits_take_precedence_over_global(tmp_path: Path) -> None:
    add_document(
        tool_root=tmp_path,
        session_slug=None,
        user_goal="pricing",
        content="pricing pricing pricing global tier baseline",
    )
    add_document(
        tool_root=tmp_path,
        session_slug=None,
        user_goal="pricing",
        content="pricing negotiated for this deal",
        deal_id="acme",
    )
    hits = search(tool_root=tmp_path, query="pricing", deal_id="acme")
    assert hits[0].deal_id == "acme"
    assert hits[0].scope == SCOPE_DEAL
    assert [h.scope for h in hits] == [SCOPE_DEAL, SCOPE_GLOBAL]


def test_scope_deal_excludes_the_global_tier(tmp_path: Path) -> None:
    add_document(tool_root=tmp_path, session_slug=None, user_goal="g", content="beta global")
    add_document(
        tool_root=tmp_path, session_slug=None, user_goal="g", content="beta deal", deal_id="acme"
    )
    hits = search(tool_root=tmp_path, query="beta", deal_id="acme", scope=SCOPE_DEAL)
    assert [h.deal_id for h in hits] == ["acme"]


def test_scope_global_excludes_deal_rows(tmp_path: Path) -> None:
    add_document(tool_root=tmp_path, session_slug=None, user_goal="g", content="gamma global")
    add_document(
        tool_root=tmp_path, session_slug=None, user_goal="g", content="gamma deal", deal_id="acme"
    )
    hits = search(tool_root=tmp_path, query="gamma", scope=SCOPE_GLOBAL)
    assert [h.scope for h in hits] == [SCOPE_GLOBAL]


def test_user_filter_keeps_unattributed_documents_visible(tmp_path: Path) -> None:
    add_document(tool_root=tmp_path, session_slug=None, user_goal="g", content="delta shared doc")
    add_document(
        tool_root=tmp_path, session_slug=None, user_goal="g", content="delta ada doc", user_id="ada"
    )
    add_document(
        tool_root=tmp_path, session_slug=None, user_goal="g", content="delta bob doc", user_id="bob"
    )
    snippets = [h.content_snippet for h in search(tool_root=tmp_path, query="delta", user_id="ada")]
    assert any("shared" in s for s in snippets)
    assert any("ada" in s for s in snippets)
    assert not any("bob" in s for s in snippets)


def test_upsert_by_source_inserts_then_updates_in_place(tmp_path: Path) -> None:
    first = upsert_by_source(
        tool_root=tmp_path,
        source_id="crm://acct/7",
        user_goal="account facts",
        content="Acme runs Postgres 16",
    )
    assert first["action"] == "inserted"

    unchanged = upsert_by_source(
        tool_root=tmp_path,
        source_id="crm://acct/7",
        user_goal="account facts",
        content="Acme runs Postgres 16",
    )
    assert unchanged == {"docId": first["docId"], "action": "unchanged"}

    updated = upsert_by_source(
        tool_root=tmp_path,
        source_id="crm://acct/7",
        user_goal="account facts",
        content="Acme migrated to Postgres 17",
        vintage=1234.0,
    )
    assert updated["action"] == "updated"
    assert updated["docId"] == first["docId"]

    # Re-sync replaces the row, so the stale text is gone from the FTS index too.
    assert search(tool_root=tmp_path, query="16") == []
    fresh = search(tool_root=tmp_path, query="17")
    assert len(fresh) == 1
    assert fresh[0].source_id == "crm://acct/7"
    assert fresh[0].vintage == 1234.0


def test_upsert_by_source_requires_source_and_content(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        upsert_by_source(tool_root=tmp_path, source_id="  ", user_goal="g", content="x")
    with pytest.raises(ValueError):
        upsert_by_source(tool_root=tmp_path, source_id="s", user_goal="g", content="  ")


def test_delete_by_scope_removes_every_deal_row(tmp_path: Path) -> None:
    for i in range(3):
        add_document(
            tool_root=tmp_path,
            session_slug=None,
            user_goal="g",
            content=f"epsilon deal note {i}",
            deal_id="acme",
        )
    add_document(tool_root=tmp_path, session_slug=None, user_goal="g", content="epsilon global note")

    assert delete_by_scope(tool_root=tmp_path, deal_id="acme") == 3
    remaining = search(tool_root=tmp_path, query="epsilon")
    assert len(remaining) == 1
    assert remaining[0].deal_id == ""
    assert search(tool_root=tmp_path, query="epsilon", deal_id="acme", scope="deal") == []


def test_delete_by_source_prunes_one_source(tmp_path: Path) -> None:
    upsert_by_source(
        tool_root=tmp_path, source_id="web://a", user_goal="g", content="zeta from source a"
    )
    upsert_by_source(
        tool_root=tmp_path, source_id="web://b", user_goal="g", content="zeta from source b"
    )
    assert delete_by_source(tool_root=tmp_path, source_id="web://a") == 1
    hits = search(tool_root=tmp_path, query="zeta")
    assert [h.source_id for h in hits] == ["web://b"]


def test_fast_ingest_indexes_immediately_and_defers_enrichment(tmp_path: Path) -> None:
    result = fast_ingest(tool_root=tmp_path, content="eta dropped file contents", deal_id="acme")
    assert result["docId"]
    assert result["enrichQueued"] is False
    hits = search(tool_root=tmp_path, query="dropped", deal_id="acme")
    assert len(hits) == 1
    assert hits[0].vintage is not None


def test_disabled_kb_is_a_no_op(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_KB", "0")
    assert add_document(tool_root=tmp_path, session_slug=None, user_goal="g", content="x") is None
    assert search(tool_root=tmp_path, query="x") == []


def test_sanitize_fts5_query_strips_commas_and_operators() -> None:
    assert sanitize_fts5_query("Acme Corp, Inc.") == "Acme Corp Inc."
    assert sanitize_fts5_query('price "quote" AND near') == "price quote"
    assert sanitize_fts5_query("  ,,,  ") == ""
    assert sanitize_fts5_query("Falcon pricing") == "Falcon pricing"


def test_search_with_commas_does_not_raise(tmp_path: Path) -> None:
    add_document(
        tool_root=tmp_path,
        session_slug=None,
        user_goal="g",
        content="Acme Corp uses Falcon pricing at twelve percent",
    )
    hits = search(tool_root=tmp_path, query="Acme Corp, Falcon")
    assert len(hits) == 1
    assert "Falcon" in hits[0].content_snippet or "Acme" in hits[0].content_snippet
