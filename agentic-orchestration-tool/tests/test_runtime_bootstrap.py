"""Tests for AGENTIC_AUTO_ENSURE_RUNTIME / Ollama ownership policy."""

from __future__ import annotations

from orchestration import runtime_bootstrap as rb


def test_should_ensure_ollama_managed_process(monkeypatch):
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "managed_process")
    monkeypatch.delenv("AGENTIC_AUTO_ENSURE_RUNTIME", raising=False)
    assert rb.should_ensure_ollama(selfcontained=False) is True
    assert rb.should_ensure_ollama(selfcontained=True) is True


def test_should_ensure_ollama_respects_disable(monkeypatch):
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "managed_process")
    monkeypatch.setenv("AGENTIC_AUTO_ENSURE_RUNTIME", "0")
    assert rb.should_ensure_ollama(selfcontained=False) is False
    assert rb.should_ensure_ollama(selfcontained=True) is True


def test_should_ensure_ollama_external_never_spawns(monkeypatch):
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "external")
    monkeypatch.setenv("AGENTIC_AUTO_ENSURE_RUNTIME", "1")
    assert rb.should_ensure_ollama(selfcontained=False) is False
    assert rb.should_ensure_ollama(selfcontained=True) is False


def test_should_ensure_ollama_managed_k8s_never_spawns(monkeypatch):
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "managed_k8s")
    monkeypatch.setenv("AGENTIC_AUTO_ENSURE_RUNTIME", "1")
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    assert rb.should_ensure_ollama(selfcontained=False) is False
    assert rb.should_ensure_ollama(selfcontained=True) is False


def test_should_ensure_ollama_auto_k8s_unhealthy_is_managed_k8s(monkeypatch):
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "auto")
    monkeypatch.setenv("AGENTIC_AUTO_ENSURE_RUNTIME", "1")
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.setattr(
        "orchestration.ollama_ownership._is_healthy",
        lambda _base: False,
    )
    assert rb.should_ensure_ollama(selfcontained=True) is False


def test_should_ensure_ollama_auto_standalone_unhealthy_spawns(monkeypatch):
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "auto")
    monkeypatch.delenv("AGENTIC_EXECUTION_BACKEND", raising=False)
    monkeypatch.delenv("AGENTIC_AUTO_ENSURE_RUNTIME", raising=False)
    monkeypatch.setattr(
        "orchestration.ollama_ownership._is_healthy",
        lambda _base: False,
    )
    monkeypatch.setattr(
        "orchestration.ollama_ownership.in_kubernetes",
        lambda: False,
    )
    assert rb.should_ensure_ollama(selfcontained=False) is True


def test_ensure_provider_payloads_skips_non_ollama(monkeypatch):
    monkeypatch.setenv("AGENTIC_AUTO_ENSURE_RUNTIME", "1")
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "managed_process")
    monkeypatch.delenv("AGENTIC_EXECUTION_BACKEND", raising=False)
    seen: list[tuple[str, str]] = []

    def fake_ensure(*, model: str, host: str, selfcontained: bool) -> None:
        seen.append((model, host))

    monkeypatch.setattr(rb, "ensure_ollama_for_agent", fake_ensure)
    rb.ensure_provider_payloads(
        [
            {"id": "gpt", "type": "openai", "model": "gpt-4o-mini"},
            {
                "id": "ll",
                "type": "ollama",
                "model": "llama3.2:3b",
                "ollama_host": "http://127.0.0.1:11434",
                "selfcontained": False,
            },
        ]
    )
    assert seen == [("llama3.2:3b", "http://127.0.0.1:11434")]
