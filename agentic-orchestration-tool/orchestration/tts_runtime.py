"""Managed TTS runtime — OpenAI-compatible sidecar over loopback → client file_id."""

from __future__ import annotations

import io
import json
import os
import re
import wave
from pathlib import Path
from typing import Any

import httpx

from orchestration.client_files import save_client_file
from orchestration.user_context import Identity

__all__ = [
    "TtsError",
    "ORPHEUS_EMOTION_TAGS",
    "is_tts_entry",
    "run_tts",
    "tts_health",
    "split_narration_sentences",
]

# Documented Orpheus emotion / pause tags (Canopy Labs). Scripts may use sparingly.
ORPHEUS_EMOTION_TAGS = (
    "<laugh>",
    "<sigh>",
    "<chuckle>",
    "<cough>",
    "<sniff>",
    "<groan>",
    "<yawn>",
    "<gasp>",
)


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


def _endpoint(entry: dict[str, Any], *, env_name: str | None = None) -> str:
    merged = _opts(entry)
    name = str(
        env_name
        or merged.get("endpoint_env")
        or "AGENTIC_SPEECH_TTS_URL"
    ).strip()
    url = (os.getenv(name) or "").strip().rstrip("/")
    if not url:
        raise TtsError(f"{name} is not set")
    return url


def _engine(entry: dict[str, Any]) -> str:
    return str(_opts(entry).get("engine") or "piper").strip().lower() or "piper"


def _fallback_endpoint(entry: dict[str, Any]) -> str | None:
    merged = _opts(entry)
    name = str(merged.get("fallback_endpoint_env") or "").strip()
    if not name:
        return None
    url = (os.getenv(name) or "").strip().rstrip("/")
    return url or None


def split_narration_sentences(text: str, *, max_chars: int = 280) -> list[str]:
    """Split narration sentence-by-sentence (further split only if one is huge)."""
    raw = re.sub(r"\s+", " ", (text or "").strip())
    if not raw:
        return []
    parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", raw) if p.strip()]
    if not parts:
        return [raw]
    chunks: list[str] = []
    for piece in parts:
        if len(piece) <= max_chars:
            chunks.append(piece)
            continue
        buf = piece
        while len(buf) > max_chars:
            cut = buf[:max_chars].rsplit(" ", 1)[0] or buf[:max_chars]
            chunks.append(cut)
            buf = buf[len(cut) :].lstrip()
        if buf:
            chunks.append(buf)
    return chunks


def _join_wavs(parts: list[bytes]) -> bytes:
    if len(parts) == 1:
        return parts[0]
    frames = bytearray()
    params: tuple[int, int, int, int, str, str] | None = None
    for blob in parts:
        with wave.open(io.BytesIO(blob), "rb") as w:
            p = w.getparams()
            if params is None:
                params = p
            elif (p.nchannels, p.sampwidth, p.framerate) != (
                params.nchannels,
                params.sampwidth,
                params.framerate,
            ):
                raise TtsError("TTS chunks have mismatched WAV formats")
            frames.extend(w.readframes(w.getnframes()))
    if params is None:
        raise TtsError("no WAV chunks to join")
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(params.nchannels)
        w.setsampwidth(params.sampwidth)
        w.setframerate(params.framerate)
        w.writeframes(bytes(frames))
    return out.getvalue()


def _comfy_or_speech_unload(entry: dict[str, Any]) -> None:
    """Best-effort idle unload hook for residency (POST /v1/unload when present)."""
    try:
        base = _endpoint(entry)
    except TtsError:
        return
    path = str(_opts(entry).get("unload_path") or "/v1/unload").strip() or "/v1/unload"
    try:
        with httpx.Client(timeout=5.0) as client:
            client.post(f"{base}{path}")
    except Exception:  # noqa: BLE001
        return


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
    from orchestration.gpu_residency import (
        GpuResidencyError,
        get_gpu_residency_manager,
        residency_lease_for_entry,
    )

    req = _parse_request(text, entry)
    engine_used = req["engine"]
    preferred_env = str(_opts(entry).get("endpoint_env") or "AGENTIC_SPEECH_TTS_URL")
    try:
        base = _endpoint(entry)
    except TtsError as exc:
        # Fail closed when the preferred endpoint env is unset (#185). Silent
        # Piper fallback made logs claim Orpheus/Kokoro while Piper ran.
        # Fallback still applies below when the preferred URL is set but the
        # sidecar is unreachable or returns 5xx.
        fallback_env = str(_opts(entry).get("fallback_endpoint_env") or "").strip()
        hint = (
            f" Configure {preferred_env}, or call tts_piper_en explicitly."
            if fallback_env
            else ""
        )
        raise TtsError(
            f"{preferred_env} is not set; refusing silent fallback"
            + (f" to {fallback_env}." if fallback_env else ".")
            + hint
        ) from exc
    path = str(_opts(entry).get("speech_path") or "/v1/audio/speech")
    own = client is None
    http = client or httpx.Client(timeout=float(os.getenv("AGENTIC_SPEECH_TTS_TIMEOUT_S", "120") or 120))
    lease = None
    try:
        try:
            lease = residency_lease_for_entry(
                entry,
                kind="tts",
                unload=lambda: _comfy_or_speech_unload(entry),
            )
        except GpuResidencyError as exc:
            raise TtsError(str(exc)) from exc

        chunks = split_narration_sentences(req["text"])
        wav_parts: list[bytes] = []
        for chunk in chunks:
            try:
                resp = http.post(
                    f"{base}{path}",
                    json={
                        "input": chunk,
                        "text": chunk,
                        "voice": req["voice"],
                        "speed": req["speed"],
                    },
                    headers={"Accept": "audio/wav"},
                )
            except httpx.HTTPError as exc:
                fallback = _fallback_endpoint(entry)
                if fallback and base != fallback:
                    base = fallback
                    engine_used = str(_opts(entry).get("fallback_engine") or "piper")
                    resp = http.post(
                        f"{base}{path}",
                        json={
                            "input": chunk,
                            "text": chunk,
                            "voice": req["voice"],
                            "speed": req["speed"],
                        },
                        headers={"Accept": "audio/wav"},
                    )
                else:
                    raise TtsError(f"TTS sidecar unreachable: {exc}") from exc
            if resp.status_code >= 400:
                fallback = _fallback_endpoint(entry)
                if fallback and base != fallback and resp.status_code >= 500:
                    base = fallback
                    engine_used = str(_opts(entry).get("fallback_engine") or "piper")
                    resp = http.post(
                        f"{base}{path}",
                        json={
                            "input": chunk,
                            "text": chunk,
                            "voice": req["voice"],
                            "speed": req["speed"],
                        },
                        headers={"Accept": "audio/wav"},
                    )
                if resp.status_code >= 400:
                    raise TtsError(f"TTS sidecar HTTP {resp.status_code}: {resp.text[:300]}")
            if not resp.content:
                raise TtsError("TTS sidecar returned empty body")
            wav_parts.append(resp.content)

        audio = _join_wavs(wav_parts) if len(wav_parts) > 1 else wav_parts[0]
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
            "engine": engine_used,
            "voice": req["voice"],
            "speed": req["speed"],
            "bytes": len(audio),
            "chunks": len(wav_parts),
            "provider": str(entry.get("id") or ""),
            "preferredEnv": preferred_env,
        }
    finally:
        if lease is not None:
            get_gpu_residency_manager().release(lease)
        if own:
            http.close()


def tts_health(entry: dict[str, Any]) -> dict[str, Any]:
    pid = str(entry.get("id") or "")
    try:
        base = _endpoint(entry)
    except TtsError as exc:
        fallback = _fallback_endpoint(entry)
        if fallback:
            return {
                "ok": True,
                "reachable": True,
                "configured": True,
                "engine": str(_opts(entry).get("fallback_engine") or "piper"),
                "fallback": True,
                "error": str(exc),
                "providerId": pid,
                "emotionTags": list(ORPHEUS_EMOTION_TAGS) if _engine(entry) == "orpheus" else None,
            }
        return {
            "ok": False,
            "reachable": False,
            "configured": False,
            "error": str(exc),
            "providerId": pid,
        }
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(f"{base}/health")
        if resp.status_code >= 400:
            return {
                "ok": False,
                "reachable": True,
                "configured": True,
                "error": f"HTTP {resp.status_code}",
                "providerId": pid,
            }
        data = resp.json() if resp.content else {}
        out: dict[str, Any] = {
            "ok": True,
            "reachable": True,
            "configured": True,
            "engine": _engine(entry),
            "backend": (data.get("backend") or {}).get("name") if isinstance(data, dict) else None,
            "providerId": pid,
        }
        if _engine(entry) == "orpheus":
            out["emotionTags"] = list(ORPHEUS_EMOTION_TAGS)
        return out
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "reachable": False,
            "configured": True,
            "error": str(exc),
            "providerId": pid,
        }
