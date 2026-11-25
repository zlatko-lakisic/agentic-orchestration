"""Engine daemon access control: operator credential, Origin/Host checks, body limits,
session-id binding, deal roles, and WebSocket run accounting."""

from __future__ import annotations

import asyncio
import os
import threading
import time
from pathlib import Path
from typing import Any

import pytest

from orchestration.serve import fastapi_available

pytestmark = pytest.mark.unit

if not fastapi_available():  # pragma: no cover - exercised on CLI-only installs
    pytest.skip(
        "fastapi not installed (pip install -r requirements-serve.txt)",
        allow_module_level=True,
    )

from fastapi.testclient import TestClient  # noqa: E402

from orchestration.serve import access  # noqa: E402
from orchestration.serve.app import create_app  # noqa: E402

TOKEN = "operator-secret-for-tests"
OPERATOR = {"Authorization": f"Bearer {TOKEN}"}


@pytest.fixture
def root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setenv("AGENTIC_KB", "1")
    for name in (
        "AGENTIC_REQUIRE_IDENTITY",
        "AGENTIC_DEAL_AUTH",
        "AGENTIC_SERVE_ADMIN_TOKEN",
        "AGENTIC_SERVE_ALLOWED_ORIGINS",
        "AGENTIC_SERVE_ALLOWED_HOSTS",
        "AGENTIC_SERVE_TRUSTED_PROXIES",
        "AGENTIC_SERVE_TLS_REQUIRE_CLIENT_CERT",
        "AGENTIC_SERVE_TLS_CA_FILE",
        "AGENTIC_SERVE_TRUST_CLIENT_SESSION_ID",
    ):
        monkeypatch.delenv(name, raising=False)
    return tmp_path


# ---- access helpers --------------------------------------------------------


def test_operator_token_is_required_when_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_ADMIN_TOKEN", TOKEN)
    assert access.operator_authorized({"authorization": f"Bearer {TOKEN}"}, "10.0.0.9")
    # Loopback is not enough once a token is configured.
    assert not access.operator_authorized({}, "127.0.0.1")
    assert not access.operator_authorized({"authorization": "Bearer nope"}, "127.0.0.1")
    assert not access.operator_authorized({"authorization": f"Basic {TOKEN}"}, "127.0.0.1")


def test_operator_falls_back_to_direct_loopback_only(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_SERVE_ADMIN_TOKEN", raising=False)
    assert access.operator_authorized({}, "127.0.0.1")
    assert access.operator_authorized({}, "::1")
    assert access.operator_authorized({}, "::ffff:127.0.0.1")
    assert not access.operator_authorized({}, "192.168.1.20")
    assert not access.operator_authorized({}, "testclient")
    # A local reverse proxy relaying someone else's request is not the operator.
    assert not access.operator_authorized({"x-forwarded-for": "203.0.113.5"}, "127.0.0.1")


@pytest.mark.parametrize(
    ("headers", "expected"),
    [
        ({}, True),
        ({"origin": "http://localhost:3847", "host": "127.0.0.1:8765"}, True),
        ({"origin": "https://ao.example.test", "host": "ao.example.test"}, True),
        ({"origin": "https://evil.example", "host": "127.0.0.1:8765"}, False),
        ({"origin": "http://localhost.evil.example", "host": "127.0.0.1:8765"}, False),
        ({"origin": "null", "host": "127.0.0.1:8765"}, False),
    ],
)
def test_origin_rule(headers: dict[str, str], expected: bool, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_SERVE_ALLOWED_ORIGINS", raising=False)
    assert access.origin_allowed(headers) is expected


def test_origin_allow_list(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_ALLOWED_ORIGINS", "https://console.example.test, other.test")
    assert access.origin_allowed({"origin": "https://console.example.test", "host": "x"})
    assert access.origin_allowed({"origin": "http://other.test:8080", "host": "x"})
    assert not access.origin_allowed({"origin": "https://evil.example", "host": "x"})


def test_host_rule_only_applies_to_a_loopback_bind(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_SERVE_ALLOWED_HOSTS", raising=False)
    assert access.host_allowed({"host": "localhost:8765"}, "127.0.0.1")
    assert not access.host_allowed({"host": "rebind.evil.example:8765"}, "127.0.0.1")
    # Not bound to loopback (or no listener): the proxy's public name is expected.
    assert access.host_allowed({"host": "ao.example.test"}, "0.0.0.0")
    assert access.host_allowed({"host": "testserver"}, None)
    monkeypatch.setenv("AGENTIC_SERVE_ALLOWED_HOSTS", "engine.internal")
    assert access.host_allowed({"host": "engine.internal:8765"}, "127.0.0.1")


def test_forwarded_client_ip_only_from_trusted_proxy(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_SERVE_TRUSTED_PROXIES", raising=False)
    spoof = {"x-forwarded-for": "1.2.3.4"}
    assert access.client_ip(spoof, "203.0.113.7") == "203.0.113.7"
    assert access.client_ip(spoof, "127.0.0.1") == "1.2.3.4"
    monkeypatch.setenv("AGENTIC_SERVE_TRUSTED_PROXIES", "10.42.0.0/16")
    assert access.client_ip(spoof, "10.42.3.9") == "1.2.3.4"
    assert access.client_ip(spoof, "10.43.3.9") == "10.43.3.9"


# ---- admin routes ----------------------------------------------------------

ADMIN_GETS = (
    "/api/v1/admin/reach-sessions",
    "/api/v1/admin/custom-tool-sandboxes",
    "/api/v1/admin/mtls/clients",
)


def test_admin_routes_reject_a_non_loopback_peer_without_credential(root: Path) -> None:
    # TestClient's peer is ("testclient", 50000): not loopback, no token configured.
    with TestClient(create_app(tool_root_path=root)) as client:
        for path in ADMIN_GETS:
            assert client.get(path).status_code == 401, path
        assert client.post("/api/v1/admin/mtls/enroll-tokens", json={}).status_code == 401
        assert (
            client.post("/api/v1/admin/mtls/clients/revoke", json={"subject": "x"}).status_code
            == 401
        )
        assert client.post("/api/v1/admin/background-activity/cancel").status_code == 401
        # Public probes are unaffected.
        assert client.get("/ready").status_code == 200
        assert client.get("/api/ping").status_code == 200


def test_admin_routes_accept_direct_loopback_peer_without_token(root: Path) -> None:
    with TestClient(create_app(tool_root_path=root), client=("127.0.0.1", 50123)) as client:
        for path in ADMIN_GETS:
            assert client.get(path).status_code == 200, path


def test_admin_routes_accept_the_operator_bearer(root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_ADMIN_TOKEN", TOKEN)
    with TestClient(create_app(tool_root_path=root), client=("127.0.0.1", 50123)) as client:
        # With a token configured, loopback alone no longer suffices.
        assert client.get("/api/v1/admin/mtls/clients").status_code == 401
        assert (
            client.get(
                "/api/v1/admin/mtls/clients", headers={"Authorization": "Bearer wrong"}
            ).status_code
            == 401
        )
        assert client.get("/api/v1/admin/mtls/clients", headers=OPERATOR).status_code == 200


def test_mtls_does_not_exempt_admin_routes(root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Under required mTLS, a certificate-less peer reaches admin routes only as operator."""
    monkeypatch.setenv("AGENTIC_SERVE_TLS_REQUIRE_CLIENT_CERT", "1")
    monkeypatch.setenv("AGENTIC_SERVE_ADMIN_TOKEN", TOKEN)
    with TestClient(create_app(tool_root_path=root)) as client:
        minted = client.post("/api/v1/admin/mtls/enroll-tokens", json={"clientName": "eve"})
        assert minted.status_code == 401
        assert client.get("/api/v1/admin/reach-sessions").status_code == 401
        assert client.post("/api/v1/admin/mtls/clients/unrevoke", json={"subject": "a"}).status_code == 401
        # Non-admin protected route still needs a client certificate.
        assert client.get("/api/session").status_code == 401
        # The coordinator (no client cert, operator bearer) gets through.
        assert client.get("/api/v1/admin/reach-sessions", headers=OPERATOR).status_code == 200
        # Enrollment itself stays reachable without a cert.
        assert client.get("/health").status_code == 200


def test_health_hides_layout_from_anonymous_peers(root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_ADMIN_TOKEN", TOKEN)
    with TestClient(create_app(tool_root_path=root)) as client:
        anonymous = client.get("/health").json()
        assert "toolRoot" not in anonymous and "bind" not in anonymous
        operator = client.get("/health", headers=OPERATOR).json()
        assert operator["toolRoot"] == str(root)
        assert "bind" in operator


def test_admin_post_requires_json_content_type(root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_ADMIN_TOKEN", TOKEN)
    with TestClient(create_app(tool_root_path=root)) as client:
        # A cross-site "simple" form post cannot set application/json.
        plain = client.post(
            "/api/v1/admin/mtls/clients/revoke",
            content=b'{"subject": "alice"}',
            headers={**OPERATOR, "Content-Type": "text/plain"},
        )
        assert plain.status_code == 415
        bad = client.post(
            "/api/v1/admin/mtls/clients/revoke",
            content=b"{not json",
            headers={**OPERATOR, "Content-Type": "application/json"},
        )
        assert bad.status_code == 400
        ok = client.post(
            "/api/v1/admin/mtls/clients/revoke", json={"subject": "alice"}, headers=OPERATOR
        )
        assert ok.status_code == 200
        assert ok.json()["closedConnections"] == 0
        huge = client.post(
            "/api/v1/admin/mtls/clients/revoke",
            content=b"{" + b" " * (70 * 1024) + b"}",
            headers={**OPERATOR, "Content-Type": "application/json"},
        )
        assert huge.status_code == 413


# ---- Origin / Host on the wire ---------------------------------------------


def test_state_changing_request_from_foreign_origin_is_refused(root: Path) -> None:
    with TestClient(create_app(tool_root_path=root)) as client:
        payload = {"content": "note", "userGoal": "g"}
        evil = client.post(
            "/api/v1/kb/ingest", json=payload, headers={"Origin": "https://evil.example"}
        )
        assert evil.status_code == 403
        assert client.post("/api/v1/kb/ingest", json=payload).status_code == 200
        same = client.post(
            "/api/v1/kb/ingest", json=payload, headers={"Origin": "http://localhost:3847"}
        )
        assert same.status_code == 200


def test_websocket_from_foreign_origin_is_refused(root: Path) -> None:
    from starlette.websockets import WebSocketDisconnect

    with TestClient(create_app(tool_root_path=root)) as client:
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/ws", headers={"Origin": "https://evil.example"}):
                pass
        with client.websocket_connect("/ws", headers={"Origin": "http://127.0.0.1:3847"}) as ws:
            assert ws.receive_json()["type"] == "hello"


def test_loopback_bound_daemon_rejects_foreign_host_header(
    root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import orchestration.serve.app as app_module

    monkeypatch.setattr(app_module, "bound_host", lambda: "127.0.0.1")
    with TestClient(
        create_app(tool_root_path=root), base_url="http://rebind.evil.example"
    ) as client:
        assert client.get("/health").status_code == 403
    with TestClient(create_app(tool_root_path=root), base_url="http://localhost:8765") as client:
        assert client.get("/ready").status_code == 200


def test_hello_omits_tool_root_for_remote_peers(root: Path) -> None:
    with TestClient(create_app(tool_root_path=root)) as client:
        with client.websocket_connect("/ws") as ws:
            assert "toolRoot" not in ws.receive_json()
    with TestClient(create_app(tool_root_path=root), client=("127.0.0.1", 50001)) as client:
        with client.websocket_connect("/ws") as ws:
            assert ws.receive_json()["toolRoot"] == str(root)


# ---- body size limits ------------------------------------------------------


def test_file_upload_over_limit_is_refused_before_buffering(
    root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_FILES_MAX_BYTES", "1024")
    with TestClient(create_app(tool_root_path=root)) as client:
        big = b"x" * (3 * 1024 * 1024)
        response = client.post(
            "/api/v1/files", files={"file": ("big.txt", big, "text/plain")}
        )
        assert response.status_code == 413


def test_custom_tool_upload_over_limit_is_refused(
    root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_CUSTOM_TOOL_SANDBOX", "1")
    monkeypatch.setenv("AGENTIC_CUSTOM_TOOL_MAX_UPLOAD_BYTES", str(64 * 1024))
    with TestClient(create_app(tool_root_path=root)) as client:
        response = client.post(
            "/api/v1/custom-tools/upload?appId=mock-comstar",
            content=b"z" * (128 * 1024),
            headers={"Content-Type": "application/zip"},
        )
        assert response.status_code == 413
        garbage = client.post(
            "/api/v1/custom-tools/upload?appId=mock-comstar",
            content=b"this is not a zip",
            headers={"Content-Type": "application/zip"},
        )
        assert garbage.status_code == 400


def test_custom_tool_activate_rejects_path_like_tool_id(
    root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_CUSTOM_TOOL_SANDBOX", "1")
    with TestClient(create_app(tool_root_path=root)) as client:
        response = client.post(
            "/api/v1/custom-tools/activate",
            json={
                "appId": "mine",
                "toolId": "client.app.mine@1.0.0/../../../victim/app/victim__app__client.app.t",
                "toolVersion": "1.0.0",
            },
        )
        assert response.status_code == 400
        assert "invalid toolId" in response.json()["detail"]


# ---- knowledge base deal scoping -------------------------------------------


def _server_mode(monkeypatch: pytest.MonkeyPatch, root: Path) -> None:
    from orchestration.deal_auth import add_member

    monkeypatch.setenv("AGENTIC_DEAL_AUTH", "1")
    add_member(tool_root=root, deal_id="acme", user_id="ada", role="owner")
    add_member(tool_root=root, deal_id="acme", user_id="vic", role="viewer")
    add_member(tool_root=root, deal_id="globex", user_id="bob", role="owner")


def _as(user: str) -> dict[str, str]:
    return {"x-agentic-user-name": user}


def test_kb_search_without_deal_only_sees_own_deals(
    root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _server_mode(monkeypatch, root)
    with TestClient(create_app(tool_root_path=root)) as client:
        for user, deal, text in (
            ("ada", "acme", "zebra acme confidential"),
            ("bob", "globex", "zebra globex confidential"),
        ):
            ingested = client.post(
                "/api/v1/kb/ingest",
                json={"content": text, "dealId": deal, "fast": False},
                headers=_as(user),
            )
            assert ingested.status_code == 200, ingested.text
        hits = client.get("/api/v1/kb/search", params={"q": "zebra"}, headers=_as("ada")).json()
        deals = {h["dealId"] for h in hits["hits"]}
        assert deals == {"acme"}
        scoped = client.get(
            "/api/v1/kb/search", params={"q": "zebra", "scope": "deal"}, headers=_as("ada")
        ).json()
        assert {h["dealId"] for h in scoped["hits"]} == {"acme"}
        stranger = client.get(
            "/api/v1/kb/search", params={"q": "zebra"}, headers=_as("mallory")
        ).json()
        assert stranger["hits"] == []


def test_kb_writes_need_editor_and_delete_needs_owner(
    root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _server_mode(monkeypatch, root)
    with TestClient(create_app(tool_root_path=root)) as client:
        denied = client.post(
            "/api/v1/kb/ingest",
            json={"content": "viewer write", "dealId": "acme", "fast": False},
            headers=_as("vic"),
        )
        assert denied.status_code == 403
        assert (
            client.delete("/api/v1/kb/scope/acme", headers=_as("vic")).status_code == 403
        )
        # Viewers may still read.
        assert (
            client.get(
                "/api/v1/kb/search", params={"q": "anything", "dealId": "acme"}, headers=_as("vic")
            ).status_code
            == 200
        )
        assert client.delete("/api/v1/kb/scope/acme", headers=_as("ada")).status_code == 200
        # An id that normalizes to nothing is not "no deal".
        assert (
            client.get(
                "/api/v1/kb/search", params={"q": "x", "dealId": "!!!"}, headers=_as("ada")
            ).status_code
            == 403
        )


def test_kb_upsert_cannot_overwrite_another_deals_source(
    root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _server_mode(monkeypatch, root)
    with TestClient(create_app(tool_root_path=root)) as client:
        first = client.post(
            "/api/v1/kb/upsert",
            json={"sourceId": "doc-1", "content": "acme original", "dealId": "acme"},
            headers=_as("ada"),
        ).json()
        assert first["action"] == "inserted"
        attack = client.post(
            "/api/v1/kb/upsert",
            json={"sourceId": "doc-1", "content": "overwritten by bob"},
            headers=_as("bob"),
        ).json()
        assert attack["action"] == "inserted"
        assert attack["docId"] != first["docId"]
        kept = client.get(
            "/api/v1/kb/search", params={"q": "original", "dealId": "acme"}, headers=_as("ada")
        ).json()
        assert len(kept["hits"]) == 1


# ---- session id binding ----------------------------------------------------


def test_request_session_id_resolution() -> None:
    from orchestration.user_context import Identity, resolve_request_session_id

    local = Identity(user_name=None, session_id="web-1", user_id="local", local=True)
    assert resolve_request_session_id(local, "my-thread") == "my-thread"
    assert resolve_request_session_id(local, None) == "web-1"
    assert resolve_request_session_id(local, "../../etc/passwd") == "web-1"

    proxied = Identity(
        user_name="Bob", session_id="wg-bob", user_id="bob", local=False, session_from_header=True
    )
    # The proxy's session wins; a body value naming Alice's session is ignored.
    assert resolve_request_session_id(proxied, "wg-alice") == "wg-bob"

    alice = Identity(user_name="alice", session_id="web-a", user_id="alice", local=False, mtls=True)
    bob = Identity(user_name="bob", session_id="web-b", user_id="bob", local=False, mtls=True)
    a_slug = resolve_request_session_id(alice, "thread-7")
    b_slug = resolve_request_session_id(bob, "thread-7")
    assert a_slug != b_slug
    assert a_slug.endswith("-thread-7") and a_slug.startswith("u-")
    assert resolve_request_session_id(alice, "thread-7") == a_slug  # stable


def test_trust_client_session_id_escape_hatch(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.user_context import Identity, resolve_request_session_id

    monkeypatch.setenv("AGENTIC_SERVE_TRUST_CLIENT_SESSION_ID", "1")
    bob = Identity(user_name="bob", session_id="web-b", user_id="bob", local=False, mtls=True)
    assert resolve_request_session_id(bob, "thread-7") == "thread-7"


def test_identity_marks_proxy_session_header() -> None:
    from orchestration.user_context import resolve_identity

    proxied = resolve_identity({"x-agentic-user-name": "Ada", "x-agentic-session-id": "wg-1"})
    assert proxied.session_from_header is True
    bare = resolve_identity({"x-agentic-user-name": "Ada"})
    assert bare.session_from_header is False


def test_ws_chat_uses_a_user_bound_session_slug(
    root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import orchestration.dynamic_run as dynamic_run

    seen: dict[str, Any] = {}

    def fake_run_dynamic_goal(**kwargs: Any) -> str:
        seen.update(kwargs)
        return "done"

    monkeypatch.setattr(dynamic_run, "run_dynamic_goal", fake_run_dynamic_goal)
    headers = {"x-agentic-user-name": "Bob", "x-agentic-session-id": "wg-bob"}
    with TestClient(create_app(tool_root_path=root)) as client:
        with client.websocket_connect("/ws", headers=headers) as ws:
            ws.receive_json()
            ws.send_json({"type": "chat", "text": "hello", "sessionId": "wg-alice"})
            while ws.receive_json().get("type") != "run_end":
                pass
    assert seen["session_slug"] == "wg-bob"
    assert seen["user_id"] == "bob"
    # Cooperative cancellation is wired through when the callee accepts it.
    assert isinstance(seen["cancel_event"], threading.Event)


# ---- queue priority --------------------------------------------------------


def test_ws_chat_priority_is_clamped_for_identified_clients(
    root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import orchestration.dynamic_run as dynamic_run

    seen: list[dict[str, Any]] = []
    monkeypatch.delenv("AGENTIC_SERVE_MAX_CLIENT_PRIORITY", raising=False)
    monkeypatch.setattr(
        dynamic_run, "run_dynamic_goal", lambda **kwargs: seen.append(kwargs) or "ok"
    )

    def _chat(headers: dict[str, str]) -> None:
        with TestClient(create_app(tool_root_path=root)) as client:
            with client.websocket_connect("/ws", headers=headers) as ws:
                ws.receive_json()
                ws.send_json({"type": "chat", "text": "go", "priority": 100})
                while ws.receive_json().get("type") != "run_end":
                    pass

    _chat({"x-agentic-user-name": "Bob"})
    assert seen[-1]["priority"] == 75
    _chat({})  # implicit local single user: no ceiling
    assert seen[-1]["priority"] == 100
    monkeypatch.setenv("AGENTIC_SERVE_MAX_CLIENT_PRIORITY", "realtime")
    _chat({"x-agentic-user-name": "Bob"})
    assert seen[-1]["priority"] == 100


# ---- run env mirroring -----------------------------------------------------


def test_run_env_identity_is_dropped_when_runs_overlap(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.serve import ws as ws_module

    monkeypatch.setenv("AGENTIC_TOOL_ROOT", "/baseline/root")
    monkeypatch.delenv("AGENTIC_RUN_ID", raising=False)
    monkeypatch.delenv("AGENTIC_USER_ID", raising=False)
    assert ws_module._run_env_active == 0

    ws_module._enter_run_env({"AGENTIC_RUN_ID": "run-a", "AGENTIC_USER_ID": "alice"})
    assert os.environ["AGENTIC_RUN_ID"] == "run-a"
    assert os.environ["AGENTIC_USER_ID"] == "alice"

    ws_module._enter_run_env({"AGENTIC_RUN_ID": "run-b", "AGENTIC_USER_ID": "bob"})
    # Two runs: neither identity may be visible through the process env.
    assert "AGENTIC_RUN_ID" not in os.environ
    assert "AGENTIC_USER_ID" not in os.environ

    ws_module._exit_run_env()
    assert "AGENTIC_USER_ID" not in os.environ  # never "restores" alice for bob
    ws_module._exit_run_env()
    assert ws_module._run_env_active == 0
    assert os.environ["AGENTIC_TOOL_ROOT"] == "/baseline/root"
    assert "AGENTIC_RUN_ID" not in os.environ


# ---- WebSocket run accounting ----------------------------------------------


class _FakeHeaders(dict):
    def get(self, key: str, default: Any = None) -> Any:
        return super().get(key.lower(), default)


class _FakeWs:
    def __init__(self) -> None:
        self.sent: list[dict[str, Any]] = []
        self.headers = _FakeHeaders()
        self.scope = {"client": ("127.0.0.1", 12345)}
        self.client = ("127.0.0.1", 12345)

    async def send_json(self, payload: dict[str, Any]) -> None:
        self.sent.append(payload)

    async def accept(self) -> None:
        return None


def _connection(tmp_path: Path):
    from orchestration.serve.ws import WsConnection
    from orchestration.user_context import Identity

    conn = WsConnection(_FakeWs(), tool_root=tmp_path)  # type: ignore[arg-type]
    conn.identity = Identity(user_id="local", user_name=None, session_id="s1")
    conn._loop = asyncio.get_running_loop()
    return conn


@pytest.mark.asyncio
async def test_busy_is_held_until_the_worker_thread_returns(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_EXEC_QUEUE_ENABLED", "0")
    conn = _connection(tmp_path)
    release = threading.Event()
    entered = threading.Event()

    def slow_execute(*_args: Any) -> str:
        entered.set()
        release.wait(timeout=20)
        return "late"

    monkeypatch.setattr(conn, "_execute", slow_execute)
    await conn.handle_run({"type": "chat", "text": "first"}, "chat")
    await asyncio.to_thread(entered.wait, 10)
    task = next(iter(conn._runs))
    task.cancel()
    await task  # _run reports "Cancelled." and returns
    await asyncio.sleep(0)
    assert any(m.get("code") == "cancelled" for m in conn.ws.sent)  # type: ignore[attr-defined]
    # The asyncio task is gone but the thread is still working.
    assert conn._live_workers == 1 and conn._untagged_workers == 1
    await conn.handle_run({"type": "chat", "text": "second"}, "chat")
    assert any(m.get("code") == "busy" for m in conn.ws.sent)  # type: ignore[attr-defined]
    release.set()
    for _ in range(200):
        if conn._live_workers == 0:
            break
        await asyncio.sleep(0.02)
    assert conn._live_workers == 0 and conn._untagged_workers == 0


@pytest.mark.asyncio
async def test_overlay_registration_does_not_block_the_receive_loop(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    conn = _connection(tmp_path)
    gate = asyncio.Event()
    order: list[str] = []

    async def slow_register(message: dict[str, Any]) -> None:
        order.append("register:start")
        await gate.wait()
        order.append("register:end")

    async def fake_run(message: dict[str, Any], kind: str) -> None:
        order.append(f"run:{message['text']}")

    monkeypatch.setattr(conn, "handle_session_overlay_register", slow_register)
    monkeypatch.setattr(conn, "handle_run", fake_run)

    await conn.handle({"type": "session_overlay_register", "appId": "app"})
    await asyncio.sleep(0)
    assert conn._overlay_task is not None
    # A ping is answered while the registration is still preparing…
    await conn.handle({"type": "ping"})
    assert {"type": "pong"} in conn.ws.sent  # type: ignore[attr-defined]
    # …and a run queues behind it instead of racing the overlay.
    await conn.handle({"type": "chat", "text": "after-overlay"})
    assert order == ["register:start"]
    gate.set()
    await conn._overlay_task
    assert order == ["register:start", "register:end", "run:after-overlay"]
    assert conn._overlay_task is None and conn._deferred == []


@pytest.mark.asyncio
async def test_revocation_closes_live_sockets(tmp_path: Path) -> None:
    pytest.importorskip("cryptography")
    from orchestration.serve import ws as ws_module
    from orchestration.serve.mtls_ca import revoke_mtls_client

    closed: list[int] = []

    class _ClosableWs(_FakeWs):
        async def close(self, code: int = 1000) -> None:
            closed.append(code)

    conn = ws_module.WsConnection(_ClosableWs(), tool_root=tmp_path)  # type: ignore[arg-type]
    conn.peercert = {"subject": ((("commonName", "alice"),),), "serialNumber": "0A"}
    other = ws_module.WsConnection(_ClosableWs(), tool_root=tmp_path)  # type: ignore[arg-type]
    other.peercert = {"subject": ((("commonName", "bob"),),), "serialNumber": "0B"}
    ws_module._LIVE_CONNECTIONS.add(conn)
    ws_module._LIVE_CONNECTIONS.add(other)
    try:
        assert await ws_module.close_revoked_connections(tmp_path) == 0
        revoke_mtls_client(tmp_path, subject="alice")
        assert await ws_module.close_revoked_connections(tmp_path) == 1
        assert closed == [ws_module.WS_CLOSE_POLICY_VIOLATION]
    finally:
        ws_module._LIVE_CONNECTIONS.discard(conn)
        ws_module._LIVE_CONNECTIONS.discard(other)


def test_run_cancelled_is_recognised_by_name() -> None:
    from orchestration.serve.ws import _accepts_kwarg, _is_run_cancelled

    class RunCancelled(RuntimeError):
        pass

    assert _is_run_cancelled(RunCancelled("stop"))
    assert not _is_run_cancelled(RuntimeError("boom"))
    assert _accepts_kwarg(lambda *, cancel_event=None: None, "cancel_event")
    assert _accepts_kwarg(lambda **kwargs: None, "cancel_event")
    assert not _accepts_kwarg(lambda *, goal: None, "cancel_event")
    assert time.monotonic() > 0
