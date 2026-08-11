from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv()

from orchestration.attachments import (
    build_attachment_block,
    compose_goal_with_attachments,
    resolve_manifest_path,
)
from orchestration.catalog_loader import discover_workflow_catalog, get_catalog_entry_by_id
from orchestration.config_loader import WorkflowConfig, load_workflow_config
from orchestration.goal_format_hints import (
    apply_web_prose_goal_if_enabled,
    goal_requires_machine_readable_only,
    web_prose_deliverable_enabled,
    web_prose_synthesis_instructions,
)
from orchestration.dynamic_planner import (
    build_dynamic_workflow_config,
    emit_faithfulness_qa_report,
    evaluate_run_quality,
    iterative_controller_decision,
)
from orchestration.orchestrator_session import (
    load_session,
    resolve_orchestrator_session_slug,
    session_file_path,
    update_session_after_crew,
    update_session_after_final,
)
from orchestration.runner import BuiltWorkflow, build_workflow, crew_kickoff_context
from orchestration.backends.crewai import run_options_from_legacy
from orchestration.backends.base import WorkflowExecutionResult
from orchestration.backends.factory import execution_backend_from_env, execution_backend_name_from_env
from orchestration.execution_dispatch import execute_workflow_config_resolved
from orchestration.artifact_verify import verify_saved_npm_projects
from orchestration.output_artifacts import (
    extractable_text_from_execution,
    offer_save_extracted_files,
    offer_save_extracted_files_from_execution,
    workflow_result_display_text,
    workflow_result_to_extractable_text,
)
from orchestration.workflow_router import select_workflow_with_ollama

_DEFAULT_CONFIG_PATH = "config/workflows/workflow.yaml"
_DEFAULT_AGENT_PROVIDERS_CATALOG_REL = "config/agent_providers"
_DEFAULT_MCP_PROVIDERS_CATALOG = "config/mcp_providers"
_DEFAULT_AGENT_SKILLS_CATALOG = "config/agent_skills"
_DEFAULT_RAG_SOURCES_CATALOG = "config/rag_sources"


def _default_agent_providers_catalog_arg() -> str:
    """CLI default: env ``AGENTIC_AGENT_PROVIDERS_CATALOG`` overrides bundled full catalog."""
    v = os.getenv("AGENTIC_AGENT_PROVIDERS_CATALOG", "").strip()
    return v if v else _DEFAULT_AGENT_PROVIDERS_CATALOG_REL


def _verification_wanted(*, cli_no_verify: bool) -> bool:
    if cli_no_verify:
        return False
    v = os.getenv("AGENTIC_VERIFY", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def _run_post_save_verify(saved: Path | None, *, verify: bool) -> None:
    if saved is None or not verify:
        return
    verify_saved_npm_projects(saved)


def _config_option_explicit(argv: list[str]) -> bool:
    """True if the user passed --config on the CLI (not only the default)."""
    for tok in argv:
        if tok == "--config" or tok.startswith("--config="):
            return True
    return False


def _parse_dynamic_agent_provider_ids(raw: str | None) -> list[str]:
    if not raw:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for part in str(raw).split(","):
        pid = part.strip()
        if not pid or pid in seen:
            continue
        seen.add(pid)
        out.append(pid)
    return out


def _run_society_cli(
    args: argparse.Namespace,
    *,
    tool_root: Path,
    charter_arg: str,
    agent_providers_catalog_path: Path,
    mcp_catalog_path: Path,
) -> int:
    """Resolve --society arguments and hand off to the society runtime (K6.1–K6.2)."""
    from orchestration.society_runtime import run_society

    charter_path = Path(charter_arg).expanduser()
    if not charter_path.is_absolute():
        candidate = (tool_root / charter_path).resolve()
        charter_path = candidate if candidate.is_file() else (Path.cwd() / charter_path).resolve()
    if not charter_path.is_file():
        print(f"error: --society charter not found: {charter_path}", file=sys.stderr)
        return 2

    goal = str(getattr(args, "goal", None) or "").strip() or str(getattr(args, "task", None) or "").strip()
    session_slug = str(getattr(args, "society_session", None) or "").strip() or os.getenv(
        "AGENTIC_SOCIETY_SESSION", ""
    ).strip()

    return run_society(
        tool_root=tool_root,
        charter_path=charter_path,
        goal=goal,
        session_slug=session_slug or None,
        quiet=bool(args.quiet),
        agent_catalog_path=agent_providers_catalog_path,
        mcp_catalog_path=mcp_catalog_path,
        max_turns=getattr(args, "society_max_turns", None),
        use_controller=False if getattr(args, "society_no_controller", False) else None,
    )


def _load_dynamic_attachment_block(args: argparse.Namespace, tool_root: Path) -> str:
    raw = getattr(args, "dynamic_attachments", None)
    if not raw or not str(raw).strip():
        return ""
    mp = resolve_manifest_path(str(raw).strip(), tool_root=tool_root)
    if not mp.is_file():
        print(f"error: --dynamic-attachments manifest not found: {mp}", file=sys.stderr)
        sys.exit(2)
    try:
        return build_attachment_block(
            tool_root=tool_root,
            manifest_path=mp,
            user_goal_hint=str(getattr(args, "task", None) or "")[:12000],
        )
    except Exception as exc:  # noqa: BLE001
        print(f"error: invalid attachment manifest ({mp}): {exc}", file=sys.stderr)
        sys.exit(2)


def _dynamic_manifest_path(args: argparse.Namespace, tool_root: Path) -> Path | None:
    raw = getattr(args, "dynamic_attachments", None)
    if not raw or not str(raw).strip():
        return None
    mp = resolve_manifest_path(str(raw).strip(), tool_root=tool_root)
    return mp if mp.is_file() else None


def _goal_with_media_grounding(
    raw_task: str,
    attachment_block: str,
    *,
    manifest_path: Path | None,
    tool_root: Path,
    mcp_catalog_path: Path,
) -> tuple[str, Any, bool]:
    """
    Compose goal with attachments + harness media evidence.

    Returns ``(goal, bundle, gated)``. When ``gated`` is True, ``goal`` is the fixed gate string.
    """
    from orchestration.media_grounding import MEDIA_GATE_RESPONSE, prepare_media_grounding
    from orchestration.mcp_providers_catalog import load_mcp_providers_catalog_merged

    goal = apply_web_prose_goal_if_enabled(
        compose_goal_with_attachments(raw_task, attachment_block)
    )
    if manifest_path is None:
        return goal, None, False
    catalog = load_mcp_providers_catalog_merged(mcp_catalog_path)
    bundle = prepare_media_grounding(
        manifest_path=manifest_path,
        tool_root=tool_root,
        user_goal=goal,
        mcp_catalog=catalog,
    )
    if bundle is None:
        return goal, None, False
    if bundle.gate:
        return MEDIA_GATE_RESPONSE, bundle, True
    if bundle.markdown_block:
        goal = goal + "\n\n" + bundle.markdown_block
    return goal, bundle, False


def _maybe_direct_vision_answer(goal: str, media_bundle: Any) -> str | None:
    """Return a plain-text vision answer when the client forbids tools / wants PEOPLE lines."""
    from orchestration.media_grounding import synthesize_direct_vision_answer

    return synthesize_direct_vision_answer(goal, media_bundle)


def _finalize_dynamic_result_text(
    result_text: str | None,
    media_bundle: Any,
    *,
    user_goal: str = "",
) -> str | None:
    from orchestration.media_grounding import finalize_media_answer, synthesize_direct_vision_answer
    from orchestration.mcp_task_hints import looks_like_mcp_tool_call_leak

    text, _accepted = finalize_media_answer(result_text or "", media_bundle)
    if looks_like_mcp_tool_call_leak(text or "") or not (text or "").strip():
        direct = synthesize_direct_vision_answer(user_goal, media_bundle, force=True)
        if direct:
            return direct
    return text


def _is_quit_command(text: str) -> bool:
    t = text.strip().lower()
    return t in frozenset({"quit", "exit", "q", ":q"})


def execute_built_workflow(
    built: BuiltWorkflow,
    *,
    quiet: bool = False,
    emit_stdout_summary: bool = True,
    execution_error_sink: list[str] | None = None,
    log_terminal_execution_failure: bool = True,
    emit_progress_lines: bool = True,
) -> WorkflowExecutionResult:
    """Execute a pre-built crew via the configured execution backend."""
    backend = execution_backend_from_env()
    options = run_options_from_legacy(
        quiet=quiet,
        emit_stdout_summary=emit_stdout_summary,
        execution_error_sink=execution_error_sink,
        log_terminal_execution_failure=log_terminal_execution_failure,
        emit_progress_lines=emit_progress_lines,
        crew_verbose=bool(getattr(built.crew, "verbose", True)),
    )
    return backend.execute_built(built, options=options)


def run_built_workflow(
    built: BuiltWorkflow,
    *,
    quiet: bool = False,
    emit_stdout_summary: bool = True,
    execution_error_sink: list[str] | None = None,
    log_terminal_execution_failure: bool = True,
    emit_progress_lines: bool = True,
) -> tuple[int, str | None]:
    """Execute a pre-built crew; return ``(exit_code, result_text)``."""
    result = execute_built_workflow(
        built,
        quiet=quiet,
        emit_stdout_summary=emit_stdout_summary,
        execution_error_sink=execution_error_sink,
        log_terminal_execution_failure=log_terminal_execution_failure,
        emit_progress_lines=emit_progress_lines,
    )
    return result.exit_code, result.result_text


def _session_execution_backend() -> str:
    return execution_backend_name_from_env()


def _update_session_after_crew(path: Path, result_text: str | None) -> None:
    update_session_after_crew(
        path,
        result_text,
        execution_backend=_session_execution_backend(),
    )


def _update_session_after_final(
    path: Path,
    *,
    user_goal: str,
    result_text: str | None,
) -> None:
    update_session_after_final(
        path,
        user_goal=user_goal,
        result_text=result_text,
        execution_backend=_session_execution_backend(),
    )


def _emit_final_qa(
    *,
    tool_root: Path,
    session_slug: str | None,
    user_goal: str,
    output_text: str | None,
    legacy_faithfulness_fallback: bool = True,
) -> bool:
    """
    Post-run QA on a finished deliverable.

    The unified gate (assertions + judge score + faithfulness in one report) runs unless
    ``AGENTIC_IMPARTIAL_QA=0``. ``legacy_faithfulness_fallback`` keeps the standalone
    faithfulness block for the paths that printed it before the gate existed, so turning the
    gate off there restores the old output instead of dropping QA entirely.

    Returns True when the gate failed *and* ``AGENTIC_IMPARTIAL_QA_FAIL=1``.
    """
    from orchestration.impartial_qa import finalize_impartial_qa, impartial_qa_gate_failed

    report = finalize_impartial_qa(
        tool_root=tool_root,
        session_slug=session_slug,
        user_goal=user_goal,
        output_text=output_text,
    )
    needs_legacy = report is None or (report.faithfulness is None and not report.skipped)
    if legacy_faithfulness_fallback and needs_legacy:
        emit_faithfulness_qa_report(user_goal=user_goal, output_text=output_text, model=None)
    return impartial_qa_gate_failed(report)


def _offer_save_from_execution(
    *,
    tool_root: Path,
    user_task: str | None,
    execution: WorkflowExecutionResult,
    output_dir: Path | None,
    no_save: bool,
    prompt_save: bool = False,
) -> Path | None:
    return offer_save_extracted_files_from_execution(
        tool_root=tool_root,
        user_task=user_task,
        execution=execution,
        output_dir=output_dir,
        no_save=no_save,
        prompt_save=prompt_save,
    )


def _run_dynamic_workflow_with_hf_fallback(
    cfg: WorkflowConfig,
    *,
    agent_providers_catalog_path: Path,
    mcp_catalog_path: Path | None,
    agent_skills_catalog_path: Path | None,
    rag_sources_catalog_path: Path | None = None,
    crew_verbose: bool,
    quiet: bool,
    emit_stdout_summary: bool = True,
    emit_progress_lines: bool = True,
) -> tuple[int, str | None, WorkflowConfig]:
    """Run ``cfg`` once; on LiteLLM Hugging Face inference failure optionally rebuild and retry.

    Returns ``(exit_code, result_text, executed_cfg)`` where ``executed_cfg`` is the workflow
    actually run after any substitution (see ``AGENTIC_EXEC_FALLBACK_PROVIDER_ID``).
    """
    from orchestration.execution_fallback import workflow_config_after_hf_litellm_fallback

    executed = cfg
    sink: list[str] = []
    result = execute_workflow_from_config(
        executed,
        crew_verbose=crew_verbose,
        quiet=quiet,
        mcp_catalog_path=mcp_catalog_path,
        agent_skills_catalog_path=agent_skills_catalog_path,
        rag_sources_catalog_path=rag_sources_catalog_path,
        emit_stdout_summary=emit_stdout_summary,
        emit_progress_lines=emit_progress_lines,
        execution_error_sink=sink,
        log_terminal_execution_failure=False,
    )
    if result.exit_code == 0:
        return 0, result.result_text, executed
    err_text = sink[-1] if sink else str(result.error or "")
    if not err_text:
        return result.exit_code, result.result_text, executed
    fb = workflow_config_after_hf_litellm_fallback(
        executed,
        err_text,
        catalog_path=agent_providers_catalog_path,
        quiet=quiet,
    )
    if fb is None:
        return result.exit_code, result.result_text, executed
    if not quiet:
        print(
            "(dynamic) exec fallback: HF inference failed; retrying once with substituted "
            "provider(s) (YAML exec_fallback_provider → AGENTIC_EXEC_FALLBACK_PROVIDER_ID → "
            "default ollama_llava) …",
            file=sys.stderr,
        )
    result2 = execute_workflow_from_config(
        fb,
        crew_verbose=crew_verbose,
        quiet=quiet,
        mcp_catalog_path=mcp_catalog_path,
        agent_skills_catalog_path=agent_skills_catalog_path,
        rag_sources_catalog_path=rag_sources_catalog_path,
        emit_stdout_summary=emit_stdout_summary,
        emit_progress_lines=emit_progress_lines,
    )
    return result2.exit_code, result2.result_text, fb


def execute_workflow_from_config(
    config: WorkflowConfig,
    *,
    crew_verbose: bool = True,
    quiet: bool = False,
    mcp_catalog_path: Path | None = None,
    agent_skills_catalog_path: Path | None = None,
    rag_sources_catalog_path: Path | None = None,
    emit_stdout_summary: bool = True,
    emit_progress_lines: bool = True,
    execution_error_sink: list[str] | None = None,
    log_terminal_execution_failure: bool = True,
) -> WorkflowExecutionResult:
    """Execute a ``WorkflowConfig`` through the configured backend (F3/F4 entry)."""
    options = run_options_from_legacy(
        quiet=quiet,
        emit_stdout_summary=emit_stdout_summary,
        execution_error_sink=execution_error_sink,
        log_terminal_execution_failure=log_terminal_execution_failure,
        crew_verbose=crew_verbose,
        mcp_catalog_path=mcp_catalog_path,
        agent_skills_catalog_path=agent_skills_catalog_path,
        rag_sources_catalog_path=rag_sources_catalog_path,
        emit_progress_lines=emit_progress_lines,
    )
    return execute_workflow_config_resolved(config, options=options)


def run_workflow(
    config_path: Path,
    *,
    topic_override: str | None = None,
    quiet: bool = False,
    mcp_catalog_path: Path | None = None,
    agent_skills_catalog_path: Path | None = None,
    rag_sources_catalog_path: Path | None = None,
) -> tuple[int, str | None]:
    """Load workflow YAML, run crew; return (exit code, final output text if any)."""
    result = run_workflow_execution(
        config_path,
        topic_override=topic_override,
        quiet=quiet,
        mcp_catalog_path=mcp_catalog_path,
        agent_skills_catalog_path=agent_skills_catalog_path,
        rag_sources_catalog_path=rag_sources_catalog_path,
    )
    return result.exit_code, result.result_text


def run_workflow_execution(
    config_path: Path,
    *,
    topic_override: str | None = None,
    quiet: bool = False,
    mcp_catalog_path: Path | None = None,
    agent_skills_catalog_path: Path | None = None,
    rag_sources_catalog_path: Path | None = None,
) -> WorkflowExecutionResult:
    """Load workflow YAML and return the backend execution result (F3 post-run adapter entry)."""
    config = load_workflow_config(config_path, topic_override=topic_override)
    return execute_workflow_from_config(
        config,
        crew_verbose=not quiet,
        quiet=quiet,
        mcp_catalog_path=mcp_catalog_path,
        agent_skills_catalog_path=agent_skills_catalog_path,
        rag_sources_catalog_path=rag_sources_catalog_path,
    )


def run_interactive_router(
    *,
    tool_root: Path,
    config_dir: Path,
    router_host: str,
    router_model: str,
    output_dir: Path | None,
    no_save: bool,
    prompt_save: bool,
    verify_saved: bool,
    quiet: bool = False,
    mcp_catalog_path: Path | None = None,
    agent_skills_catalog_path: Path | None = None,
    rag_sources_catalog_path: Path | None = None,
) -> None:
    """Prompt for tasks until quit; Ollama router picks a catalog workflow each time."""
    entries = discover_workflow_catalog(config_dir)
    if not entries:
        print(
            f"No routable workflows in {config_dir / 'workflows'} "
            "(need meta + workflow in each yaml).",
            file=sys.stderr,
        )
        return

    print(
        "Interactive mode: type a task and press Enter. "
        "The router picks a workflow from the catalog each time. "
        "Quit with: quit, exit, q, or Ctrl+Z then Enter (Windows) / Ctrl+D (Unix).",
        file=sys.stderr,
    )

    while True:
        try:
            line = input("task> ")
        except EOFError:
            print("\nExiting.", file=sys.stderr)
            break

        task = line.strip()
        if not task:
            continue
        if _is_quit_command(task):
            print("Exiting.", file=sys.stderr)
            break

        try:
            chosen_id, router_reason = select_workflow_with_ollama(
                user_task=task,
                entries=entries,
                ollama_host=router_host,
                model=router_model,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"(router) failed: {exc}", file=sys.stderr)
            continue

        if router_reason and not quiet:
            print(f"(router) reason: {router_reason}", file=sys.stderr)
        entry = get_catalog_entry_by_id(entries, chosen_id)
        if entry is None:
            print(
                f"(router) internal error: missing catalog entry for {chosen_id!r}",
                file=sys.stderr,
            )
            continue
        if not quiet:
            print(
                f"(router) workflow={entry.id!r} file={entry.path}",
                file=sys.stderr,
            )
        exit_code, result_text = run_workflow(
            entry.path, topic_override=task, quiet=quiet
        )
        if exit_code == 0 and result_text:
            saved = offer_save_extracted_files(
                tool_root=tool_root,
                user_task=task,
                result_text=result_text,
                output_dir=output_dir,
                no_save=no_save,
                prompt_save=prompt_save,
            )
            _run_post_save_verify(saved, verify=verify_saved)


def run_interactive_fixed_config(
    *,
    tool_root: Path,
    config_path: Path,
    output_dir: Path | None,
    no_save: bool,
    prompt_save: bool,
    verify_saved: bool,
    quiet: bool = False,
    mcp_catalog_path: Path | None = None,
    agent_skills_catalog_path: Path | None = None,
    rag_sources_catalog_path: Path | None = None,
) -> None:
    """Prompt for topics until quit; always runs the same workflow file."""
    if not config_path.exists():
        print(f"Config not found: {config_path}", file=sys.stderr)
        return

    print(
        f"Interactive mode (fixed workflow): {config_path}\n"
        "Type each task/topic and press Enter. "
        "Quit with: quit, exit, q, or Ctrl+Z then Enter / Ctrl+D.",
        file=sys.stderr,
    )

    while True:
        try:
            line = input("task> ")
        except EOFError:
            print("\nExiting.", file=sys.stderr)
            break

        task = line.strip()
        if not task:
            continue
        if _is_quit_command(task):
            print("Exiting.", file=sys.stderr)
            break

        exit_code, result_text = run_workflow(
            config_path,
            topic_override=task,
            quiet=quiet,
            mcp_catalog_path=mcp_catalog_path,
        agent_skills_catalog_path=agent_skills_catalog_path,
        rag_sources_catalog_path=rag_sources_catalog_path,
        )
        if exit_code == 0 and result_text:
            saved = offer_save_extracted_files(
                tool_root=tool_root,
                user_task=task,
                result_text=result_text,
                output_dir=output_dir,
                no_save=no_save,
                prompt_save=prompt_save,
            )
            _run_post_save_verify(saved, verify=verify_saved)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a YAML-driven CrewAI workflow. "
            "With no TASK, runs interactively: keep entering prompts until you quit. "
            "Pass TASK for a single router-selected run, or use --batch for a one-shot fixed YAML."
        )
    )
    parser.add_argument(
        "task",
        nargs="?",
        default=None,
        metavar="TASK",
        help=(
            "Natural-language task for a single run: Ollama picks a workflow from the catalog; "
            "this becomes the workflow topic."
        ),
    )
    parser.add_argument(
        "--batch",
        action="store_true",
        help=(
            "Run once and exit when TASK is omitted (uses --config). "
            "Default without TASK is interactive (router) mode."
        ),
    )
    parser.add_argument(
        "--config",
        default=_DEFAULT_CONFIG_PATH,
        help=(
            f"Workflow YAML (default {_DEFAULT_CONFIG_PATH!r}). "
            "Without TASK: one-shot if you pass --config explicitly on the CLI; "
            "use -i --config FILE for an interactive loop on that file."
        ),
    )
    parser.add_argument(
        "--config-dir",
        default="config",
        help=(
            "Config root; routable workflows are read from <config-dir>/workflows/*.yaml "
            "(router mode). Each file needs top-level 'meta' + 'workflow' to be routable."
        ),
    )
    parser.add_argument(
        "--router-model",
        default=os.getenv("ROUTER_OLLAMA_MODEL", "llama3.2").strip(),
        help="Ollama model id for routing (default env ROUTER_OLLAMA_MODEL or llama3.2).",
    )
    parser.add_argument(
        "--router-host",
        default=os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434").strip(),
        help="Ollama base URL for routing (default env OLLAMA_HOST).",
    )
    parser.add_argument(
        "-i",
        "--interactive",
        dest="interactive",
        action="store_true",
        help=(
            "Interactive loop on a fixed workflow: use together with an explicit --config FILE "
            "(same prompt as router mode; quit with quit / exit / q)."
        ),
    )
    parser.add_argument(
        "--example",
        choices=("healthcare", "logistics", "society_research_panel"),
        default=None,
        metavar="NAME",
        help=(
            "Load a built-in vertical under <repo>/examples/verticals/<NAME>/ for this process: "
            "orchestrator context file + extra agent-provider and MCP YAML dirs. "
            "No copying paths into .env. Optional MCPs stay off unless you set their env gates."
        ),
    )
    parser.add_argument(
        "--output-dir",
        default=None,
        metavar="DIR",
        help=(
            "Save files parsed from markdown output here after each successful run, without "
            "prompting. Relative paths use the current working directory."
        ),
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Do not prompt or save extracted files under __output__ (or --output-dir).",
    )
    parser.add_argument(
        "--prompt-save",
        action="store_true",
        help=(
            "After a run, ask where to save extracted files instead of writing to __output__ "
            "automatically."
        ),
    )
    parser.add_argument(
        "--no-verify",
        action="store_true",
        help=(
            "After saving extracted files, skip npm install/test/build under the saved tree. "
            "Verification is on by default unless AGENTIC_VERIFY=0 (or false/no/off)."
        ),
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help=(
            "Less console noise: CrewAI verbose off, no workflow banner, final output only on "
            "stdout; with --dynamic, skip plan/step progress on stderr (errors still print)."
        ),
    )
    parser.add_argument(
        "--dynamic",
        action="store_true",
        help=(
            "Plan and run a one-off workflow: TASK is the user goal; GPT (AGENTIC_PLANNER_MODEL / "
            "OPENAI_*) devises steps and picks agent providers from --agent-providers-catalog, "
            "then runs them in order. Requires TASK."
        ),
    )
    parser.add_argument(
        "--dynamic-iterative",
        action="store_true",
        help=(
            "Iterative dynamic mode: plan and execute one step at a time, re-planning between "
            "steps using the same orchestrator session. This allows mid-run adaptation "
            "(adding/swapping agents, changing MCPs, etc.). Requires TASK."
        ),
    )
    parser.add_argument(
        "--dynamic-iterative-rounds",
        default=int(os.getenv("AGENTIC_DYNAMIC_ITERATIVE_ROUNDS", "4")),
        type=int,
        metavar="N",
        help=(
            "With --dynamic-iterative: maximum number of stepwise rounds to run before the "
            "final synthesis step (default env AGENTIC_DYNAMIC_ITERATIVE_ROUNDS or 4)."
        ),
    )
    parser.add_argument(
        "--dynamic-iterative-auto",
        action="store_true",
        help=(
            "With --dynamic-iterative: automatically stop early or continue as needed (up to "
            "--dynamic-iterative-max-rounds) by using a small controller model after each round."
        ),
    )
    parser.add_argument(
        "--dynamic-iterative-max-rounds",
        default=int(os.getenv("AGENTIC_DYNAMIC_ITERATIVE_MAX_ROUNDS", "8")),
        type=int,
        metavar="N",
        help=(
            "With --dynamic-iterative-auto: hard cap on rounds (default env "
            "AGENTIC_DYNAMIC_ITERATIVE_MAX_ROUNDS or 8)."
        ),
    )
    parser.add_argument(
        "--dynamic-iterative-min-rounds",
        default=int(os.getenv("AGENTIC_DYNAMIC_ITERATIVE_MIN_ROUNDS", "1")),
        type=int,
        metavar="N",
        help=(
            "With --dynamic-iterative-auto: minimum rounds to run before the controller may stop "
            "(default env AGENTIC_DYNAMIC_ITERATIVE_MIN_ROUNDS or 1)."
        ),
    )
    parser.add_argument(
        "--society",
        default=None,
        metavar="CHARTER.yaml",
        help=(
            "Run an agent society from a charter YAML (see config/schemas/society_charter.schema.json): "
            "members take turns on a threaded message bus until a stop condition, the society "
            "controller, or --society-max-turns ends the run. Goal comes from --goal or TASK. "
            "Mutually exclusive with --dynamic / --dynamic-iterative."
        ),
    )
    parser.add_argument(
        "--goal",
        default=None,
        metavar="TEXT",
        help=(
            "Goal for --society (alternative to the TASK positional). Falls back to "
            "society.goal in the charter when both are omitted."
        ),
    )
    parser.add_argument(
        "--society-session",
        default=None,
        metavar="NAME",
        help=(
            "With --society: session directory name under "
            "__orchestrator_sessions__/societies/ (default: the charter's society id). "
            "Also settable via AGENTIC_SOCIETY_SESSION."
        ),
    )
    parser.add_argument(
        "--society-max-turns",
        default=None,
        type=int,
        metavar="N",
        help=(
            "With --society: lower the charter's max_turns for this run (never raises it)."
        ),
    )
    parser.add_argument(
        "--society-no-controller",
        action="store_true",
        help=(
            "With --society: skip the controller LLM between rounds and stop only on "
            "stop_when phrases or the turn budget (same as AGENTIC_SOCIETY_CONTROLLER=0)."
        ),
    )
    parser.add_argument(
        "--dynamic-iterative-no-synthesize",
        action="store_true",
        help=(
            "With --dynamic-iterative: skip the final synthesis step. Useful if you want to "
            "inspect intermediate outputs and synthesize manually."
        ),
    )
    parser.add_argument(
        "--agent-providers-catalog",
        "--providers-catalog",
        default=_default_agent_providers_catalog_arg(),
        metavar="PATH",
        dest="agent_providers_catalog",
        help=(
            "Directory of one YAML file per agent provider, or a legacy bundle YAML with top-level "
            "'agent_providers' (or 'providers') list. Default: env AGENTIC_AGENT_PROVIDERS_CATALOG if set, "
            f"else {_DEFAULT_AGENT_PROVIDERS_CATALOG_REL!r}. "
            f"Merge extra directories via env AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS ({os.pathsep}-separated). "
            "--providers-catalog is a deprecated alias."
        ),
    )
    parser.add_argument(
        "--dynamic-agent-provider-ids",
        default="",
        metavar="ID1,ID2,...",
        help=(
            "With --dynamic or --dynamic-iterative: restrict planner choices to these "
            "agent provider IDs from the catalog. Comma-separated. If empty, planner can "
            "choose automatically from all available providers."
        ),
    )
    parser.add_argument(
        "--dynamic-attachments",
        default=None,
        metavar="MANIFEST.JSON",
        help=(
            "With --dynamic or --dynamic-iterative: JSON manifest of user files (path, name, mime, size). "
            "The orchestrator infers file kinds and appends routing context for the planner. "
            "Paths must be under <tool>/_web_uploads/ unless AGENTIC_ATTACHMENTS_ALLOW_ABSOLUTE=1."
        ),
    )
    parser.add_argument(
        "--mcp-providers-catalog",
        default=_DEFAULT_MCP_PROVIDERS_CATALOG,
        metavar="PATH",
        help=(
            f"Directory of one YAML per MCP provider: CrewAI ``mcps`` via ref/refs (URL strings), "
            f"streamable_http (url + headers), or stdio (command + args + optional env). "
            f"Or a bundle YAML with 'mcp_providers'. "
            f"Default {_DEFAULT_MCP_PROVIDERS_CATALOG!r}; missing path loads no MCP catalog entries. "
            f"Also merges directories in AGENTIC_EXTRA_MCP_PROVIDERS_PATH ({os.pathsep}-separated)."
        ),
    )
    parser.add_argument(
        "--agent-skills-catalog",
        default=_DEFAULT_AGENT_SKILLS_CATALOG,
        metavar="PATH",
        help=(
            f"Directory of one YAML per agent skill (procedural instructions injected into tasks). "
            f"Or a bundle YAML with 'agent_skills'. "
            f"Default {_DEFAULT_AGENT_SKILLS_CATALOG!r}; missing path loads no skill catalog entries. "
            f"Also merges directories in AGENTIC_EXTRA_AGENT_SKILLS_PATH ({os.pathsep}-separated)."
        ),
    )
    parser.add_argument(
        "--rag-sources-catalog",
        default=_DEFAULT_RAG_SOURCES_CATALOG,
        metavar="PATH",
        help=(
            f"Directory of one YAML per RAG source (sqlite-fts / embedding / hybrid). "
            f"Or a bundle YAML with 'rag_sources'. "
            f"Default {_DEFAULT_RAG_SOURCES_CATALOG!r}; missing path loads no RAG catalog entries. "
            f"Also merges directories in AGENTIC_EXTRA_RAG_SOURCES_PATH ({os.pathsep}-separated)."
        ),
    )
    parser.add_argument(
        "--orchestrator-session",
        default=None,
        metavar="NAME",
        help=(
            "With --dynamic: use this session id for planner history + crew excerpt files "
            "under __orchestrator_sessions__/ (default when unset: see "
            "AGENTIC_ORCHESTRATOR_DEFAULT_SESSION). "
            "Override naming with env AGENTIC_ORCHESTRATOR_SESSION."
        ),
    )
    parser.add_argument(
        "--planner-greet",
        action="store_true",
        help="Call the planner LLM for a short web-chat greeting on stdout and exit.",
    )
    parser.add_argument(
        "--execute-step",
        default=None,
        metavar="SPEC.JSON",
        help="Worker mode: run one step from a StepSpec JSON file and exit (subprocess/K8s workers).",
    )
    parser.add_argument(
        "--warm-pool-worker",
        action="store_true",
        help="K8s warm pool mode: poll run-store queue and execute steps until terminated.",
    )
    parser.add_argument(
        "--delegation-broker",
        action="store_true",
        help="K8s delegation broker (K5.5): spawn child Jobs for worker delegation requests.",
    )
    parser.add_argument(
        "--orchestrator-session-reset",
        action="store_true",
        help="With --dynamic: delete the resolved session JSON before this run "
        "(explicit name, env, or default slug).",
    )
    parser.add_argument(
        "--harness-dir",
        action="append",
        default=None,
        metavar="PATH",
        help=(
            "User harness pack root(s); each subdir with harness.yaml is one pack. "
            "Also merges AGENTIC_EXTRA_AGENT_HARNESS_DIRS. Use with --harness-agent or --user-harness-run-all."
        ),
    )
    parser.add_argument(
        "--user-harness-run-all",
        action="store_true",
        help="Run all user harness scenarios under --harness-dir / AGENTIC_EXTRA_AGENT_HARNESS_DIRS.",
    )
    parser.add_argument(
        "--harness-agent",
        default=None,
        metavar="ID",
        help="Run harness for one catalog agent_provider_id and exit (platform or user pack).",
    )
    parser.add_argument(
        "--harness-batch",
        action="store_true",
        help="Run platform agent harness for all (or filtered) catalog agents and exit.",
    )
    parser.add_argument(
        "--harness-tier",
        default=os.getenv("AGENTIC_HARNESS_TIER", "static"),
        choices=("static", "connectivity", "smoke", "capability", "l0", "l1", "l2", "l3"),
        help=(
            "Harness tier: static (L0), connectivity (L1), smoke (L2), capability (L3). "
            "Default env AGENTIC_HARNESS_TIER or static."
        ),
    )
    parser.add_argument(
        "--harness-filter",
        default=None,
        metavar="GLOB",
        help="With --harness-batch: fnmatch glob on agent provider ids (e.g. gpt_*).",
    )
    parser.add_argument(
        "--harness-max-agents",
        default=None,
        type=int,
        metavar="N",
        help="With --harness-batch: cap number of agents to probe.",
    )
    parser.add_argument(
        "--harness-profile",
        default=None,
        metavar="PROFILE",
        help="Force harness profile (general, research, write, reason, coding, vision).",
    )
    parser.add_argument(
        "--harness-backend",
        default=None,
        metavar="NAME",
        help="Execution backend for smoke/capability tiers (inprocess or subprocess).",
    )
    parser.add_argument(
        "--harness-json",
        action="store_true",
        help="Emit harness batch report as JSON on stdout.",
    )
    parser.add_argument(
        "--harness-fail-fast",
        action="store_true",
        help="Stop harness batch on first failure.",
    )
    parser.add_argument(
        "--harness-verbose",
        action="store_true",
        help="Verbose harness smoke runs (CrewAI verbose).",
    )
    return parser.parse_args()


def _cli_output_dir(raw: str | None) -> Path | None:
    if not raw or not str(raw).strip():
        return None
    return Path(str(raw).strip()).expanduser().resolve()


def main() -> None:
    args = parse_args()
    tool_root = Path(__file__).resolve().parent

    try:
        from orchestration.edge_platform import apply_edge_platform_env_defaults
        from orchestration.ollama_runtime import (
            apply_ollama_runtime_env_defaults,
            format_ollama_runtime_log_line,
        )

        apply_edge_platform_env_defaults()
        apply_ollama_runtime_env_defaults()
        try:
            from orchestration.ollama_ownership import MODE_MANAGED_PROCESS, resolve_ollama_mode
            from orchestration.ollama_serve_lifecycle import ensure_shutdown_hooks

            # Install atexit/signal teardown early when AO owns a child ollama serve.
            if resolve_ollama_mode() == MODE_MANAGED_PROCESS:
                ensure_shutdown_hooks()
        except Exception:  # noqa: BLE001
            pass
        if os.getenv("AGENTIC_EDGE_PLATFORM_LOG", "1").strip().lower() not in (
            "0",
            "false",
            "no",
            "off",
        ):
            print(format_ollama_runtime_log_line(), file=sys.stderr)
    except Exception:  # noqa: BLE001
        pass

    # Skip auto-install for long-running k8s helpers (images ship deps already).
    _skip_runtime_bootstrap = bool(
        getattr(args, "warm_pool_worker", False)
        or getattr(args, "delegation_broker", False)
    )
    if not _skip_runtime_bootstrap:
        # Auto-install Python/.venv deps and planner Ollama model when configured.
        # Per-agent Ollama ensure also runs in OllamaProvider.initialize().
        try:
            from orchestration.runtime_bootstrap import bootstrap_tool_runtime

            bootstrap_tool_runtime(tool_root=tool_root)
        except Exception as exc:  # noqa: BLE001
            print(f"error: runtime bootstrap failed: {exc}", file=sys.stderr)
            sys.exit(2)

    if getattr(args, "planner_greet", False):
        from orchestration.planner_greeting import run_planner_greeting_cli

        sys.exit(run_planner_greeting_cli(tool_root=tool_root, quiet=bool(args.quiet)))

    if getattr(args, "warm_pool_worker", False):
        from orchestration.backends.kubernetes_warm_pool import run_warm_pool_worker_loop
        from orchestration.run_store import run_store_base_from_env

        mount = run_store_base_from_env()
        if not mount:
            print(
                "error: AGENTIC_RUN_STORE_PATH required for --warm-pool-worker",
                file=sys.stderr,
            )
            sys.exit(2)
        run_warm_pool_worker_loop(run_store_mount=str(mount))
        sys.exit(0)

    if getattr(args, "delegation_broker", False):
        from orchestration.backends.kubernetes_delegation import run_delegation_broker_loop
        from orchestration.run_store import run_store_base_from_env

        mount = run_store_base_from_env()
        if not mount:
            print(
                "error: AGENTIC_RUN_STORE_PATH required for --delegation-broker",
                file=sys.stderr,
            )
            sys.exit(2)
        run_delegation_broker_loop(run_store_mount=str(mount))
        sys.exit(0)

    if getattr(args, "execute_step", None):
        from orchestration.execute_step import execute_step_from_spec_file

        spec = Path(str(args.execute_step).strip())
        if not spec.is_file():
            print(f"error: --execute-step file not found: {spec}", file=sys.stderr)
            sys.exit(2)
        sys.exit(execute_step_from_spec_file(spec.resolve()))

    if getattr(args, "example", None):
        from orchestration.example_overlays import apply_example_overlay_env

        apply_example_overlay_env(tool_root, str(args.example))

    if (
        getattr(args, "harness_agent", None)
        or getattr(args, "harness_batch", False)
        or getattr(args, "harness_dir", None)
        or getattr(args, "user_harness_run_all", False)
    ):
        from orchestration.agent_harness import run_harness_cli

        sys.exit(run_harness_cli(args, tool_root))

    config_dir = (
        (tool_root / args.config_dir).resolve()
        if not Path(args.config_dir).is_absolute()
        else Path(args.config_dir)
    )
    config_path = (
        (tool_root / args.config).resolve()
        if not Path(args.config).is_absolute()
        else Path(args.config)
    )
    save_output_dir = _cli_output_dir(args.output_dir)
    no_save = bool(args.no_save)
    prompt_save = bool(args.prompt_save)
    verify_saved = _verification_wanted(cli_no_verify=bool(args.no_verify))

    agent_providers_catalog_path = (
        (tool_root / args.agent_providers_catalog).resolve()
        if not Path(args.agent_providers_catalog).is_absolute()
        else Path(args.agent_providers_catalog)
    )
    mcp_catalog_path = (
        (tool_root / args.mcp_providers_catalog).resolve()
        if not Path(args.mcp_providers_catalog).is_absolute()
        else Path(args.mcp_providers_catalog)
    )
    agent_skills_catalog_path = (
        (tool_root / args.agent_skills_catalog).resolve()
        if not Path(args.agent_skills_catalog).is_absolute()
        else Path(args.agent_skills_catalog)
    )
    rag_sources_catalog_path = (
        (tool_root / args.rag_sources_catalog).resolve()
        if not Path(args.rag_sources_catalog).is_absolute()
        else Path(args.rag_sources_catalog)
    )
    selected_dynamic_provider_ids = _parse_dynamic_agent_provider_ids(
        str(getattr(args, "dynamic_agent_provider_ids", "") or "")
    )

    if args.dynamic and args.dynamic_iterative:
        print("error: choose only one of --dynamic or --dynamic-iterative", file=sys.stderr)
        sys.exit(2)

    society_charter_arg = str(getattr(args, "society", None) or "").strip()
    if society_charter_arg:
        if args.dynamic or args.dynamic_iterative:
            print(
                "error: choose only one of --society, --dynamic, or --dynamic-iterative",
                file=sys.stderr,
            )
            sys.exit(2)
        sys.exit(
            _run_society_cli(
                args,
                tool_root=tool_root,
                charter_arg=society_charter_arg,
                agent_providers_catalog_path=agent_providers_catalog_path,
                mcp_catalog_path=mcp_catalog_path,
            )
        )

    if args.dynamic_iterative:
        has_manifest = bool(
            getattr(args, "dynamic_attachments", None)
            and str(args.dynamic_attachments).strip()
        )
        if (not args.task or not str(args.task).strip()) and not has_manifest:
            print(
                "error: --dynamic-iterative requires TASK (your goal), e.g. "
                'python main.py --dynamic-iterative "Explain mirrord and how to get started" '
                "(or supply --dynamic-attachments with a manifest and an optional TASK).",
                file=sys.stderr,
            )
            sys.exit(2)

        def _norm(s: str) -> str:
            return " ".join(str(s or "").strip().lower().split())

        def _is_negative(s: str) -> bool:
            return _norm(s) in ("no", "nope", "nah", "rerun", "re-run", "reprocess", "run again")

        def _cache_enabled() -> bool:
            return os.getenv("AGENTIC_ANSWER_CACHE", "1").strip().lower() not in (
                "0",
                "false",
                "no",
                "off",
            )

        attachment_block = _load_dynamic_attachment_block(args, tool_root)
        dynamic_manifest = _dynamic_manifest_path(args, tool_root)
        media_grounding_bundle = None

        def compose_goal(g: str) -> str:
            return apply_web_prose_goal_if_enabled(
                compose_goal_with_attachments(g, attachment_block)
            )

        raw_task = str(args.task or "").strip()
        if not raw_task:
            raw_task = (
                "Use the attached files as the primary inputs. Summarize, extract insights, "
                "and answer any implied questions."
            )

        logical_goal = raw_task
        explicit_session = (args.orchestrator_session or "").strip() or os.getenv(
            "AGENTIC_ORCHESTRATOR_SESSION", ""
        ).strip()
        try:
            slug = resolve_orchestrator_session_slug(explicit_session)
        except ValueError as exc:
            print(f"(dynamic) invalid session name: {exc}", file=sys.stderr)
            sys.exit(2)
        orchestrator_session_path = session_file_path(tool_root, slug)
        if args.orchestrator_session_reset and orchestrator_session_path.exists():
            orchestrator_session_path.unlink()
            if not args.quiet:
                label = explicit_session if explicit_session else slug
                print(
                    f"(dynamic) reset orchestrator session {label!r} -> {orchestrator_session_path}",
                    file=sys.stderr,
                )

        # Answer cache: if the user repeats the same goal, return cached final answer and ask for confirmation.
        if _cache_enabled() and orchestrator_session_path.exists() and not args.orchestrator_session_reset:
            sess0 = load_session(orchestrator_session_path)
            # If user says "no" after a cached answer, rerun the pending goal.
            if sess0.pending_reprocess_goal and _is_negative(str(args.task or "").strip()):
                raw_task = str(sess0.pending_reprocess_goal).strip()
                logical_goal = raw_task
                sess0.pending_reprocess_goal = None
                from orchestration.orchestrator_session import save_session

                save_session(orchestrator_session_path, sess0)
            elif sess0.last_user_goal and sess0.last_final_answer_excerpt:
                cache_goal = compose_goal(raw_task)
                if _norm(sess0.last_user_goal) == _norm(cache_goal):
                    # Mark pending so a follow-up "no" can trigger a re-run of the same goal.
                    sess0.pending_reprocess_goal = raw_task
                    from orchestration.orchestrator_session import save_session

                    save_session(orchestrator_session_path, sess0)
                    print(sess0.last_final_answer_excerpt.strip())
                    print("\n\nIs this the answer you wanted? Reply `no` to re-run.", file=sys.stdout)
                    return

        cache_goal, media_grounding_bundle, media_gated = _goal_with_media_grounding(
            raw_task,
            attachment_block,
            manifest_path=dynamic_manifest,
            tool_root=tool_root,
            mcp_catalog_path=mcp_catalog_path,
        )
        if media_gated:
            print(cache_goal)
            return
        direct_vision = _maybe_direct_vision_answer(cache_goal, media_grounding_bundle)
        if direct_vision:
            if not args.quiet:
                print("(dynamic) direct vision completion (no agent tool loop)", file=sys.stderr)
            print(direct_vision)
            return

        manual_rounds = max(1, int(args.dynamic_iterative_rounds))
        max_rounds = manual_rounds
        if args.dynamic_iterative_auto:
            max_rounds = max(1, int(args.dynamic_iterative_max_rounds))
        min_rounds = max(1, int(args.dynamic_iterative_min_rounds))

        stream_iter_steps = os.getenv("AGENTIC_DYNAMIC_ITER_STREAM_STEPS", "").strip().lower() in (
            "1",
            "true",
            "yes",
            "on",
        )
        last_iter_crew_text: str | None = None

        for r in range(1, max_rounds + 1):
            if not args.quiet:
                label = f"{r}/{max_rounds}" if args.dynamic_iterative_auto else f"{r}/{manual_rounds}"
                print(f"(dynamic-iter) round {label}", file=sys.stderr)
            try:
                dyn_cfg, plan = build_dynamic_workflow_config(
                    user_prompt=compose_goal(logical_goal),
                    catalog_path=agent_providers_catalog_path,
                    allowed_agent_provider_ids=selected_dynamic_provider_ids,
                    mcp_catalog_path=mcp_catalog_path,
                    agent_skills_catalog_path=agent_skills_catalog_path,
                    rag_sources_catalog_path=rag_sources_catalog_path,
                    session_path=orchestrator_session_path,
                    max_steps=1,
                    tool_root=tool_root,
                    quiet=args.quiet,
                )
            except Exception as exc:  # noqa: BLE001
                print(f"(dynamic-iter) planning failed: {exc}", file=sys.stderr)
                sys.exit(1)

            try:
                from orchestration.learning_store import emit_run_rating_meta

                emit_run_rating_meta(dyn_cfg)
            except Exception:  # noqa: BLE001
                pass

            summary = plan.get("plan_summary")
            if not args.quiet and isinstance(summary, str) and summary.strip():
                print(f"(dynamic-iter) plan: {summary.strip()}", file=sys.stderr)
            if not args.quiet and dyn_cfg.tasks:
                tdef = dyn_cfg.tasks[0]
                first_line = str(tdef.description or "").strip().splitlines()[0].strip()
                if tdef.mcp_providers is not None:
                    mcp_part = f"mcp {tdef.mcp_providers!r}"
                else:
                    mcp_part = f"mcp (default {dyn_cfg.mcp_providers!r})"
                print(
                    f"(dynamic-iter) step: {first_line or tdef.id} -> agent_provider {tdef.agent_provider_id!r}; {mcp_part}",
                    file=sys.stderr,
                )
            steps_raw = plan.get("steps")
            if isinstance(steps_raw, list) and steps_raw:
                step0 = steps_raw[0]
                if isinstance(step0, dict):
                    sr = (
                        str(
                            step0.get("rationale")
                            or step0.get("step_rationale")
                            or step0.get("why")
                            or "",
                        ).strip()
                    )
                    if sr:
                        print(
                            f"(dynamic-iter) planner step rationale: {sr}",
                            file=sys.stderr,
                            flush=True,
                        )

            exit_code, result_text, dyn_cfg = _run_dynamic_workflow_with_hf_fallback(
                dyn_cfg,
                agent_providers_catalog_path=agent_providers_catalog_path,
                mcp_catalog_path=mcp_catalog_path,
                agent_skills_catalog_path=agent_skills_catalog_path,
                rag_sources_catalog_path=rag_sources_catalog_path,
                crew_verbose=not args.quiet,
                quiet=args.quiet,
                emit_stdout_summary=stream_iter_steps,
                emit_progress_lines=stream_iter_steps,
            )
            if exit_code:
                sys.exit(exit_code)
            last_iter_crew_text = result_text or last_iter_crew_text
            _update_session_after_crew(orchestrator_session_path, result_text)
            # Learning: evaluate + update local stats (best-effort).
            try:
                from orchestration.learning_store import (
                    append_trace_event,
                    attachment_fingerprint_event_fields,
                    attachment_fingerprint_for_task,
                    learning_enabled,
                    load_stats,
                    save_stats,
                    update_provider_score,
                )

                if learning_enabled():
                    provider_id = dyn_cfg.tasks[0].agent_provider_id if dyn_cfg.tasks else "unknown"
                    fp = (
                        attachment_fingerprint_for_task(dyn_cfg.tasks[0], dyn_cfg)
                        if dyn_cfg.tasks
                        else "none"
                    )
                    eval_data = evaluate_run_quality(
                        user_goal=compose_goal(logical_goal),
                        output_text=result_text or "",
                        model=None,
                    )
                    score = eval_data.get("score", None)
                    append_trace_event(
                        tool_root,
                        {
                            "kind": "round_result",
                            "mode": "dynamic-iterative",
                            "round": r,
                            "provider_id": provider_id,
                            **attachment_fingerprint_event_fields(fp),
                            "eval": eval_data,
                        },
                    )
                    st = load_stats(tool_root)
                    st = update_provider_score(
                        stats=st,
                        provider_id=provider_id,
                        attachment_fingerprint=fp,
                        user_prompt=compose_goal(logical_goal),
                        eval_score=float(score) if isinstance(score, (int, float)) else None,
                    )
                    save_stats(tool_root, st)
            except Exception:  # noqa: BLE001
                pass

            if args.dynamic_iterative_auto:
                sess = load_session(orchestrator_session_path)
                excerpt = (sess.last_crew_output_excerpt or "").strip()
                decision = iterative_controller_decision(
                    original_goal=compose_goal(raw_task),
                    latest_excerpt=excerpt,
                    round_index=r,
                    max_rounds=max_rounds,
                    model=None,
                )
                done = bool(decision.get("done", False))
                reason = str(decision.get("reason", "")).strip()
                next_goal = str(decision.get("next_goal", "")).strip()
                est_left = decision.get("estimated_rounds_remaining", None)
                conf = str(decision.get("estimate_confidence", "")).strip().lower()
                try:
                    est_left_i = int(est_left) if est_left is not None else None
                except Exception:  # noqa: BLE001
                    est_left_i = None
                stderr_live = getattr(sys, "__stderr__", sys.stderr)
                stderr_live.write(
                    f"(dynamic-iter) controller (round {r}/{max_rounds}): done={done}\n",
                )
                stderr_live.write(f"(dynamic-iter) controller reason: {reason or '(none)'}\n")
                if next_goal:
                    stderr_live.write(
                        f"(dynamic-iter) controller refined next_goal: {next_goal}\n",
                    )
                if not done:
                    if r < max_rounds:
                        stderr_live.write(
                            "(dynamic-iter) controller decision: continue — "
                            "another planning + crew round will run\n",
                        )
                    else:
                        stderr_live.write(
                            "(dynamic-iter) controller decision: would continue but "
                            f"max rounds ({max_rounds}) reached — stopping iterative loop\n",
                        )
                else:
                    stderr_live.write(
                        "(dynamic-iter) controller decision: stop — "
                        "proceeding to synthesis (if enabled)\n",
                    )
                stderr_live.flush()
                if est_left_i is not None:
                    conf_part = f" ({conf})" if conf in ("low", "medium", "high") else ""
                    # Estimated percent complete: rounds done / (done + remaining).
                    denom = max(1, int(r) + int(est_left_i))
                    pct = int(round((int(r) / denom) * 100))
                    pct = max(0, min(100, pct))
                    if not args.quiet:
                        print(
                            f"(dynamic-iter) controller: ~{est_left_i} round(s) remaining{conf_part} "
                            f"(~{pct}% complete)",
                            file=sys.stderr,
                        )
                    # Keep stdout clean for non-verbose UIs that only surface the final summary there.
                    try:
                        sys.__stderr__.write(
                            f"(progress) ~{pct}% complete; estimated rounds remaining: ~{est_left_i}{conf_part}\n"
                        )
                        sys.__stderr__.flush()
                    except Exception:  # noqa: BLE001
                        pass
                if next_goal:
                    logical_goal = next_goal
                if done and r >= min_rounds:
                    stderr_live = getattr(sys, "__stderr__", sys.stderr)
                    stderr_live.write(
                        f"(dynamic-iter) stopping early at round {r} (controller done=true)\n",
                    )
                    stderr_live.flush()
                    break

            if not args.dynamic_iterative_auto and r >= manual_rounds:
                break

        strict_mr_goal = goal_requires_machine_readable_only(cache_goal)
        omit_final_synthesis = bool(args.dynamic_iterative_no_synthesize) or strict_mr_goal
        iterative_final_text = ""

        if omit_final_synthesis and not stream_iter_steps:
            iterative_final_text = str(last_iter_crew_text or "").strip()
            if not iterative_final_text:
                sess_quick = load_session(orchestrator_session_path)
                iterative_final_text = (sess_quick.last_crew_output_excerpt or "").strip()
            iterative_final_text = _finalize_dynamic_result_text(
                iterative_final_text, media_grounding_bundle, user_goal=cache_goal
            ) or ""
            if iterative_final_text:
                print(iterative_final_text, flush=True)

        if not omit_final_synthesis:
            # Final synthesis: use the last crew excerpt as context.
            sess = load_session(orchestrator_session_path)
            excerpt = (sess.last_crew_output_excerpt or "").strip()
            prose_hdr = ""
            if web_prose_deliverable_enabled() and not strict_mr_goal:
                prose_hdr = web_prose_synthesis_instructions()
            synth_prompt = (
                f"{cache_goal}\n\n"
                f"{prose_hdr}"
                "Synthesize a final answer by combining the intermediate results below. "
                "Resolve contradictions; if information is missing, explicitly list assumptions.\n\n"
                "Math/finance formatting rules:\n"
                "- If you show a calculation like Total Savings - Total Costs, label the left-hand side as the computed metric, e.g. "
                "`Net Impact = Total Savings - Total Costs = ...`, not `Total Savings - Total Costs = ...`.\n"
                "- Prefer clear variable names and avoid mismatched labels.\n\n"
                "## Intermediate results (excerpt)\n"
                f"{excerpt}\n"
            )
            try:
                synth_cfg, plan = build_dynamic_workflow_config(
                    user_prompt=synth_prompt,
                    catalog_path=agent_providers_catalog_path,
                    allowed_agent_provider_ids=selected_dynamic_provider_ids,
                    mcp_catalog_path=mcp_catalog_path,
                    agent_skills_catalog_path=agent_skills_catalog_path,
                    rag_sources_catalog_path=rag_sources_catalog_path,
                    session_path=orchestrator_session_path,
                    max_steps=1,
                    tool_root=tool_root,
                    quiet=args.quiet,
                )
            except Exception as exc:  # noqa: BLE001
                print(f"(dynamic-iter) synthesis planning failed: {exc}", file=sys.stderr)
                sys.exit(1)

            try:
                from orchestration.learning_store import emit_run_rating_meta

                emit_run_rating_meta(synth_cfg)
            except Exception:  # noqa: BLE001
                pass

            exit_code, result_text, synth_cfg = _run_dynamic_workflow_with_hf_fallback(
                synth_cfg,
                agent_providers_catalog_path=agent_providers_catalog_path,
                mcp_catalog_path=mcp_catalog_path,
                agent_skills_catalog_path=agent_skills_catalog_path,
                rag_sources_catalog_path=rag_sources_catalog_path,
                crew_verbose=not args.quiet,
                quiet=args.quiet,
                emit_stdout_summary=True,
                emit_progress_lines=stream_iter_steps,
            )
            if exit_code:
                sys.exit(exit_code)
            result_text = _finalize_dynamic_result_text(
                result_text, media_grounding_bundle, user_goal=cache_goal
            )
            _update_session_after_crew(orchestrator_session_path, result_text)
            _update_session_after_final(
                orchestrator_session_path, user_goal=cache_goal, result_text=result_text
            )
            try:
                from orchestration.knowledge_base import add_document
                from orchestration.learning_store import (
                    attachment_fingerprint_for_task,
                )

                provider_id = synth_cfg.tasks[0].agent_provider_id if synth_cfg.tasks else "unknown"
                fp = (
                    attachment_fingerprint_for_task(synth_cfg.tasks[0], synth_cfg)
                    if synth_cfg.tasks
                    else "none"
                )
                add_document(
                    tool_root=tool_root,
                    session_slug=slug,
                    user_goal=cache_goal,
                    content=result_text or "",
                    provider_id=provider_id,
                    attachment_fingerprint=fp,
                )
            except Exception:  # noqa: BLE001
                pass
            try:
                from orchestration.learning_store import (
                    append_trace_event,
                    attachment_fingerprint_event_fields,
                    attachment_fingerprint_for_task,
                    learning_enabled,
                    load_stats,
                    save_stats,
                    update_provider_score,
                )

                if learning_enabled():
                    provider_id = synth_cfg.tasks[0].agent_provider_id if synth_cfg.tasks else "unknown"
                    fp = (
                        attachment_fingerprint_for_task(synth_cfg.tasks[0], synth_cfg)
                        if synth_cfg.tasks
                        else "none"
                    )
                    eval_data = evaluate_run_quality(
                        user_goal=cache_goal,
                        output_text=result_text or "",
                        model=None,
                    )
                    score = eval_data.get("score", None)
                    append_trace_event(
                        tool_root,
                        {
                            "kind": "final_synthesis_result",
                            "mode": "dynamic-iterative",
                            "provider_id": provider_id,
                            **attachment_fingerprint_event_fields(fp),
                            "eval": eval_data,
                        },
                    )
                    st = load_stats(tool_root)
                    st = update_provider_score(
                        stats=st,
                        provider_id=provider_id,
                        attachment_fingerprint=fp,
                        user_prompt=cache_goal,
                        eval_score=float(score) if isinstance(score, (int, float)) else None,
                    )
                    save_stats(tool_root, st)
            except Exception:  # noqa: BLE001
                pass

            qa_gate_failed = _emit_final_qa(
                tool_root=tool_root,
                session_slug=slug,
                user_goal=cache_goal,
                output_text=result_text,
            )

            if result_text:
                saved = offer_save_extracted_files(
                    tool_root=tool_root,
                    user_task=cache_goal,
                    result_text=result_text,
                    output_dir=save_output_dir,
                    no_save=no_save,
                    prompt_save=prompt_save,
                )
                _run_post_save_verify(saved, verify=verify_saved)
            if qa_gate_failed:
                sys.exit(1)
        else:
            sess = load_session(orchestrator_session_path)
            last_ex = (sess.last_crew_output_excerpt or "").strip()
            qa_out = iterative_final_text.strip() or last_ex
            if strict_mr_goal and qa_out:
                _update_session_after_final(
                    orchestrator_session_path,
                    user_goal=cache_goal,
                    result_text=qa_out,
                )
            qa_gate_failed = _emit_final_qa(
                tool_root=tool_root,
                session_slug=slug,
                user_goal=cache_goal,
                output_text=qa_out or None,
            )
            if strict_mr_goal and qa_out:
                saved = offer_save_extracted_files(
                    tool_root=tool_root,
                    user_task=cache_goal,
                    result_text=qa_out,
                    output_dir=save_output_dir,
                    no_save=no_save,
                    prompt_save=prompt_save,
                )
                _run_post_save_verify(saved, verify=verify_saved)
            if qa_gate_failed:
                sys.exit(1)
        return

    if args.dynamic:
        has_manifest = bool(
            getattr(args, "dynamic_attachments", None)
            and str(args.dynamic_attachments).strip()
        )
        if (not args.task or not str(args.task).strip()) and not has_manifest:
            print(
                "error: --dynamic requires TASK (your goal), e.g. "
                'python main.py --dynamic "Compare REST vs gRPC for internal APIs" '
                "(or supply --dynamic-attachments with a manifest and an optional TASK).",
                file=sys.stderr,
            )
            sys.exit(2)

        def _norm(s: str) -> str:
            return " ".join(str(s or "").strip().lower().split())

        def _is_negative(s: str) -> bool:
            return _norm(s) in ("no", "nope", "nah", "rerun", "re-run", "reprocess", "run again")

        def _cache_enabled() -> bool:
            return os.getenv("AGENTIC_ANSWER_CACHE", "1").strip().lower() not in (
                "0",
                "false",
                "no",
                "off",
            )

        attachment_block = _load_dynamic_attachment_block(args, tool_root)
        dynamic_manifest = _dynamic_manifest_path(args, tool_root)
        media_grounding_bundle = None

        def compose_goal(g: str) -> str:
            return apply_web_prose_goal_if_enabled(
                compose_goal_with_attachments(g, attachment_block)
            )

        raw_task = str(args.task or "").strip()
        if not raw_task:
            raw_task = (
                "Use the attached files as the primary inputs. Summarize, extract insights, "
                "and answer any implied questions."
            )

        explicit_session = (args.orchestrator_session or "").strip() or os.getenv(
            "AGENTIC_ORCHESTRATOR_SESSION", ""
        ).strip()
        try:
            slug = resolve_orchestrator_session_slug(explicit_session)
        except ValueError as exc:
            print(f"(dynamic) invalid session name: {exc}", file=sys.stderr)
            sys.exit(2)
        orchestrator_session_path = session_file_path(tool_root, slug)
        if args.orchestrator_session_reset and orchestrator_session_path.exists():
            orchestrator_session_path.unlink()
            if not args.quiet:
                label = explicit_session if explicit_session else slug
                print(
                    f"(dynamic) reset orchestrator session {label!r} -> {orchestrator_session_path}",
                    file=sys.stderr,
                )
        if _cache_enabled() and orchestrator_session_path.exists() and not args.orchestrator_session_reset:
            sess0 = load_session(orchestrator_session_path)
            if sess0.pending_reprocess_goal and _is_negative(str(args.task or "").strip()):
                raw_task = str(sess0.pending_reprocess_goal).strip()
                sess0.pending_reprocess_goal = None
                from orchestration.orchestrator_session import save_session

                save_session(orchestrator_session_path, sess0)
            elif sess0.last_user_goal and sess0.last_final_answer_excerpt:
                cache_goal = compose_goal(raw_task)
                if _norm(sess0.last_user_goal) == _norm(cache_goal):
                    sess0.pending_reprocess_goal = raw_task
                    from orchestration.orchestrator_session import save_session

                    save_session(orchestrator_session_path, sess0)
                    print(sess0.last_final_answer_excerpt.strip())
                    print("\n\nIs this the answer you wanted? Reply `no` to re-run.", file=sys.stdout)
                    return
        cache_goal, media_grounding_bundle, media_gated = _goal_with_media_grounding(
            raw_task,
            attachment_block,
            manifest_path=dynamic_manifest,
            tool_root=tool_root,
            mcp_catalog_path=mcp_catalog_path,
        )
        if media_gated:
            print(cache_goal)
            return
        direct_vision = _maybe_direct_vision_answer(cache_goal, media_grounding_bundle)
        if direct_vision:
            if not args.quiet:
                print("(dynamic) direct vision completion (no agent tool loop)", file=sys.stderr)
            print(direct_vision)
            return
        try:
            dyn_cfg, plan = build_dynamic_workflow_config(
                user_prompt=cache_goal,
                catalog_path=agent_providers_catalog_path,
                allowed_agent_provider_ids=selected_dynamic_provider_ids,
                mcp_catalog_path=mcp_catalog_path,
                agent_skills_catalog_path=agent_skills_catalog_path,
                rag_sources_catalog_path=rag_sources_catalog_path,
                session_path=orchestrator_session_path,
                tool_root=tool_root,
                quiet=args.quiet,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"(dynamic) planning failed: {exc}", file=sys.stderr)
            sys.exit(1)
        try:
            from orchestration.learning_store import emit_run_rating_meta

            emit_run_rating_meta(dyn_cfg)
        except Exception:  # noqa: BLE001
            pass
        summary = plan.get("plan_summary")
        if not args.quiet:
            if isinstance(summary, str) and summary.strip():
                print(f"(dynamic) plan: {summary.strip()}", file=sys.stderr)
            for i, tdef in enumerate(dyn_cfg.tasks, start=1):
                if tdef.mcp_providers is not None:
                    mcp_part = f"; mcp {tdef.mcp_providers!r}"
                else:
                    mcp_part = f"; mcp (default {dyn_cfg.mcp_providers!r})"
                print(
                    f"(dynamic) step {i}/{len(dyn_cfg.tasks)}: {tdef.id} -> "
                    f"agent_provider {tdef.agent_provider_id!r}{mcp_part}",
                    file=sys.stderr,
                )
        exit_code, result_text, dyn_cfg = _run_dynamic_workflow_with_hf_fallback(
            dyn_cfg,
            agent_providers_catalog_path=agent_providers_catalog_path,
            mcp_catalog_path=mcp_catalog_path,
        agent_skills_catalog_path=agent_skills_catalog_path,
        rag_sources_catalog_path=rag_sources_catalog_path,
            crew_verbose=not args.quiet,
            quiet=args.quiet,
            emit_stdout_summary=True,
            emit_progress_lines=True,
        )
        if exit_code:
            sys.exit(exit_code)
        result_text = _finalize_dynamic_result_text(
            result_text, media_grounding_bundle, user_goal=cache_goal
        )
        _update_session_after_crew(orchestrator_session_path, result_text)
        _update_session_after_final(
            orchestrator_session_path, user_goal=cache_goal, result_text=result_text
        )
        qa_gate_failed = _emit_final_qa(
            tool_root=tool_root,
            session_slug=slug,
            user_goal=cache_goal,
            output_text=result_text,
        )
        try:
            from orchestration.knowledge_base import add_document
            from orchestration.learning_store import attachment_fingerprint_for_task

            last_task = dyn_cfg.tasks[-1] if dyn_cfg.tasks else None
            provider_id = last_task.agent_provider_id if last_task else "unknown"
            fp = attachment_fingerprint_for_task(last_task, dyn_cfg) if last_task else "none"
            add_document(
                tool_root=tool_root,
                session_slug=slug,
                user_goal=cache_goal,
                content=result_text or "",
                provider_id=provider_id,
                attachment_fingerprint=fp,
            )
        except Exception:  # noqa: BLE001
            pass
        try:
            from orchestration.learning_store import (
                append_trace_event,
                attachment_fingerprint_event_fields,
                attachment_fingerprint_for_task,
                learning_enabled,
                load_stats,
                save_stats,
                update_provider_score,
            )

            if learning_enabled():
                used = []
                for t in dyn_cfg.tasks:
                    fp = attachment_fingerprint_for_task(t, dyn_cfg)
                    used.append((t.agent_provider_id, fp))
                eval_data = evaluate_run_quality(
                    user_goal=cache_goal,
                    output_text=result_text or "",
                    model=None,
                )
                score = eval_data.get("score", None)
                append_trace_event(
                    tool_root,
                    {"kind": "run_result", "mode": "dynamic", "used": used, "eval": eval_data},
                )
                st = load_stats(tool_root)
                for pid, fp in used:
                    st = update_provider_score(
                        stats=st,
                        provider_id=pid,
                        attachment_fingerprint=fp,
                        user_prompt=cache_goal,
                        eval_score=float(score) if isinstance(score, (int, float)) else None,
                    )
                save_stats(tool_root, st)
        except Exception:  # noqa: BLE001
            pass
        if result_text:
            saved = offer_save_extracted_files(
                tool_root=tool_root,
                user_task=cache_goal,
                result_text=result_text,
                output_dir=save_output_dir,
                no_save=no_save,
                prompt_save=prompt_save,
            )
            _run_post_save_verify(saved, verify=verify_saved)
        if qa_gate_failed:
            sys.exit(1)
        return

    if args.task:
        entries = discover_workflow_catalog(config_dir)
        chosen_id, router_reason = select_workflow_with_ollama(
            user_task=args.task,
            entries=entries,
            ollama_host=args.router_host,
            model=args.router_model,
        )
        if router_reason and not args.quiet:
            print(f"(router) reason: {router_reason}", file=sys.stderr)
        entry = get_catalog_entry_by_id(entries, chosen_id)
        if entry is None:
            raise RuntimeError(f"Internal error: missing catalog entry for {chosen_id!r}")
        if not args.quiet:
            print(
                f"(router) workflow={entry.id!r} file={entry.path}",
                file=sys.stderr,
            )
        exit_code, result_text = run_workflow(
            entry.path,
            topic_override=args.task,
            quiet=args.quiet,
            mcp_catalog_path=mcp_catalog_path,
        agent_skills_catalog_path=agent_skills_catalog_path,
        rag_sources_catalog_path=rag_sources_catalog_path,
        )
        if exit_code:
            sys.exit(exit_code)
        qa_gate_failed = False
        if result_text and str(result_text).strip():
            qa_gate_failed = _emit_final_qa(
                tool_root=tool_root,
                session_slug=entry.id,
                user_goal=str(args.task),
                output_text=result_text,
                legacy_faithfulness_fallback=False,
            )
        if result_text:
            saved = offer_save_extracted_files(
                tool_root=tool_root,
                user_task=args.task,
                result_text=result_text,
                output_dir=save_output_dir,
                no_save=no_save,
                prompt_save=prompt_save,
            )
            _run_post_save_verify(saved, verify=verify_saved)
        if qa_gate_failed:
            sys.exit(1)
        return

    argv_cli = sys.argv[1:]
    config_explicit = _config_option_explicit(argv_cli)

    if args.batch:
        execution = run_workflow_execution(
            config_path, topic_override=None, quiet=args.quiet
        )
        if execution.exit_code:
            sys.exit(execution.exit_code)
        if extractable_text_from_execution(execution):
            saved = _offer_save_from_execution(
                tool_root=tool_root,
                user_task=None,
                execution=execution,
                output_dir=save_output_dir,
                no_save=no_save,
                prompt_save=prompt_save,
            )
            _run_post_save_verify(saved, verify=verify_saved)
        return

    if config_explicit and not args.interactive:
        execution = run_workflow_execution(
            config_path,
            topic_override=None,
            quiet=args.quiet,
            mcp_catalog_path=mcp_catalog_path,
        agent_skills_catalog_path=agent_skills_catalog_path,
        rag_sources_catalog_path=rag_sources_catalog_path,
        )
        if execution.exit_code:
            sys.exit(execution.exit_code)
        if extractable_text_from_execution(execution):
            saved = _offer_save_from_execution(
                tool_root=tool_root,
                user_task=None,
                execution=execution,
                output_dir=save_output_dir,
                no_save=no_save,
                prompt_save=prompt_save,
            )
            _run_post_save_verify(saved, verify=verify_saved)
        return

    if args.interactive and config_explicit:
        run_interactive_fixed_config(
            tool_root=tool_root,
            config_path=config_path,
            output_dir=save_output_dir,
            no_save=no_save,
            prompt_save=prompt_save,
            verify_saved=verify_saved,
            quiet=args.quiet,
        )
        return

    run_interactive_router(
        tool_root=tool_root,
        config_dir=config_dir,
        router_host=args.router_host,
        router_model=args.router_model,
        output_dir=save_output_dir,
        no_save=no_save,
        prompt_save=prompt_save,
        verify_saved=verify_saved,
        quiet=args.quiet,
        mcp_catalog_path=mcp_catalog_path,
        agent_skills_catalog_path=agent_skills_catalog_path,
        rag_sources_catalog_path=rag_sources_catalog_path,
    )


if __name__ == "__main__":
    main()
