"""Runtime harness: recover when CrewAI Final Answer is MCP/tool-call syntax.

Legitimate structured JSON deliverables are left alone — only tool-invocation
stubs (``{"name","parameters"}``, CrewAI ``npx_y_…`` names, etc.) trigger recovery.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

from orchestration.mcp_task_hints import (
    FILESYSTEM_MCP_IDS,
    augment_task_description_for_mcp_leak_retry,
    looks_like_mcp_tool_call_leak,
)

_LISTING_MARKER = "[agentic: workspace listing]"


def filesystem_allowed_root() -> Path | None:
    for key in (
        "FILESYSTEM_MCP_ALLOWED_DIRECTORY",
        "AGENTIC_K8S_MCP_FILESYSTEM_DIR",
    ):
        raw = os.getenv(key, "").strip()
        if not raw:
            continue
        p = Path(raw).expanduser()
        if p.is_dir():
            return p
    return None


def list_workspace_absolute_paths(root: Path, *, max_entries: int = 200) -> str:
    """Deterministic directory listing (absolute paths) for summarize-only recovery."""
    root = root.resolve()
    lines: list[str] = []
    try:
        entries = sorted(root.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
    except OSError as exc:
        return f"(could not list {root}: {exc})"
    for path in entries:
        if len(lines) >= max_entries:
            lines.append(f"… truncated after {max_entries} entries")
            break
        kind = "dir" if path.is_dir() else "file"
        lines.append(f"{kind}\t{path}")
    if not lines:
        return f"(empty directory: {root})"
    return "\n".join(lines)


def _user_question_from_topic(topic: str) -> str:
    from orchestration.simple_chat import strip_web_prose_delivery_suffix

    return strip_web_prose_delivery_suffix(topic).strip()


def _summarize_listing_description(user_question: str, listing: str, *, minimal: bool = False) -> str:
    if minimal:
        return (
            f"{_LISTING_MARKER}\n{listing}\n\n"
            "List every path above for the user, one absolute path per line. "
            "No tool-call JSON."
        )
    return (
        f"Question: {user_question}\n\n"
        f"{_LISTING_MARKER}\n{listing}\n\n"
        "Answer the question using only the listing above. Prefer absolute paths, "
        "one per line when listing files. Write plain language or a path list — "
        "never emit tool-call JSON (no name/parameters stubs)."
    )


def run_filesystem_list_summarize_step(
    *,
    built: Any,
    topic: str,
    root: Path,
) -> str:
    """List the allowlisted workspace, then one summarize-only kickoff (tools off)."""
    from orchestration.output_artifacts import workflow_result_to_extractable_text
    from orchestration.runner import crew_kickoff_context
    from orchestration.text_normalize import (
        looks_like_format_instruction_only,
        sanitize_user_facing_prose,
    )

    listing = list_workspace_absolute_paths(root)
    user_question = _user_question_from_topic(topic)
    text = ""

    for minimal in (False, True):
        summarize_desc = _summarize_listing_description(
            user_question,
            listing,
            minimal=minimal,
        )
        for crew_task in built.crew.tasks:
            crew_task.description = summarize_desc
            crew_task.expected_output = (
                "A plain-language answer or absolute path list from the listing."
            )
        for agent in built.crew.agents:
            agent.tools = []
        with crew_kickoff_context(built):
            workflow_result = built.crew.kickoff(inputs={"topic": user_question})
        text = sanitize_user_facing_prose(
            workflow_result_to_extractable_text(workflow_result)
        )
        if text and not looks_like_format_instruction_only(text):
            return text
        if looks_like_mcp_tool_call_leak(
            workflow_result_to_extractable_text(workflow_result)
        ):
            continue

    # Last resort: return the deterministic listing itself (never tool JSON).
    return listing if listing else text


def run_generic_mcp_leak_retry_kickoff(
    *,
    built: Any,
    topic: str,
    task_description: str,
    mcp_ids: list[str],
) -> str | None:
    """One more kickoff with tools still attached and a leak-retry task hint."""
    from orchestration.output_artifacts import workflow_result_to_extractable_text
    from orchestration.runner import crew_kickoff_context
    from orchestration.text_normalize import sanitize_user_facing_prose

    retry_desc = augment_task_description_for_mcp_leak_retry(task_description, mcp_ids)
    for crew_task in built.crew.tasks:
        crew_task.description = retry_desc
        crew_task.expected_output = (
            "A user-facing answer (prose or intentional structured JSON for the goal). "
            "Never a tool-call stub."
        )
    with crew_kickoff_context(built):
        workflow_result = built.crew.kickoff(inputs={"topic": topic})
    raw = workflow_result_to_extractable_text(workflow_result)
    text = sanitize_user_facing_prose(raw)
    if text and not looks_like_mcp_tool_call_leak(raw):
        return text
    return None


def recover_after_mcp_tool_leak(
    *,
    built: Any,
    topic: str,
    task_description: str,
    mcp_ids: list[str],
    leaked_text: str,
) -> str | None:
    """
    Runtime harness after a tool-call leak Final Answer.

    Prefer deterministic filesystem list+summarize when a filesystem MCP is attached;
    otherwise one guided retry kickoff.
    """
    _ = leaked_text  # reserved for future leak parsing
    if any(mid in FILESYSTEM_MCP_IDS or mid.startswith("openclaw_") for mid in mcp_ids):
        root = filesystem_allowed_root()
        if root is not None:
            print(
                f"(execute-step) tool-call leak; list+summarize workspace {root}",
                file=sys.stderr,
            )
            return run_filesystem_list_summarize_step(
                built=built,
                topic=topic,
                root=root,
            )
    print(
        "(execute-step) tool-call leak; generic MCP retry kickoff",
        file=sys.stderr,
    )
    return run_generic_mcp_leak_retry_kickoff(
        built=built,
        topic=topic,
        task_description=task_description,
        mcp_ids=mcp_ids,
    )
