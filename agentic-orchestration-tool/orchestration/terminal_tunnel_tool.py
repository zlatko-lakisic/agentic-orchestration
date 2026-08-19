"""CrewAI tool shims for COMSTAR session-tunnel terminal MCP.

COMSTAR provides an MCP tunnel over HTTP with JSON-RPC:
 - engine sends an `mcp_tunnel_request`
 - the `AO Reach` client executes the HTTP `/mcp` call

CrewAI's native MCP resolver may expose long hashed tunnel tool names.
These BaseTools provide stable, short names that match what overlay
prompts/workflows expect (e.g. `run_terminal_command`).
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


def is_terminal_tunnel_mcp_entry(entry: Any) -> bool:
    url = _entry_url(entry).lower()
    if not url:
        return False
    if "/t/" not in url:
        return False
    return "terminal" in url


def partition_terminal_tunnel_mcps(mcps: list[Any]) -> tuple[list[Any], list[str]]:
    """Split resolved MCP configs into (non-terminal-tunnel, terminal loopback URLs)."""
    other: list[Any] = []
    urls: list[str] = []
    seen: set[str] = set()
    for entry in mcps:
        if is_terminal_tunnel_mcp_entry(entry):
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


def call_terminal_mcp_tool(
    base_url: str,
    name: str,
    arguments: dict[str, Any] | None = None,
) -> str:
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
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urlopen(req, timeout=120) as resp:  # noqa: S310 — loopback tunnel only
            raw = resp.read().decode("utf-8", errors="replace")
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        return f"Terminal MCP {name} failed: {exc}"

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
        # Prefer MCP-style `{ content: [{type, text}] }`, but fall back safely.
        chunks = result.get("content") or []
        texts: list[str] = []
        if isinstance(chunks, list):
            for item in chunks:
                if isinstance(item, dict) and item.get("text") is not None:
                    texts.append(str(item["text"]))
        if texts:
            return "\n".join(texts)[:8000]
        return str(result)[:8000]

    return str(result if result is not None else raw)[:8000]


def terminal_tunnel_tools(mcp_url: str) -> list[BaseTool]:
    url = str(mcp_url or "").strip()

    class RunTerminalCommandTool(BaseTool):
        name: str = "run_terminal_command"
        description: str = (
            "Run a terminal command via the COMSTAR session-tunnel MCP. "
            "Input: command (required string). "
            "Optional: waitForCompletion (boolean, default true) and timeoutMs (number)."
        )

        def _run(
            self,
            command: str,
            waitForCompletion: bool = True,
            timeoutMs: int | None = None,
        ) -> str:
            cmd = str(command or "").strip()
            if not cmd:
                return "Error: command is required"
            arguments: dict[str, Any] = {
                "command": cmd,
                "waitForCompletion": bool(waitForCompletion),
            }
            if isinstance(timeoutMs, int) and timeoutMs > 0:
                arguments["timeoutMs"] = timeoutMs
            return call_terminal_mcp_tool(url, "run_terminal_command", arguments)

    return [RunTerminalCommandTool()]


def attach_terminal_tunnel_tools_to_agents(
    agents: list[Any],
    mcp_urls: list[str],
) -> bool:
    """Append `run_terminal_command` shims; skip duplicates. Returns True when attached."""
    attached = False
    tools: list[BaseTool] = []
    for url in mcp_urls:
        tools.extend(terminal_tunnel_tools(url))

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

