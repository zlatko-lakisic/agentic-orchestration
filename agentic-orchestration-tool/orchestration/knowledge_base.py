from __future__ import annotations

import hashlib
import os
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any


KB_DIR_NAME = "__orchestrator_kb__"

#: Default scope for every row, including every legacy row written before the
#: two-tier columns existed. Deal-scoped rows use ``SCOPE_DEAL``.
SCOPE_GLOBAL = "global"
SCOPE_DEAL = "deal"


def kb_enabled() -> bool:
    return os.getenv("AGENTIC_KB", "1").strip().lower() not in ("0", "false", "no", "off")


def kb_dir(tool_root: Path) -> Path:
    return (tool_root / KB_DIR_NAME).resolve()


def kb_path(tool_root: Path) -> Path:
    return kb_dir(tool_root) / "kb.sqlite3"


def _connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path))
    con.execute("PRAGMA journal_mode=WAL;")
    con.execute("PRAGMA synchronous=NORMAL;")
    return con


def content_hash(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


#: Columns added after v1. ``ensure_schema`` ALTERs them onto existing databases so a
#: legacy kb.sqlite3 keeps working (SQLite ALTER TABLE ADD COLUMN is cheap and additive).
_ADDITIVE_COLUMNS: tuple[tuple[str, str], ...] = (
    ("user_id", "TEXT"),
    ("deal_id", "TEXT"),
    ("scope", "TEXT"),
    ("source_id", "TEXT"),
    ("vintage", "REAL"),
    ("content_hash", "TEXT"),
)


def _existing_columns(con: sqlite3.Connection, table: str) -> set[str]:
    return {str(row[1]) for row in con.execute(f"PRAGMA table_info({table});").fetchall()}


def ensure_schema(con: sqlite3.Connection) -> None:
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS docs (
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
    columns = _existing_columns(con, "docs")
    for name, decl in _ADDITIVE_COLUMNS:
        if name not in columns:
            con.execute(f"ALTER TABLE docs ADD COLUMN {name} {decl};")
    # Legacy rows predate the column: treat them as global-tier documents.
    con.execute(f"UPDATE docs SET scope='{SCOPE_GLOBAL}' WHERE scope IS NULL OR scope='';")
    con.execute("CREATE INDEX IF NOT EXISTS docs_scope_idx ON docs(scope);")
    con.execute("CREATE INDEX IF NOT EXISTS docs_deal_idx ON docs(deal_id);")
    con.execute("CREATE INDEX IF NOT EXISTS docs_source_idx ON docs(source_id);")
    # FTS5 virtual table (content indexed for search). Use external content table for storage.
    con.execute(
        """
        CREATE VIRTUAL TABLE IF NOT EXISTS docs_fts
        USING fts5(content, user_goal, session_slug, provider_id, content='docs', content_rowid='id');
        """
    )
    # Trigger-like manual sync (insert only; we append immutable docs).
    con.execute(
        """
        CREATE TRIGGER IF NOT EXISTS docs_ai AFTER INSERT ON docs BEGIN
          INSERT INTO docs_fts(rowid, content, user_goal, session_slug, provider_id)
          VALUES (new.id, new.content, new.user_goal, coalesce(new.session_slug,''), coalesce(new.provider_id,''));
        END;
        """
    )
    # Upsert-by-source and delete-by-scope mutate rows, so the FTS index needs the
    # matching delete/update hooks the append-only v1 schema did not require.
    con.execute(
        """
        CREATE TRIGGER IF NOT EXISTS docs_ad AFTER DELETE ON docs BEGIN
          INSERT INTO docs_fts(docs_fts, rowid, content, user_goal, session_slug, provider_id)
          VALUES ('delete', old.id, old.content, old.user_goal, coalesce(old.session_slug,''), coalesce(old.provider_id,''));
        END;
        """
    )
    con.execute(
        """
        CREATE TRIGGER IF NOT EXISTS docs_au AFTER UPDATE ON docs BEGIN
          INSERT INTO docs_fts(docs_fts, rowid, content, user_goal, session_slug, provider_id)
          VALUES ('delete', old.id, old.content, old.user_goal, coalesce(old.session_slug,''), coalesce(old.provider_id,''));
          INSERT INTO docs_fts(rowid, content, user_goal, session_slug, provider_id)
          VALUES (new.id, new.content, new.user_goal, coalesce(new.session_slug,''), coalesce(new.provider_id,''));
        END;
        """
    )
    con.commit()


@dataclass
class KBQueryResult:
    doc_id: int
    score: float
    user_goal: str
    session_slug: str
    provider_id: str
    content_snippet: str
    scope: str = SCOPE_GLOBAL
    deal_id: str = ""
    source_id: str = ""
    vintage: float | None = None

    def to_json_dict(self) -> dict[str, Any]:
        return {
            "docId": self.doc_id,
            "score": self.score,
            "userGoal": self.user_goal,
            "sessionSlug": self.session_slug,
            "providerId": self.provider_id,
            "snippet": self.content_snippet,
            "scope": self.scope,
            "dealId": self.deal_id,
            "sourceId": self.source_id,
            "vintage": self.vintage,
        }


def _doc_char_cap() -> int:
    cap = int(os.getenv("AGENTIC_KB_DOC_CHARS", "20000"))
    return max(2000, min(200000, cap))


def _clean(value: str | None) -> str | None:
    return (value or "").strip() or None


def _resolve_scope(scope: str | None, deal_id: str | None) -> str:
    explicit = (scope or "").strip().lower()
    if explicit in (SCOPE_GLOBAL, SCOPE_DEAL):
        return explicit
    return SCOPE_DEAL if _clean(deal_id) else SCOPE_GLOBAL


def add_document(
    *,
    tool_root: Path,
    session_slug: str | None,
    user_goal: str,
    content: str,
    provider_id: str | None = None,
    attachment_fingerprint: str | None = None,
    mcp_fingerprint: str | None = None,
    user_id: str | None = None,
    deal_id: str | None = None,
    scope: str | None = None,
    source_id: str | None = None,
    vintage: float | None = None,
) -> int | None:
    """
    Append a document. Without the optional kwargs this is the legacy v1 insert.

    Returns the new row id (or ``None`` when the KB is disabled / the text was empty).
    """
    if not kb_enabled():
        return None
    from orchestration.cloud_anonymize import maybe_redact_for_cloud_provider

    text = maybe_redact_for_cloud_provider((content or "").strip())
    if not text:
        return None
    goal = maybe_redact_for_cloud_provider(str(user_goal or "").strip())
    fp = (attachment_fingerprint or mcp_fingerprint or "").strip() or None
    text = text[: _doc_char_cap()]

    with _connect(kb_path(tool_root)) as con:
        ensure_schema(con)
        cur = con.execute(
            """
            INSERT INTO docs(
              ts, session_slug, user_goal, provider_id, mcp_fingerprint, content,
              user_id, deal_id, scope, source_id, vintage, content_hash
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                float(time.time()),
                _clean(session_slug),
                goal,
                _clean(provider_id),
                fp,
                text,
                _clean(user_id),
                _clean(deal_id),
                _resolve_scope(scope, deal_id),
                _clean(source_id),
                float(vintage) if vintage is not None else None,
                content_hash(text),
            ),
        )
        con.commit()
        return int(cur.lastrowid or 0) or None


def upsert_by_source(
    *,
    tool_root: Path,
    source_id: str,
    user_goal: str,
    content: str,
    session_slug: str | None = None,
    provider_id: str | None = None,
    user_id: str | None = None,
    deal_id: str | None = None,
    scope: str | None = None,
    vintage: float | None = None,
) -> dict[str, Any]:
    """
    Replace the row for ``source_id`` (incremental re-sync) or insert it.

    Returns ``{docId, action}`` where action is ``inserted``, ``updated`` or
    ``unchanged`` (the stored ``content_hash`` still matches).
    """
    if not kb_enabled():
        return {"docId": None, "action": "disabled"}
    sid = _clean(source_id)
    if not sid:
        raise ValueError("source_id is required for upsert_by_source")
    from orchestration.cloud_anonymize import maybe_redact_for_cloud_provider

    text = maybe_redact_for_cloud_provider((content or "").strip())[: _doc_char_cap()]
    if not text:
        raise ValueError("content is required for upsert_by_source")
    goal = maybe_redact_for_cloud_provider(str(user_goal or "").strip())
    digest = content_hash(text)
    resolved_scope = _resolve_scope(scope, deal_id)

    with _connect(kb_path(tool_root)) as con:
        ensure_schema(con)
        row = con.execute(
            "SELECT id, content_hash FROM docs WHERE source_id = ? ORDER BY id DESC LIMIT 1;",
            (sid,),
        ).fetchone()
        if row is None:
            cur = con.execute(
                """
                INSERT INTO docs(
                  ts, session_slug, user_goal, provider_id, mcp_fingerprint, content,
                  user_id, deal_id, scope, source_id, vintage, content_hash
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    float(time.time()),
                    _clean(session_slug),
                    goal,
                    _clean(provider_id),
                    None,
                    text,
                    _clean(user_id),
                    _clean(deal_id),
                    resolved_scope,
                    sid,
                    float(vintage) if vintage is not None else None,
                    digest,
                ),
            )
            con.commit()
            return {"docId": int(cur.lastrowid or 0), "action": "inserted"}
        doc_id = int(row[0])
        if str(row[1] or "") == digest:
            con.execute(
                "UPDATE docs SET vintage = ?, ts = ? WHERE id = ?;",
                (
                    float(vintage) if vintage is not None else None,
                    float(time.time()),
                    doc_id,
                ),
            )
            con.commit()
            return {"docId": doc_id, "action": "unchanged"}
        con.execute(
            """
            UPDATE docs SET ts = ?, session_slug = ?, user_goal = ?, provider_id = ?,
                            content = ?, user_id = ?, deal_id = ?, scope = ?,
                            vintage = ?, content_hash = ?
            WHERE id = ?;
            """,
            (
                float(time.time()),
                _clean(session_slug),
                goal,
                _clean(provider_id),
                text,
                _clean(user_id),
                _clean(deal_id),
                resolved_scope,
                float(vintage) if vintage is not None else None,
                digest,
                doc_id,
            ),
        )
        con.commit()
        return {"docId": doc_id, "action": "updated"}


def fast_ingest(
    *,
    tool_root: Path,
    content: str,
    user_goal: str = "",
    session_slug: str | None = None,
    user_id: str | None = None,
    deal_id: str | None = None,
    scope: str | None = None,
    source_id: str | None = None,
    vintage: float | None = None,
) -> dict[str, Any]:
    """
    Index now, enrich later: minimal-field insert for ad-hoc drops.

    Enrichment (summaries, embeddings, entity extraction) is a separate pass; v1 runs a
    synchronous no-op so the API contract is stable while the queue is still to come.
    """
    doc_id = add_document(
        tool_root=tool_root,
        session_slug=session_slug,
        user_goal=user_goal or "(fast ingest)",
        content=content,
        user_id=user_id,
        deal_id=deal_id,
        scope=scope,
        source_id=source_id,
        vintage=vintage if vintage is not None else time.time(),
    )
    return {"docId": doc_id, "enrichQueued": enqueue_enrich(doc_id)}


def enqueue_enrich(doc_id: int | None) -> bool:
    """Enrichment hook for :func:`fast_ingest`. v1 is a deliberate no-op."""
    return False


def delete_by_scope(
    *,
    tool_root: Path,
    deal_id: str,
) -> int:
    """Remove every row for a deal (lifecycle: deal deleted). Returns rows removed."""
    did = _clean(deal_id)
    if not did:
        raise ValueError("deal_id is required for delete_by_scope")
    with _connect(kb_path(tool_root)) as con:
        ensure_schema(con)
        cur = con.execute("DELETE FROM docs WHERE deal_id = ?;", (did,))
        con.commit()
        return int(cur.rowcount or 0)


def delete_by_source(
    *,
    tool_root: Path,
    source_id: str,
) -> int:
    """Remove every row for one source (re-sync prune). Returns rows removed."""
    sid = _clean(source_id)
    if not sid:
        raise ValueError("source_id is required for delete_by_source")
    with _connect(kb_path(tool_root)) as con:
        ensure_schema(con)
        cur = con.execute("DELETE FROM docs WHERE source_id = ?;", (sid,))
        con.commit()
        return int(cur.rowcount or 0)


def _row_to_result(row: tuple[Any, ...]) -> KBQueryResult:
    doc_id, rank, user_goal, session_slug, provider_id, snip, scope, deal_id, source_id, vintage = row
    try:
        r = float(rank)
    except Exception:  # noqa: BLE001
        r = 1e9
    return KBQueryResult(
        doc_id=int(doc_id),
        score=1.0 / (1.0 + max(0.0, r)),
        user_goal=str(user_goal or ""),
        session_slug=str(session_slug or ""),
        provider_id=str(provider_id or ""),
        content_snippet=str(snip or ""),
        scope=str(scope or SCOPE_GLOBAL),
        deal_id=str(deal_id or ""),
        source_id=str(source_id or ""),
        vintage=float(vintage) if isinstance(vintage, (int, float)) else None,
    )


_SEARCH_SQL = """
SELECT d.id,
       bm25(docs_fts) AS rank,
       d.user_goal,
       coalesce(d.session_slug,'') AS session_slug,
       coalesce(d.provider_id,'') AS provider_id,
       snippet(docs_fts, 0, '', '', '…', ?) AS snip,
       coalesce(d.scope,'{global}') AS scope,
       coalesce(d.deal_id,'') AS deal_id,
       coalesce(d.source_id,'') AS source_id,
       d.vintage AS vintage
FROM docs_fts
JOIN docs d ON d.id = docs_fts.rowid
WHERE docs_fts MATCH ?
""".replace("{global}", SCOPE_GLOBAL)


def search(
    *,
    tool_root: Path,
    query: str,
    limit: int = 4,
    scope: str | None = None,
    deal_id: str | None = None,
    user_id: str | None = None,
) -> list[KBQueryResult]:
    """
    Full-text search over stored documents.

    With no scoping arguments this is the v1 behavior: every document, ranked by bm25.
    With ``deal_id`` set, deal hits come first and global-tier hits follow — deal facts
    take precedence over company-tier documents on conflict. Pass ``scope="deal"`` to
    exclude the global tier entirely.
    """
    if not kb_enabled():
        return []
    q = " ".join(str(query or "").strip().split())
    if not q:
        return []
    limit = max(1, min(12, int(limit)))
    snippet_chars = int(os.getenv("AGENTIC_KB_SNIPPET_CHARS", "600"))
    snippet_chars = max(200, min(2000, snippet_chars))
    did = _clean(deal_id)
    uid = _clean(user_id)
    requested_scope = (scope or "").strip().lower() or None

    def _run(con: sqlite3.Connection, extra_sql: str, params: tuple[Any, ...]) -> list[KBQueryResult]:
        rows = con.execute(
            _SEARCH_SQL + extra_sql + " ORDER BY rank ASC LIMIT ?;",
            (snippet_chars, q, *params, limit),
        ).fetchall()
        return [_row_to_result(r) for r in rows]

    user_sql = " AND (d.user_id IS NULL OR d.user_id = ?)" if uid else ""
    user_params: tuple[Any, ...] = (uid,) if uid else ()

    with _connect(kb_path(tool_root)) as con:
        ensure_schema(con)
        if did:
            deal_hits = _run(
                con,
                " AND d.deal_id = ?" + user_sql,
                (did, *user_params),
            )
            if requested_scope == SCOPE_DEAL:
                return deal_hits[:limit]
            remaining = limit - len(deal_hits)
            if remaining <= 0:
                return deal_hits[:limit]
            global_hits = _run(
                con,
                f" AND coalesce(d.scope,'{SCOPE_GLOBAL}') = '{SCOPE_GLOBAL}'" + user_sql,
                user_params,
            )
            return (deal_hits + global_hits[:remaining])[:limit]
        if requested_scope in (SCOPE_GLOBAL, SCOPE_DEAL):
            return _run(
                con,
                f" AND coalesce(d.scope,'{SCOPE_GLOBAL}') = ?" + user_sql,
                (requested_scope, *user_params),
            )
        return _run(con, user_sql, user_params)


def planner_kb_context(*, tool_root: Path, user_prompt: str) -> str:
    """
    Build a short context block for the planner from previously stored answers.
    """
    if not kb_enabled():
        return ""
    max_hits = int(os.getenv("AGENTIC_KB_MAX_HITS", "4"))
    max_hits = max(0, min(12, max_hits))
    if max_hits <= 0:
        return ""
    hits = search(tool_root=tool_root, query=user_prompt, limit=max_hits)
    if not hits:
        return ""
    lines: list[str] = []
    for h in hits:
        meta = f"doc={h.doc_id} score~{h.score:.2f}"
        if h.provider_id:
            meta += f" provider={h.provider_id}"
        if h.session_slug:
            meta += f" session={h.session_slug}"
        lines.append(f"- [{meta}] goal: {h.user_goal}\n  snippet: {h.content_snippet}")
    return (
        "\n\n## Local knowledge base (previous outputs)\n"
        "You may reuse these snippets if relevant. If they conflict with current requirements, prefer the current user goal.\n"
        + "\n".join(lines)
        + "\n"
    )
