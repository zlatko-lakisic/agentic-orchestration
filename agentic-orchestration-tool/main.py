from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv()

from orchestration.config_loader import load_workflow_config
from orchestration.runner import BuiltWorkflow, build_workflow


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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run YAML-driven CrewAI workflow dynamically."
    )
    parser.add_argument(
        "--config",
        default="config/workflow.yaml",
        help="Path to workflow YAML file.",
    )
    return parser.parse_args()


def main() -> None:
    require_env("OPENAI_API_KEY")

    args = parse_args()
    config_path = Path(args.config)
    config = load_workflow_config(config_path)

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

    if exit_code:
        sys.exit(exit_code)


if __name__ == "__main__":
    main()
