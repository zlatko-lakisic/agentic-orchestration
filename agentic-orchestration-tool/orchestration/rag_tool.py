"""Tool-mode RAG: CrewAI tools with harness-level grant ACL (not prompt-only)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from crewai.tools import BaseTool

from orchestration.rag_retrieve import RagStepAudit, format_inject_block, retrieve_from_source
from orchestration.rag_sources_catalog import rag_catalog_by_id


class RagQueryTool(BaseTool):
    """Query a granted RAG source mid-step. Non-granted sources are blocked at dispatch."""

    name: str = "rag_query"
    description: str = (
        "Retrieve passages from a granted RAG corpus. "
        "Arguments: source_id (catalog id granted to this step), query (search text). "
        "Results include citation tags [rag:source_id#chunk_id] that you must use when citing."
    )

    def __init__(
        self,
        *,
        allowed_source_ids: frozenset[str],
        catalog_entries: list[dict[str, Any]],
        tool_root: Path,
        audit: RagStepAudit,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self._allowed = frozenset(allowed_source_ids)
        self._catalog = rag_catalog_by_id(catalog_entries)
        self._tool_root = tool_root
        self._audit = audit

    def _run(self, source_id: str, query: str = "") -> str:
        sid = str(source_id or "").strip()
        q = str(query or "").strip()
        if not sid:
            return "error: source_id is required"

        if sid not in self._allowed:
            msg = (
                f"RAG tool blocked: source_id {sid!r} is not granted to this step. "
                f"Granted: {sorted(self._allowed)!r}"
            )
            self._audit.truncation_events.append(
                {
                    "type": "tool_acl_denied",
                    "source_id": sid,
                    "granted_rag_ids": sorted(self._allowed),
                }
            )
            return msg

        entry = self._catalog.get(sid)
        if entry is None:
            return f"error: unknown RAG source {sid!r}"
        if str(entry.get("mode", "")).strip() != "tool":
            return f"error: RAG source {sid!r} is mode={entry.get('mode')!r}, not tool"

        if not q:
            return "error: query is required"

        chunks = retrieve_from_source(entry, query=q, tool_root=self._tool_root)
        self._audit.record_chunks(
            source_id=sid,
            query=q,
            mode="tool",
            chunks=chunks,
            truncated=False,
        )
        if not chunks:
            return f"[rag:{sid}] no results"
        return format_inject_block([(sid, chunks)]).strip()


def tool_mode_entries(
    entries: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    return [e for e in entries if str(e.get("mode", "")).strip() == "tool"]


def attach_rag_tools_to_agents(
    agents: list[Any],
    *,
    allowed_source_ids: frozenset[str],
    catalog_entries: list[dict[str, Any]],
    tool_root: Path,
    audit: RagStepAudit,
) -> bool:
    """Attach ``rag_query`` to agents when the step has tool-mode grants. Returns True if attached."""
    tool_entries = tool_mode_entries(catalog_entries)
    allowed_tool = frozenset(
        str(e.get("id", "")).strip()
        for e in tool_entries
        if str(e.get("id", "")).strip() in allowed_source_ids
    )
    if not allowed_tool:
        return False

    tool = RagQueryTool(
        allowed_source_ids=allowed_tool,
        catalog_entries=catalog_entries,
        tool_root=tool_root,
        audit=audit,
    )
    for agent in agents:
        existing = list(getattr(agent, "tools", None) or [])
        # Avoid duplicate tool name
        if any(getattr(t, "name", "") == "rag_query" for t in existing):
            continue
        agent.tools = [*existing, tool]
    return True
