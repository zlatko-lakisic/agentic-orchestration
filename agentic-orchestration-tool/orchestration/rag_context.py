"""Inject-mode RAG context into task descriptions (adjacent to skill injection)."""

from __future__ import annotations

RAG_MARKER = "\n\n---\n## RAG context (harness-retrieved; cite as [rag:source_id#chunk_id])\n"


def augment_description_for_rag(description: str, rag_block: str) -> str:
    """Append a harness-built RAG inject block to a task description."""
    block = str(rag_block or "").strip()
    if not block:
        return description
    if RAG_MARKER.strip() in description or "## RAG context (harness-retrieved" in description:
        return description
    # prepare_inject_context already includes the heading; avoid double markers.
    text = block if block.startswith("---") or block.startswith("##") else RAG_MARKER.strip() + "\n" + block
    return description.rstrip() + "\n\n" + text.strip() + "\n"


def strip_rag_from_description(description: str) -> str:
    """Remove a prior RAG inject block."""
    markers = (
        "\n\n---\n## RAG context (harness-retrieved",
        "\n---\n## RAG context (harness-retrieved",
    )
    for marker in markers:
        idx = description.find(marker)
        if idx != -1:
            return description[:idx].rstrip()
    return description


def rag_query_for_step(
    *,
    explicit_rag_query: str | None,
    task_description: str,
) -> str:
    """Prefer planner ``rag_query`` when present; else use task description."""
    q = str(explicit_rag_query or "").strip()
    if q:
        return q
    return str(task_description or "").strip()
