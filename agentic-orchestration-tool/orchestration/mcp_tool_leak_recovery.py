"""Runtime harness: recover when CrewAI Final Answer is unusable for MCP steps.

Legitimate structured JSON deliverables are left alone. Triggers include tool-call
stubs, CrewAI meta echoes (e.g. after max iterations), and filesystem list goals
that never returned workspace paths.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Any

from orchestration.mcp_task_hints import (
    FILESYSTEM_MCP_IDS,
    augment_task_description_for_mcp_leak_retry,
    looks_like_mcp_tool_call_leak,
)

_LISTING_MARKER = "[agentic: workspace listing]"

_META_ANSWER_RE = re.compile(
    r"(?is)^\s*[\(\[]?\s*(?:don'?t|do\s+not)\s+use\s+past\s+results(?:\s+here)?\.?\s*[\)\]]?\s*$"
    r"|^\s*maximum\s+iterations\s+reached"
    r"|^\s*requesting\s+final\s+answer"
    r"|^\s*now it'?s time you must give your absolute best final answer"
    r"|^\s*you'?ll ignore all previous instructions"
)

_LIST_GOAL_RE = re.compile(
    r"(?is)\b("
    r"list\s+(everything|all|files|dirs?|directories|contents?|the\s+workspace)"
    r"|list\s+.*\b(workspace|directory|folder|filesystem)\b"
    r"|what('?s|\s+is)\s+in\s+(your\s+)?(workspace|directory|folder)"
    r"|show\s+(me\s+)?(the\s+)?(files|contents?|directory|workspace)"
    r"|directory\s+listing"
    r"|ls\b"
    r")\b"
)


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


def has_filesystem_mcp(mcp_ids: list[str]) -> bool:
    return any(mid in FILESYSTEM_MCP_IDS or mid.startswith("openclaw_") for mid in mcp_ids)


def goal_requests_filesystem_listing(topic: str) -> bool:
    return bool(_LIST_GOAL_RE.search(str(topic or "")))


def looks_like_unusable_crew_answer(text: str) -> bool:
    """True for meta/instruction echoes that must not be shown as the user answer."""
    t = str(text or "").strip()
    if not t:
        return True
    if looks_like_mcp_tool_call_leak(t):
        return True
    if _META_ANSWER_RE.search(t):
        return True
    lower = t.lower()
    if "don't use past results" in lower or "do not use past results" in lower:
        if len(t) < 120:
            return True
    if "ignore all previous instructions" in lower and len(t) < 280:
        return True
    return False


def answer_has_workspace_paths(text: str, root: Path | None = None) -> bool:
    t = str(text or "")
    if root is not None and str(root) in t:
        return True
    # Absolute unix paths that look like file entries
    if re.search(r"(?m)^(?:file|dir)\t?/", t):
        return True
    if re.search(r"(?m)^/[^\s]+/\S+", t) and t.count("/") >= 3:
        return True
    return False


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
        lines.append(str(path.resolve()))
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
            "Copy every absolute path from the listing above into your reply, "
            "one path per line. Do not invent paths. Do not print meta instructions."
        )
    return (
        f"Question: {user_question}\n\n"
        f"{_LISTING_MARKER}\n{listing}\n\n"
        "Answer using only the listing above. Prefer absolute paths, one per line. "
        "Never emit tool-call JSON or meta instructions like "
        "'do not use past results'."
    )


def run_filesystem_list_summarize_step(
    *,
    built: Any,
    topic: str,
    root: Path,
    prefer_raw_listing: bool | None = None,
) -> str:
    """List the allowlisted workspace; optionally summarize, else return paths."""
    from orchestration.output_artifacts import workflow_result_to_extractable_text
    from orchestration.runner import crew_kickoff_context
    from orchestration.text_normalize import (
        looks_like_format_instruction_only,
        sanitize_user_facing_prose,
    )

    listing = list_workspace_absolute_paths(root)
    if prefer_raw_listing is None:
        prefer_raw_listing = goal_requests_filesystem_listing(topic)
    if prefer_raw_listing:
        # List goals: skip a second LLM pass — small models often echo CrewAI meta text.
        return listing

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
        raw = workflow_result_to_extractable_text(workflow_result)
        text = sanitize_user_facing_prose(raw)
        if (
            text
            and not looks_like_format_instruction_only(text)
            and not looks_like_unusable_crew_answer(text)
            and not looks_like_unusable_crew_answer(raw)
        ):
            return text

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
            "Never a tool-call stub or meta instruction."
        )
    with crew_kickoff_context(built):
        workflow_result = built.crew.kickoff(inputs={"topic": topic})
    raw = workflow_result_to_extractable_text(workflow_result)
    text = sanitize_user_facing_prose(raw)
    if text and not looks_like_unusable_crew_answer(raw) and not looks_like_unusable_crew_answer(
        text
    ):
        return text
    return None


def needs_filesystem_recovery(
    *,
    text: str,
    raw_text: str,
    topic: str,
    mcp_ids: list[str],
) -> bool:
    if not has_filesystem_mcp(mcp_ids):
        return False
    if looks_like_unusable_crew_answer(raw_text) or looks_like_unusable_crew_answer(text):
        return True
    if goal_requests_filesystem_listing(topic):
        root = filesystem_allowed_root()
        if not answer_has_workspace_paths(text, root) and not answer_has_workspace_paths(
            raw_text, root
        ):
            return True
    return False


def recover_after_mcp_tool_leak(
    *,
    built: Any,
    topic: str,
    task_description: str,
    mcp_ids: list[str],
    leaked_text: str,
) -> str | None:
    """
    Runtime harness after an unusable Final Answer on an MCP step.

    Prefer deterministic filesystem listing when a filesystem MCP is attached;
    otherwise one guided retry kickoff.
    """
    _ = leaked_text
    if has_filesystem_mcp(mcp_ids):
        root = filesystem_allowed_root()
        if root is not None:
            print(
                f"(execute-step) unusable MCP answer; list workspace {root}",
                file=sys.stderr,
            )
            return run_filesystem_list_summarize_step(
                built=built,
                topic=topic,
                root=root,
            )
    print(
        "(execute-step) unusable MCP answer; generic MCP retry kickoff",
        file=sys.stderr,
    )
    return run_generic_mcp_leak_retry_kickoff(
        built=built,
        topic=topic,
        task_description=task_description,
        mcp_ids=mcp_ids,
    )
