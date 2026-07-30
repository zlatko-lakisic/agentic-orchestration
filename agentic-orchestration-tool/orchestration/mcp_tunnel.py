"""
Reverse MCP tunnel: engine-host HTTP loopback → owning WebSocket → client MCP.

Session MCP catalogs use ``tunnel://session-mcp/<alias>``. At resolve time those URLs
are rewritten to ``http://127.0.0.1:<port>/t/<connection_id>/<alias>/…``. CrewAI (or
any HTTP client) talks to loopback only — the daemon never dials the client LAN.
"""

from __future__ import annotations

import base64
import logging
import threading
import uuid
from concurrent.futures import Future
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Callable
from urllib.parse import unquote

from orchestration.session_overlay import (
    TUNNEL_URL_PREFIX,
    current_connection_id,
    get_overlay,
    mcp_tunnel_enabled,
    overlay_max_bytes,
)

logger = logging.getLogger(__name__)

DEFAULT_TUNNEL_TIMEOUT_S = 60.0

SendRequestFn = Callable[[dict[str, Any]], None]


class McpTunnelError(RuntimeError):
    """Tunnel proxy failure (timeout, unknown connection, disabled, etc.)."""


class _TunnelBridge:
    """Per-WebSocket ownership of pending ``mcp_tunnel_request`` futures."""

    def __init__(self, connection_id: str, send_request: SendRequestFn) -> None:
        self.connection_id = connection_id
        self._send_request = send_request
        self._pending: dict[str, Future[dict[str, Any]]] = {}
        self._lock = threading.Lock()
        self._closed = False

    def close(self) -> None:
        with self._lock:
            self._closed = True
            pending = list(self._pending.items())
            self._pending.clear()
        for _rid, fut in pending:
            if not fut.done():
                fut.set_exception(McpTunnelError("MCP tunnel closed (session overlay evicted)"))

    def deliver_response(self, message: dict[str, Any]) -> bool:
        request_id = str(message.get("requestId") or message.get("request_id") or "").strip()
        if not request_id:
            return False
        with self._lock:
            fut = self._pending.pop(request_id, None)
        if fut is None:
            return False
        if not fut.done():
            fut.set_result(message)
        return True

    def exchange(
        self,
        *,
        mcp_id: str,
        tunnel_path: str,
        method: str,
        path: str,
        headers: dict[str, str],
        body: bytes,
        timeout_s: float = DEFAULT_TUNNEL_TIMEOUT_S,
    ) -> dict[str, Any]:
        if self._closed:
            raise McpTunnelError("MCP tunnel closed")
        max_bytes = overlay_max_bytes()
        if len(body) > max_bytes:
            raise McpTunnelError(
                f"MCP tunnel request body is {len(body)} bytes; max is {max_bytes}"
            )
        request_id = str(uuid.uuid4())
        fut: Future[dict[str, Any]] = Future()
        with self._lock:
            if self._closed:
                raise McpTunnelError("MCP tunnel closed")
            self._pending[request_id] = fut

        payload = {
            "type": "mcp_tunnel_request",
            "requestId": request_id,
            "mcpId": mcp_id,
            "tunnelPath": tunnel_path,
            "method": method.upper(),
            "path": path,
            "headers": headers,
            "bodyBase64": base64.b64encode(body).decode("ascii") if body else "",
        }
        try:
            self._send_request(payload)
        except Exception as exc:  # noqa: BLE001
            with self._lock:
                self._pending.pop(request_id, None)
            raise McpTunnelError(f"failed to emit mcp_tunnel_request: {exc}") from exc

        try:
            return fut.result(timeout=timeout_s)
        except McpTunnelError:
            raise
        except Exception as exc:  # noqa: BLE001
            with self._lock:
                self._pending.pop(request_id, None)
            raise McpTunnelError(
                f"MCP tunnel timed out or failed waiting for requestId={request_id}: {exc}"
            ) from exc


class McpTunnelHub:
    """Process-wide loopback HTTP server + connection bridges."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._bridges: dict[str, _TunnelBridge] = {}
        self._server: ThreadingHTTPServer | None = None
        self._thread: threading.Thread | None = None
        self._port: int | None = None

    @property
    def port(self) -> int | None:
        return self._port

    def ensure_server(self) -> int:
        with self._lock:
            if self._server is not None and self._port is not None:
                return self._port
            hub = self

            class Handler(BaseHTTPRequestHandler):
                protocol_version = "HTTP/1.1"

                def log_message(self, fmt: str, *args: Any) -> None:  # noqa: A003
                    logger.debug("mcp-tunnel: " + fmt, *args)

                def _handle(self) -> None:
                    try:
                        status, resp_headers, body = hub._serve_http(self)
                    except McpTunnelError as exc:
                        status, resp_headers, body = (
                            502,
                            {"content-type": "text/plain; charset=utf-8"},
                            str(exc).encode("utf-8"),
                        )
                    except Exception as exc:  # noqa: BLE001
                        logger.exception("mcp-tunnel handler error")
                        status, resp_headers, body = (
                            500,
                            {"content-type": "text/plain; charset=utf-8"},
                            f"tunnel error: {exc}".encode("utf-8"),
                        )
                    self.send_response(status)
                    for hk, hv in resp_headers.items():
                        if str(hk).lower() == "transfer-encoding":
                            continue
                        self.send_header(str(hk), str(hv))
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    if self.command != "HEAD":
                        self.wfile.write(body)

                def do_GET(self) -> None:  # noqa: N802
                    self._handle()

                def do_POST(self) -> None:  # noqa: N802
                    self._handle()

                def do_PUT(self) -> None:  # noqa: N802
                    self._handle()

                def do_DELETE(self) -> None:  # noqa: N802
                    self._handle()

                def do_PATCH(self) -> None:  # noqa: N802
                    self._handle()

                def do_HEAD(self) -> None:  # noqa: N802
                    self._handle()

                def do_OPTIONS(self) -> None:  # noqa: N802
                    self._handle()

            server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
            server.daemon_threads = True
            port = int(server.server_address[1])
            thread = threading.Thread(
                target=server.serve_forever,
                name="agentic-mcp-tunnel",
                daemon=True,
            )
            thread.start()
            self._server = server
            self._thread = thread
            self._port = port
            logger.info("MCP tunnel loopback listening on 127.0.0.1:%s", port)
            return port

    def register_bridge(self, connection_id: str, send_request: SendRequestFn) -> _TunnelBridge:
        cid = str(connection_id or "").strip()
        if not cid:
            raise McpTunnelError("connection_id required for MCP tunnel bridge")
        self.ensure_server()
        bridge = _TunnelBridge(cid, send_request)
        with self._lock:
            old = self._bridges.pop(cid, None)
            self._bridges[cid] = bridge
        if old is not None:
            old.close()
        return bridge

    def unregister_bridge(self, connection_id: str) -> None:
        cid = str(connection_id or "").strip()
        with self._lock:
            bridge = self._bridges.pop(cid, None)
        if bridge is not None:
            bridge.close()

    def deliver_response(self, connection_id: str, message: dict[str, Any]) -> bool:
        cid = str(connection_id or "").strip()
        with self._lock:
            bridge = self._bridges.get(cid)
        if bridge is None:
            return False
        return bridge.deliver_response(message)

    def rewrite_tunnel_url(self, url: str, *, mcp_id: str) -> str:
        """Map ``tunnel://session-mcp/<alias>`` → loopback HTTP URL for this connection."""
        if not mcp_tunnel_enabled():
            raise McpTunnelError("MCP tunnel is disabled (AGENTIC_SERVE_MCP_TUNNEL=0)")
        text = str(url or "").strip().rstrip("/")
        if not text.startswith(TUNNEL_URL_PREFIX):
            return text
        alias = text[len(TUNNEL_URL_PREFIX) :].strip().strip("/")
        if not alias:
            raise McpTunnelError(f"invalid tunnel URL {url!r}")
        cid = current_connection_id()
        if not cid:
            raise McpTunnelError(
                f"tunnel URL {url!r} for mcp {mcp_id!r} requires an owning WebSocket connection"
            )
        port = self.ensure_server()
        with self._lock:
            if cid not in self._bridges:
                raise McpTunnelError(
                    f"no MCP tunnel bridge for connection {cid!r} (register overlay first)"
                )
        # CrewAI appends paths like /mcp; keep a stable mount prefix.
        return f"http://127.0.0.1:{port}/t/{cid}/{alias}"

    def _serve_http(
        self, handler: BaseHTTPRequestHandler
    ) -> tuple[int, dict[str, str], bytes]:
        if not mcp_tunnel_enabled():
            raise McpTunnelError("MCP tunnel is disabled")
        raw_path = unquote(handler.path or "/")
        # /t/<connection_id>/<alias>[/rest...]
        parts = raw_path.split("?", 1)
        path_only = parts[0]
        query = parts[1] if len(parts) > 1 else ""
        segs = [s for s in path_only.split("/") if s]
        if len(segs) < 3 or segs[0] != "t":
            return 404, {"content-type": "text/plain"}, b"not a tunnel path"
        connection_id, alias = segs[1], segs[2]
        rest = "/" + "/".join(segs[3:]) if len(segs) > 3 else "/"
        if query:
            rest = f"{rest}?{query}" if rest != "/" else f"/?{query}"

        length = int(handler.headers.get("Content-Length") or 0)
        max_bytes = overlay_max_bytes()
        if length > max_bytes:
            raise McpTunnelError(f"request body too large ({length} > {max_bytes})")
        body = handler.rfile.read(length) if length > 0 else b""

        with self._lock:
            bridge = self._bridges.get(connection_id)
        if bridge is None:
            raise McpTunnelError(f"unknown tunnel connection {connection_id!r}")

        # Resolve mcp id from the overlay owned by this connection (best-effort).
        from orchestration.session_overlay import overlays_for_connection, tunnel_alias_from_url

        mcp_id = f"client.{alias}"
        for overlay in overlays_for_connection(connection_id):
            for entry in overlay.mcps:
                sh = entry.get("streamable_http") if isinstance(entry, dict) else None
                if not isinstance(sh, dict):
                    continue
                if tunnel_alias_from_url(str(sh.get("url") or "")) == alias:
                    mcp_id = str(entry.get("id") or mcp_id)
                    break

        headers = {
            str(k): str(v)
            for k, v in handler.headers.items()
            if str(k).lower() not in ("host", "content-length", "transfer-encoding", "connection")
        }
        response = bridge.exchange(
            mcp_id=mcp_id,
            tunnel_path=alias,
            method=handler.command or "POST",
            path=rest,
            headers=headers,
            body=body,
        )
        status = int(response.get("status") or 502)
        resp_headers_raw = response.get("headers") or {}
        resp_headers: dict[str, str] = {}
        if isinstance(resp_headers_raw, dict):
            for hk, hv in resp_headers_raw.items():
                resp_headers[str(hk)] = str(hv)
        b64 = str(response.get("bodyBase64") or response.get("body_base64") or "")
        try:
            resp_body = base64.b64decode(b64) if b64 else b""
        except Exception as exc:  # noqa: BLE001
            raise McpTunnelError(f"invalid bodyBase64 in mcp_tunnel_response: {exc}") from exc
        if len(resp_body) > max_bytes:
            raise McpTunnelError(
                f"MCP tunnel response body is {len(resp_body)} bytes; max is {max_bytes}"
            )
        return status, resp_headers, resp_body

    def stop_for_tests(self) -> None:
        with self._lock:
            for bridge in list(self._bridges.values()):
                bridge.close()
            self._bridges.clear()
            server = self._server
            self._server = None
            self._thread = None
            self._port = None
        if server is not None:
            server.shutdown()


_HUB = McpTunnelHub()


def tunnel_hub() -> McpTunnelHub:
    return _HUB


def rewrite_tunnel_url_if_needed(url: str, *, mcp_id: str) -> str:
    text = str(url or "").strip()
    if not text.startswith(TUNNEL_URL_PREFIX):
        return text
    return tunnel_hub().rewrite_tunnel_url(text, mcp_id=mcp_id)


def register_connection_bridge(connection_id: str, send_request: SendRequestFn) -> None:
    tunnel_hub().register_bridge(connection_id, send_request)


def unregister_connection_bridge(connection_id: str) -> None:
    tunnel_hub().unregister_bridge(connection_id)


def deliver_tunnel_response(connection_id: str, message: dict[str, Any]) -> bool:
    return tunnel_hub().deliver_response(connection_id, message)


def assert_tunnel_owned_by_session(
    *,
    user_id: str,
    session_id: str,
    connection_id: str,
    mcp_id: str,
) -> None:
    overlay = get_overlay(user_id, session_id)
    if overlay is None:
        raise McpTunnelError("no session overlay for this identity")
    if overlay.connection_id != connection_id:
        raise McpTunnelError("MCP tunnel is owned by a different connection")
    ids = {str(e.get("id") or "") for e in overlay.mcps}
    if mcp_id not in ids:
        raise McpTunnelError(f"mcp id {mcp_id!r} is not in this session overlay")
