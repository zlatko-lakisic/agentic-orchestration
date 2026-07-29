"""
In-process single-pass dynamic run for the API daemon.

``main.py --dynamic`` stays the CLI entry point; this module is the same pipeline
(plan → execute → persist) without argparse, interactive prompts, attachment
manifests, or artifact saving, so a warm daemon can serve a chat turn without
spawning Python per message.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

DEFAULT_AGENT_PROVIDERS_CATALOG_REL = "config/agent_providers"
DEFAULT_MCP_PROVIDERS_CATALOG_REL = "config/mcp_providers"
DEFAULT_AGENT_SKILLS_CATALOG_REL = "config/agent_skills"
DEFAULT_RAG_SOURCES_CATALOG_REL = "config/rag_sources"


def tool_root_default() -> Path:
    return Path(__file__).resolve().parents[1]


def _resolve_catalog_path(raw: Path | str | None, *, tool_root: Path, default_rel: str) -> Path:
    candidate = Path(str(raw).strip()) if raw else Path(default_rel)
    if not candidate.is_absolute():
        candidate = tool_root / candidate
    return candidate.resolve()


@dataclass(frozen=True)
class CatalogPaths:
    agent_providers: Path
    mcp_providers: Path
    agent_skills: Path
    rag_sources: Path


def catalog_paths(tool_root: Path | None = None) -> CatalogPaths:
    """Catalog locations using the same env overrides as the CLI."""
    root = tool_root or tool_root_default()
    return CatalogPaths(
        agent_providers=_resolve_catalog_path(
            os.getenv("AGENTIC_AGENT_PROVIDERS_CATALOG", "").strip() or None,
            tool_root=root,
            default_rel=DEFAULT_AGENT_PROVIDERS_CATALOG_REL,
        ),
        mcp_providers=_resolve_catalog_path(
            os.getenv("AGENTIC_MCP_PROVIDERS_CATALOG", "").strip() or None,
            tool_root=root,
            default_rel=DEFAULT_MCP_PROVIDERS_CATALOG_REL,
        ),
        agent_skills=_resolve_catalog_path(
            os.getenv("AGENTIC_AGENT_SKILLS_CATALOG", "").strip() or None,
            tool_root=root,
            default_rel=DEFAULT_AGENT_SKILLS_CATALOG_REL,
        ),
        rag_sources=_resolve_catalog_path(
            os.getenv("AGENTIC_RAG_SOURCES_CATALOG", "").strip() or None,
            tool_root=root,
            default_rel=DEFAULT_RAG_SOURCES_CATALOG_REL,
        ),
    )


def warm_catalogs(tool_root: Path | None = None) -> dict[str, Any]:
    """
    Load the agent-provider catalog once at daemon startup.

    Returned counts feed ``/health``; a failure is reported rather than raised so the
    daemon still starts (and says why) on a host with a broken catalog overlay.
    """
    paths = catalog_paths(tool_root)
    out: dict[str, Any] = {"agentProvidersCatalog": str(paths.agent_providers)}
    try:
        from orchestration.agent_providers_catalog import load_agent_providers_catalog_merged

        entries = load_agent_providers_catalog_merged(paths.agent_providers)
        out["agentProviders"] = len(entries)
        out["ok"] = True
    except Exception as exc:  # noqa: BLE001
        out["agentProviders"] = 0
        out["ok"] = False
        out["error"] = str(exc)
    return out


def _record_dynamic_run_state(
    *,
    tool_root: Path,
    session_path: Path,
    session_slug: str,
    goal: str,
    result_text: str,
    provider_id: str,
    user_id: str | None,
) -> None:
    """Session excerpt + answer cache + KB document (best-effort, mirrors the CLI)."""
    from orchestration.orchestrator_session import (
        update_session_after_crew,
        update_session_after_final,
    )

    update_session_after_crew(session_path, result_text)
    update_session_after_final(session_path, user_goal=goal, result_text=result_text)
    try:
        from orchestration.knowledge_base import add_document

        add_document(
            tool_root=tool_root,
            session_slug=session_slug,
            user_goal=goal,
            content=result_text,
            provider_id=provider_id,
            user_id=user_id,
        )
    except Exception:  # noqa: BLE001
        pass


def run_dynamic_goal(
    *,
    tool_root: Path | None = None,
    goal: str,
    session_slug: str | None = None,
    quiet: bool = True,
    agent_provider_ids: list[str] | None = None,
    user_id: str | None = None,
    max_steps: int | None = None,
    on_progress: Callable[[str], None] | None = None,
) -> str:
    """
    Plan and execute one dynamic goal in this process; return the final text.

    Raises ``RuntimeError`` when planning or execution fails so the caller can turn it
    into a protocol-level error frame.
    """
    from orchestration.backends.crewai import run_options_from_legacy
    from orchestration.dynamic_planner import build_dynamic_workflow_config
    from orchestration.execution_dispatch import execute_workflow_config_resolved
    from orchestration.orchestrator_session import (
        resolve_orchestrator_session_slug,
        session_file_path,
    )

    text = str(goal or "").strip()
    if not text:
        raise RuntimeError("Empty goal")

    root = tool_root or tool_root_default()
    paths = catalog_paths(root)
    slug = resolve_orchestrator_session_slug(str(session_slug or "").strip())
    session_path = session_file_path(root, slug, user_id=user_id)

    def progress(message: str) -> None:
        if on_progress is not None:
            on_progress(message)
        elif not quiet:
            print(f"(daemon) {message}", file=sys.stderr)

    progress("planning")
    config, plan = build_dynamic_workflow_config(
        user_prompt=text,
        catalog_path=paths.agent_providers,
        allowed_agent_provider_ids=list(agent_provider_ids or []) or None,
        mcp_catalog_path=paths.mcp_providers,
        agent_skills_catalog_path=paths.agent_skills,
        rag_sources_catalog_path=paths.rag_sources,
        session_path=session_path,
        tool_root=root,
        max_steps=max_steps,
        quiet=quiet,
    )
    summary = plan.get("plan_summary") if isinstance(plan, dict) else None
    if isinstance(summary, str) and summary.strip():
        progress(f"plan: {summary.strip()}")
    progress(f"executing {len(config.tasks)} step(s)")

    options = run_options_from_legacy(
        quiet=quiet,
        emit_stdout_summary=False,
        crew_verbose=not quiet,
        mcp_catalog_path=paths.mcp_providers,
        agent_skills_catalog_path=paths.agent_skills,
        rag_sources_catalog_path=paths.rag_sources,
        emit_progress_lines=False,
    )
    result = execute_workflow_config_resolved(config, options=options)
    if result.exit_code != 0:
        raise RuntimeError(str(result.error or "dynamic execution failed"))

    result_text = str(result.result_text or "").strip()
    last_task = config.tasks[-1] if config.tasks else None
    _record_dynamic_run_state(
        tool_root=root,
        session_path=session_path,
        session_slug=slug,
        goal=text,
        result_text=result_text,
        provider_id=last_task.agent_provider_id if last_task else "unknown",
        user_id=user_id,
    )
    return result_text
