"""CrewAI tool shim for fetch_url — Ollama small models invoke this reliably vs native MCP."""

from __future__ import annotations

import json
import os
import re
from html import unescape
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from crewai.tools import BaseTool

_URL_RE = re.compile(r"https?://[^\s<>\"')\]]+", re.IGNORECASE)


def is_fetch_stdio_mcp_entry(entry: Any) -> bool:
    if not isinstance(entry, dict):
        return False
    args = entry.get("args") or []
    if any("mcp_server_fetch" in str(a) for a in args):
        return True
    return str(entry.get("command", "")).strip().lower() == "mcp_server_fetch"


def partition_fetch_stdio_mcps(mcps: list[Any]) -> tuple[list[Any], list[Any]]:
    """Split resolved MCP configs into (non-fetch, fetch-stdio)."""
    other: list[Any] = []
    fetch_stdio: list[Any] = []
    for entry in mcps:
        if is_fetch_stdio_mcp_entry(entry):
            fetch_stdio.append(entry)
        else:
            other.append(entry)
    return other, fetch_stdio


def _max_fetch_chars() -> int:
    try:
        return max(2000, min(40000, int(os.getenv("AGENTIC_FETCH_URL_MAX_CHARS", "14000"))))
    except ValueError:
        return 14000


def fetch_url_text(url: str, *, max_chars: int | None = None) -> str:
    cap = max_chars if max_chars is not None else _max_fetch_chars()
    req = Request(
        url,
        headers={
            "User-Agent": os.getenv(
                "AGENTIC_FETCH_URL_USER_AGENT",
                "agentic-orchestration/1.10 (+https://github.com/zlatko-lakisic/agentic-orchestration)",
            ),
            "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        },
    )
    with urlopen(req, timeout=25) as resp:  # noqa: S310 — agent-invoked bounded fetch
        raw = resp.read(cap * 8)
    text = raw.decode("utf-8", errors="replace")
    text = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", text)
    text = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", text)
    text = re.sub(r"(?is)<noscript[^>]*>.*?</noscript>", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:cap]


class FetchUrlTool(BaseTool):
    name: str = "fetch"
    description: str = (
        "Fetch the readable text content of an HTTP or HTTPS URL. "
        "Use when the user shares a link or asks what a webpage or repository is about. "
        "Input: url (required string). Optional: max_length (integer, default 5000)."
    )

    def _run(self, url: str, max_length: int = 5000) -> str:
        target = str(url or "").strip()
        if not target:
            return "Error: url is required"
        if not _URL_RE.match(target):
            return f"Error: invalid URL {target!r}"
        try:
            cap = max(500, min(40000, int(max_length)))
        except (TypeError, ValueError):
            cap = 5000
        try:
            body = fetch_url_text(target, max_chars=cap)
        except (HTTPError, URLError, TimeoutError, ValueError) as exc:
            return f"Fetch failed for {target}: {exc}"
        if not body.strip():
            return f"(empty page body for {target})"
        return body


def attach_fetch_url_tool_to_agents(agents: list[Any]) -> bool:
    """Append ``FetchUrlTool`` to each agent if not already present. Returns True when attached."""
    tool = FetchUrlTool()
    attached = False
    for agent in agents:
        existing = list(getattr(agent, "tools", None) or [])
        if any(getattr(t, "name", "") == tool.name for t in existing):
            continue
        agent.tools = [*existing, tool]
        attached = True
    return attached


def parse_leaked_fetch_parameters(text: str) -> dict[str, Any] | None:
    """Best-effort parse of ``parameters: {...}`` from a tool-call leak (for diagnostics)."""
    m = re.search(r"parameters:\s*(\{.*\})\s*$", str(text or ""), re.MULTILINE | re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None
