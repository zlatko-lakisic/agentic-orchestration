"""Optional STT/TTS capability advertisement for ``orchestration.serve`` hello.

Speech inference runs in **sidecars** (see ``speech/``). The engine only advertises
OpenAI-compatible base URLs so Reach clients can call them over HTTP.

Enable with ``AGENTIC_SPEECH_ENABLED=1``. Client-facing URLs should be LAN-reachable
(``AGENTIC_SPEECH_ADVERTISE_STT_URL`` / ``AGENTIC_SPEECH_ADVERTISE_TTS_URL``); local
sidecar bind URLs default to loopback.
"""

from __future__ import annotations

import os
from typing import Any


def _truthy(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in ("1", "true", "yes", "on")


def speech_enabled() -> bool:
    return _truthy("AGENTIC_SPEECH_ENABLED")


def _url(name: str, default: str) -> str:
    raw = os.getenv(name, "").strip()
    return raw.rstrip("/") if raw else default.rstrip("/")


def speech_hello_payload() -> dict[str, Any] | None:
    """Return the ``speech`` object for WS hello, or ``None`` when disabled."""
    if not speech_enabled():
        return None

    stt = _url(
        "AGENTIC_SPEECH_ADVERTISE_STT_URL",
        os.getenv("AGENTIC_SPEECH_STT_URL", "").strip() or "http://127.0.0.1:8090",
    )
    tts = _url(
        "AGENTIC_SPEECH_ADVERTISE_TTS_URL",
        os.getenv("AGENTIC_SPEECH_TTS_URL", "").strip() or "http://127.0.0.1:8091",
    )
    token = os.getenv("AGENTIC_SPEECH_TOKEN", "").strip()
    payload: dict[str, Any] = {
        "enabled": True,
        "openaiCompatible": True,
        "sttBaseUrl": stt,
        "ttsBaseUrl": tts,
        "transcribePath": "/v1/audio/transcriptions",
        "speechPath": "/v1/audio/speech",
    }
    if token:
        payload["auth"] = "bearer"
    return payload
