"""RAG tool ACL and grounding enforcement."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from orchestration.rag_grounding import finalize_rag_answer, verify_rag_citations
from orchestration.rag_retrieve import RagChunk, RagStepAudit
from orchestration.rag_sources_catalog import load_rag_sources_catalog
from orchestration.rag_tool import RagQueryTool
from orchestration.knowledge_base import add_document, kb_path


@pytest.mark.unit
def test_tool_blocks_non_granted_source(tmp_path: Path) -> None:
    (tmp_path / "a.yaml").write_text(
        yaml.dump({"id": "allowed", "backend": "sqlite-fts", "mode": "tool", "top_k": 2}),
        encoding="utf-8",
    )
    catalog = load_rag_sources_catalog(tmp_path)
    audit = RagStepAudit(granted_rag_ids=["allowed"])
    tool = RagQueryTool(
        allowed_source_ids=frozenset({"allowed"}),
        catalog_entries=catalog,
        tool_root=tmp_path,
        audit=audit,
    )
    out = tool._run("other", "query")
    assert "blocked" in out.lower()
    assert any(e.get("type") == "tool_acl_denied" for e in audit.truncation_events)


@pytest.mark.unit
def test_tool_granted_source_callable(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_KB", "1")
    add_document(
        tool_root=tmp_path,
        session_slug=None,
        user_goal="compliance policy",
        content="All vendors must complete SOC2 attestation annually.",
    )
    db = kb_path(tmp_path)
    (tmp_path / "cfg").mkdir()
    (tmp_path / "cfg" / "t.yaml").write_text(
        yaml.dump(
            {
                "id": "kb",
                "backend": "sqlite-fts",
                "mode": "tool",
                "path": str(db),
                "top_k": 3,
            }
        ),
        encoding="utf-8",
    )
    catalog = load_rag_sources_catalog(tmp_path / "cfg")
    audit = RagStepAudit(granted_rag_ids=["kb"])
    tool = RagQueryTool(
        allowed_source_ids=frozenset({"kb"}),
        catalog_entries=catalog,
        tool_root=tmp_path,
        audit=audit,
    )
    out = tool._run("kb", "SOC2 vendors")
    assert "[rag:kb]" in out or "[rag:kb#" in out
    assert audit.retrieved_chunks or "[rag:kb] no results" in out


@pytest.mark.unit
def test_grounding_valid_citation_passes() -> None:
    audit = RagStepAudit(granted_rag_ids=["docs"])
    audit.retrieved_chunks.append(RagChunk("docs", "7", "text", 1.0))
    assert verify_rag_citations("Based on [rag:docs#7] the answer is yes.", audit) is None
    text, ok, reason = finalize_rag_answer("Based on [rag:docs#7] yes.", audit)
    assert ok and reason is None
    assert "docs#7" in " ".join(audit.cited_chunk_ids) or audit.cited_chunk_ids


@pytest.mark.unit
def test_grounding_fabricated_chunk_fails() -> None:
    audit = RagStepAudit(granted_rag_ids=["docs"])
    audit.retrieved_chunks.append(RagChunk("docs", "7", "text", 1.0))
    reason = verify_rag_citations("See [rag:docs#999].", audit)
    assert reason and "fabricated_chunk_id" in reason
    _text, ok, reject = finalize_rag_answer("See [rag:docs#999].", audit)
    assert not ok and reject


@pytest.mark.unit
def test_grounding_non_granted_source_fails() -> None:
    audit = RagStepAudit(granted_rag_ids=["docs"])
    audit.retrieved_chunks.append(RagChunk("other", "1", "x", 1.0))
    reason = verify_rag_citations("See [rag:other#1].", audit)
    assert reason and "non_granted" in reason


@pytest.mark.unit
def test_audit_dict_has_provenance_fields() -> None:
    audit = RagStepAudit(granted_rag_ids=["a", "b"])
    audit.record_chunks(
        source_id="a",
        query="q",
        mode="inject",
        chunks=[RagChunk("a", "1", "t", 0.5)],
    )
    audit.record_chunks(
        source_id="b",
        query="q2",
        mode="tool",
        chunks=[RagChunk("b", "2", "u", 0.4)],
        truncated=True,
    )
    d = audit.to_dict()
    assert d["granted_rag_ids"] == ["a", "b"]
    assert len(d["queries"]) == 2
    assert {c["chunk_id"] for c in d["returned_chunks"]} == {"1", "2"}
    assert d["truncation_events"]
