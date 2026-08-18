"""Task-level MCP guidance and detection of tool-call syntax leaked as final answers."""

from __future__ import annotations

import json
import re
from typing import Any

_MARKER = "[agentic: MCP task instructions]"
_RETRY_MARKER = "[agentic: MCP retry]"

_MEDIA_MCP_IDS = frozenset(
    {"media_understand", "media_audio_transcribe", "media_video_analyze"}
)

FILESYSTEM_MCP_IDS = frozenset({"filesystem_local", "openclaw_filesystem"})


def is_filesystem_mcp_id(mid: str) -> bool:
    """True for host filesystem MCPs and packed overlay tunnels (``client.filesystem_local``)."""
    sid = str(mid or "").strip()
    if sid in FILESYSTEM_MCP_IDS or sid.startswith("openclaw_"):
        return True
    return sid.endswith(".filesystem_local") or sid.endswith(".openclaw_filesystem")

_TOOL_LEAK_RE = re.compile(
    r"(^name:\s*\S+|python[_-]?m[_-]?mcp_server_fetch|mcp_server_fetch|"
    r"plant_knowledge_mcp|^\s*parameters:\s*\{|"
    r"npx_y_modelcontextprotocol|"
    r"npx_-y_@modelcontextprotocol|"
    r'"name"\s*:\s*"[^"]*plant_knowledge[^"]*"|'
    r'"name"\s*:\s*"(?:describe_image(?:_file)?|transcribe_audio(?:_file)?|'
    r'analyze_video(?:_file)?|python_m_mcp_servers_media_understand[^"]*|'
    r'media_understand[^"]*|npx_y_[^"]*")")',
    re.IGNORECASE | re.MULTILINE,
)

# Keys that appear on tool-invocation stubs (not general deliverable JSON).
_TOOL_STUB_KEYS = frozenset(
    {"name", "parameters", "arguments", "tool_name", "tool", "input", "args"}
)
_TOOL_STUB_NAME_KEYS = frozenset({"name", "tool_name", "tool"})


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


def _looks_like_tool_call_stub_json(text: str) -> bool:
    """True when the whole message is a tool-invocation object, not deliverable JSON."""
    t = text.strip()
    if not (t.startswith("{") and t.endswith("}")):
        return False
    try:
        obj = json.loads(t)
    except (json.JSONDecodeError, TypeError, ValueError):
        return False
    if not isinstance(obj, dict) or not obj:
        return False
    keys = set(obj.keys())
    if not keys <= _TOOL_STUB_KEYS:
        return False
    if not (keys & _TOOL_STUB_NAME_KEYS):
        return False
    # Must look like a call: name + args bag, or name alone that is clearly a tool id.
    name = str(
        obj.get("name") or obj.get("tool_name") or obj.get("tool") or ""
    ).strip()
    if not name:
        return False
    has_args = any(k in obj for k in ("parameters", "arguments", "input", "args"))
    if has_args:
        return True
    lower_name = name.lower()
    return any(
        token in lower_name
        for token in (
            "npx_",
            "mcp",
            "fetch",
            "filesystem",
            "describe_image",
            "transcribe",
            "analyze_video",
            "plant_knowledge",
        )
    )


def looks_like_mcp_tool_call_leak(text: str) -> bool:
    """
    Detect CrewAI / agent tool-call syntax wrongly used as the Final Answer.

    Does **not** treat arbitrary JSON as a leak (e.g. ``{"minutes": 10}`` is fine).
    """
    t = str(text or "").strip()
    if not t:
        return False
    if _looks_like_tool_call_stub_json(t):
        return True
    if _TOOL_LEAK_RE.search(t):
        return True
    lower = t.lower()
    if "parameters:" in lower and '"url"' in lower:
        return True
    if lower.startswith("name:") and "parameters:" in lower:
        return True
    # OpenAI-style / agent stub JSON embedded or media-specific
    if '"name"' in lower and '"parameters"' in lower:
        if any(
            k in lower
            for k in (
                "describe_image",
                "transcribe_audio",
                "analyze_video",
                "media_understand",
                "python_m_mcp",
                "plant_knowledge",
                "_web_uploads",
                "npx_y_",
                "modelcontextprotocol",
                "filesystem",
                "list_directory",
                "search_files",
                "read_file",
            )
        ):
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


def _filesystem_hint() -> str:
    return (
        "Filesystem tools: prefer list_directory / directory_tree with the absolute workspace "
        "path from the tool schema; then answer with absolute paths for the user. "
        "Do not print tool-call JSON (name/parameters) as your Final Answer — that is not "
        "a substitute for invoking tools or summarizing their results. Intentional "
        "structured JSON for the user goal is fine when the goal asks for it."
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
    if any(is_filesystem_mcp_id(mid) for mid in mcp_ids):
        blocks.append(_filesystem_hint())
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
        + "\nYour previous answer only printed tool-call syntax (name/parameters) instead of "
        "a real answer. Invoke the needed MCP tools now (or use their results), then write "
        "the user-facing reply. Do not emit another tool-call stub as the Final Answer. "
        "Structured JSON is allowed only when it is the deliverable the user asked for."
    )
