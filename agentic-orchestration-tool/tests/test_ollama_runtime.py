"""Tests for Ollama runtime resolution."""

from __future__ import annotations

from orchestration import ollama_runtime as ort


def test_detect_ollama_runtime_native_preferred(monkeypatch):
    monkeypatch.setenv("AGENTIC_EDGE_PLATFORM", "jetson")
    monkeypatch.setenv("AGENTIC_OLLAMA_RUNTIME", "native")
    monkeypatch.setattr(
        ort,
        "_detect_native_ollama",
        lambda: {"version": "ollama v0.20.7", "binary": "/usr/local/bin/ollama"},
    )
    monkeypatch.setattr(ort, "_detect_jetson_container_ollama", lambda: None)
    info = ort.detect_ollama_runtime()
    assert info["backend"] == "native"


def test_detect_ollama_runtime_auto_jetson_container_running(monkeypatch):
    monkeypatch.setenv("AGENTIC_EDGE_PLATFORM", "jetson")
    monkeypatch.setenv("AGENTIC_OLLAMA_RUNTIME", "auto")
    monkeypatch.setattr(ort, "_detect_native_ollama", lambda: {"version": "ollama v0.20.7"})
    monkeypatch.setattr(
        ort,
        "_detect_jetson_container_ollama",
        lambda: {"image": "dustynv/ollama:r36.2.0", "running": True},
    )
    info = ort.detect_ollama_runtime()
    assert info["backend"] == "jetson-container"


def test_detect_ollama_runtime_auto_jetson_falls_back_native(monkeypatch):
    monkeypatch.setenv("AGENTIC_EDGE_PLATFORM", "jetson")
    monkeypatch.setenv("AGENTIC_OLLAMA_RUNTIME", "auto")
    monkeypatch.setattr(ort, "_detect_native_ollama", lambda: {"version": "ollama v0.20.7"})
    monkeypatch.setattr(ort, "_detect_jetson_container_ollama", lambda: None)
    info = ort.detect_ollama_runtime()
    assert info["backend"] == "native"
