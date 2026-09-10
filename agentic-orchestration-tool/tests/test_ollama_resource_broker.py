"""Broker HTTP admission + pass-through tests."""

from __future__ import annotations

import json
import threading
import time
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from orchestration import ollama_resource_broker as broker
from orchestration import ollama_resource_manager as orm


class _Upstream:
    def __init__(self, *, ps_delay_s: float = 0.0, tags_ok: bool = True) -> None:
        self.calls: list[tuple[str, str]] = []
        self.ps_delay_s = ps_delay_s
        self.tags_ok = tags_ok
        self._lock = threading.Lock()

    def handler(self, request: httpx.Request) -> httpx.Response:
        with self._lock:
            self.calls.append((request.method, request.url.path))
        if request.url.path == "/api/ps":
            if self.ps_delay_s > 0:
                time.sleep(self.ps_delay_s)
            return httpx.Response(200, json={"models": []})
        if request.url.path == "/api/tags":
            if not self.tags_ok:
                raise httpx.ConnectError("upstream down", request=request)
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


def _make_app(up: _Upstream) -> tuple[Any, orm.OllamaResourceManager, httpx.MockTransport]:
    transport = httpx.MockTransport(up.handler)
    mgr = orm.OllamaResourceManager(
        upstream_base="http://upstream.test",
        http_client=httpx.Client(transport=transport),
    )
    app = broker.create_broker_app(manager=mgr)
    return app, mgr, transport


@pytest.mark.unit
def test_broker_passthrough_tags(monkeypatch: pytest.MonkeyPatch) -> None:
    up = _Upstream()
    app, _mgr, transport = _make_app(up)
    with TestClient(app) as client:
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
    app, mgr, transport = _make_app(up)
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


@pytest.mark.unit
def test_health_does_not_block_on_slow_api_ps() -> None:
    """Regression: kubelet liveness used /health which called status()->/api/ps."""
    up = _Upstream(ps_delay_s=5.0)
    app, _mgr, transport = _make_app(up)
    with TestClient(app) as client:
        app.state.http = httpx.AsyncClient(transport=transport)
        # Idle reconciler may have probed /api/ps on startup; clear before assert.
        up.calls.clear()
        t0 = time.perf_counter()
        res = client.get("/health")
        elapsed = time.perf_counter() - t0
        assert res.status_code == 200
        body = res.json()
        assert body["ok"] is True
        assert "loaded" not in body
        assert elapsed < 1.0
        assert "/api/ps" not in [p for _, p in up.calls]


@pytest.mark.unit
def test_ready_succeeds_when_upstream_tags_ok() -> None:
    up = _Upstream()
    app, _mgr, transport = _make_app(up)
    with TestClient(app) as client:
        app.state.http = httpx.AsyncClient(transport=transport)
        res = client.get("/ready")
        assert res.status_code == 200
        assert res.json()["ok"] is True
        assert "/api/tags" in [p for _, p in up.calls]


@pytest.mark.unit
def test_ready_503_when_upstream_down() -> None:
    up = _Upstream(tags_ok=False)
    app, _mgr, transport = _make_app(up)
    with TestClient(app) as client:
        app.state.http = httpx.AsyncClient(transport=transport)
        res = client.get("/ready")
        assert res.status_code == 503
        assert res.json()["ok"] is False


@pytest.mark.unit
def test_resource_status_still_works_off_event_loop() -> None:
    up = _Upstream()
    app, _mgr, transport = _make_app(up)
    with TestClient(app) as client:
        app.state.http = httpx.AsyncClient(transport=transport)
        res = client.get("/api/agentic/resource-status")
        assert res.status_code == 200
        assert res.json()["enabled"] is True
        assert "/api/ps" in [p for _, p in up.calls]
