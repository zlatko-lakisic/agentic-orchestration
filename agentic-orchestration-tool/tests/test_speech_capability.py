"""Tests for optional speech capability hello payload."""

from __future__ import annotations

import os
from unittest import mock

from orchestration.speech_capability import speech_enabled, speech_hello_payload


def test_speech_disabled_by_default():
    with mock.patch.dict(os.environ, {}, clear=False):
        os.environ.pop("AGENTIC_SPEECH_ENABLED", None)
        assert speech_enabled() is False
        assert speech_hello_payload() is None


def test_speech_hello_uses_advertise_urls():
    env = {
        "AGENTIC_SPEECH_ENABLED": "1",
        "AGENTIC_SPEECH_ADVERTISE_STT_URL": "http://10.0.0.5:8090/",
        "AGENTIC_SPEECH_ADVERTISE_TTS_URL": "http://10.0.0.5:8091/",
        "AGENTIC_SPEECH_TOKEN": "secret",
    }
    with mock.patch.dict(os.environ, env, clear=False):
        payload = speech_hello_payload()
    assert payload is not None
    assert payload["enabled"] is True
    assert payload["openaiCompatible"] is True
    assert payload["sttBaseUrl"] == "http://10.0.0.5:8090"
    assert payload["ttsBaseUrl"] == "http://10.0.0.5:8091"
    assert payload["transcribePath"] == "/v1/audio/transcriptions"
    assert payload["speechPath"] == "/v1/audio/speech"
    assert payload["auth"] == "bearer"


def test_speech_hello_falls_back_to_local_urls():
    env = {
        "AGENTIC_SPEECH_ENABLED": "1",
    }
    with mock.patch.dict(os.environ, env, clear=False):
        for key in (
            "AGENTIC_SPEECH_ADVERTISE_STT_URL",
            "AGENTIC_SPEECH_ADVERTISE_TTS_URL",
            "AGENTIC_SPEECH_STT_URL",
            "AGENTIC_SPEECH_TTS_URL",
            "AGENTIC_SPEECH_TOKEN",
        ):
            os.environ.pop(key, None)
        payload = speech_hello_payload()
    assert payload is not None
    assert payload["sttBaseUrl"] == "http://127.0.0.1:8090"
    assert payload["ttsBaseUrl"] == "http://127.0.0.1:8091"
    assert "auth" not in payload
