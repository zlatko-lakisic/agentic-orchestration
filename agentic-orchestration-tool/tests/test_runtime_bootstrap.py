"""Tests for AGENTIC_AUTO_ENSURE_RUNTIME policy."""

from __future__ import annotations

from orchestration import runtime_bootstrap as rb


def test_should_ensure_ollama_default_on_for_non_selfcontained(monkeypatch):
    monkeypatch.delenv("AGENTIC_AUTO_ENSURE_RUNTIME", raising=False)
    monkeypatch.delenv("AGENTIC_EXECUTION_BACKEND", raising=False)
    assert rb.should_ensure_ollama(selfcontained=False) is True
    assert rb.should_ensure_ollama(selfcontained=True) is True


def test_should_ensure_ollama_respects_disable(monkeypatch):
    monkeypatch.setenv("AGENTIC_AUTO_ENSURE_RUNTIME", "0")
    monkeypatch.delenv("AGENTIC_EXECUTION_BACKEND", raising=False)
    assert rb.should_ensure_ollama(selfcontained=False) is False
    assert rb.should_ensure_ollama(selfcontained=True) is True


def test_should_ensure_ollama_kubernetes_defaults_to_selfcontained(monkeypatch):
    monkeypatch.setenv("AGENTIC_AUTO_ENSURE_RUNTIME", "1")
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.delenv("AGENTIC_AUTO_ENSURE_OLLAMA_IN_K8S", raising=False)
    assert rb.should_ensure_ollama(selfcontained=False) is False
    assert rb.should_ensure_ollama(selfcontained=True) is True


def test_should_ensure_ollama_kubernetes_force(monkeypatch):
    monkeypatch.setenv("AGENTIC_AUTO_ENSURE_RUNTIME", "1")
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.setenv("AGENTIC_AUTO_ENSURE_OLLAMA_IN_K8S", "1")
    assert rb.should_ensure_ollama(selfcontained=False) is True


def test_ensure_provider_payloads_skips_non_ollama(monkeypatch):
    monkeypatch.setenv("AGENTIC_AUTO_ENSURE_RUNTIME", "1")
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
