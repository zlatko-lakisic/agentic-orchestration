"""
Direct-agent fast path: "ask agent X, with this provided context, now."

Bypasses the planner → JSON plan → sequential crew cycle. The caller supplies the
agent id and pre-retrieved context, so there is no plan decomposition and no second
LLM round trip before the answer starts. The dynamic planner path
(``orchestration.dynamic_run``) stays the default for deep multi-step goals.

This is not a second agent runtime: it builds a one-task ``WorkflowConfig`` and kicks
it off through ``orchestration.runner.build_workflow``, exactly like a society turn.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

DEFAULT_EXPECTED_OUTPUT = (
    "A direct, complete answer in plain prose. No preamble, no restatement of the question."
)


def _tool_root_default() -> Path:
    return Path(__file__).resolve().parents[1]


def load_agent_entry(
    *,
    agent_provider_id: str,
    catalog_path: Path,
) -> dict[str, Any]:
    """Resolve one catalog entry by id, or raise with the reason it is unavailable."""
    from orchestration.agent_providers_catalog import (
        deepcopy_agent_provider,
        load_agent_providers_catalog_merged,
    )

    wanted = str(agent_provider_id or "").strip()
    if not wanted:
        raise ValueError("agent_provider_id is required")
    entries = load_agent_providers_catalog_merged(catalog_path)
    for entry in entries:
        if str(entry.get("id", "")).strip() == wanted:
            return deepcopy_agent_provider(entry)
    raise LookupError(
        f"unknown agent_provider_id {wanted!r}; not in {catalog_path}. "
        "Add it to the catalog or an AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS overlay."
    )


def build_direct_task_description(*, goal: str, context: str = "") -> str:
    """Prompt for a single-shot answer: caller context first, then the question."""
    parts: list[str] = []
    ctx = str(context or "").strip()
    if ctx:
        cap = int(os.getenv("AGENTIC_DIRECT_AGENT_CONTEXT_CHARS", "20000"))
        cap = max(500, min(200000, cap))
        parts.append("## Provided context\n" + ctx[:cap])
    parts.append("## Question\n" + str(goal or "").strip())
    parts.append(
        "Answer using the provided context when it is relevant. "
        "Say what you do not know instead of inventing it. Do not plan, delegate, or ask "
        "clarifying questions — answer now."
    )
    return "\n\n".join(parts)


def build_direct_agent_config(
    *,
    agent_provider_id: str,
    goal: str,
    context: str = "",
    catalog_path: Path,
    mcp_provider_ids: list[str] | None = None,
    expected_output: str | None = None,
):
    """One-task ``WorkflowConfig`` for the direct path (no planner involved)."""
    from orchestration.config_loader import TaskDefinition, WorkflowConfig

    entry = load_agent_entry(agent_provider_id=agent_provider_id, catalog_path=catalog_path)
    pid = str(entry.get("id") or "").strip()
    step_id = f"direct-{pid}"
    return WorkflowConfig(
        name=f"direct-{pid}",
        process="sequential",
        topic=str(goal or "").strip(),
        instance_key=f"direct-{pid}",
        agent_providers=[entry],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id=step_id,
                agent_provider_id=pid,
                description=build_direct_task_description(goal=goal, context=context),
                expected_output=(expected_output or DEFAULT_EXPECTED_OUTPUT),
                mcp_providers=list(mcp_provider_ids or []),
                skills=[],
            )
        ],
        task_sequence=[step_id],
    )


def run_direct_agent(
    *,
    tool_root: Path | None = None,
    agent_provider_id: str,
    goal: str,
    context: str = "",
    session_slug: str | None = None,
    mcp_provider_ids: list[str] | None = None,
    user_id: str | None = None,
    quiet: bool = True,
    persist: bool = True,
) -> str:
    """Ask one catalog agent one question and return its answer text."""
    text = str(goal or "").strip()
    if not text:
        raise ValueError("goal is required")

    from orchestration.dynamic_run import catalog_paths
    from orchestration.output_artifacts import workflow_result_to_extractable_text
    from orchestration.runner import build_workflow, crew_kickoff_context
    from orchestration.text_normalize import sanitize_user_facing_prose

    root = tool_root or _tool_root_default()
    paths = catalog_paths(root)

    config = build_direct_agent_config(
        agent_provider_id=agent_provider_id,
        goal=text,
        context=context,
        catalog_path=paths.agent_providers,
        mcp_provider_ids=mcp_provider_ids,
    )
    built = build_workflow(
        config,
        crew_verbose=not quiet,
        quiet=quiet,
        emit_progress_lines=False,
        mcp_catalog_path=paths.mcp_providers,
    )
    with crew_kickoff_context(built):
        result = built.crew.kickoff(inputs={"topic": text})
    answer = sanitize_user_facing_prose(workflow_result_to_extractable_text(result))

    if persist and answer:
        _persist_direct_answer(
            tool_root=root,
            session_slug=session_slug,
            goal=text,
            answer=answer,
            provider_id=str(config.agent_providers[0].get("id") or ""),
            user_id=user_id,
        )
    return answer


def _persist_direct_answer(
    *,
    tool_root: Path,
    session_slug: str | None,
    goal: str,
    answer: str,
    provider_id: str,
    user_id: str | None,
) -> None:
    """Store the answer in the KB (best-effort; a direct call must never fail on this)."""
    try:
        from orchestration.knowledge_base import add_document

        add_document(
            tool_root=tool_root,
            session_slug=session_slug,
            user_goal=goal,
            content=answer,
            provider_id=provider_id,
            user_id=user_id,
        )
    except Exception:  # noqa: BLE001
        pass
