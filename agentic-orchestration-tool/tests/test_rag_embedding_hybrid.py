"""Integration tests for RAG embedding + hybrid backends (end-to-end paths)."""

from __future__ import annotations

import math
from pathlib import Path

import pytest
import yaml

from orchestration.knowledge_base import add_document, kb_path
from orchestration.rag_embeddings import (
    content_hash,
    cosine_similarity,
    load_docs_from_kb,
    normalize_embedding_provider,
    reciprocal_rank_fusion,
    resolve_index_path,
    search_vector_index,
    sync_vector_index,
)
from orchestration.rag_grounding import finalize_rag_answer
from orchestration.rag_retrieve import prepare_inject_context, retrieve_from_source
from orchestration.rag_sources_catalog import (
    load_rag_sources_catalog,
    resolve_rag_ids,
    validate_rag_source_entry,
)
from orchestration.rag_tool import RagQueryTool
from orchestration.rag_retrieve import RagStepAudit


def _fake_embed(texts: list[str], model: str) -> list[list[float]]:
    """Deterministic embedding with topic boosts for paraphrases."""
    assert model
    out: list[list[float]] = []
    for text in texts:
        vec = [0.0] * 8
        for i, ch in enumerate(text.lower()):
            vec[i % 8] += (ord(ch) % 31) / 31.0
        low = text.lower()
        if any(w in low for w in ("jetson", "edge", "k3s", "deploy", "rollout", "warm-pool", "cluster")):
            vec[0] += 5.0
            vec[1] += 3.0
        if any(w in low for w in ("billing", "invoice", "payment", "finance")):
            vec[2] += 5.0
            vec[3] += 3.0
        if "uniquetokenxyz" in low:
            vec[4] += 8.0
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        out.append([x / norm for x in vec])
    return out


def _seed_corpus(tool_root: Path) -> None:
    add_document(
        tool_root=tool_root,
        session_slug="s",
        user_goal="edge rollout notes",
        content="Deploy agentic orchestration on Jetson k3s with warm-pool workers and NodePort 30487.",
    )
    add_document(
        tool_root=tool_root,
        session_slug="s",
        user_goal="finance notes",
        content="Customer billing invoices and payment reconciliation for month end.",
    )
    add_document(
        tool_root=tool_root,
        session_slug="s",
        user_goal="exact token doc",
        content="UniqueTokenXYZ appears only here for keyword FTS matching.",
    )


@pytest.mark.unit
def test_helpers_normalize_cosine_rrf() -> None:
    assert normalize_embedding_provider("litellm:text-embedding-3-small") == "text-embedding-3-small"
    assert cosine_similarity([1.0, 0.0], [1.0, 0.0]) == pytest.approx(1.0)
    fused = reciprocal_rank_fusion([["a", "b"], ["b", "c"]], limit=3)
    assert fused[0][0] == "b"


@pytest.mark.unit
def test_embedding_requires_provider_and_index(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="provider"):
        validate_rag_source_entry(
            {
                "id": "emb",
                "backend": "embedding",
                "mode": "inject",
                "index": str(tmp_path / "idx.sqlite3"),
                "_source_path": str(tmp_path / "x.yaml"),
            }
        )
    with pytest.raises(ValueError, match="index"):
        validate_rag_source_entry(
            {
                "id": "emb",
                "backend": "embedding",
                "mode": "inject",
                "provider": "litellm:text-embedding-3-small",
                "_source_path": str(tmp_path / "x.yaml"),
            }
        )


@pytest.mark.unit
def test_embedding_catalog_loads_when_complete(tmp_path: Path) -> None:
    idx = tmp_path / "vectors.sqlite3"
    (tmp_path / "emb.yaml").write_text(
        yaml.dump(
            {
                "id": "kb_embed",
                "backend": "embedding",
                "mode": "inject",
                "provider": "litellm:fake-embed",
                "index": str(idx),
            }
        ),
        encoding="utf-8",
    )
    catalog = load_rag_sources_catalog(tmp_path)
    assert catalog[0]["provider"] == "fake-embed"
    assert catalog[0]["_resolved_index"] == str(idx.resolve())


@pytest.mark.unit
def test_examples_dir_skipped_by_catalog_loader(config_dir: Path) -> None:
    catalog = load_rag_sources_catalog(config_dir / "rag_sources")
    ids = {e["id"] for e in catalog}
    assert "orchestrator_kb" in ids
    assert "orchestrator_kb_embed" not in ids
    assert "orchestrator_kb_hybrid" not in ids
    examples = config_dir / "rag_sources" / "_examples"
    assert (examples / "orchestrator_kb_embed.yaml").is_file()
    assert (examples / "orchestrator_kb_hybrid.yaml").is_file()


@pytest.mark.unit
def test_embedding_retrieve_prefers_paraphrase_over_keyword(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_KB", "1")
    tool_root = tmp_path / "tool"
    tool_root.mkdir()
    _seed_corpus(tool_root)
    entry = validate_rag_source_entry(
        {
            "id": "sem",
            "backend": "embedding",
            "mode": "inject",
            "provider": "fake-embed",
            "index": str(tmp_path / "idx.sqlite3"),
            "path": str(kb_path(tool_root)),
            "top_k": 1,
            "_source_path": str(tmp_path / "sem.yaml"),
        }
    )
    chunks = retrieve_from_source(
        entry,
        query="how do we roll out on the edge device cluster?",
        tool_root=tool_root,
        embed_fn=_fake_embed,
    )
    assert chunks
    assert "Jetson" in chunks[0].text or "warm-pool" in chunks[0].text
    assert "billing" not in chunks[0].text.lower()


@pytest.mark.unit
def test_vector_index_resyncs_when_doc_changes(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_KB", "1")
    tool_root = tmp_path / "tool"
    tool_root.mkdir()
    add_document(
        tool_root=tool_root,
        session_slug="s",
        user_goal="v1",
        content="alpha content about billing invoices only",
    )
    docs_db = kb_path(tool_root)
    index_path = tmp_path / "idx.sqlite3"
    docs = load_docs_from_kb(docs_db)
    assert docs
    sync_vector_index(index_path=index_path, docs=docs, model="fake-embed", embed_fn=_fake_embed)
    qvec = _fake_embed(["payment finance month end"], "fake-embed")[0]
    hits1 = search_vector_index(index_path=index_path, query_vec=qvec, model="fake-embed", limit=1)
    assert hits1 and "billing" in hits1[0][2].lower()

    # Change corpus: append a Jetson doc and re-sync.
    add_document(
        tool_root=tool_root,
        session_slug="s",
        user_goal="v2",
        content="Deploy Jetson k3s edge cluster warm-pool",
    )
    docs2 = load_docs_from_kb(docs_db)
    n = sync_vector_index(index_path=index_path, docs=docs2, model="fake-embed", embed_fn=_fake_embed)
    assert n >= 1
    qvec2 = _fake_embed(["edge device rollout cluster"], "fake-embed")[0]
    hits2 = search_vector_index(index_path=index_path, query_vec=qvec2, model="fake-embed", limit=1)
    assert hits2
    assert "Jetson" in hits2[0][2] or "k3s" in hits2[0][2]


@pytest.mark.unit
def test_hybrid_merges_fts_token_and_embedding_paraphrase(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_KB", "1")
    tool_root = tmp_path / "tool"
    tool_root.mkdir()
    _seed_corpus(tool_root)
    entry = validate_rag_source_entry(
        {
            "id": "hyb",
            "backend": "hybrid",
            "mode": "inject",
            "provider": "fake-embed",
            "index": str(tmp_path / "hybrid.sqlite3"),
            "path": str(kb_path(tool_root)),
            "top_k": 2,
            "_source_path": str(tmp_path / "hyb.yaml"),
        }
    )
    chunks = retrieve_from_source(
        entry,
        query="UniqueTokenXYZ edge device rollout",
        tool_root=tool_root,
        embed_fn=_fake_embed,
    )
    texts = " ".join(c.text for c in chunks)
    assert "UniqueTokenXYZ" in texts
    assert "Jetson" in texts or "k3s" in texts


@pytest.mark.unit
def test_embedding_inject_context_and_grounding(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_KB", "1")
    tool_root = tmp_path / "tool"
    tool_root.mkdir()
    _seed_corpus(tool_root)
    entry = validate_rag_source_entry(
        {
            "id": "emb_inject",
            "backend": "embedding",
            "mode": "inject",
            "provider": "fake-embed",
            "index": str(tmp_path / "inj.sqlite3"),
            "path": str(kb_path(tool_root)),
            "top_k": 2,
            "max_tokens": 2000,
            "_source_path": str(tmp_path / "e.yaml"),
        }
    )

    # prepare_inject_context has no embed_fn kwarg — patch module entry point.
    monkeypatch.setattr(
        "orchestration.rag_embeddings.litellm_embed_texts",
        _fake_embed,
    )
    block, audit = prepare_inject_context(
        entries=[entry],
        query="edge cluster rollout",
        tool_root=tool_root,
    )
    assert "[rag:emb_inject#" in block
    assert audit.retrieved_chunks
    cite = audit.retrieved_chunks[0].citation_tag
    text, ok, reason = finalize_rag_answer(f"Deploy using {cite}.", audit)
    assert ok and reason is None
    assert cite in text


@pytest.mark.unit
def test_embedding_tool_mode_end_to_end(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_KB", "1")
    tool_root = tmp_path / "tool"
    tool_root.mkdir()
    _seed_corpus(tool_root)
    monkeypatch.setattr(
        "orchestration.rag_embeddings.litellm_embed_texts",
        _fake_embed,
    )
    cfg = tmp_path / "cfg"
    cfg.mkdir()
    (cfg / "t.yaml").write_text(
        yaml.dump(
            {
                "id": "kb_tool_embed",
                "backend": "embedding",
                "mode": "tool",
                "provider": "fake-embed",
                "index": str(tmp_path / "tool_idx.sqlite3"),
                "path": str(kb_path(tool_root)),
                "top_k": 2,
            }
        ),
        encoding="utf-8",
    )
    catalog = load_rag_sources_catalog(cfg)
    resolved = resolve_rag_ids(["kb_tool_embed"], catalog, context="test")
    assert resolved[0]["backend"] == "embedding"
    audit = RagStepAudit(granted_rag_ids=["kb_tool_embed"])
    tool = RagQueryTool(
        allowed_source_ids=frozenset({"kb_tool_embed"}),
        catalog_entries=catalog,
        tool_root=tool_root,
        audit=audit,
    )
    out = tool._run("kb_tool_embed", "how do we roll out on the edge device?")
    assert "[rag:kb_tool_embed#" in out
    assert audit.retrieved_chunks
    assert audit.queries[0].mode == "tool"


@pytest.mark.unit
def test_embedding_failure_does_not_fallback_to_fts(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_KB", "1")
    tool_root = tmp_path / "tool"
    tool_root.mkdir()
    add_document(
        tool_root=tool_root,
        session_slug="s",
        user_goal="kb",
        content="sqlite fts would find this easily with matching words",
    )

    def boom(texts: list[str], model: str) -> list[list[float]]:
        raise RuntimeError("provider down")

    entry = validate_rag_source_entry(
        {
            "id": "emb",
            "backend": "embedding",
            "mode": "tool",
            "provider": "fake-embed",
            "index": str(tmp_path / "idx.sqlite3"),
            "path": str(kb_path(tool_root)),
            "_source_path": str(tmp_path / "e.yaml"),
        }
    )
    with pytest.raises(RuntimeError, match="provider down"):
        retrieve_from_source(
            entry,
            query="matching words",
            tool_root=tool_root,
            embed_fn=boom,
        )


@pytest.mark.unit
def test_empty_query_returns_no_chunks(tmp_path: Path) -> None:
    entry = validate_rag_source_entry(
        {
            "id": "emb",
            "backend": "embedding",
            "mode": "inject",
            "provider": "fake-embed",
            "index": str(tmp_path / "idx.sqlite3"),
            "_source_path": str(tmp_path / "e.yaml"),
        }
    )
    assert retrieve_from_source(entry, query="  ", tool_root=tmp_path, embed_fn=_fake_embed) == []


@pytest.mark.unit
def test_resolve_index_path_directory_uses_vectors_sqlite(tmp_path: Path) -> None:
    entry = {
        "id": "x",
        "index": str(tmp_path / "embed_dir"),
        "_source_path": str(tmp_path / "x.yaml"),
        "_resolved_index": str(tmp_path / "embed_dir"),
    }
    p = resolve_index_path(entry, tool_root=tmp_path)
    assert p.name == "vectors.sqlite3"
    assert content_hash("abc") == content_hash("abc")
    assert content_hash("abc") != content_hash("abd")
