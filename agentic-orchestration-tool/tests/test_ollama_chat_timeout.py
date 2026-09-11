"""Unit tests for Ollama chat timeout + overlay prewarm helpers."""

from __future__ import annotations

import pytest

from orchestration.direct_agent import ollama_chat_timeout_sec
from orchestration.run_status import error_code_for_exception
from orchestration.session_overlay_runtime import (
    overlay_prewarm_enabled,
    overlay_prewarm_timeout_sec,
)


@pytest.mark.unit
def test_ollama_chat_timeout_defaults_to_600(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_OLLAMA_CHAT_TIMEOUT_SEC", raising=False)
    assert ollama_chat_timeout_sec(None) == 600.0
    assert ollama_chat_timeout_sec({}) == 600.0


@pytest.mark.unit
def test_ollama_chat_timeout_yaml_overrides_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_CHAT_TIMEOUT_SEC", "600")
    assert ollama_chat_timeout_sec({"chat_timeout_sec": 900}) == 900.0
    assert ollama_chat_timeout_sec({"options": {"chat_timeout_sec": "450"}}) == 450.0


@pytest.mark.unit
def test_ollama_chat_timeout_bad_yaml_falls_back(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_CHAT_TIMEOUT_SEC", "480")
    assert ollama_chat_timeout_sec({"chat_timeout_sec": "abc"}) == 480.0
    assert ollama_chat_timeout_sec({"chat_timeout_sec": 0}) == 480.0
    assert ollama_chat_timeout_sec({"chat_timeout_sec": ""}) == 480.0


@pytest.mark.unit
def test_ollama_chat_timeout_clamps(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_OLLAMA_CHAT_TIMEOUT_SEC", raising=False)
    assert ollama_chat_timeout_sec({"chat_timeout_sec": 5}) == 30.0
    assert ollama_chat_timeout_sec({"chat_timeout_sec": 99999}) == 7200.0


@pytest.mark.unit
def test_timeout_error_maps_to_timeout_code() -> None:
    assert error_code_for_exception(TimeoutError("Ollama /api/chat timed out after 600s")) == "timeout"


@pytest.mark.unit
def test_overlay_prewarm_flag(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_OLLAMA_OVERLAY_PREWARM", raising=False)
    assert overlay_prewarm_enabled(None) is False
    assert overlay_prewarm_enabled({"prewarm": True}) is True
    assert overlay_prewarm_enabled({"prewarm": "no"}) is False
    monkeypatch.setenv("AGENTIC_OLLAMA_OVERLAY_PREWARM", "1")
    assert overlay_prewarm_enabled({}) is True
    assert overlay_prewarm_enabled({"prewarm": False}) is False


@pytest.mark.unit
def test_overlay_prewarm_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_OLLAMA_PREWARM_TIMEOUT_SEC", raising=False)
    assert overlay_prewarm_timeout_sec(None) == 300.0
    assert overlay_prewarm_timeout_sec({"prewarm_timeout_sec": 120}) == 120.0
    monkeypatch.setenv("AGENTIC_OLLAMA_PREWARM_TIMEOUT_SEC", "90")
    assert overlay_prewarm_timeout_sec({"prewarm_timeout_sec": "x"}) == 90.0
