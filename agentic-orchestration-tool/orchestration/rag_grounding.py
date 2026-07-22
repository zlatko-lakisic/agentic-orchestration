"""Harness-level RAG citation grounding (blocking — not prompt-only).

Pattern mirrors ``media_grounding.finalize_media_answer``: verify after the model
speaks; reject with a structured error when citations invent chunk IDs.
"""

from __future__ import annotations

import json
import re
import sys
from typing import Any

from orchestration.rag_retrieve import RagStepAudit

RAG_CITATION_RE = re.compile(r"\[rag:([^\]#\s]+)#([^\]\s]+)\]")
RAG_GROUNDING_AUDIT_MARKER = "[agentic: rag grounding audit]"
RAG_GATE_RESPONSE = (
    "RAG grounding gate: the answer cited retrieved material that was not present "
    "in the harness-retrieved chunk set for this step."
)


def extract_rag_citations(text: str) -> list[tuple[str, str]]:
    """Return (source_id, chunk_id) pairs in citation order."""
    return [(m.group(1), m.group(2)) for m in RAG_CITATION_RE.finditer(str(text or ""))]


def verify_rag_citations(
    answer: str,
    audit: RagStepAudit | None,
    *,
    granted_rag_ids: list[str] | None = None,
) -> str | None:
    """
    Return a structured rejection reason, or None when citations are valid.

    Rules:
    - Citations must refer to chunks actually retrieved this step (inject + tool).
    - Citations to a non-granted source fail even if somehow present.
    - No citations → pass (grounding only constrains claims that cite RAG).
    """
    cites = extract_rag_citations(answer)
    if not cites:
        return None
    if audit is None:
        return "rag_citations_present_but_no_retrieval_audit"

    granted = set(granted_rag_ids or audit.granted_rag_ids)
    retrieved = audit.retrieved_chunk_key_set()
    if audit.cited_chunk_ids is not None:
        audit.cited_chunk_ids = [f"{s}#{c}" for s, c in cites]

    for source_id, chunk_id in cites:
        if granted and source_id not in granted:
            return f"citation_to_non_granted_source:{source_id}#{chunk_id}"
        if (source_id, chunk_id) not in retrieved:
            return f"fabricated_chunk_id:{source_id}#{chunk_id}"
    return None


def emit_rag_grounding_audit(
    audit: RagStepAudit | None,
    *,
    verification: str,
) -> None:
    payload: dict[str, Any] = {
        "verification": verification,
        "rag": audit.to_dict() if audit is not None else None,
    }
    try:
        sys.stderr.write(f"{RAG_GROUNDING_AUDIT_MARKER} {json.dumps(payload, sort_keys=True)}\n")
    except Exception:  # noqa: BLE001
        pass


def finalize_rag_answer(
    answer: str,
    audit: RagStepAudit | None,
    *,
    granted_rag_ids: list[str] | None = None,
) -> tuple[str, bool, str | None]:
    """
    Verify RAG citations.

    Returns ``(text, accepted, reject_reason)``. When not accepted, ``text`` is the
    gate response (suitable for step failure pathways).
    """
    reject = verify_rag_citations(answer, audit, granted_rag_ids=granted_rag_ids)
    if reject:
        emit_rag_grounding_audit(audit, verification=f"rejected_{reject}")
        return f"{RAG_GATE_RESPONSE} ({reject})", False, reject
    emit_rag_grounding_audit(audit, verification="accepted")
    return answer, True, None
