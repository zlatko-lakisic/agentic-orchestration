from __future__ import annotations

import argparse
import contextlib
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv()

from orchestration.catalog_loader import discover_workflow_catalog, get_catalog_entry_by_id
from orchestration.config_loader import load_workflow_config
from orchestration.dynamic_planner import build_dynamic_workflow_config
from orchestration.orchestrator_session import (
    safe_orchestrator_session_slug,
    session_file_path,
    update_session_after_crew,
)
from orchestration.runner import BuiltWorkflow, build_workflow, crew_kickoff_context
from orchestration.artifact_verify import verify_saved_npm_projects
from orchestration.output_artifacts import (
    offer_save_extracted_files,
    workflow_result_to_extractable_text,
)
from orchestration.workflow_router import select_workflow_with_ollama

_DEFAULT_CONFIG_PATH = "config/workflows/workflow.yaml"
_DEFAULT_PROVIDERS_CATALOG = "config/providers"


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


def require_env(var_name: str) -> str:
    value = os.getenv(var_name, "").strip()
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {var_name}. "
            "Create a .env file from .env.example and set it."
        )
    return value


def _workflow_context(built: BuiltWorkflow) -> dict[str, Any]:
    return {**built.workflow_context, "inputs": dict(built.inputs)}


def _on_workflow_start(built: BuiltWorkflow) -> None:
    ctx = _workflow_context(built)
    for provider in built.providers.values():
        try:
            provider.on_workflow_start(ctx)
        except Exception as exc:  # noqa: BLE001
            print(
                f"Warning: provider '{provider.config.id}' on_workflow_start failed: {exc}",
                file=sys.stderr,
            )


def _on_workflow_end(
    built: BuiltWorkflow,
    result: object | None,
    error: BaseException | None,
) -> None:
    ctx = _workflow_context(built)
    for provider in built.providers.values():
        try:
            provider.on_workflow_end(ctx, result, error)
        except Exception as exc:  # noqa: BLE001
            print(
                f"Warning: provider '{provider.config.id}' on_workflow_end failed: {exc}",
                file=sys.stderr,
            )


def _cleanup_providers(built: BuiltWorkflow) -> None:
    for provider in built.providers.values():
        try:
            provider.cleanup()
        except Exception as exc:  # noqa: BLE001
            print(
                f"Warning: provider '{provider.config.id}' cleanup failed: {exc}",
                file=sys.stderr,
            )


def _is_quit_command(text: str) -> bool:
    t = text.strip().lower()
    return t in frozenset({"quit", "exit", "q", ":q"})


def run_built_workflow(
    built: BuiltWorkflow,
    *,
    quiet: bool = False,
) -> tuple[int, str | None]:
    """Execute a pre-built crew; return (exit code, final output text if any)."""
    _on_workflow_start(built)

    exit_code = 0
    workflow_result: object | None = None
    workflow_error: BaseException | None = None
    result_text: str | None = None
    try:
        try:
            with crew_kickoff_context(built):
                if quiet:
                    with open(os.devnull, "w", encoding="utf-8") as _quiet_sink:
                        with contextlib.redirect_stdout(_quiet_sink), contextlib.redirect_stderr(
                            _quiet_sink
                        ):
                            workflow_result = built.crew.kickoff(inputs=built.inputs)
                else:
                    workflow_result = built.crew.kickoff(inputs=built.inputs)
        except Exception as exc:
            workflow_error = exc
            print("\nWorkflow execution failed.", file=sys.stderr)
            print(
                "Check your YAML config and OPENAI settings in .env, then retry.",
                file=sys.stderr,
            )
            print(f"Error: {exc}", file=sys.stderr)
            exit_code = 1
        else:
            if quiet:
                if workflow_result is not None:
                    _disp = workflow_result_display_text(workflow_result)
                    if _disp:
                        print(_disp, flush=True)
            else:
                print("\n=== Workflow Output ===\n")
                print(workflow_result)
            if workflow_result is not None:
                result_text = workflow_result_to_extractable_text(workflow_result)
    finally:
        _on_workflow_end(built, workflow_result, workflow_error)
        _cleanup_providers(built)

    return exit_code, result_text


def run_workflow(
    config_path: Path,
    *,
    topic_override: str | None = None,
    quiet: bool = False,
) -> tuple[int, str | None]:
    """Load workflow YAML, run crew; return (exit code, final output text if any)."""
    config = load_workflow_config(config_path, topic_override=topic_override)
    built = build_workflow(config, crew_verbose=not quiet)
    return run_built_workflow(built, quiet=quiet)


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
            config_path, topic_override=task, quiet=quiet
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
            "OPENAI_*) devises steps and picks providers from --providers-catalog, then runs them "
            "in order. Requires TASK."
        ),
    )
    parser.add_argument(
        "--providers-catalog",
        default=_DEFAULT_PROVIDERS_CATALOG,
        metavar="PATH",
        help=(
            f"Directory of one YAML file per provider, or a legacy bundle YAML with a top-level "
            f"'providers' list (default {_DEFAULT_PROVIDERS_CATALOG!r})."
        ),
    )
    parser.add_argument(
        "--orchestrator-session",
        default=None,
        metavar="NAME",
        help=(
            "With --dynamic: persist planner LLM chat + crew output excerpt under "
            "__orchestrator_sessions__/NAME.json for multi-turn planning. "
            "Override with env AGENTIC_ORCHESTRATOR_SESSION."
        ),
    )
    parser.add_argument(
        "--orchestrator-session-reset",
        action="store_true",
        help="With --orchestrator-session: delete the session file before this run.",
    )
    return parser.parse_args()


def _cli_output_dir(raw: str | None) -> Path | None:
    if not raw or not str(raw).strip():
        return None
    return Path(str(raw).strip()).expanduser().resolve()


def main() -> None:
    require_env("OPENAI_API_KEY")

    args = parse_args()
    tool_root = Path(__file__).resolve().parent
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

    providers_catalog_path = (
        (tool_root / args.providers_catalog).resolve()
        if not Path(args.providers_catalog).is_absolute()
        else Path(args.providers_catalog)
    )

    if args.dynamic:
        if not args.task or not str(args.task).strip():
            print(
                "error: --dynamic requires TASK (your goal), e.g. "
                'python main.py --dynamic "Compare REST vs gRPC for internal APIs"',
                file=sys.stderr,
            )
            sys.exit(2)
        goal = str(args.task).strip()
        orch_name = (args.orchestrator_session or "").strip() or os.getenv(
            "AGENTIC_ORCHESTRATOR_SESSION", ""
        ).strip()
        if args.orchestrator_session_reset and not orch_name:
            print(
                "error: --orchestrator-session-reset requires --orchestrator-session "
                "(or AGENTIC_ORCHESTRATOR_SESSION).",
                file=sys.stderr,
            )
            sys.exit(2)
        orchestrator_session_path: Path | None = None
        if orch_name:
            try:
                slug = safe_orchestrator_session_slug(orch_name)
            except ValueError as exc:
                print(f"(dynamic) invalid session name: {exc}", file=sys.stderr)
                sys.exit(2)
            orchestrator_session_path = session_file_path(tool_root, slug)
            if args.orchestrator_session_reset and orchestrator_session_path.exists():
                orchestrator_session_path.unlink()
                if not args.quiet:
                    print(
                        f"(dynamic) reset orchestrator session {orch_name!r} -> {orchestrator_session_path}",
                        file=sys.stderr,
                    )
        try:
            dyn_cfg, plan = build_dynamic_workflow_config(
                user_prompt=goal,
                catalog_path=providers_catalog_path,
                session_path=orchestrator_session_path,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"(dynamic) planning failed: {exc}", file=sys.stderr)
            sys.exit(1)
        summary = plan.get("plan_summary")
        if not args.quiet:
            if isinstance(summary, str) and summary.strip():
                print(f"(dynamic) plan: {summary.strip()}", file=sys.stderr)
            for i, tdef in enumerate(dyn_cfg.tasks, start=1):
                print(
                    f"(dynamic) step {i}/{len(dyn_cfg.tasks)}: {tdef.id} -> provider {tdef.provider_id!r}",
                    file=sys.stderr,
                )
        built = build_workflow(dyn_cfg, crew_verbose=not args.quiet)
        exit_code, result_text = run_built_workflow(built, quiet=args.quiet)
        if exit_code:
            sys.exit(exit_code)
        if orchestrator_session_path is not None:
            update_session_after_crew(orchestrator_session_path, result_text)
        if result_text:
            saved = offer_save_extracted_files(
                tool_root=tool_root,
                user_task=goal,
                result_text=result_text,
                output_dir=save_output_dir,
                no_save=no_save,
                prompt_save=prompt_save,
            )
            _run_post_save_verify(saved, verify=verify_saved)
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
            entry.path, topic_override=args.task, quiet=args.quiet
        )
        if exit_code:
            sys.exit(exit_code)
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
        return

    argv_cli = sys.argv[1:]
    config_explicit = _config_option_explicit(argv_cli)

    if args.batch:
        exit_code, result_text = run_workflow(
            config_path, topic_override=None, quiet=args.quiet
        )
        if exit_code:
            sys.exit(exit_code)
        if result_text:
            saved = offer_save_extracted_files(
                tool_root=tool_root,
                user_task=None,
                result_text=result_text,
                output_dir=save_output_dir,
                no_save=no_save,
                prompt_save=prompt_save,
            )
            _run_post_save_verify(saved, verify=verify_saved)
        return

    if config_explicit and not args.interactive:
        exit_code, result_text = run_workflow(
            config_path, topic_override=None, quiet=args.quiet
        )
        if exit_code:
            sys.exit(exit_code)
        if result_text:
            saved = offer_save_extracted_files(
                tool_root=tool_root,
                user_task=None,
                result_text=result_text,
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
    )


if __name__ == "__main__":
    main()
