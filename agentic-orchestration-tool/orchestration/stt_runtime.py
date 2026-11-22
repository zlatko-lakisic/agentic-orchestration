"""Managed STT runtime — OpenAI-compatible sidecar over loopback."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx

from orchestration.client_files import (
    ClientFileError,
    ClientFileNotFound,
    get_client_file_meta,
    resolve_client_file,
)
from orchestration.user_context import Identity

__all__ = [
    "SttError",
    "is_stt_entry",
    "run_stt",
    "stt_health",
]


class SttError(ValueError):
    """Invalid STT request or sidecar failure."""


def is_stt_entry(entry: dict[str, Any] | None) -> bool:
    if not isinstance(entry, dict):
        return False
    typ = str(entry.get("type") or entry.get("provider_type") or "").strip().lower()
    return typ == "stt"


def _opts(entry: dict[str, Any]) -> dict[str, Any]:
    opts = entry.get("provider_options")
    merged = dict(entry)
    if isinstance(opts, dict):
        merged.update(opts)
    return merged


def _endpoint(entry: dict[str, Any]) -> str:
    merged = _opts(entry)
    env_name = str(merged.get("endpoint_env") or "AGENTIC_SPEECH_STT_URL").strip()
    url = (os.getenv(env_name) or "").strip().rstrip("/")
    if not url:
        raise SttError(f"{env_name} is not set")
    return url


def _parse_request(text: str) -> dict[str, Any]:
    raw = (text or "").strip()
    if not raw.startswith("{"):
        raise SttError("STT requires JSON with audio_file_id")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SttError(f"invalid STT JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise SttError("STT payload must be a JSON object")
    file_id = str(data.get("audio_file_id") or data.get("file_id") or "").strip()
    if not file_id:
        raise SttError("audio_file_id is required")
    fmt = str(data.get("response_format") or "verbose_json").strip() or "verbose_json"
    gran = data.get("timestamp_granularities") or ["word"]
    if isinstance(gran, str):
        gran = [gran]
    return {
        "audio_file_id": file_id,
        "response_format": fmt,
        "timestamp_granularities": list(gran),
        "language": str(data.get("language") or "").strip() or None,
    }


def _speech_unload(entry: dict[str, Any]) -> None:
    try:
        base = _endpoint(entry)
    except SttError:
        return
    path = str(_opts(entry).get("unload_path") or "/v1/unload").strip() or "/v1/unload"
    try:
        with httpx.Client(timeout=5.0) as client:
            client.post(f"{base}{path}")
    except Exception:  # noqa: BLE001
        return


def run_stt(
    entry: dict[str, Any],
    *,
    text: str,
    tool_root: Path,
    identity: Identity | str | None = None,
    user_id: str | None = None,
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    """Transcribe a client audio file via the STT sidecar."""
    del tool_root
    from orchestration.gpu_residency import (
        GpuResidencyError,
        get_gpu_residency_manager,
        residency_lease_for_entry,
    )

    req = _parse_request(text)
    owner: Identity | str
    if identity is not None:
        owner = identity
    elif user_id:
        owner = str(user_id)
    else:
        raise SttError("identity or user_id required")
    try:
        audio_path = resolve_client_file(owner, req["audio_file_id"])
        meta = get_client_file_meta(owner, req["audio_file_id"])
    except (ClientFileError, ClientFileNotFound) as exc:
        raise SttError(str(exc)) from exc
    audio_bytes = audio_path.read_bytes()
    mime = str(meta.get("mime_type") or meta.get("content_type") or "audio/wav")
    base = _endpoint(entry)
    path = str(_opts(entry).get("transcribe_path") or "/v1/audio/transcriptions")
    own = client is None
    http = client or httpx.Client(timeout=float(os.getenv("AGENTIC_SPEECH_STT_TIMEOUT_S", "300") or 300))
    lease = None
    try:
        try:
            lease = residency_lease_for_entry(
                entry,
                kind="stt",
                unload=lambda: _speech_unload(entry),
            )
        except GpuResidencyError as exc:
            raise SttError(str(exc)) from exc
        files = {
            "file": (audio_path.name or "audio.wav", audio_bytes, mime)
        }
        data: dict[str, Any] = {
            "response_format": req["response_format"],
            "timestamp_granularities[]": req["timestamp_granularities"],
        }
        if req["language"]:
            data["language"] = req["language"]
        resp = http.post(f"{base}{path}", data=data, files=files)
        if resp.status_code >= 400:
            raise SttError(f"STT sidecar HTTP {resp.status_code}: {resp.text[:300]}")
        try:
            body = resp.json()
        except Exception:  # noqa: BLE001
            body = {"text": resp.text}
        if not isinstance(body, dict):
            body = {"text": str(body)}
        return {
            "ok": True,
            "text": body.get("text"),
            "words": body.get("words"),
            "provider": str(entry.get("id") or ""),
            "audio_file_id": req["audio_file_id"],
            "raw": body,
        }
    finally:
        if lease is not None:
            get_gpu_residency_manager().release(lease)
        if own:
            http.close()


def stt_health(entry: dict[str, Any]) -> dict[str, Any]:
    try:
        base = _endpoint(entry)
    except SttError as exc:
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
            "engine": (data.get("engine") if isinstance(data, dict) else None) or "faster-whisper",
            "providerId": str(entry.get("id") or ""),
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "reachable": False,
            "error": str(exc),
            "providerId": str(entry.get("id") or ""),
        }
