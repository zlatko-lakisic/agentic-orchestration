"""Planner LLM greeting for web chat connect (prose, not JSON plan)."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

from orchestration.agent_providers_catalog import (
    catalog_for_planner_prompt,
    load_agent_providers_catalog_merged,
)
from orchestration.catalog_credentials import filter_entries_by_api_credentials
from orchestration.dynamic_planner import _planner_chat_completion
from orchestration.hardware_profile import filter_catalog_by_hardware
from orchestration.ollama_catalog_filter import filter_catalog_by_pulled_ollama_models
from orchestration.text_normalize import strip_wrapping_quotes


def planner_greet_enabled() -> bool:
    return os.getenv("AGENTIC_WEB_PLANNER_GREET", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def _user_display_name() -> str:
    return os.getenv("AGENTIC_WEB_USER_DISPLAY_NAME", "").strip()


def _greeting_system_prompt(*, catalog_doc: str) -> str:
    edge = os.getenv("AGENTIC_EDGE_PLATFORM", "").strip()
    edge_line = f"You are running on edge platform `{edge}`.\n" if edge else ""
    name = _user_display_name()
    personal = (
        f"The user's display name is {name!r}. Greet them by name naturally once.\n"
        if name
        else ""
    )
    catalog_block = catalog_doc.strip() or "(no agent providers configured)"
    return (
        "You are the planning assistant for the Agentic Orchestration web chat.\n"
        f"{edge_line}"
        f"{personal}"
        "The user just opened a new chat session. Write a warm, concise greeting "
        "(1–3 short sentences).\n"
        "Briefly mention what kinds of tasks you can help plan and route to available agents.\n"
        "Write in plain natural language only — no JSON, no code blocks, no tool calls, "
        "and do not wrap the greeting in quotation marks.\n\n"
        f"Available agent providers:\n{catalog_block}"
    )


def _load_greeting_catalog(tool_root: Path) -> list[dict[str, Any]]:
    catalog_path = os.getenv("AGENTIC_AGENT_PROVIDERS_CATALOG", "config/agent_providers")
    path = Path(catalog_path)
    if not path.is_absolute():
        path = tool_root / catalog_path
    entries = load_agent_providers_catalog_merged(path)
    entries, _skipped = filter_entries_by_api_credentials(
        entries,
        verbose=False,
        log_prefix="planner greet",
    )
    entries, _excluded, _vram, _arch = filter_catalog_by_hardware(entries)
    entries = filter_catalog_by_pulled_ollama_models(
        entries,
        verbose=False,
        log_prefix="(planner greet) catalog",
    )
    return entries


def generate_planner_greeting(*, tool_root: Path, quiet: bool = False) -> str:
    """Call the planner LLM for a short user-facing greeting."""
    entries = _load_greeting_catalog(tool_root)
    catalog_doc = catalog_for_planner_prompt(entries)
    model = os.getenv("AGENTIC_PLANNER_MODEL", "gpt-4o-mini").strip()
    messages = [
        {"role": "system", "content": _greeting_system_prompt(catalog_doc=catalog_doc)},
        {
            "role": "user",
            "content": (
                f"Greet {name} now." if (name := _user_display_name()) else "Greet the user now."
            ),
        },
    ]
    if not quiet:
        print(f"(planner-greet) planner LLM: model={model!r}", file=sys.stderr)
    text = strip_wrapping_quotes(
        _planner_chat_completion(messages=messages, model=model, json_mode=False)
    )
    if not text:
        raise RuntimeError("Planner greeting returned empty content")
    return text


def run_planner_greeting_cli(*, tool_root: Path, quiet: bool = False) -> int:
    try:
        greeting = generate_planner_greeting(tool_root=tool_root, quiet=quiet)
    except Exception as exc:  # noqa: BLE001
        print(f"error: planner greeting failed: {exc}", file=sys.stderr)
        return 1
    print(greeting, end="" if greeting.endswith("\n") else "\n")
    return 0


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    quiet = "--quiet" in sys.argv[1:]
    raise SystemExit(run_planner_greeting_cli(tool_root=root, quiet=quiet))
