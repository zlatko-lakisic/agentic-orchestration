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


def _mcp_id_token(raw: Any) -> str | None:
    if raw is None:
        return None
    if isinstance(raw, str):
        text = raw.strip()
        return text or None
    if isinstance(raw, dict):
        for key in ("id", "ref", "name"):
            val = str(raw.get(key) or "").strip()
            if val:
                return val
    return str(raw).strip() or None


def _crew_step_trace_rows(config: Any) -> list[dict[str, Any]]:
    """Per-task agents + MCP/skills/RAG/harness for Admin Traces crew log."""
    from orchestration.config_loader import (
        raw_mcp_spec_for_task,
        raw_rag_spec_for_task,
        raw_skill_spec_for_task,
    )

    by_id: dict[str, dict[str, Any]] = {}
    for entry in getattr(config, "agent_providers", None) or []:
        if not isinstance(entry, dict):
            continue
        pid = str(entry.get("id") or "").strip()
        if pid:
            by_id[pid] = entry
    rows: list[dict[str, Any]] = []
    for task in list(getattr(config, "tasks", None) or [])[:24]:
        agent_id = str(getattr(task, "agent_provider_id", None) or "").strip()
        entry = by_id.get(agent_id) or {}
        harness = str(entry.get("harness_profile") or "").strip() or None
        mcps = [
            mid
            for mid in (_mcp_id_token(x) for x in raw_mcp_spec_for_task(task, config))
            if mid
        ]
        rows.append(
            {
                "id": getattr(task, "id", None),
                "agent_provider_id": agent_id or None,
                "mcps": mcps,
                "skills": raw_skill_spec_for_task(task, config),
                "rag": raw_rag_spec_for_task(task, config),
                "harness": harness,
            }
        )
    return rows


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
    run_id: str | None = None,
    exit_code: int | None = None,
    error: str | None = None,
    k8s_jobs: list[dict[str, Any]] | None = None,
    execution_backend: str | None = None,
) -> None:
    """Session excerpt + answer cache + KB document (best-effort, mirrors the CLI)."""
    from orchestration.orchestrator_session import (
        update_session_after_crew,
        update_session_after_final,
    )

    outcome = {
        "run_id": run_id,
        "exit_code": exit_code,
        "error": error,
        "k8s_jobs": k8s_jobs,
        "execution_backend": execution_backend,
    }
    update_session_after_crew(session_path, result_text, **outcome)
    update_session_after_final(
        session_path,
        user_goal=goal,
        result_text=result_text,
        **outcome,
    )
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
    run_id: str | None = None,
) -> str:
    """
    Plan and execute one dynamic goal in this process; return the final text.

    Raises ``RuntimeError`` when planning or execution fails so the caller can turn it
    into a protocol-level error frame.
    """
    from orchestration.backends.crewai import run_options_from_legacy
    from orchestration.backends.factory import execution_backend_name_from_env
    from orchestration.dynamic_planner import build_dynamic_workflow_config
    from orchestration.execution_dispatch import execute_workflow_config_resolved
    from orchestration.orchestrator_session import (
        resolve_orchestrator_session_slug,
        session_file_path,
    )
    from orchestration.run_store import resolve_run_id
    from orchestration.structured_logging import emit_log

    text = str(goal or "").strip()
    if not text:
        raise RuntimeError("Empty goal")

    root = tool_root or tool_root_default()
    paths = catalog_paths(root)
    slug = resolve_orchestrator_session_slug(str(session_slug or "").strip())
    session_path = session_file_path(root, slug, user_id=user_id)
    rid = resolve_run_id(run_id)
    backend_name = execution_backend_name_from_env()

    def progress(message: str) -> None:
        if on_progress is not None:
            on_progress(message)
        elif not quiet:
            print(f"(daemon) {message}", file=sys.stderr)

    emit_log("dynamic planning", run_id=rid, component="engine")
    progress("planning")
    from orchestration.run_trace import append_run_event
    from orchestration.agent_allowlist import resolve_allowed_agent_provider_ids
    from orchestration.session_overlay import get_current_overlay

    overlay = get_current_overlay()
    app_id = overlay.app_id if overlay else None
    overlay_allowed = overlay.allowed_agent_provider_ids if overlay else None
    overlay_mcp_allowed = overlay.allowed_mcp_provider_ids if overlay else None
    overlay_skill_allowed = overlay.allowed_skill_ids if overlay else None
    resolved_ids = resolve_allowed_agent_provider_ids(
        tool_root=root,
        app_id=app_id,
        request_ids=agent_provider_ids,
        overlay_ids=overlay_allowed,
    )

    # Engine WS already emits request_start; do not duplicate the boundary here.
    config, plan = build_dynamic_workflow_config(
        user_prompt=text,
        catalog_path=paths.agent_providers,
        allowed_agent_provider_ids=resolved_ids,
        allowed_mcp_provider_ids=overlay_mcp_allowed,
        allowed_skill_ids=overlay_skill_allowed,
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
    agents = []
    mcps: list[str] = []
    skills: list[str] = []
    if isinstance(plan, dict):
        for step in plan.get("steps") or []:
            if isinstance(step, dict) and step.get("agent_provider_id"):
                agents.append(str(step["agent_provider_id"]))
        mcps = [str(x) for x in (plan.get("mcp_provider_ids") or []) if x]
        skills = [str(x) for x in (plan.get("skill_ids") or []) if x]
    for t in config.tasks:
        if t.agent_provider_id and t.agent_provider_id not in agents:
            agents.append(t.agent_provider_id)
    crew_steps = _crew_step_trace_rows(config)
    append_run_event(
        root,
        rid,
        "plan",
        actor="planner",
        message=str(summary or f"{len(config.tasks)} step(s)").strip()[:200],
        detail={
            "dynamicPlanning": True,
            "agents": agents,
            "mcps": mcps,
            "skills": skills,
            "steps": len(config.tasks),
            "crewSteps": crew_steps,
        },
    )
    append_run_event(
        root,
        rid,
        "decision",
        actor="orchestrator",
        message=str(summary or f"{len(config.tasks)} step(s)").strip()[:200],
        detail={
            "dynamicPlanning": True,
            "reason": str(summary or "").strip() or None,
            "agents": agents,
            "mcps": mcps,
            "skills": skills,
            "steps": crew_steps,
        },
    )
    progress(f"executing {len(config.tasks)} step(s)")
    emit_log(
        f"dynamic executing {len(config.tasks)} step(s)",
        run_id=rid,
        component="engine",
    )

    options = run_options_from_legacy(
        quiet=quiet,
        emit_stdout_summary=False,
        crew_verbose=not quiet,
        mcp_catalog_path=paths.mcp_providers,
        agent_skills_catalog_path=paths.agent_skills,
        rag_sources_catalog_path=paths.rag_sources,
        emit_progress_lines=False,
        run_id=rid,
    )
    result = execute_workflow_config_resolved(config, options=options)
    last_task = config.tasks[-1] if config.tasks else None
    provider_id = last_task.agent_provider_id if last_task else "unknown"
    err_text = str(result.error) if result.error else None
    if result.exit_code != 0:
        emit_log(
            f"dynamic fail: {err_text or 'dynamic execution failed'}",
            level="error",
            run_id=rid,
            component="engine",
        )
        append_run_event(
            root,
            rid,
            "run_error",
            actor="orchestrator",
            message=(err_text or "failed")[:500],
            detail={"exit_code": int(result.exit_code)},
        )
        _record_dynamic_run_state(
            tool_root=root,
            session_path=session_path,
            session_slug=slug,
            goal=text,
            result_text=str(result.result_text or "").strip(),
            provider_id=provider_id,
            user_id=user_id,
            run_id=rid,
            exit_code=int(result.exit_code),
            error=err_text or "dynamic execution failed",
            k8s_jobs=list(result.k8s_jobs or []),
            execution_backend=backend_name,
        )
        raise RuntimeError(str(result.error or "dynamic execution failed"))

    result_text = str(result.result_text or "").strip()
    emit_log("dynamic done", run_id=rid, component="engine")
    append_run_event(
        root,
        rid,
        "run_end",
        actor="orchestrator",
        message="ok",
        detail={"exit_code": 0, "chars": len(result_text)},
    )
    _record_dynamic_run_state(
        tool_root=root,
        session_path=session_path,
        session_slug=slug,
        goal=text,
        result_text=result_text,
        provider_id=provider_id,
        user_id=user_id,
        run_id=rid,
        exit_code=int(result.exit_code),
        error=None,
        k8s_jobs=list(result.k8s_jobs or []),
        execution_backend=backend_name,
    )
    return result_text
