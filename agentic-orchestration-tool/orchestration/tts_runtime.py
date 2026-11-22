"""Managed TTS runtime — OpenAI-compatible sidecar over loopback → client file_id."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx

from orchestration.client_files import save_client_file
from orchestration.user_context import Identity

__all__ = [
    "TtsError",
    "is_tts_entry",
    "run_tts",
    "tts_health",
]


class TtsError(ValueError):
    """Invalid TTS request or sidecar failure."""


def is_tts_entry(entry: dict[str, Any] | None) -> bool:
    if not isinstance(entry, dict):
        return False
    typ = str(entry.get("type") or entry.get("provider_type") or "").strip().lower()
    return typ == "tts"


def _opts(entry: dict[str, Any]) -> dict[str, Any]:
    opts = entry.get("provider_options")
    merged = dict(entry)
    if isinstance(opts, dict):
        merged.update(opts)
    return merged


def _endpoint(entry: dict[str, Any]) -> str:
    merged = _opts(entry)
    env_name = str(merged.get("endpoint_env") or "AGENTIC_SPEECH_TTS_URL").strip()
    url = (os.getenv(env_name) or "").strip().rstrip("/")
    if not url:
        raise TtsError(f"{env_name} is not set")
    return url


def _engine(entry: dict[str, Any]) -> str:
    return str(_opts(entry).get("engine") or "piper").strip().lower() or "piper"


def _parse_request(text: str, entry: dict[str, Any]) -> dict[str, Any]:
    raw = (text or "").strip()
    data: dict[str, Any] = {}
    if raw.startswith("{"):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                data = parsed
        except json.JSONDecodeError as exc:
            raise TtsError(f"TTS payload must be JSON object or plain text: {exc}") from exc
    prompt = str(data.get("text") or data.get("prompt") or ("" if data else raw)).strip()
    if not prompt:
        raise TtsError("TTS requires non-empty text")
    defaults = _opts(entry).get("defaults") if isinstance(_opts(entry).get("defaults"), dict) else {}
    voice = str(data.get("voice") or defaults.get("voice") or "default").strip() or "default"
    speed = float(data.get("speed") if data.get("speed") is not None else defaults.get("speed") or 1.0)
    engine = str(data.get("engine") or _engine(entry)).strip().lower()
    allowed = _opts(entry).get("allowed_engines")
    # Hard guard first: English native providers never accept Qwen.
    if engine in {"qwen", "qwen3", "qwen3-tts"}:
        raise TtsError("Qwen3-TTS is not allowed for this English TTS provider")
    if isinstance(allowed, list) and allowed:
        allowed_norm = {str(x).strip().lower() for x in allowed if str(x).strip()}
        if engine not in allowed_norm:
            raise TtsError(
                f"engine {engine!r} not allowed for this provider "
                f"(allowed: {sorted(allowed_norm)})"
            )
    return {"text": prompt, "voice": voice, "speed": speed, "engine": engine}


def run_tts(
    entry: dict[str, Any],
    *,
    text: str,
    tool_root: Path,
    identity: Identity | str | None = None,
    user_id: str | None = None,
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    """POST sidecar ``/v1/audio/speech`` and register WAV as a client file."""
    del tool_root
    req = _parse_request(text, entry)
    base = _endpoint(entry)
    path = str(_opts(entry).get("speech_path") or "/v1/audio/speech")
    own = client is None
    http = client or httpx.Client(timeout=float(os.getenv("AGENTIC_SPEECH_TTS_TIMEOUT_S", "120") or 120))
    try:
        resp = http.post(
            f"{base}{path}",
            json={"input": req["text"], "text": req["text"], "voice": req["voice"], "speed": req["speed"]},
            headers={"Accept": "audio/wav"},
        )
        if resp.status_code >= 400:
            raise TtsError(f"TTS sidecar HTTP {resp.status_code}: {resp.text[:300]}")
        audio = resp.content
        if not audio:
            raise TtsError("TTS sidecar returned empty body")
        owner: Identity | str
        if identity is not None:
            owner = identity
        elif user_id:
            owner = str(user_id)
        else:
            raise TtsError("identity or user_id required to store TTS output")
        meta = save_client_file(owner, audio, "speech.wav", "audio/wav")
        return {
            "ok": True,
            "file_id": meta["file_id"],
            "download_url": meta.get("download_url"),
            "content_type": "audio/wav",
            "engine": req["engine"],
            "voice": req["voice"],
            "speed": req["speed"],
            "bytes": len(audio),
            "provider": str(entry.get("id") or ""),
        }
    finally:
        if own:
            http.close()


def tts_health(entry: dict[str, Any]) -> dict[str, Any]:
    try:
        base = _endpoint(entry)
    except TtsError as exc:
        return {"ok": False, "reachable": False, "error": str(exc), "providerId": str(entry.get("id") or "")}
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(f"{base}/health")
        if resp.status_code >= 400:
            return {
                "ok": False,
                "reachable": True,
                "error": f"HTTP {resp.status_code}",
                "providerId": str(entry.get("id") or ""),
            }
        data = resp.json() if resp.content else {}
        return {
            "ok": True,
            "reachable": True,
            "engine": _engine(entry),
            "backend": (data.get("backend") or {}).get("name") if isinstance(data, dict) else None,
            "providerId": str(entry.get("id") or ""),
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "reachable": False,
            "error": str(exc),
            "providerId": str(entry.get("id") or ""),
        }
