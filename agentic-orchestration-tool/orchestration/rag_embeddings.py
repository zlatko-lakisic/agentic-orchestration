"""Local embedding index + LiteLLM embed helper for RAG backends.

No FAISS/Chroma/pgvector — vectors live in a small SQLite file next to the corpus.
Missing/failed embedding providers hard-fail (never silently fall back to FTS).
"""

from __future__ import annotations

import hashlib
import math
import os
import sqlite3
import struct
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Sequence

from orchestration.knowledge_base import ensure_schema

EmbedFn = Callable[[list[str], str], list[list[float]]]


def normalize_embedding_provider(raw: str) -> str:
    """LiteLLM model id; strip optional ``litellm:`` prefix."""
    model = str(raw or "").strip()
    if model.lower().startswith("litellm:"):
        model = model.split(":", 1)[1].strip()
    return model


def _pack_vec(vec: Sequence[float]) -> bytes:
    return struct.pack(f"{len(vec)}f", *[float(x) for x in vec])


def _unpack_vec(blob: bytes) -> list[float]:
    n = len(blob) // 4
    if n < 1 or len(blob) != n * 4:
        raise ValueError("invalid embedding blob")
    return list(struct.unpack(f"{n}f", blob))


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b):
        xf = float(x)
        yf = float(y)
        dot += xf * yf
        na += xf * xf
        nb += yf * yf
    if na <= 0.0 or nb <= 0.0:
        return 0.0
    return dot / (math.sqrt(na) * math.sqrt(nb))


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path))
    con.execute("PRAGMA journal_mode=WAL;")
    con.execute("PRAGMA synchronous=NORMAL;")
    return con


def ensure_vector_schema(con: sqlite3.Connection) -> None:
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS vec_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        """
    )
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS vectors (
          chunk_id TEXT PRIMARY KEY,
          doc_id INTEGER NOT NULL,
          content_hash TEXT NOT NULL,
          model TEXT NOT NULL,
          dim INTEGER NOT NULL,
          text TEXT NOT NULL,
          user_goal TEXT,
          embedding BLOB NOT NULL,
          updated_ts REAL NOT NULL
        );
        """
    )
    con.execute("CREATE INDEX IF NOT EXISTS idx_vectors_model ON vectors(model);")
    con.commit()


def resolve_index_path(entry: dict[str, Any], *, tool_root: Path) -> Path:
    resolved = str(entry.get("_resolved_index") or "").strip()
    if resolved:
        return _as_index_sqlite_path(Path(resolved))
    raw = entry.get("index")
    path_str = str(raw).strip() if raw is not None else ""
    if not path_str:
        raise ValueError(
            f"RAG source {entry.get('id')!r}: embedding/hybrid requires non-empty 'index'",
        )
    p = Path(path_str).expanduser()
    if not p.is_absolute():
        source = Path(str(entry.get("_source_path", ""))).resolve().parent
        if source.exists():
            p = (source / p).resolve()
        else:
            p = (tool_root / p).resolve()
    return _as_index_sqlite_path(p)


def _as_index_sqlite_path(p: Path) -> Path:
    if p.suffix.lower() not in (".sqlite", ".sqlite3", ".db"):
        return p / "vectors.sqlite3"
    return p


def litellm_embed_texts(texts: list[str], model: str) -> list[list[float]]:
    """Call LiteLLM embeddings. Raises on failure — no FTS fallback."""
    if not texts:
        return []
    model_id = normalize_embedding_provider(model)
    if not model_id:
        raise RuntimeError("RAG embedding provider/model is empty")

    try:
        import litellm
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("litellm is required for RAG embedding/hybrid backends") from exc

    try:
        resp = litellm.embedding(model=model_id, input=texts)
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(
            f"RAG embedding failed for model {model_id!r}: {exc}. "
            "No silent fallback to sqlite-fts.",
        ) from exc

    data = getattr(resp, "data", None)
    if data is None and isinstance(resp, dict):
        data = resp.get("data")
    if not data:
        raise RuntimeError(f"RAG embedding returned no data for model {model_id!r}")

    out: list[list[float]] = []
    for i, item in enumerate(data):
        if isinstance(item, dict):
            vec = item.get("embedding")
        else:
            vec = getattr(item, "embedding", None)
        if not isinstance(vec, (list, tuple)) or not vec:
            raise RuntimeError(f"RAG embedding missing vector at index {i}")
        out.append([float(x) for x in vec])
    if len(out) != len(texts):
        raise RuntimeError(
            f"RAG embedding count mismatch: got {len(out)} vectors for {len(texts)} texts",
        )
    return out


def _snippet(text: str, *, max_chars: int = 600) -> str:
    t = " ".join(str(text or "").split())
    if len(t) <= max_chars:
        return t
    return t[: max_chars - 1] + "…"


@dataclass(frozen=True)
class IndexedDoc:
    doc_id: int
    text: str
    user_goal: str
    content_hash: str


def load_docs_from_kb(db_path: Path, *, max_docs: int = 5000) -> list[IndexedDoc]:
    """Load corpus documents from a knowledge_base-compatible sqlite file."""
    max_docs = max(1, min(50_000, int(max_docs)))
    if not db_path.exists():
        return []
    with _connect(db_path) as con:
        ensure_schema(con)
        rows = con.execute(
            """
            SELECT id, content, coalesce(user_goal,'')
            FROM docs
            ORDER BY id DESC
            LIMIT ?;
            """,
            (max_docs,),
        ).fetchall()
    out: list[IndexedDoc] = []
    for doc_id, content, user_goal in rows:
        body = str(content or "").strip()
        goal = str(user_goal or "").strip()
        combined = f"{goal}\n{body}".strip() if goal else body
        if not combined:
            continue
        out.append(
            IndexedDoc(
                doc_id=int(doc_id),
                text=combined,
                user_goal=goal,
                content_hash=content_hash(combined),
            )
        )
    return out


def sync_vector_index(
    *,
    index_path: Path,
    docs: list[IndexedDoc],
    model: str,
    embed_fn: EmbedFn | None = None,
    batch_size: int | None = None,
) -> int:
    """Upsert embeddings for docs that are missing or content-changed. Returns upsert count."""
    model_id = normalize_embedding_provider(model)
    if not model_id:
        raise RuntimeError("RAG embedding provider/model is empty")
    emb = embed_fn or litellm_embed_texts
    try:
        batch = int(batch_size if batch_size is not None else os.getenv("AGENTIC_RAG_EMBED_BATCH", "16"))
    except ValueError:
        batch = 16
    batch = max(1, min(64, batch))

    with _connect(index_path) as con:
        ensure_vector_schema(con)
        existing = {
            str(cid): (str(ch), str(mdl))
            for cid, ch, mdl in con.execute(
                "SELECT chunk_id, content_hash, model FROM vectors",
            ).fetchall()
        }
        stale_ids = [
            d
            for d in docs
            if existing.get(str(d.doc_id), ("", "")) != (d.content_hash, model_id)
        ]
        upserted = 0
        now = float(time.time())
        for i in range(0, len(stale_ids), batch):
            chunk = stale_ids[i : i + batch]
            vectors = emb([d.text for d in chunk], model_id)
            for doc, vec in zip(chunk, vectors):
                if not vec:
                    raise RuntimeError(f"empty embedding for doc_id={doc.doc_id}")
                con.execute(
                    """
                    INSERT INTO vectors(
                      chunk_id, doc_id, content_hash, model, dim, text, user_goal, embedding, updated_ts
                    ) VALUES(?,?,?,?,?,?,?,?,?)
                    ON CONFLICT(chunk_id) DO UPDATE SET
                      doc_id=excluded.doc_id,
                      content_hash=excluded.content_hash,
                      model=excluded.model,
                      dim=excluded.dim,
                      text=excluded.text,
                      user_goal=excluded.user_goal,
                      embedding=excluded.embedding,
                      updated_ts=excluded.updated_ts
                    """,
                    (
                        str(doc.doc_id),
                        int(doc.doc_id),
                        doc.content_hash,
                        model_id,
                        len(vec),
                        _snippet(doc.text, max_chars=4000),
                        doc.user_goal,
                        _pack_vec(vec),
                        now,
                    ),
                )
                upserted += 1
        con.execute(
            "INSERT INTO vec_meta(key, value) VALUES('model', ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (model_id,),
        )
        con.commit()
        return upserted


def search_vector_index(
    *,
    index_path: Path,
    query_vec: Sequence[float],
    model: str,
    limit: int = 5,
) -> list[tuple[str, float, str]]:
    """Return (chunk_id, score, text) sorted by cosine similarity descending."""
    model_id = normalize_embedding_provider(model)
    limit = max(1, min(50, int(limit)))
    if not index_path.exists():
        return []
    with _connect(index_path) as con:
        ensure_vector_schema(con)
        rows = con.execute(
            "SELECT chunk_id, text, embedding FROM vectors WHERE model = ?",
            (model_id,),
        ).fetchall()
    scored: list[tuple[str, float, str]] = []
    for chunk_id, text, blob in rows:
        try:
            vec = _unpack_vec(blob)
        except ValueError:
            continue
        score = cosine_similarity(query_vec, vec)
        scored.append((str(chunk_id), float(score), str(text or "")))
    scored.sort(key=lambda t: t[1], reverse=True)
    return scored[:limit]


def reciprocal_rank_fusion(
    ranked_lists: list[list[str]],
    *,
    k: int = 60,
    limit: int = 5,
) -> list[tuple[str, float]]:
    """Classic RRF: score(d) = sum 1/(k + rank). Higher is better."""
    scores: dict[str, float] = {}
    for ranked in ranked_lists:
        for rank, chunk_id in enumerate(ranked, start=1):
            cid = str(chunk_id)
            scores[cid] = scores.get(cid, 0.0) + 1.0 / (float(k) + float(rank))
    ordered = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    return ordered[: max(1, min(50, int(limit)))]
