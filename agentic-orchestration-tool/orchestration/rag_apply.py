"""Shared helpers to apply RAG inject + audit for a step/task."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from orchestration.config_loader import TaskDefinition, WorkflowConfig, raw_rag_spec_for_task
from orchestration.rag_context import augment_description_for_rag, rag_query_for_step
from orchestration.rag_retrieve import RagStepAudit, prepare_inject_context
from orchestration.rag_sources_catalog import resolve_rag_ids


def apply_rag_to_description(
    description: str,
    *,
    rag_ids: list[str],
    rag_query: str | None,
    catalog_entries: list[dict[str, Any]],
    tool_root: Path,
    audit: RagStepAudit | None = None,
    context: str = "step",
) -> tuple[str, RagStepAudit]:
    """Resolve granted RAG sources, inject inject-mode context, return description + audit."""
    session = audit or RagStepAudit()
    session.granted_rag_ids = list(rag_ids)
    if not rag_ids:
        return description, session

    entries = resolve_rag_ids(rag_ids, catalog_entries, context=context)
    query = rag_query_for_step(explicit_rag_query=rag_query, task_description=description)
    block, session = prepare_inject_context(
        entries=entries,
        query=query,
        tool_root=tool_root,
        audit=session,
    )
    return augment_description_for_rag(description, block), session


def apply_rag_for_task(
    task: TaskDefinition,
    config: WorkflowConfig,
    *,
    description: str,
    catalog_entries: list[dict[str, Any]],
    tool_root: Path,
) -> tuple[str, RagStepAudit, list[str]]:
    rag_ids = raw_rag_spec_for_task(task, config)
    desc, audit = apply_rag_to_description(
        description,
        rag_ids=rag_ids,
        rag_query=task.rag_query,
        catalog_entries=catalog_entries,
        tool_root=tool_root,
        context=f"task {task.id}",
    )
    return desc, audit, rag_ids
