from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv()

from orchestration.catalog_loader import discover_workflow_catalog, get_catalog_entry_by_id
from orchestration.config_loader import load_workflow_config
from orchestration.runner import BuiltWorkflow, build_workflow
from orchestration.workflow_router import select_workflow_with_ollama


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


def run_workflow(
    config_path: Path,
    *,
    topic_override: str | None = None,
) -> int:
    """Load workflow YAML, run crew, return process exit code (0 = success)."""
    config = load_workflow_config(config_path, topic_override=topic_override)
    built = build_workflow(config)
    _on_workflow_start(built)

    exit_code = 0
    workflow_result: object | None = None
    workflow_error: BaseException | None = None
    try:
        try:
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
            print("\n=== Workflow Output ===\n")
            print(workflow_result)
    finally:
        _on_workflow_end(built, workflow_result, workflow_error)
        _cleanup_providers(built)

    return exit_code


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a YAML-driven CrewAI workflow. "
            "Pass a TASK to let Ollama pick a workflow from the catalog."
        )
    )
    parser.add_argument(
        "task",
        nargs="?",
        default=None,
        metavar="TASK",
        help=(
            "Natural-language task. If set, Ollama scans --config-dir for workflow "
            "files with a meta block and picks one; your task becomes the workflow topic."
        ),
    )
    parser.add_argument(
        "--config",
        default="config/workflow.yaml",
        help="Workflow YAML file (used when TASK is omitted).",
    )
    parser.add_argument(
        "--config-dir",
        default="config",
        help=(
            "Directory scanned for routable *.yaml / *.yml workflows "
            "(router mode). Files need top-level 'meta' + 'workflow'."
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
    return parser.parse_args()


def main() -> None:
    require_env("OPENAI_API_KEY")

    args = parse_args()
    tool_root = Path(__file__).resolve().parent

    if args.task:
        config_dir = (
            (tool_root / args.config_dir).resolve()
            if not Path(args.config_dir).is_absolute()
            else Path(args.config_dir)
        )
        entries = discover_workflow_catalog(config_dir)
        chosen_id, router_reason = select_workflow_with_ollama(
            user_task=args.task,
            entries=entries,
            ollama_host=args.router_host,
            model=args.router_model,
        )
        if router_reason:
            print(f"(router) reason: {router_reason}", file=sys.stderr)
        entry = get_catalog_entry_by_id(entries, chosen_id)
        if entry is None:
            raise RuntimeError(f"Internal error: missing catalog entry for {chosen_id!r}")
        print(
            f"(router) workflow={entry.id!r} file={entry.path}",
            file=sys.stderr,
        )
        exit_code = run_workflow(entry.path, topic_override=args.task)
    else:
        config_path = (
            (tool_root / args.config).resolve()
            if not Path(args.config).is_absolute()
            else Path(args.config)
        )
        exit_code = run_workflow(config_path, topic_override=None)

    if exit_code:
        sys.exit(exit_code)


if __name__ == "__main__":
    main()
