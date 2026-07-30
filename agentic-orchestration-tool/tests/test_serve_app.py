"""Engine daemon: REST surface, identity gating, and the WebSocket protocol port.

Skips entirely when the optional serve extras are absent (requirements-serve.txt), so
the default unit tier stays installable without FastAPI.
"""

from __future__ import annotations

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

from orchestration.serve.app import create_app  # noqa: E402


@pytest.fixture
def kb_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setenv("AGENTIC_KB", "1")
    monkeypatch.delenv("AGENTIC_REQUIRE_IDENTITY", raising=False)
    monkeypatch.delenv("AGENTIC_DEAL_AUTH", raising=False)
    return tmp_path


@pytest.fixture
def client(kb_root: Path):
    with TestClient(create_app(tool_root_path=kb_root)) as c:
        yield c


def test_health_reports_version_and_warm_catalogs(client: TestClient) -> None:
    body = client.get("/health").json()
    assert body["ok"] is True
    assert body["version"]
    assert body["service"] == "agentic-orchestration-engine"
    assert "catalogs" in body
    assert "resident" in body
    assert "keepaliveModels" in body["resident"]
    assert "vramGbAvailable" in body["resident"]
    assert "hardware" in body
    assert "architectures" in body["hardware"]
    assert "gpu" in body["hardware"]
    assert "vramGbAvailable" in body["hardware"]


def test_api_ping_identifies_this_process(client: TestClient) -> None:
    body = client.get("/api/ping").json()
    assert body["ok"] is True
    assert body["service"] == "agentic-orchestration-engine"
    assert isinstance(body["pid"], int)


def test_api_session_local_mode_without_headers(client: TestClient) -> None:
    body = client.get("/api/session").json()
    assert body["userId"] == "local"
    assert body["local"] is True
    assert body["sessionId"].startswith("web-")


def test_api_session_reads_proxy_headers(client: TestClient) -> None:
    body = client.get(
        "/api/session",
        headers={"x-agentic-user-name": "Zlatko", "x-agentic-session-id": "wg-abc123"},
    ).json()
    assert body == {
        "ok": True,
        "userName": "Zlatko",
        "sessionId": "wg-abc123",
        "userId": "zlatko",
        "local": False,
    }


def test_require_identity_rejects_anonymous_requests(
    kb_root: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_REQUIRE_IDENTITY", "1")
    with TestClient(create_app(tool_root_path=kb_root)) as c:
        assert c.get("/api/session").status_code == 401
        ok = c.get("/api/session", headers={"x-user-name": "Alex"})
        assert ok.status_code == 200
        assert ok.json()["userId"] == "alex"
        # /health and /api/ping stay open so a supervisor can probe an unauthenticated port.
        assert c.get("/health").status_code == 200
        assert c.get("/api/ping").status_code == 200


def test_host_metrics_endpoint_returns_a_sample(client: TestClient) -> None:
    body = client.get("/api/host-metrics").json()
    assert "memory" in body
    assert "cpu" in body
    assert body["scope"] in ("runtime", "host", "container", "jetson")


def test_kb_ingest_search_and_delete_by_scope(client: TestClient) -> None:
    ingested = client.post(
        "/api/v1/kb/ingest",
        json={"content": "Falcon pricing is locked at 12 percent", "dealId": "acme-2026"},
    ).json()
    assert ingested["ok"] is True
    assert ingested["docId"]

    hits = client.get("/api/v1/kb/search", params={"q": "Falcon", "dealId": "acme-2026"}).json()
    assert hits["ok"] is True
    assert hits["hits"]
    assert hits["hits"][0]["dealId"] == "acme-2026"

    removed = client.request("DELETE", "/api/v1/kb/scope/acme-2026").json()
    assert removed["removed"] == 1
    after = client.get("/api/v1/kb/search", params={"q": "Falcon"}).json()
    assert after["hits"] == []


def test_kb_upsert_is_idempotent_for_the_same_source(client: TestClient) -> None:
    payload: dict[str, Any] = {
        "sourceId": "crm://acct/1",
        "content": "Acme uses Postgres 16",
        "userGoal": "account facts",
    }
    first = client.post("/api/v1/kb/upsert", json=payload).json()
    assert first["action"] == "inserted"
    again = client.post("/api/v1/kb/upsert", json=payload).json()
    assert again["action"] == "unchanged"
    assert again["docId"] == first["docId"]
    changed = client.post(
        "/api/v1/kb/upsert",
        json={**payload, "content": "Acme migrated to Postgres 17"},
    ).json()
    assert changed["action"] == "updated"
    assert changed["docId"] == first["docId"]


def test_kb_ingest_rejects_empty_content(client: TestClient) -> None:
    assert client.post("/api/v1/kb/ingest", json={"content": "  "}).status_code == 400


def test_deal_scoped_routes_enforce_membership(
    kb_root: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_REQUIRE_IDENTITY", "1")
    from orchestration.deal_auth import add_member

    add_member(tool_root=kb_root, deal_id="acme-2026", user_id="ada-lovelace")
    with TestClient(create_app(tool_root_path=kb_root)) as c:
        member = {"x-user-name": "Ada Lovelace"}
        stranger = {"x-user-name": "Mallory"}
        assert (
            c.post(
                "/api/v1/kb/ingest",
                json={"content": "deal note", "dealId": "acme-2026"},
                headers=member,
            ).status_code
            == 200
        )
        denied = c.post(
            "/api/v1/kb/ingest",
            json={"content": "deal note", "dealId": "acme-2026"},
            headers=stranger,
        )
        assert denied.status_code == 403
        # Global-tier writes are not deal-scoped, so they are not gated.
        assert c.post("/api/v1/kb/ingest", json={"content": "company note"}, headers=stranger).status_code == 200


def test_direct_agent_route_reports_engine_failures(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import orchestration.direct_agent as direct_agent

    monkeypatch.setattr(
        direct_agent,
        "run_direct_agent",
        lambda **_kw: "mocked answer",
    )
    body = client.post(
        "/api/v1/direct-agent",
        json={"agentProviderId": "ollama_hermes3", "text": "hello", "questionId": "q-1"},
    ).json()
    assert body["text"] == "mocked answer"
    assert body["questionId"] == "q-1"
    assert body["ok"] is True
    assert body["elapsedMs"] >= 0


def test_direct_agent_route_json_mode_echoes_format_and_ok(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import json

    import orchestration.direct_agent as direct_agent

    monkeypatch.setattr(
        direct_agent,
        "run_direct_agent",
        lambda **_kw: '{"technical":null,"commercial":"pricing"}',
    )
    body = client.post(
        "/api/v1/direct-agent",
        json={
            "agentProviderId": "kb_meeting_router",
            "text": "What is the list price?",
            "responseFormat": {"type": "json_object"},
            "jsonSchema": {
                "type": "object",
                "properties": {
                    "technical": {"type": ["string", "null"]},
                    "commercial": {"type": ["string", "null"]},
                },
            },
            "questionId": "q-json",
        },
    ).json()
    assert body["ok"] is True
    assert body["responseFormat"] == {"type": "json_object"}
    assert json.loads(body["text"])["commercial"] == "pricing"


def test_direct_agent_route_json_mode_ok_false_on_format_error(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import orchestration.direct_agent as direct_agent

    def boom(**_kw):
        raise direct_agent.DirectAgentFormatError(
            "response is not valid JSON",
            raw="not json at all",
        )

    monkeypatch.setattr(direct_agent, "run_direct_agent", boom)
    response = client.post(
        "/api/v1/direct-agent",
        json={
            "agentProviderId": "kb_meeting_router",
            "text": "split",
            "responseFormat": {"type": "json_object"},
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is False
    assert "not valid JSON" in body["error"]
    assert body["text"] == "not json at all"
    assert body["responseFormat"] == {"type": "json_object"}


def test_direct_agent_route_rejects_empty_text(client: TestClient) -> None:
    assert (
        client.post(
            "/api/v1/direct-agent", json={"agentProviderId": "x", "text": " "}
        ).status_code
        == 400
    )


def test_direct_agent_route_maps_unknown_agent_to_400(
    client: TestClient,
    tool_root: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(
        "AGENTIC_AGENT_PROVIDERS_CATALOG", str(tool_root / "config" / "agent_providers")
    )
    response = client.post(
        "/api/v1/direct-agent",
        json={"agentProviderId": "does-not-exist", "text": "hello"},
    )
    assert response.status_code == 400
    assert "does-not-exist" in response.json()["detail"]


# ---- WebSocket protocol ---------------------------------------------------


def test_ws_hello_ping_and_unknown_type(client: TestClient) -> None:
    with client.websocket_connect("/ws") as ws:
        hello = ws.receive_json()
        assert hello["type"] == "hello"
        assert hello["questionTags"] is True
        assert hello["userId"] == "local"

        ws.send_json({"type": "ping"})
        assert ws.receive_json()["type"] == "pong"

        ws.send_json({"type": "nope"})
        error = ws.receive_json()
        assert error["type"] == "error"
        assert "Unknown message type" in error["message"]


def test_ws_rejects_empty_chat_text(client: TestClient) -> None:
    with client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "chat", "text": "   "})
        assert ws.receive_json()["message"] == "Empty message"


def test_ws_host_metrics_subscribe_pushes_a_sample(client: TestClient) -> None:
    with client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "host_metrics_subscribe"})
        frame = ws.receive_json()
        assert frame["type"] == "host_metrics"
        assert "memory" in frame


def test_ws_rate_enqueues_a_pending_rating(client: TestClient, kb_root: Path) -> None:
    with client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "rate", "providerId": "ollama_hermes3", "rating": 1})
        assert ws.receive_json() == {"type": "rated", "ok": True}
    from orchestration.learning_store import pending_ratings_path

    assert "ollama_hermes3" in pending_ratings_path(kb_root).read_text(encoding="utf-8")


def test_ws_chat_streams_run_frames(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    import orchestration.dynamic_run as dynamic_run

    def fake_run(*, on_progress=None, **_kw):
        if on_progress:
            on_progress("planning")
        return "final answer"

    monkeypatch.setattr(dynamic_run, "run_dynamic_goal", fake_run)
    with client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "chat", "text": "why is the sky blue"})
        types = []
        while True:
            frame = ws.receive_json()
            types.append(frame["type"])
            if frame["type"] == "run_end":
                assert frame["ok"] is True
                break
        assert types[0] == "preflight"
        assert "run_start" in types
        assert "chunk" in types


def test_ws_untagged_chat_keeps_the_busy_lock(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import threading

    import orchestration.dynamic_run as dynamic_run

    release = threading.Event()

    def blocking_run(**_kw):
        release.wait(timeout=5)
        return "done"

    monkeypatch.setattr(dynamic_run, "run_dynamic_goal", blocking_run)
    with client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "chat", "text": "first"})
        assert ws.receive_json()["type"] == "preflight"
        assert ws.receive_json()["type"] == "run_start"
        ws.send_json({"type": "chat", "text": "second"})
        busy = ws.receive_json()
        assert busy["type"] == "error"
        assert "already in progress" in busy["message"]
        release.set()


def test_ws_question_id_allows_concurrent_runs(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import orchestration.dynamic_run as dynamic_run

    monkeypatch.setattr(dynamic_run, "run_dynamic_goal", lambda **_kw: "tagged answer")
    with client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "chat", "text": "one", "question_id": "q-1"})
        ws.send_json({"type": "chat", "text": "two", "question_id": "q-2"})
        ended: set[str] = set()
        while len(ended) < 2:
            frame = ws.receive_json()
            assert frame.get("question_id") in ("q-1", "q-2")
            if frame["type"] == "run_end":
                ended.add(frame["question_id"])
        assert ended == {"q-1", "q-2"}


def test_ws_direct_agent_message_streams_answer(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import orchestration.direct_agent as direct_agent

    monkeypatch.setattr(direct_agent, "run_direct_agent", lambda **_kw: "direct answer")
    with client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json(
            {
                "type": "direct_agent",
                "agent_provider_id": "ollama_hermes3",
                "text": "summarize",
                "question_id": "q-9",
            }
        )
        texts: list[str] = []
        while True:
            frame = ws.receive_json()
            assert frame["question_id"] == "q-9"
            if frame["type"] == "chunk":
                texts.append(frame["text"])
            if frame["type"] == "run_end":
                break
        assert "direct answer" in texts


def test_ws_direct_agent_streams_progress_chunks(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import orchestration.direct_agent as direct_agent

    def fake_run(*, on_progress=None, **_kw):
        if on_progress:
            on_progress("ensuring runtime for ollama_hermes3")
            on_progress("generating")
        return "direct answer"

    monkeypatch.setattr(direct_agent, "run_direct_agent", fake_run)
    with client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json(
            {
                "type": "direct_agent",
                "agent_provider_id": "ollama_hermes3",
                "text": "summarize",
                "question_id": "q-prog",
            }
        )
        stderr_chunks: list[str] = []
        stdout_chunks: list[str] = []
        while True:
            frame = ws.receive_json()
            assert frame.get("question_id") == "q-prog"
            if frame["type"] == "chunk":
                if frame.get("stream") == "stderr":
                    stderr_chunks.append(frame["text"])
                else:
                    stdout_chunks.append(frame["text"])
            if frame["type"] == "run_end":
                break
        assert any("ensuring runtime" in t for t in stderr_chunks)
        assert any("generating" in t for t in stderr_chunks)
        assert "direct answer" in stdout_chunks


def test_ws_run_failure_emits_error_then_run_end(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import orchestration.dynamic_run as dynamic_run

    def boom(**_kw):
        raise RuntimeError("planner exploded")

    monkeypatch.setattr(dynamic_run, "run_dynamic_goal", boom)
    with client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "chat", "text": "break it"})
        frames = []
        while True:
            frame = ws.receive_json()
            frames.append(frame)
            if frame["type"] == "run_end":
                break
        assert any(f["type"] == "error" and "planner exploded" in f["message"] for f in frames)
        assert frames[-1]["ok"] is False


def test_ws_closes_when_identity_required(
    kb_root: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from starlette.websockets import WebSocketDisconnect

    monkeypatch.setenv("AGENTIC_REQUIRE_IDENTITY", "1")
    with TestClient(create_app(tool_root_path=kb_root)) as c:
        with c.websocket_connect("/ws") as ws:
            assert ws.receive_json()["type"] == "error"
            with pytest.raises(WebSocketDisconnect):
                ws.receive_json()
        with c.websocket_connect("/ws", headers={"x-user-name": "Ada"}) as ws:
            hello = ws.receive_json()
            assert hello["type"] == "hello"
            assert hello["userId"] == "ada"


def test_ws_hello_advertises_session_overlay_flags(
    kb_root: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("AGENTIC_SERVE_MCP_TUNNEL", "1")
    with TestClient(create_app(tool_root_path=kb_root)) as c:
        with c.websocket_connect("/ws") as ws:
            hello = ws.receive_json()
            assert hello["sessionOverlay"] is True
            assert hello["mcpTunnel"] is True


def test_ws_session_overlay_register_ack_and_clear(
    kb_root: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from orchestration.session_overlay import get_overlay, reset_overlays_for_tests

    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("AGENTIC_SERVE_MCP_TUNNEL", "1")
    # Avoid hitting a real Ollama during register ensure.
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY_ENSURE_OLLAMA", "0")
    reset_overlays_for_tests()
    headers = {"x-agentic-user-name": "Ada", "x-agentic-session-id": "sess-1"}
    with TestClient(create_app(tool_root_path=kb_root)) as c:
        with c.websocket_connect("/ws", headers=headers) as ws:
            hello = ws.receive_json()
            assert hello["userId"] == "ada"
            ws.send_json(
                {
                    "type": "session_overlay_register",
                    "ttlSeconds": 600,
                    "agents": [
                        {
                            "id": "client.kb_researcher",
                            "type": "ollama",
                            "role": "r",
                            "goal": "g",
                            "backstory": "b",
                            "model": "qwen2.5:7b",
                        }
                    ],
                    "mcps": [],
                    "skills": [],
                }
            )
            ack = ws.receive_json()
            assert ack["type"] == "session_overlay_ack"
            assert ack["agentIds"] == ["client.kb_researcher"]
            assert get_overlay("ada", "sess-1") is not None

            ws.send_json({"type": "session_overlay_clear"})
            cleared = ws.receive_json()
            assert cleared["type"] == "session_overlay_cleared"
            assert get_overlay("ada", "sess-1") is None


def test_ws_session_overlay_register_ensures_ollama_model(
    kb_root: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from orchestration.session_overlay import reset_overlays_for_tests
    import orchestration.session_overlay_runtime as sor

    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("AGENTIC_SERVE_MCP_TUNNEL", "1")
    monkeypatch.setenv("OLLAMA_API_BASE", "http://host.k3s.internal:11434")
    reset_overlays_for_tests()
    seen: list[list] = []

    def fake_ensure(agents, *, on_progress=None):
        seen.append(list(agents))
        if on_progress:
            on_progress("ollama model missing: qwen2.5:3b; pulling …")

    monkeypatch.setattr(sor, "ensure_session_overlay_ollama_models", fake_ensure)
    headers = {"x-agentic-user-name": "Ada", "x-agentic-session-id": "sess-pull"}
    with TestClient(create_app(tool_root_path=kb_root)) as c:
        with c.websocket_connect("/ws", headers=headers) as ws:
            ws.receive_json()
            ws.send_json(
                {
                    "type": "session_overlay_register",
                    "agents": [
                        {
                            "id": "client.smoke",
                            "type": "ollama",
                            "role": "r",
                            "goal": "g",
                            "backstory": "b",
                            "model": "qwen2.5:3b",
                            "selfcontained": False,
                        }
                    ],
                }
            )
            frames = []
            while True:
                frame = ws.receive_json()
                frames.append(frame)
                if frame["type"] in ("session_overlay_ack", "error"):
                    break
            assert frames[-1]["type"] == "session_overlay_ack"
            assert any(f.get("type") == "chunk" for f in frames)
            assert seen
            assert seen[0][0]["ollama_host"] == "http://host.k3s.internal:11434"


def test_ws_session_overlay_rejects_when_disabled(
    kb_root: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("AGENTIC_SERVE_SESSION_OVERLAY", raising=False)
    with TestClient(create_app(tool_root_path=kb_root)) as c:
        with c.websocket_connect("/ws") as ws:
            hello = ws.receive_json()
            assert hello.get("sessionOverlay") is False
            ws.send_json(
                {
                    "type": "session_overlay_register",
                    "agents": [{"id": "client.x", "type": "ollama"}],
                }
            )
            err = ws.receive_json()
            assert err["type"] == "error"
            assert "disabled" in err["message"]


def test_ws_direct_agent_forwards_mcp_provider_ids(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import orchestration.direct_agent as direct_agent

    captured: dict[str, Any] = {}

    def fake_run(**kwargs):
        captured.update(kwargs)
        return "ok"

    monkeypatch.setattr(direct_agent, "run_direct_agent", fake_run)
    with client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json(
            {
                "type": "direct_agent",
                "agentProviderId": "ollama_hermes3",
                "text": "use tools",
                "mcpProviderIds": ["client.filesystem_local", "filesystem_local"],
            }
        )
        frames = []
        while True:
            frame = ws.receive_json()
            frames.append(frame)
            if frame["type"] == "run_end":
                break
        assert frames[-1]["ok"] is True
    assert captured.get("mcp_provider_ids") == [
        "client.filesystem_local",
        "filesystem_local",
    ]


def test_direct_agent_rest_forwards_mcp_provider_ids(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import orchestration.direct_agent as direct_agent

    captured: dict[str, Any] = {}

    def fake_run(**kwargs):
        captured.update(kwargs)
        return "ok"

    monkeypatch.setattr(direct_agent, "run_direct_agent", fake_run)
    body = client.post(
        "/api/v1/direct-agent",
        json={
            "agentProviderId": "ollama_hermes3",
            "text": "hello",
            "mcpProviderIds": ["search_brave"],
        },
    ).json()
    assert body["ok"] is True
    assert captured.get("mcp_provider_ids") == ["search_brave"]
