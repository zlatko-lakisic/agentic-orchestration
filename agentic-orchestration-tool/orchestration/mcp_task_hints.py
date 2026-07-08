"""Task-level MCP guidance and detection of tool-call syntax leaked as final answers."""

from __future__ import annotations

import re
from typing import Any

_MARKER = "[agentic: MCP task instructions]"
_RETRY_MARKER = "[agentic: MCP retry]"

_MEDIA_MCP_IDS = frozenset(
    {"media_understand", "media_audio_transcribe", "media_video_analyze"}
)

_TOOL_LEAK_RE = re.compile(
    r"(^name:\s*\S+|python[_-]?m[_-]?mcp_server_fetch|mcp_server_fetch|"
    r"plant_knowledge_mcp|^\s*parameters:\s*\{|"
    r'"name"\s*:\s*"[^"]*plant_knowledge[^"]*")',
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
    if "parameters:" in lower and '"url"' in lower:
        return True
    if lower.startswith("name:") and "parameters:" in lower:
        return True
    return False


def _fetch_url_hint() -> str:
    return "URLs in the goal: call the `fetch` tool, then answer in short plain prose."


def _media_understand_hint() -> str:
    return (
        "Attached media files: call describe_image_file, transcribe_audio_file, or "
        "analyze_video_file with the absolute paths from ## Attached files / media grounding evidence. "
        "Ground answers in tool output — do not invent cinematic details."
    )


def augment_task_description_for_mcps(description: str, mcp_ids: list[str]) -> str:
    if not mcp_ids:
        return description
    if _MARKER in description:
        return description
    blocks: list[str] = []
    if "fetch_url" in mcp_ids:
        blocks.append(_fetch_url_hint())
    if any(mid in _MEDIA_MCP_IDS for mid in mcp_ids):
        blocks.append(_media_understand_hint())
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
