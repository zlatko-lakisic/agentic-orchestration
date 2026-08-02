from __future__ import annotations

import pytest

from orchestration import ollama_keepalive as ok


@pytest.mark.unit
def test_resolve_keepalive_model_tag(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_OLLAMA_KEEPALIVE_MODEL", raising=False)
    monkeypatch.delenv("AGENTIC_OLLAMA_KEEPALIVE_MODELS", raising=False)
    monkeypatch.setenv("AGENTIC_PLANNER_MODEL", "ollama/llama3.2:3b")
    assert ok.resolve_keepalive_model_tag() == "llama3.2:3b"


@pytest.mark.unit
def test_resolve_keepalive_model_tags_multi(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "AGENTIC_OLLAMA_KEEPALIVE_MODELS", "qwen2.5:3b, ollama/qwen2.5:3b, llama3.2:1b"
    )
    assert ok.resolve_keepalive_model_tags() == ["qwen2.5:3b", "llama3.2:1b"]


@pytest.mark.unit
def test_ollama_keepalive_duration_forever_is_int(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_KEEP_ALIVE", "-1")
    assert ok.ollama_keepalive_duration() == -1


@pytest.mark.unit
def test_ollama_keepalive_duration_string(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_KEEP_ALIVE", "24h")
    assert ok.ollama_keepalive_duration() == "24h"


@pytest.mark.unit
def test_ping_ollama_keepalive_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_KEEPALIVE", "1")
    monkeypatch.delenv("AGENTIC_OLLAMA_KEEPALIVE_MODELS", raising=False)
    monkeypatch.setenv("AGENTIC_PLANNER_MODEL", "ollama/llama3.2:3b")
    monkeypatch.setenv("OLLAMA_API_BASE", "http://127.0.0.1:11434")
    monkeypatch.setenv("AGENTIC_OLLAMA_KEEP_ALIVE", "-1")

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
            assert json["keep_alive"] == -1
            assert isinstance(json["keep_alive"], int)
            return FakeResp()

    monkeypatch.setattr(ok.httpx, "Client", FakeClient)
    assert ok.ping_ollama_keepalive() is True
    status = ok.keepalive_status()
    assert status["ok"] is True
    assert status["models"] == ["llama3.2:3b"]


@pytest.mark.unit
def test_ping_multi_model_keepalive(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_KEEPALIVE", "1")
    monkeypatch.setenv("AGENTIC_OLLAMA_KEEPALIVE_MODELS", "a:1b,b:1b")
    seen: list[str] = []

    class FakeResp:
        is_success = True

    class FakeClient:
        def __init__(self, *args: object, **kwargs: object) -> None:
            pass

        def __enter__(self) -> FakeClient:
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(self, url: str, json: dict) -> FakeResp:
            seen.append(json["model"])
            return FakeResp()

    monkeypatch.setattr(ok.httpx, "Client", FakeClient)
    assert ok.ping_ollama_keepalive() is True
    assert seen == ["a:1b", "b:1b"]
