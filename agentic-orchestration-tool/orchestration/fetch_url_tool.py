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


def extract_http_urls_from_text(text: str) -> list[str]:
    from orchestration.simple_chat import strip_web_prose_delivery_suffix

    raw = strip_web_prose_delivery_suffix(text)
    seen: set[str] = set()
    out: list[str] = []
    for match in _URL_RE.finditer(raw):
        url = match.group(0).rstrip(".,);]")
        if url not in seen:
            seen.add(url)
            out.append(url)
    return out


def extract_url_from_leak_or_topic(leaked_text: str, topic: str) -> str | None:
    params = parse_leaked_fetch_parameters(leaked_text)
    if params and params.get("url"):
        return str(params["url"]).strip()
    urls = extract_http_urls_from_text(topic)
    return urls[0] if urls else None


_FETCHED_MARKER = "[agentic: fetched page content]"


def _user_question_from_topic(topic: str) -> str:
    from orchestration.simple_chat import strip_web_prose_delivery_suffix

    return strip_web_prose_delivery_suffix(topic).strip()


def _summarize_task_description(user_question: str, fetched_block: str, *, minimal: bool = False) -> str:
    if minimal:
        return (
            "Repository / page text:\n"
            f"{fetched_block[:5000]}\n\n"
            "In 3-4 sentences, what is this software project or page about?"
        )
    return (
        f"Question: {user_question}\n\n"
        f"{_FETCHED_MARKER}\n{fetched_block}\n\n"
        "Answer the question directly using the page text above (2-5 sentences). "
        "Do not repeat formatting instructions."
    )


def run_ollama_fetch_summarize_step(
    *,
    built: Any,
    topic: str,
    task_description: str,
    urls: list[str],
) -> str:
    """
    Fetch URL(s) deterministically, then one summarize-only crew kickoff (tools disabled).

    Used for small Ollama models that print tool-call syntax instead of invoking CrewAI tools.
    """
    from orchestration.output_artifacts import workflow_result_to_extractable_text
    from orchestration.runner import crew_kickoff_context
    from orchestration.text_normalize import (
        looks_like_format_instruction_only,
        sanitize_user_facing_prose,
    )

    blocks: list[str] = []
    for url in urls[:3]:
        body = FetchUrlTool()._run(url, max_length=5000)
        blocks.append(f"### {url}\n{body}")
    fetched_block = "\n\n".join(blocks).strip()
    user_question = _user_question_from_topic(topic)
    text = ""

    for minimal in (False, True):
        summarize_desc = _summarize_task_description(
            user_question,
            fetched_block,
            minimal=minimal,
        )
        for crew_task in built.crew.tasks:
            crew_task.description = summarize_desc
            crew_task.expected_output = "A short plain-language summary."
        for agent in built.crew.agents:
            agent.tools = []
        with crew_kickoff_context(built):
            workflow_result = built.crew.kickoff(inputs={"topic": user_question})
        text = sanitize_user_facing_prose(workflow_result_to_extractable_text(workflow_result))
        if text and not looks_like_format_instruction_only(text):
            return text

    return text if text else "Could not summarize the page content."


def recover_fetch_url_after_tool_leak(
    *,
    built: Any,
    topic: str,
    task_description: str,
    leaked_text: str,
) -> str | None:
    """When kickoff returned tool-call syntax, fetch the URL and run summarize-only kickoff."""
    url = extract_url_from_leak_or_topic(leaked_text, topic)
    if not url:
        return None
    return run_ollama_fetch_summarize_step(
        built=built,
        topic=topic,
        task_description=task_description,
        urls=[url],
    )


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
