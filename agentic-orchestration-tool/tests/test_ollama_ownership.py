"""Tests for Ollama ownership modes."""

from __future__ import annotations

from orchestration import ollama_ownership as oo


def test_resolve_auto_healthy_is_external(monkeypatch):
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "auto")
    monkeypatch.setenv("OLLAMA_API_BASE", "http://127.0.0.1:11434")
    assert oo.resolve_ollama_mode(healthy=True, in_k8s=False) == oo.MODE_EXTERNAL


def test_resolve_auto_unhealthy_standalone_is_managed_process(monkeypatch):
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "auto")
    assert oo.resolve_ollama_mode(healthy=False, in_k8s=False) == oo.MODE_MANAGED_PROCESS


def test_resolve_auto_unhealthy_k8s_is_managed_k8s(monkeypatch):
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "auto")
    assert oo.resolve_ollama_mode(healthy=False, in_k8s=True) == oo.MODE_MANAGED_K8S


def test_resolve_explicit_modes(monkeypatch):
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "external")
    assert oo.resolve_ollama_mode(healthy=False, in_k8s=True) == oo.MODE_EXTERNAL
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "managed_process")
    assert oo.resolve_ollama_mode(healthy=True, in_k8s=True) == oo.MODE_MANAGED_PROCESS
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "k8s")
    assert oo.resolve_ollama_mode(healthy=True, in_k8s=False) == oo.MODE_MANAGED_K8S


def test_ollama_status_external_not_restartable(monkeypatch):
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "auto")
    monkeypatch.setenv("OLLAMA_API_BASE", "http://host.k3s.internal:11434")
    st = oo.ollama_status(healthy=True, in_k8s=True)
    assert st["mode"] == oo.MODE_EXTERNAL
    assert st["owned"] is False
    assert st["restartable"] is False
    assert "External" in (st["reason"] or "")


def test_ollama_status_managed_k8s_restartable(monkeypatch):
    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "managed_k8s")
    st = oo.ollama_status(healthy=False, in_k8s=True, deployment_present=True)
    assert st["mode"] == oo.MODE_MANAGED_K8S
    assert st["restartable"] is True
    assert st["deployment"] == "agentic-ollama"


def test_should_ensure_respects_ownership(monkeypatch):
    from orchestration.runtime_bootstrap import should_ensure_ollama

    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "external")
    monkeypatch.setenv("AGENTIC_AUTO_ENSURE_RUNTIME", "1")
    assert should_ensure_ollama(selfcontained=True) is False

    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "managed_process")
    assert should_ensure_ollama(selfcontained=False) is True

    monkeypatch.setenv("AGENTIC_OLLAMA_MODE", "managed_k8s")
    assert should_ensure_ollama(selfcontained=True) is False
