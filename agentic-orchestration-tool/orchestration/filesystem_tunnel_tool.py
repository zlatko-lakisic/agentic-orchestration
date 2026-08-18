"""CrewAI tool shims for COMSTAR session-tunnel filesystem MCP.

CrewAI native MCP prefixes the loopback tunnel URL into tool names until they hash,
so overlay prompts that say ``read_file`` never match a callable tool. These BaseTools
use the original MCP names and JSON-RPC POST to the engine loopback (which the tunnel
forwards to the IDE).
"""

from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from crewai.tools import BaseTool


def _entry_url(entry: Any) -> str:
    if isinstance(entry, str):
        return entry.strip()
    if isinstance(entry, dict):
        return str(entry.get("url") or "").strip()
    return str(getattr(entry, "url", "") or "").strip()


def is_filesystem_tunnel_mcp_entry(entry: Any) -> bool:
    url = _entry_url(entry).lower()
    if not url:
        return False
    if "/t/" not in url:
        return False
    return "filesystem" in url


def partition_filesystem_tunnel_mcps(mcps: list[Any]) -> tuple[list[Any], list[str]]:
    """Split resolved MCP configs into (non-tunnel-filesystem, loopback URLs)."""
    other: list[Any] = []
    urls: list[str] = []
    seen: set[str] = set()
    for entry in mcps:
        if is_filesystem_tunnel_mcp_entry(entry):
            url = _entry_url(entry).rstrip("/")
            if url and url not in seen:
                seen.add(url)
                urls.append(url)
            continue
        other.append(entry)
    return other, urls


def _mcp_endpoint(base_url: str) -> str:
    text = str(base_url or "").strip().rstrip("/")
    if text.endswith("/mcp"):
        return text
    return f"{text}/mcp"


def call_filesystem_mcp_tool(base_url: str, name: str, arguments: dict[str, Any] | None = None) -> str:
    endpoint = _mcp_endpoint(base_url)
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": name, "arguments": arguments or {}},
    }
    req = Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=55) as resp:  # noqa: S310 — loopback tunnel only
            raw = resp.read().decode("utf-8", errors="replace")
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        return f"Filesystem MCP {name} failed: {exc}"
    try:
        body = json.loads(raw)
    except json.JSONDecodeError:
        return raw[:8000]
    if isinstance(body, dict) and body.get("error"):
        err = body["error"]
        if isinstance(err, dict):
            return str(err.get("message") or err)
        return str(err)
    result = body.get("result") if isinstance(body, dict) else None
    if isinstance(result, dict):
        chunks = result.get("content") or []
        texts: list[str] = []
        if isinstance(chunks, list):
            for item in chunks:
                if isinstance(item, dict) and item.get("text"):
                    texts.append(str(item["text"]))
        if texts:
            return "\n".join(texts)
        if result.get("isError"):
            return str(result)
    return str(result if result is not None else raw)[:8000]


def filesystem_tunnel_tools(mcp_url: str) -> list[BaseTool]:
    url = str(mcp_url or "").strip()

    class ListAllowedDirectoriesTool(BaseTool):
        name: str = "list_allowed_directories"
        description: str = (
            "List workspace directories this filesystem MCP may access. "
            "Call this first to get the absolute root, then pass that root to "
            "list_directory or read_file. No arguments."
        )

        def _run(self, **kwargs: Any) -> str:
            return call_filesystem_mcp_tool(url, "list_allowed_directories", {})

    class ListDirectoryTool(BaseTool):
        name: str = "list_directory"
        description: str = (
            "List files and directories at path. "
            "Input: path (required string, absolute workspace path from list_allowed_directories, "
            "or a workspace-relative name such as hello.txt)."
        )

        def _run(self, path: str) -> str:
            target = str(path or "").strip()
            if not target:
                return "Error: path is required"
            return call_filesystem_mcp_tool(url, "list_directory", {"path": target})

    class ReadFileTool(BaseTool):
        name: str = "read_file"
        description: str = (
            "Read a UTF-8 text file from the workspace. "
            "Input: path (required string). Relative names like hello.txt are resolved "
            "against the workspace root from list_allowed_directories."
        )

        def _run(self, path: str) -> str:
            target = str(path or "").strip()
            if not target:
                return "Error: path is required"
            return call_filesystem_mcp_tool(url, "read_file", {"path": target})

    return [
        ListAllowedDirectoriesTool(),
        ListDirectoryTool(),
        ReadFileTool(),
    ]


def attach_filesystem_tunnel_tools_to_agents(agents: list[Any], mcp_urls: list[str]) -> bool:
    """Append short-named filesystem tools; skip duplicates. Returns True when any attached."""
    attached = False
    tools: list[BaseTool] = []
    for url in mcp_urls:
        tools.extend(filesystem_tunnel_tools(url))
    if not tools:
        return False
    for agent in agents:
        existing = list(getattr(agent, "tools", None) or [])
        have = {str(getattr(t, "name", "") or "") for t in existing}
        extra = [t for t in tools if t.name not in have]
        if not extra:
            continue
        agent.tools = [*existing, *extra]
        attached = True
    return attached
