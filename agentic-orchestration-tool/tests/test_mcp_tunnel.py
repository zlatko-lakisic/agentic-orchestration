"""MCP tunnel loopback ↔ WebSocket request/response round-trip."""

from __future__ import annotations

import base64
import json
import threading
from typing import Any

import pytest

from orchestration.mcp_tunnel import (
    deliver_tunnel_response,
    register_connection_bridge,
    rewrite_tunnel_url_if_needed,
    tunnel_hub,
    unregister_connection_bridge,
)
from orchestration.session_overlay import (
    overlay_run_context,
    register_overlay,
    reset_overlays_for_tests,
)

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _clean(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("AGENTIC_SERVE_MCP_TUNNEL", "1")
    reset_overlays_for_tests()
    unregister_connection_bridge("conn-1")
    yield
    unregister_connection_bridge("conn-1")
    reset_overlays_for_tests()
    tunnel_hub().stop_for_tests()


def test_tunnel_http_round_trip_via_mocked_ws() -> None:
    inbox: list[dict[str, Any]] = []
    ready = threading.Event()

    def send_request(payload: dict[str, Any]) -> None:
        inbox.append(payload)
        ready.set()

        def reply() -> None:
            ready.wait(timeout=2)
            req = inbox[-1]
            body = json.dumps({"ok": True, "tools": []}).encode("utf-8")
            deliver_tunnel_response(
                "conn-1",
                {
                    "type": "mcp_tunnel_response",
                    "requestId": req["requestId"],
                    "status": 200,
                    "headers": {"content-type": "application/json"},
                    "bodyBase64": base64.b64encode(body).decode("ascii"),
                },
            )

        threading.Thread(target=reply, daemon=True).start()

    register_connection_bridge("conn-1", send_request)
    register_overlay(
        user_id="ada",
        session_id="s1",
        connection_id="conn-1",
        mcps=[
            {
                "id": "client.filesystem_local",
                "streamable_http": {
                    "url": "tunnel://session-mcp/filesystem",
                    "headers": {},
                },
            }
        ],
        stock_ids=set(),
    )

    with overlay_run_context(user_id="ada", session_id="s1", connection_id="conn-1"):
        url = rewrite_tunnel_url_if_needed(
            "tunnel://session-mcp/filesystem",
            mcp_id="client.filesystem_local",
        )

    import urllib.request

    req = urllib.request.Request(
        url + "/mcp",
        data=b'{"jsonrpc":"2.0","method":"tools/list","id":1}',
        headers={"content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        assert resp.status == 200
        payload = json.loads(resp.read().decode("utf-8"))
    assert payload["ok"] is True
    assert inbox
    assert inbox[0]["type"] == "mcp_tunnel_request"
    assert inbox[0]["mcpId"] == "client.filesystem_local"
    assert inbox[0]["tunnelPath"] == "filesystem"
    assert inbox[0]["method"] == "POST"
    assert inbox[0]["path"] == "/mcp"
