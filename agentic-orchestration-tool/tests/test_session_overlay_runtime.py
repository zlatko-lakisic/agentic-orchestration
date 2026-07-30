"""Session-overlay Ollama ensure (HTTP API only — no local spawn)."""

from __future__ import annotations

import pytest

from orchestration.session_overlay_runtime import (
    collect_overlay_ollama_models,
    ensure_session_overlay_ollama_models,
    resolve_overlay_ollama_host,
    rewrite_overlay_ollama_hosts,
)

pytestmark = pytest.mark.unit


def test_resolve_overlay_ollama_host_from_api_base_when_omitted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OLLAMA_API_BASE", "http://host.k3s.internal:11434")
    monkeypatch.delenv("OLLAMA_HOST", raising=False)
    assert resolve_overlay_ollama_host({"id": "client.a", "type": "ollama"}) == (
        "http://host.k3s.internal:11434"
    )
    assert resolve_overlay_ollama_host({"ollama_host": ""}) == "http://host.k3s.internal:11434"
    assert resolve_overlay_ollama_host({"ollama_host": "workflow"}) == (
        "http://host.k3s.internal:11434"
    )


def test_resolve_overlay_ollama_host_prefers_explicit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OLLAMA_API_BASE", "http://host.k3s.internal:11434")
    assert (
        resolve_overlay_ollama_host({"ollama_host": "http://10.0.0.5:11434"})
        == "http://10.0.0.5:11434"
    )


def test_rewrite_fills_host_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OLLAMA_API_BASE", "http://host.k3s.internal:11434")
    agents = rewrite_overlay_ollama_hosts(
        [
            {
                "id": "client.a",
                "type": "ollama",
                "model": "qwen2.5:7b",
                "selfcontained": False,
            }
        ]
    )
    assert agents[0]["ollama_host"] == "http://host.k3s.internal:11434"


def test_ensure_missing_model_triggers_pull(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("OLLAMA_API_BASE", "http://ollama.test:11434")
    pulled: list[tuple[str, str]] = []
    progress: list[str] = []

    import agent_providers.ollama_provider as op

    monkeypatch.setattr(op, "is_ollama_healthy", lambda _host: True)
    monkeypatch.setattr(op, "ollama_has_model", lambda _host, model: model in {"already"})
    monkeypatch.setattr(
        op,
        "pull_ollama_model",
        lambda model, host: pulled.append((model, host)),
    )
    # After pull, pretend tags now include the model.
    state = {"pulled": False}

    def has_model(_host: str, model: str) -> bool:
        if model == "already":
            return True
        return state["pulled"] and model == "qwen2.5:3b"

    def pull(model: str, host: str) -> None:
        pulled.append((model, host))
        state["pulled"] = True

    monkeypatch.setattr(op, "ollama_has_model", has_model)
    monkeypatch.setattr(op, "pull_ollama_model", pull)

    ensure_session_overlay_ollama_models(
        [
            {
                "id": "client.researcher",
                "type": "ollama",
                "model": "qwen2.5:3b",
                "selfcontained": False,
            },
            {
                "id": "client.other",
                "type": "ollama",
                "model": "already",
            },
        ],
        on_progress=progress.append,
    )
    assert pulled == [("qwen2.5:3b", "http://ollama.test:11434")]
    assert any("pulling" in p or "missing" in p for p in progress)


def test_ensure_works_under_kubernetes_selfcontained_false(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """k8s gate must not block session-overlay HTTP pulls."""
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.delenv("AGENTIC_AUTO_ENSURE_OLLAMA_IN_K8S", raising=False)
    monkeypatch.setenv("OLLAMA_API_BASE", "http://host.k3s.internal:11434")

    import agent_providers.ollama_provider as op
    from orchestration.runtime_bootstrap import should_ensure_ollama

    assert should_ensure_ollama(selfcontained=False) is False

    pulled: list[str] = []
    monkeypatch.setattr(op, "is_ollama_healthy", lambda _h: True)
    monkeypatch.setattr(op, "ollama_has_model", lambda _h, _m: False)

    def pull(model: str, host: str) -> None:
        pulled.append(model)
        monkeypatch.setattr(op, "ollama_has_model", lambda _h, m: m == model)

    monkeypatch.setattr(op, "pull_ollama_model", pull)

    ensure_session_overlay_ollama_models(
        [{"id": "client.x", "type": "ollama", "model": "llama3.2:3b", "selfcontained": False}]
    )
    assert pulled == ["llama3.2:3b"]


def test_collect_unique_models(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OLLAMA_API_BASE", "http://h:11434")
    pairs = collect_overlay_ollama_models(
        [
            {"id": "client.a", "type": "ollama", "model": "qwen2.5:7b"},
            {"id": "client.b", "type": "ollama", "model": "qwen2.5:7b"},
            {"id": "client.c", "type": "openai", "model": "gpt"},
        ]
    )
    assert pairs == [("qwen2.5:7b", "http://h:11434")]


def test_ensure_disabled_flag_skips(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY_ENSURE_OLLAMA", "0")
    monkeypatch.setenv("OLLAMA_API_BASE", "http://h:11434")
    called = {"n": 0}

    import agent_providers.ollama_provider as op

    monkeypatch.setattr(
        op,
        "ensure_ollama_model_on_api",
        lambda **_kw: called.__setitem__("n", called["n"] + 1),
    )
    ensure_session_overlay_ollama_models(
        [{"id": "client.a", "type": "ollama", "model": "x"}]
    )
    assert called["n"] == 0


def test_ollama_has_model_parses_tags(monkeypatch: pytest.MonkeyPatch) -> None:
    import json

    import agent_providers.ollama_provider as op

    class _Resp:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def read(self):
            return json.dumps({"models": [{"name": "qwen2.5:3b"}, {"name": "llama3.2:latest"}]}).encode()

    monkeypatch.setattr(op.urllib.request, "urlopen", lambda *_a, **_k: _Resp())
    assert op.ollama_has_model("http://h:11434", "qwen2.5:3b") is True
    assert op.ollama_has_model("http://h:11434", "llama3.2") is True
    assert op.ollama_has_model("http://h:11434", "missing") is False
