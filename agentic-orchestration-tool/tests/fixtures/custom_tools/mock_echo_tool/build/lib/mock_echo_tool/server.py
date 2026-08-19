"""Minimal loopback HTTP MCP stub: /health + /mcp JSON-RPC echo."""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any


class _Handler(BaseHTTPRequestHandler):
    server_version = "MockEchoTool/1.0"

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith("/health"):
            self._send_json(200, {"ok": True, "service": "mock-echo-tool"})
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        if not self.path.startswith("/mcp"):
            self.send_response(404)
            self.end_headers()
            return
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length else b"{}"
        try:
            req = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            req = {}
        method = str(req.get("method") or "")
        req_id = req.get("id")
        if method == "tools/list":
            result = {
                "tools": [
                    {
                        "name": "echo",
                        "description": "Echo input text",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"text": {"type": "string"}},
                        },
                    }
                ]
            }
        elif method == "tools/call":
            params = req.get("params") if isinstance(req.get("params"), dict) else {}
            text = ""
            args = params.get("arguments")
            if isinstance(args, dict):
                text = str(args.get("text") or "")
            result = {"content": [{"type": "text", "text": f"echo:{text}"}]}
        else:
            result = {"ok": True, "method": method}
        self._send_json(200, {"jsonrpc": "2.0", "id": req_id, "result": result})


def run_server(*, port: int | None = None, host: str = "127.0.0.1") -> None:
    bind_port = int(port if port is not None else os.environ.get("AGENTIC_TOOL_PORT") or 0)
    httpd = HTTPServer((host, bind_port), _Handler)
    httpd.serve_forever()
