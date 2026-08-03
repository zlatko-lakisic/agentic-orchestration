"""Normalize AO MCP catalog entries into values CrewAI ``Agent(mcps=...)`` accepts."""

from __future__ import annotations

import warnings
from typing import Any


def _legacy_string_mcps(mcps: list[Any]) -> list[Any] | None:
    """CrewAI <1.12 only accepts ``list[str]`` (HTTP URLs / AMP refs)."""
    out: list[Any] = []
    skipped_stdio = 0
    for entry in mcps:
        if isinstance(entry, str):
            s = entry.strip()
            if s:
                out.append(s)
            continue
        if not isinstance(entry, dict):
            raise TypeError(f"Unsupported MCP entry type: {type(entry)!r}")
        if "command" in entry:
            skipped_stdio += 1
            continue
        url = str(entry.get("url") or "").strip()
        if url:
            out.append(url)
            continue
        raise ValueError(f"MCP dict entry missing command or url: {entry!r}")
    if skipped_stdio:
        warnings.warn(
            f"Skipping {skipped_stdio} stdio MCP config(s): CrewAI lacks crewai.mcp "
            "(need crewai>=1.12). Chat continues without those tools.",
            UserWarning,
            stacklevel=3,
        )
    return out or None


def normalize_mcps_for_crewai(mcps: list[Any] | None) -> list[Any] | None:
    """
    Convert resolved MCP entries into values CrewAI ``Agent(mcps=...)`` accepts.

    CrewAI >= 1.12 accepts ``str | MCPServerStdio | MCPServerHTTP | MCPServerSSE``.
    Plain dicts (AO catalog resolve output) must be coerced or Agent validation fails.
    On older CrewAI, keep URL strings and drop stdio dicts (with a warning).
    """
    if not mcps:
        return None

    try:
        from crewai.mcp import MCPServerHTTP, MCPServerSSE, MCPServerStdio
    except ImportError:
        return _legacy_string_mcps(mcps)

    out: list[Any] = []
    for entry in mcps:
        if isinstance(entry, str):
            s = entry.strip()
            if s:
                out.append(s)
            continue
        if isinstance(entry, (MCPServerStdio, MCPServerHTTP, MCPServerSSE)):
            out.append(entry)
            continue
        if not isinstance(entry, dict):
            raise TypeError(f"Unsupported MCP entry type: {type(entry)!r}")

        if "command" in entry:
            env = entry.get("env")
            out.append(
                MCPServerStdio(
                    command=str(entry["command"]),
                    args=[str(a) for a in (entry.get("args") or [])],
                    env={str(k): str(v) for k, v in env.items()} if isinstance(env, dict) else None,
                )
            )
            continue

        url = str(entry.get("url") or "").strip()
        if not url:
            raise ValueError(f"MCP dict entry missing command or url: {entry!r}")
        # CrewAI prefixes tool names from the URL host; OpenAI rejects names that
        # start with a digit (http://127.0.0.1:… → 127_0_0_1_…).
        if url.startswith("http://127.0.0.1:"):
            url = "http://localhost:" + url[len("http://127.0.0.1:") :]
        elif url.startswith("https://127.0.0.1:"):
            url = "https://localhost:" + url[len("https://127.0.0.1:") :]
        transport = str(entry.get("transport") or "streamable-http").strip().lower()
        headers = entry.get("headers")
        header_map = (
            {str(k): str(v) for k, v in headers.items()} if isinstance(headers, dict) else None
        )
        if transport in ("sse", "server-sent-events"):
            out.append(MCPServerSSE(url=url, headers=header_map))
        else:
            out.append(MCPServerHTTP(url=url, headers=header_map, streamable=True))

    return out or None
