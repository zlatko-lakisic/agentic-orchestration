"""Unit tests for Ollama chat timeout + overlay prewarm helpers."""

from __future__ import annotations

import io
import sys
import types
import urllib.error

import pytest

from orchestration.direct_agent import (
    _litellm_chat_json,
    _ollama_json_think_value,
    _raise_ollama_http_error,
    ollama_chat_timeout_sec,
)
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
@pytest.mark.parametrize(
    ("entry", "expected"),
    [
        ({}, False),
        ({"think": True}, True),
        ({"think": "high"}, "high"),
        ({"options": {"think": True}}, True),
        ({"think": False, "options": {"think": True}}, False),
    ],
)
def test_ollama_json_think_resolution(entry: dict[str, object], expected: object) -> None:
    assert _ollama_json_think_value(entry) == expected


@pytest.mark.unit
@pytest.mark.parametrize(
    "detail",
    [
        "cudaMalloc failed: out of memory",
        "NvMapMemAllocInternalTagged failed",
        "llama runner process has terminated",
        "runner terminated unexpectedly",
    ],
)
def test_model_load_failures_map_to_stable_code(detail: str) -> None:
    assert error_code_for_exception(RuntimeError(detail)) == "model_load_failed"


@pytest.mark.unit
def test_ollama_http_500_model_load_failure_is_clear() -> None:
    detail = b'{"error":"cudaMalloc failed: out of memory"}'
    exc = urllib.error.HTTPError(
        "http://ollama/api/chat",
        500,
        "Internal Server Error",
        {},
        io.BytesIO(detail),
    )
    with pytest.raises(RuntimeError, match="could not load the model into GPU memory"):
        _raise_ollama_http_error(exc, detail.decode())


@pytest.mark.unit
def test_litellm_json_chat_forwards_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    def _completion(**kwargs: object) -> dict[str, object]:
        captured.update(kwargs)
        return {"choices": [{"message": {"content": '{"ok":true}'}}]}

    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(completion=_completion),
    )
    monkeypatch.setattr(
        "agent_providers.ollama_provider.litellm_api_base_for_ollama",
        lambda: "http://agentic-ollama:11434",
    )
    assert (
        _litellm_chat_json(
            entry={
                "type": "ollama",
                "model": "qwen3:8b",
                "chat_timeout_sec": 750,
            },
            prompt="return json",
            on_progress=None,
        )
        == '{"ok":true}'
    )
    assert captured["timeout"] == 750.0


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
