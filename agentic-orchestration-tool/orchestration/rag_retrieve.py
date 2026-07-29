"""RAG retrieval, token budgets, and per-step audit.

Token budget policy (deterministic):
1. Process inject-mode sources in the order granted by the step plan.
2. Within each source, keep chunks in retrieval-score order (highest first).
3. Stop adding chunk text when the source ``max_tokens`` cap is reached.
4. Also enforce a global inject budget (``AGENTIC_RAG_INJECT_MAX_TOKENS``, default 6000).
5. Truncation events are recorded on the step audit.

Token estimate: ``ceil(chars / 4)`` (no tokenizer dependency).
"""

from __future__ import annotations

import math
import os
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from orchestration.knowledge_base import KBQueryResult, ensure_schema


def estimate_tokens(text: str) -> int:
    return max(1, math.ceil(len(text) / 4)) if text else 0


def rag_inject_global_max_tokens() -> int:
    try:
        cap = int(os.getenv("AGENTIC_RAG_INJECT_MAX_TOKENS", "6000"))
    except ValueError:
        cap = 6000
    return max(200, min(200_000, cap))


@dataclass(frozen=True)
class RagChunk:
    source_id: str
    chunk_id: str
    text: str
    score: float

    @property
    def citation_tag(self) -> str:
        return f"[rag:{self.source_id}#{self.chunk_id}]"


@dataclass
class RagQueryRecord:
    source_id: str
    query: str
    mode: str
    chunk_ids: list[str] = field(default_factory=list)
    scores: list[float] = field(default_factory=list)
    truncated: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_id": self.source_id,
            "query": self.query,
            "mode": self.mode,
            "chunk_ids": list(self.chunk_ids),
            "scores": list(self.scores),
            "truncated": self.truncated,
        }


@dataclass
class RagStepAudit:
    """Provenance that must answer which corpus/chunks informed a step."""

    granted_rag_ids: list[str] = field(default_factory=list)
    queries: list[RagQueryRecord] = field(default_factory=list)
    retrieved_chunks: list[RagChunk] = field(default_factory=list)
    cited_chunk_ids: list[str] = field(default_factory=list)
    truncation_events: list[dict[str, Any]] = field(default_factory=list)

    def retrieved_citation_keys(self) -> set[str]:
        return {c.citation_tag for c in self.retrieved_chunks}

    def retrieved_chunk_key_set(self) -> set[tuple[str, str]]:
        return {(c.source_id, c.chunk_id) for c in self.retrieved_chunks}

    def record_chunks(
        self,
        *,
        source_id: str,
        query: str,
        mode: str,
        chunks: list[RagChunk],
        truncated: bool = False,
    ) -> None:
        self.queries.append(
            RagQueryRecord(
                source_id=source_id,
                query=query,
                mode=mode,
                chunk_ids=[c.chunk_id for c in chunks],
                scores=[c.score for c in chunks],
                truncated=truncated,
            )
        )
        self.retrieved_chunks.extend(chunks)
        if truncated:
            self.truncation_events.append(
                {
                    "source_id": source_id,
                    "mode": mode,
                    "kept_chunk_ids": [c.chunk_id for c in chunks],
                }
            )

    def to_dict(self) -> dict[str, Any]:
        return {
            "granted_rag_ids": list(self.granted_rag_ids),
            "queries": [q.to_dict() for q in self.queries],
            "returned_chunks": [
                {
                    "source_id": c.source_id,
                    "chunk_id": c.chunk_id,
                    "score": c.score,
                    "citation": c.citation_tag,
                }
                for c in self.retrieved_chunks
            ],
            "cited_chunk_ids": list(self.cited_chunk_ids),
            "truncation_events": list(self.truncation_events),
        }


def _connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path))
    con.execute("PRAGMA journal_mode=WAL;")
    con.execute("PRAGMA synchronous=NORMAL;")
    return con


def search_sqlite_fts_at_path(
    *,
    db_path: Path,
    query: str,
    limit: int = 5,
    snippet_chars: int = 600,
) -> list[KBQueryResult]:
    """FTS search against an arbitrary KB sqlite path (does not check AGENTIC_KB)."""
    from orchestration.knowledge_base import sanitize_fts5_query

    q = sanitize_fts5_query(query)
    if not q:
        return []
    limit = max(1, min(50, int(limit)))
    snippet_chars = max(200, min(2000, int(snippet_chars)))

    with _connect(db_path) as con:
        ensure_schema(con)
        try:
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
        except sqlite3.OperationalError:
            # Empty DB / residual MATCH syntax — treat as no hits.
            return []

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


def resolve_sqlite_fts_db_path(
    entry: dict[str, Any],
    *,
    tool_root: Path,
) -> Path:
    resolved = str(entry.get("_resolved_path") or "").strip()
    if resolved:
        return Path(resolved)
    path_raw = entry.get("path")
    path_str = str(path_raw).strip() if path_raw is not None else ""
    if path_str:
        p = Path(path_str).expanduser()
        if not p.is_absolute():
            source = Path(str(entry.get("_source_path", ""))).resolve().parent
            p = (source / p).resolve()
        return p
    from orchestration.knowledge_base import kb_path

    return kb_path(tool_root)


def retrieve_from_source(
    entry: dict[str, Any],
    *,
    query: str,
    tool_root: Path,
    embed_fn: Any | None = None,
) -> list[RagChunk]:
    """Single-shot retrieval for one catalog entry."""
    backend = str(entry.get("backend", "")).strip().lower()
    source_id = str(entry.get("id", "")).strip()
    top_k = int(entry.get("top_k", 5))
    if backend == "sqlite-fts":
        return _retrieve_sqlite_fts(entry, query=query, tool_root=tool_root, source_id=source_id, top_k=top_k)
    if backend == "embedding":
        return _retrieve_embedding(
            entry,
            query=query,
            tool_root=tool_root,
            source_id=source_id,
            top_k=top_k,
            embed_fn=embed_fn,
        )
    if backend == "hybrid":
        return _retrieve_hybrid(
            entry,
            query=query,
            tool_root=tool_root,
            source_id=source_id,
            top_k=top_k,
            embed_fn=embed_fn,
        )
    raise ValueError(f"Unknown RAG backend {backend!r} for source {source_id!r}")


def _retrieve_sqlite_fts(
    entry: dict[str, Any],
    *,
    query: str,
    tool_root: Path,
    source_id: str,
    top_k: int,
) -> list[RagChunk]:
    db = resolve_sqlite_fts_db_path(entry, tool_root=tool_root)
    hits = search_sqlite_fts_at_path(db_path=db, query=query, limit=top_k)
    return [
        RagChunk(
            source_id=source_id,
            chunk_id=str(h.doc_id),
            text=h.content_snippet or h.user_goal,
            score=float(h.score),
        )
        for h in hits
    ]


def _max_embed_docs() -> int:
    try:
        n = int(os.getenv("AGENTIC_RAG_EMBED_MAX_DOCS", "2000"))
    except ValueError:
        n = 2000
    return max(1, min(50_000, n))


def _retrieve_embedding(
    entry: dict[str, Any],
    *,
    query: str,
    tool_root: Path,
    source_id: str,
    top_k: int,
    embed_fn: Any | None = None,
) -> list[RagChunk]:
    from orchestration.rag_embeddings import (
        load_docs_from_kb,
        litellm_embed_texts,
        normalize_embedding_provider,
        resolve_index_path,
        search_vector_index,
        sync_vector_index,
    )

    q = " ".join(str(query or "").strip().split())
    if not q:
        return []
    provider = normalize_embedding_provider(str(entry.get("provider") or ""))
    if not provider:
        raise RuntimeError(
            f"RAG source {source_id!r}: embedding backend missing provider "
            "(no silent fallback to sqlite-fts)",
        )
    docs_db = resolve_sqlite_fts_db_path(entry, tool_root=tool_root)
    index_path = resolve_index_path(entry, tool_root=tool_root)
    emb = embed_fn or litellm_embed_texts
    docs = load_docs_from_kb(docs_db, max_docs=_max_embed_docs())
    sync_vector_index(index_path=index_path, docs=docs, model=provider, embed_fn=emb)
    qvec = emb([q], provider)[0]
    hits = search_vector_index(index_path=index_path, query_vec=qvec, model=provider, limit=top_k)
    return [
        RagChunk(source_id=source_id, chunk_id=cid, text=text, score=float(score))
        for cid, score, text in hits
    ]


def _retrieve_hybrid(
    entry: dict[str, Any],
    *,
    query: str,
    tool_root: Path,
    source_id: str,
    top_k: int,
    embed_fn: Any | None = None,
) -> list[RagChunk]:
    from orchestration.rag_embeddings import (
        load_docs_from_kb,
        litellm_embed_texts,
        normalize_embedding_provider,
        reciprocal_rank_fusion,
        resolve_index_path,
        search_vector_index,
        sync_vector_index,
    )

    q = " ".join(str(query or "").strip().split())
    if not q:
        return []
    provider = normalize_embedding_provider(str(entry.get("provider") or ""))
    if not provider:
        raise RuntimeError(
            f"RAG source {source_id!r}: hybrid backend missing provider "
            "(no silent fallback to sqlite-fts alone)",
        )

    oversample = max(top_k * 4, top_k)
    fts_chunks = _retrieve_sqlite_fts(
        entry,
        query=q,
        tool_root=tool_root,
        source_id=source_id,
        top_k=oversample,
    )
    fts_ids = [c.chunk_id for c in fts_chunks]
    fts_by_id = {c.chunk_id: c for c in fts_chunks}

    docs_db = resolve_sqlite_fts_db_path(entry, tool_root=tool_root)
    index_path = resolve_index_path(entry, tool_root=tool_root)
    emb = embed_fn or litellm_embed_texts
    docs = load_docs_from_kb(docs_db, max_docs=_max_embed_docs())
    sync_vector_index(index_path=index_path, docs=docs, model=provider, embed_fn=emb)
    qvec = emb([q], provider)[0]
    emb_hits = search_vector_index(
        index_path=index_path,
        query_vec=qvec,
        model=provider,
        limit=oversample,
    )
    emb_ids = [cid for cid, _score, _text in emb_hits]
    emb_by_id = {
        cid: RagChunk(source_id=source_id, chunk_id=cid, text=text, score=float(score))
        for cid, score, text in emb_hits
    }

    fused = reciprocal_rank_fusion([fts_ids, emb_ids], limit=top_k)
    out: list[RagChunk] = []
    for cid, rrf_score in fused:
        base = emb_by_id.get(cid) or fts_by_id.get(cid)
        if base is None:
            continue
        out.append(
            RagChunk(
                source_id=source_id,
                chunk_id=cid,
                text=base.text,
                score=float(rrf_score),
            )
        )
    return out


def apply_token_budgets(
    *,
    source_chunks: list[tuple[dict[str, Any], list[RagChunk]]],
    global_max_tokens: int | None = None,
) -> tuple[list[tuple[str, list[RagChunk]]], list[dict[str, Any]]]:
    """
    Deterministic truncation across inject sources.

    Returns (list of (source_id, kept_chunks), truncation_events).
    """
    global_cap = global_max_tokens if global_max_tokens is not None else rag_inject_global_max_tokens()
    used_global = 0
    kept: list[tuple[str, list[RagChunk]]] = []
    events: list[dict[str, Any]] = []

    for entry, chunks in source_chunks:
        source_id = str(entry.get("id", "")).strip()
        source_cap = int(entry.get("max_tokens", 2000))
        used_source = 0
        kept_chunks: list[RagChunk] = []
        truncated = False
        # chunks already in score order from retrieval
        for chunk in chunks:
            piece = f"{chunk.citation_tag} {chunk.text}".strip()
            cost = estimate_tokens(piece)
            if used_source + cost > source_cap or used_global + cost > global_cap:
                truncated = True
                break
            kept_chunks.append(chunk)
            used_source += cost
            used_global += cost
        kept.append((source_id, kept_chunks))
        if truncated or len(kept_chunks) < len(chunks):
            events.append(
                {
                    "source_id": source_id,
                    "reason": "token_budget",
                    "source_max_tokens": source_cap,
                    "global_max_tokens": global_cap,
                    "input_chunks": len(chunks),
                    "kept_chunks": len(kept_chunks),
                    "kept_chunk_ids": [c.chunk_id for c in kept_chunks],
                }
            )
    return kept, events


def format_inject_block(
    kept: list[tuple[str, list[RagChunk]]],
    *,
    zero_result_source_ids: list[str] | None = None,
) -> str:
    """Build the delimited inject block with visible provenance tags."""
    lines: list[str] = [
        "",
        "---",
        "## RAG context (harness-retrieved; cite as [rag:source_id#chunk_id])",
        "",
    ]
    zero_ids = set(zero_result_source_ids or [])
    for source_id, chunks in kept:
        if not chunks:
            lines.append(f"[rag:{source_id}] no results")
            lines.append("")
            continue
        for chunk in chunks:
            lines.append(f"{chunk.citation_tag} {chunk.text}".strip())
        lines.append("")
    for sid in zero_ids:
        # Already emitted empty kept entries; only add if source missing from kept entirely.
        if not any(sid == s for s, _ in kept):
            lines.append(f"[rag:{sid}] no results")
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def prepare_inject_context(
    *,
    entries: list[dict[str, Any]],
    query: str,
    tool_root: Path,
    audit: RagStepAudit | None = None,
) -> tuple[str, RagStepAudit]:
    """Retrieve inject-mode sources, apply budgets, return markdown block + audit."""
    session = audit or RagStepAudit()
    inject_entries = [e for e in entries if str(e.get("mode", "inject")).strip() == "inject"]
    source_chunks: list[tuple[dict[str, Any], list[RagChunk]]] = []
    zero_ids: list[str] = []

    for entry in inject_entries:
        chunks = retrieve_from_source(entry, query=query, tool_root=tool_root)
        source_id = str(entry.get("id", "")).strip()
        if not chunks:
            zero_ids.append(source_id)
        source_chunks.append((entry, chunks))

    kept, events = apply_token_budgets(source_chunks=source_chunks)
    session.truncation_events.extend(events)

    for entry, _original in source_chunks:
        source_id = str(entry.get("id", "")).strip()
        kept_for = next((chs for sid, chs in kept if sid == source_id), [])
        truncated = any(e.get("source_id") == source_id for e in events)
        session.record_chunks(
            source_id=source_id,
            query=query,
            mode="inject",
            chunks=kept_for,
            truncated=truncated,
        )

    block = format_inject_block(kept, zero_result_source_ids=zero_ids)
    return block, session
