from __future__ import annotations

import pytest

from orchestration import ollama_keepalive as ok


@pytest.mark.unit
def test_resolve_keepalive_model_tag(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_OLLAMA_KEEPALIVE_MODEL", raising=False)
    monkeypatch.setenv("AGENTIC_PLANNER_MODEL", "ollama/llama3.2:3b")
    assert ok.resolve_keepalive_model_tag() == "llama3.2:3b"


@pytest.mark.unit
def test_ping_ollama_keepalive_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_KEEPALIVE", "1")
    monkeypatch.setenv("AGENTIC_PLANNER_MODEL", "ollama/llama3.2:3b")
    monkeypatch.setenv("OLLAMA_API_BASE", "http://127.0.0.1:11434")

    class FakeResp:
        def __init__(self) -> None:
            self.is_success = True

    class FakeClient:
        def __init__(self, *args: object, **kwargs: object) -> None:
            pass

        def __enter__(self) -> FakeClient:
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(self, url: str, json: dict) -> FakeResp:
            assert url.endswith("/api/generate")
            assert json["model"] == "llama3.2:3b"
            return FakeResp()

    monkeypatch.setattr(ok.httpx, "Client", FakeClient)
    assert ok.ping_ollama_keepalive() is True
