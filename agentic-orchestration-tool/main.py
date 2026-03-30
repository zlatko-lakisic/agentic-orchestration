from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

from orchestration.config_loader import load_workflow_config
from orchestration.runner import build_workflow


def require_env(var_name: str) -> str:
    value = os.getenv(var_name, "").strip()
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {var_name}. "
            "Create a .env file from .env.example and set it."
        )
    return value


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
    load_dotenv()
    require_env("OPENAI_API_KEY")

    args = parse_args()
    config_path = Path(args.config)
    config = load_workflow_config(config_path)

    built = build_workflow(config)

    try:
        result = built.crew.kickoff(inputs=built.inputs)
    except Exception as exc:
        print("\nWorkflow execution failed.", file=sys.stderr)
        print(
            "Check your YAML config and OPENAI settings in .env, then retry.",
            file=sys.stderr,
        )
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)

    print("\n=== Workflow Output ===\n")
    print(result)


if __name__ == "__main__":
    main()
