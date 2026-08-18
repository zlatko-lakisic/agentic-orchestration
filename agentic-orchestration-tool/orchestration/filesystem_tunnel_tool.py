"""CrewAI tool shims for COMSTAR session-tunnel filesystem MCP.

CrewAI native MCP prefixes the loopback tunnel URL into tool names until they hash,
so overlay prompts that say ``read_file`` never match a callable tool. These BaseTools
use the original MCP names and JSON-RPC POST to the engine loopback (which the tunnel
forwards to the IDE).
"""

from __future__ import annotations

import json
import re
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


_FILE_RE = re.compile(
    r"\b((?:[\w.-]+[/\\])*[\w.-]+\.(?:py|txt|md|json|ya?ml|ts|tsx|js|jsx))\b",
    re.IGNORECASE,
)


def extract_filenames_from_topic(topic: str) -> list[str]:
    """Filenames mentioned in the user turn (hello.txt, buggy.py, …)."""
    seen: set[str] = set()
    out: list[str] = []
    for match in _FILE_RE.finditer(str(topic or "")):
        name = match.group(1).strip()
        key = name.lower()
        if not name or key in seen:
            continue
        seen.add(key)
        out.append(name)
    return out


def run_ollama_filesystem_tunnel_step(
    *,
    built: Any,
    topic: str,
    mcp_url: str,
    filenames: list[str],
) -> str:
    """Read tunnel files deterministically, then one summarize-only crew kickoff.

    Small Ollama models print tool-call syntax instead of invoking CrewAI tools; this
    is the same pattern as ``run_ollama_fetch_summarize_step``.
    """
    from orchestration.crewai_template import crew_kickoff
    from orchestration.mcp_stdio_hygiene import disable_agent_tools_and_mcps
    from orchestration.output_artifacts import workflow_result_to_extractable_text
    from orchestration.runner import crew_kickoff_context
    from orchestration.simple_chat import user_turn_for_simple_chat
    from orchestration.text_normalize import sanitize_user_facing_prose

    roots = call_filesystem_mcp_tool(mcp_url, "list_allowed_directories", {})
    blocks = [f"Allowed directories:\n{roots}"]
    bodies: dict[str, str] = {}
    for name in filenames[:8]:
        body = call_filesystem_mcp_tool(mcp_url, "read_file", {"path": name})
        bodies[name] = body
        blocks.append(f"### {name}\n{body}")
    material = "\n\n".join(blocks)
    topic_l = str(topic or "").lower()
    if len(filenames) == 1 and (
        "only the file contents" in topic_l or "reply with only" in topic_l
    ):
        return bodies[filenames[0]]
    if "truncat" in topic_l and filenames:
        blob = "\n".join(bodies.get(name, "") for name in filenames)
        if "truncated" in blob.lower() or "…" in blob:
            return "The filesystem MCP result looks truncated."
        return "The filesystem MCP result does not look truncated."
    user_question = user_turn_for_simple_chat(topic).strip() or str(topic).strip()
    summarize_desc = (
        f"{user_question}\n\n[agentic: workspace files]\n{material}\n\n"
        "Answer using the file contents above. If the user asked for file contents, "
        "quote them. If they asked to review code, name the concrete bug."
    )
    for crew_task in built.crew.tasks:
        crew_task.description = summarize_desc
        crew_task.expected_output = "A clear answer based on the workspace files."
    for agent in built.crew.agents:
        disable_agent_tools_and_mcps(agent)
        llm = getattr(agent, "llm", None)
        if llm is not None:
            for key in ("think", "thinking"):
                try:
                    setattr(llm, key, False)
                except Exception:  # noqa: BLE001
                    pass
    with crew_kickoff_context(built):
        workflow_result = crew_kickoff(built.crew, inputs={"topic": user_question})
    return sanitize_user_facing_prose(
        workflow_result_to_extractable_text(workflow_result)
    )
