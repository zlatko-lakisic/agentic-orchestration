from __future__ import annotations

import os
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any


KB_DIR_NAME = "__orchestrator_kb__"


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
    con.commit()


@dataclass
class KBQueryResult:
    doc_id: int
    score: float
    user_goal: str
    session_slug: str
    provider_id: str
    content_snippet: str


def add_document(
    *,
    tool_root: Path,
    session_slug: str | None,
    user_goal: str,
    content: str,
    provider_id: str | None = None,
    mcp_fingerprint: str | None = None,
) -> None:
    if not kb_enabled():
        return
    text = (content or "").strip()
    if not text:
        return
    cap = int(os.getenv("AGENTIC_KB_DOC_CHARS", "20000"))
    cap = max(2000, min(200000, cap))
    text = text[:cap]

    with _connect(kb_path(tool_root)) as con:
        ensure_schema(con)
        con.execute(
            "INSERT INTO docs(ts, session_slug, user_goal, provider_id, mcp_fingerprint, content) VALUES(?,?,?,?,?,?)",
            (
                float(time.time()),
                (session_slug or "").strip() or None,
                str(user_goal or "").strip(),
                (provider_id or "").strip() or None,
                (mcp_fingerprint or "").strip() or None,
                text,
            ),
        )
        con.commit()


def search(
    *,
    tool_root: Path,
    query: str,
    limit: int = 4,
) -> list[KBQueryResult]:
    if not kb_enabled():
        return []
    q = " ".join(str(query or "").strip().split())
    if not q:
        return []
    limit = max(1, min(12, int(limit)))
    snippet_chars = int(os.getenv("AGENTIC_KB_SNIPPET_CHARS", "600"))
    snippet_chars = max(200, min(2000, snippet_chars))

    with _connect(kb_path(tool_root)) as con:
        ensure_schema(con)
        # bm25() exists for fts5. Lower is better; invert to a pseudo score.
        rows = con.execute(
            """
            SELECT d.id,
                   bm25(docs_fts) AS rank,
                   d.user_goal,
                   coalesce(d.session_slug,'') AS session_slug,
                   coalesce(d.provider_id,'') AS provider_id,
                   snippet(docs_fts, 0, '', '', '…', ?) AS snip
            FROM docs_fts
            JOIN docs d ON d.id = docs_fts.rowid
            WHERE docs_fts MATCH ?
            ORDER BY rank ASC
            LIMIT ?;
            """,
            (snippet_chars, q, limit),
        ).fetchall()

    out: list[KBQueryResult] = []
    for doc_id, rank, user_goal, session_slug, provider_id, snip in rows:
        try:
            r = float(rank)
        except Exception:  # noqa: BLE001
            r = 1e9
        score = 1.0 / (1.0 + max(0.0, r))
        out.append(
            KBQueryResult(
                doc_id=int(doc_id),
                score=float(score),
                user_goal=str(user_goal or ""),
                session_slug=str(session_slug or ""),
                provider_id=str(provider_id or ""),
                content_snippet=str(snip or ""),
            )
        )
    return out


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

