"""Task-level MCP guidance and detection of tool-call syntax leaked as final answers."""

from __future__ import annotations

import re
from typing import Any

_MARKER = "[agentic: MCP task instructions]"
_RETRY_MARKER = "[agentic: MCP retry]"

_TOOL_LEAK_RE = re.compile(
    r"(^name:\s*\S+|python[_-]?m[_-]?mcp_server_fetch|mcp_server_fetch|^\s*parameters:\s*\{)",
    re.IGNORECASE | re.MULTILINE,
)


def mcp_ids_from_step_spec(data: dict[str, Any]) -> list[str]:
    out: list[str] = []
    for item in data.get("mcp_providers") or []:
        if not isinstance(item, dict):
            continue
        mid = str(item.get("id", "")).strip()
        if mid:
            out.append(mid)
    return out


def mcp_ids_from_raw_spec(raw: list[Any]) -> list[str]:
    out: list[str] = []
    for item in raw:
        if isinstance(item, str):
            s = item.strip()
            if s:
                out.append(s)
        elif isinstance(item, dict):
            s = str(item.get("id") or item.get("ref") or "").strip()
            if s:
                out.append(s)
    return out


def looks_like_mcp_tool_call_leak(text: str) -> bool:
    t = str(text or "").strip()
    if not t:
        return False
    if _TOOL_LEAK_RE.search(t):
        return True
    lower = t.lower()
    if "parameters:" in lower and '"url"' in lower and "max_length" in lower:
        return True
    return False


def _fetch_url_hint() -> str:
    return (
        "**URL fetch (required):** When the user's goal includes HTTP(S) URLs, invoke the "
        "`fetch` tool for each relevant URL, read the returned page text, then answer in "
        "plain natural language. Your final answer must be a human-readable summary — never "
        "output tool invocation stubs (`name:`, `parameters:`, JSON tool envelopes, or "
        "python_m_mcp_server_fetch lines)."
    )


def augment_task_description_for_mcps(description: str, mcp_ids: list[str]) -> str:
    if not mcp_ids:
        return description
    if _MARKER in description:
        return description
    blocks: list[str] = []
    if "fetch_url" in mcp_ids:
        blocks.append(_fetch_url_hint())
    if not blocks:
        return description
    return description.rstrip() + "\n\n" + _MARKER + "\n" + "\n".join(blocks)


def augment_task_description_for_mcp_leak_retry(description: str, mcp_ids: list[str]) -> str:
    if not mcp_ids or _RETRY_MARKER in description:
        return description
    base = augment_task_description_for_mcps(description, mcp_ids)
    return (
        base.rstrip()
        + "\n\n"
        + _RETRY_MARKER
        + "\nYour previous answer only printed tool syntax instead of using MCP tools. "
        "Invoke the fetch tool now, wait for the page content, then write a clear summary "
        "for the user."
    )
