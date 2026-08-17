"""Broker HTTP admission + pass-through tests."""

from __future__ import annotations

import json
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from orchestration import ollama_resource_broker as broker
from orchestration import ollama_resource_manager as orm


class _Upstream:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.calls.append((request.method, request.url.path))
        if request.url.path == "/api/ps":
            return httpx.Response(200, json={"models": []})
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "a:1b"}]})
        if request.url.path in ("/api/chat", "/api/generate"):
            body = json.loads(request.content.decode("utf-8") or "{}")
            if body.get("keep_alive") == 0:
                return httpx.Response(200, json={"done": True})
            return httpx.Response(
                200,
                json={"message": {"role": "assistant", "content": "ok"}, "done": True},
            )
        return httpx.Response(404, json={"error": "not found"})


@pytest.fixture(autouse=True)
def _env(monkeypatch: pytest.MonkeyPatch) -> None:
    orm.reset_resource_manager_for_tests()
    monkeypatch.setenv("AGENTIC_OLLAMA_RESOURCE_SHARING", "1")
    monkeypatch.setenv("AGENTIC_VRAM_GB", "16")
    monkeypatch.setenv("AGENTIC_RESIDENT_HEADROOM_GB", "1")
    monkeypatch.setenv("AGENTIC_OLLAMA_UPSTREAM", "http://upstream.test")
    yield
    orm.reset_resource_manager_for_tests()


@pytest.mark.unit
def test_broker_passthrough_tags(monkeypatch: pytest.MonkeyPatch) -> None:
    up = _Upstream()
    transport = httpx.MockTransport(up.handler)
    mgr = orm.OllamaResourceManager(
        upstream_base="http://upstream.test",
        http_client=httpx.Client(transport=transport),
    )
    app = broker.create_broker_app(manager=mgr)

    with TestClient(app) as client:
        # Patch async client used by proxy
        app.state.http = httpx.AsyncClient(transport=transport)
        res = client.get("/api/tags")
        assert res.status_code == 200
        assert res.json()["models"][0]["name"] == "a:1b"
        st = client.get("/api/agentic/resource-status")
        assert st.status_code == 200
        assert st.json()["enabled"] is True


@pytest.mark.unit
def test_broker_admits_chat(monkeypatch: pytest.MonkeyPatch) -> None:
    up = _Upstream()
    transport = httpx.MockTransport(up.handler)
    mgr = orm.OllamaResourceManager(
        upstream_base="http://upstream.test",
        http_client=httpx.Client(transport=transport),
    )
    app = broker.create_broker_app(manager=mgr)
    with TestClient(app) as client:
        app.state.http = httpx.AsyncClient(transport=transport)
        res = client.post(
            "/api/chat",
            json={
                "model": "a:1b",
                "messages": [{"role": "user", "content": "hi"}],
                "stream": False,
            },
        )
        assert res.status_code == 200
        assert mgr.status()["admits"] >= 1
        assert "/api/chat" in [p for _, p in up.calls]
