"""CrewAI tool shim for fetch_url — Ollama small models invoke this reliably vs native MCP."""

from __future__ import annotations

import http.client
import ipaddress
import json
import os
import re
import socket
from html import unescape
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from crewai.tools import BaseTool

from orchestration.mcp_stdio_hygiene import stdio_command_args_env

_URL_RE = re.compile(r"https?://[^\s<>\"')\]]+", re.IGNORECASE)


def is_fetch_stdio_mcp_entry(entry: Any) -> bool:
    """True for python -m mcp_server_fetch, uvx mcp-server-fetch, and MCPServerStdio of those."""
    if isinstance(entry, str):
        return False
    command, args, _ = stdio_command_args_env(entry)
    tokens = [command, *args]
    if not any(str(t).strip() for t in tokens):
        return False
    blob = " ".join(str(t) for t in tokens).lower()
    if "mcp_server_fetch" in blob or "mcp-server-fetch" in blob:
        return True
    return command.strip().lower() in ("mcp_server_fetch", "mcp-server-fetch")


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


def _html_to_plain_text(html: str, *, max_chars: int) -> str:
    """Strip common executable/style blocks then remaining tags; collapse whitespace."""
    # Closing tags must allow browser-forgiving forms like </script foo="bar">
    # (CodeQL py/bad-tag-filter).
    text = re.sub(r"(?is)<script\b[^>]*>.*?</script\b[^>]*>", " ", html)
    text = re.sub(r"(?is)<style\b[^>]*>.*?</style\b[^>]*>", " ", text)
    text = re.sub(r"(?is)<noscript\b[^>]*>.*?</noscript\b[^>]*>", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]


class FetchUrlBlocked(ValueError):
    """The URL (or a redirect hop) points at an address the fetch tool must not reach."""


_MAX_REDIRECTS = 5


def _allow_private_fetch() -> bool:
    """``AGENTIC_FETCH_URL_ALLOW_PRIVATE=1`` lifts the internal-address block entirely."""
    return os.getenv("AGENTIC_FETCH_URL_ALLOW_PRIVATE", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def _allowed_fetch_hosts() -> set[str]:
    """``AGENTIC_FETCH_URL_ALLOWED_HOSTS`` — comma list of hostnames exempt from the block."""
    raw = os.getenv("AGENTIC_FETCH_URL_ALLOWED_HOSTS", "")
    return {h.strip().lower() for h in raw.split(",") if h.strip()}


def _is_internal_address(addr: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    mapped = getattr(addr, "ipv4_mapped", None)
    if mapped is not None:
        addr = mapped
    # ``is_global`` is False for loopback, RFC 1918 / ULA, link-local (cloud metadata),
    # carrier-grade NAT, documentation and other special-purpose ranges.
    return bool(not addr.is_global or addr.is_multicast)


def assert_public_fetch_url(url: str) -> None:
    """
    Raise :class:`FetchUrlBlocked` unless ``url`` is http(s) to a public address.

    The tool is driven by model output (and by text on fetched pages), so without this a
    remote client could read loopback-only surfaces of the engine host, cloud metadata
    (``169.254.169.254``), Ollama, or in-cluster services through the answer text.
    Every address the hostname resolves to must be public.
    """
    try:
        parts = urlsplit(str(url or "").strip())
        port = parts.port
    except ValueError as exc:
        raise FetchUrlBlocked(f"invalid URL: {exc}") from exc
    if parts.scheme not in ("http", "https"):
        raise FetchUrlBlocked("only http and https URLs can be fetched")
    host = (parts.hostname or "").strip().lower()
    if not host:
        raise FetchUrlBlocked("URL has no host")
    if _allow_private_fetch() or host in _allowed_fetch_hosts():
        return
    try:
        infos = socket.getaddrinfo(host, port or (443 if parts.scheme == "https" else 80))
    except (socket.gaierror, UnicodeError, OSError) as exc:
        raise FetchUrlBlocked(f"could not resolve host {host!r}: {exc}") from exc
    for info in infos:
        try:
            addr = ipaddress.ip_address(str(info[4][0]).split("%", 1)[0])
        except ValueError:
            raise FetchUrlBlocked(f"host {host!r} resolved to an unusable address") from None
        if _is_internal_address(addr):
            raise FetchUrlBlocked(
                f"host {host!r} resolves to a loopback, private or link-local address"
            )


class _NoRedirect(HTTPRedirectHandler):
    """Surface 3xx as ``HTTPError`` so each hop can be re-validated before it is followed."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001, D102
        return None


def fetch_url_text(url: str, *, max_chars: int | None = None) -> str:
    cap = max_chars if max_chars is not None else _max_fetch_chars()
    headers = {
        "User-Agent": os.getenv(
            "AGENTIC_FETCH_URL_USER_AGENT",
            "agentic-orchestration/1.10 (+https://github.com/zlatko-lakisic/agentic-orchestration)",
        ),
        "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
    }
    opener = build_opener(_NoRedirect())
    current = str(url or "").strip()
    raw = b""
    for _hop in range(_MAX_REDIRECTS + 1):
        assert_public_fetch_url(current)
        try:
            with opener.open(Request(current, headers=headers), timeout=25) as resp:  # noqa: S310
                raw = resp.read(cap * 8)
            break
        except HTTPError as exc:
            location = exc.headers.get("Location") if exc.headers is not None else None
            if exc.code in (301, 302, 303, 307, 308) and location:
                current = urljoin(current, location)
                continue
            raise
    else:
        raise FetchUrlBlocked(f"too many redirects (>{_MAX_REDIRECTS})")
    text = raw.decode("utf-8", errors="replace")
    plain = _html_to_plain_text(text, max_chars=cap)

    from orchestration.cloud_anonymize import redact_tool_result_for_cloud

    return redact_tool_result_for_cloud(plain)


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
    from orchestration.mcp_stdio_hygiene import disable_agent_tools_and_mcps
    from orchestration.output_artifacts import workflow_result_to_extractable_text
    from orchestration.crewai_template import crew_kickoff
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
            disable_agent_tools_and_mcps(agent)
        with crew_kickoff_context(built):
            workflow_result = crew_kickoff(built.crew, inputs={"topic": user_question})
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
        except FetchUrlBlocked as exc:
            return f"Fetch blocked for {target}: {exc}"
        except (
            HTTPError,
            URLError,
            TimeoutError,
            ValueError,
            http.client.HTTPException,
            OSError,
        ) as exc:
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
