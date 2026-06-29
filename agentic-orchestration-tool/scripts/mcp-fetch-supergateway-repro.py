#!/usr/bin/env python3
"""Step 1/2: reproduce CrewAI vs supergateway Streamable HTTP handshake for fetch_url.

Usage (supergateway must be listening on --url):
  docker run --rm -p 8080:8080 supercorp/supergateway:uvx \\
    --stdio "uvx mcp-server-fetch" --port 8080 --outputTransport streamableHttp

  python scripts/mcp-fetch-supergateway-repro.py
  python scripts/mcp-fetch-supergateway-repro.py --url http://127.0.0.1:8080/mcp --crewai
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

_TOOL_ROOT = Path(__file__).resolve().parents[1]
if str(_TOOL_ROOT) not in sys.path:
    sys.path.insert(0, str(_TOOL_ROOT))

import httpx

_INIT_BODY = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "agentic-repro", "version": "1"},
    },
}


def _post_initialize(url: str, *, session_id: str | None = None) -> tuple[int, dict[str, str], str]:
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if session_id:
        headers["mcp-session-id"] = session_id
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(url, headers=headers, json=_INIT_BODY)
        return resp.status_code, dict(resp.headers), resp.text


def _try_crewai_native(url: str) -> None:
    from orchestration.crewai_mcp_hotfix import apply_crewai_mcp_native_resolver_hotfix

    apply_crewai_mcp_native_resolver_hotfix()
    from crewai.mcp.tool_resolver import MCPToolResolver
    from crewai.utilities.logger import Logger

    config: dict[str, Any] = {
        "url": url.rstrip("/"),
        "transport": "streamable-http",
        "headers": {"Accept": "application/json, text/event-stream"},
    }
    resolver = MCPToolResolver(agent=None, logger=Logger(verbose=False))
    tools, _errors = resolver._resolve_native(config)
    print(f"CrewAI native tools: {len(tools)}")
    for tool in tools[:5]:
        print(f"  - {getattr(tool, 'name', tool)}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Reproduce fetch MCP via supergateway HTTP bridge")
    parser.add_argument("--url", default="http://127.0.0.1:8080/mcp", help="Streamable HTTP MCP URL")
    parser.add_argument("--crewai", action="store_true", help="Also run CrewAI MCPToolResolver")
    args = parser.parse_args()
    url = args.url.rstrip("/")

    print(f"POST initialize -> {url}")
    status, headers, body = _post_initialize(url)
    print(f"  status: {status}")
    print(f"  mcp-session-id: {headers.get('mcp-session-id', headers.get('Mcp-Session-Id', '(none)'))}")
    preview = body[:500] + ("..." if len(body) > 500 else "")
    print(f"  body: {preview}")

    session = headers.get("mcp-session-id") or headers.get("Mcp-Session-Id")
    if session and status < 400:
        print(f"POST tools/list (session={session[:12]}...)")
        list_body = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {},
        }
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream",
                    "mcp-session-id": session,
                },
                json=list_body,
            )
            print(f"  tools/list status: {resp.status_code}")
            print(f"  tools/list body: {resp.text[:400]}")

    if args.crewai:
        print("\nCrewAI MCPToolResolver._resolve_native:")
        try:
            _try_crewai_native(url)
        except Exception as exc:  # noqa: BLE001
            print(f"  FAILED: {exc}", file=sys.stderr)
            return 1

    if status >= 400:
        print(
            "\nDiagnosis: supergateway returned HTTP error on initialize. "
            "K8s workers should use worker-native stdio fetch (Option A) instead of this bridge.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
