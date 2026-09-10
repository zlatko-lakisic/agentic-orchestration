"""Unit tests for Ollama healthy wait / soft-retry used by session overlay ensure."""

from __future__ import annotations

import threading

import pytest

from orchestration import ollama_health as oh


@pytest.mark.unit
def test_wait_for_ollama_healthy_retries_then_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = {"n": 0}

    def _healthy(_host: str) -> bool:
        calls["n"] += 1
        return calls["n"] >= 3

    monkeypatch.setattr(oh, "is_ollama_healthy", _healthy)
    monkeypatch.setattr(oh.time, "sleep", lambda _s: None)
    assert oh.wait_for_ollama_healthy("http://ollama.test", attempts=3, delays_s=(0.0, 0.0, 0.0))
    assert calls["n"] == 3


@pytest.mark.unit
def test_wait_for_ollama_healthy_fails_after_attempts(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(oh, "is_ollama_healthy", lambda _h: False)
    monkeypatch.setattr(oh.time, "sleep", lambda _s: None)
    assert not oh.wait_for_ollama_healthy(
        "http://ollama.test", attempts=3, delays_s=(0.0, 0.0, 0.0)
    )


@pytest.mark.unit
def test_wait_for_ollama_healthy_respects_cancel(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(oh, "is_ollama_healthy", lambda _h: False)
    ev = threading.Event()
    ev.set()
    assert not oh.wait_for_ollama_healthy(
        "http://ollama.test", attempts=5, delays_s=(1.0,), cancel_event=ev
    )
