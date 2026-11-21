#!/usr/bin/env python3
"""AO speech sidecar — OpenAI-compatible TTS (POST /v1/audio/speech → audio/wav).

Uses sherpa-onnx Piper VITS. Model dir must contain ``*.onnx``, ``tokens.txt``,
and ``espeak-ng-data/``.

Optional: ``AGENTIC_SPEECH_TOKEN`` — require ``Authorization: Bearer <token>``.

Env:
  AGENTIC_SPEECH_TTS_MODEL_DIR   default voice directory (id ``default``)
  AGENTIC_SPEECH_TTS_VOICES_DIR  optional folder of voice subfolders (id = name)
  AGENTIC_SPEECH_TTS_THREADS     default 2
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import threading
import time
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


def _find_vits(dir_path: Path) -> dict[str, Path]:
    onnx = next(dir_path.glob("*.onnx"), None)
    tokens = dir_path / "tokens.txt"
    data_dir = dir_path / "espeak-ng-data"
    if onnx is None or not tokens.is_file() or not data_dir.is_dir():
        raise FileNotFoundError(
            f"Need *.onnx + tokens.txt + espeak-ng-data/ in {dir_path}"
        )
    return {"model": onnx, "tokens": tokens, "data_dir": data_dir}


def _write_wav(path: Path, samples: Any, sample_rate: int) -> None:
    import numpy as np

    pcm = np.asarray(samples, dtype=np.float32)
    pcm = np.clip(pcm, -1.0, 1.0)
    ints = (pcm * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(ints.tobytes())


def discover_voice_dirs(
    *,
    model_dir: Path | None,
    voices_dir: Path | None,
) -> dict[str, Path]:
    """Map voice id → Piper VITS model directory.

    ``AGENTIC_SPEECH_TTS_MODEL_DIR`` becomes id ``default``. Subfolders of
    ``AGENTIC_SPEECH_TTS_VOICES_DIR`` use the folder name as the id.
    """
    voices: dict[str, Path] = {}
    if model_dir is not None and model_dir.is_dir():
        voices["default"] = model_dir.resolve()
    if voices_dir is not None and voices_dir.is_dir():
        for child in sorted(voices_dir.iterdir()):
            if not child.is_dir():
                continue
            voice_id = child.name.strip()
            if not voice_id or voice_id == "default":
                # Keep MODEL_DIR as the sole ``default``; skip colliding names.
                if voice_id == "default" and "default" in voices:
                    continue
                if not voice_id:
                    continue
            try:
                _find_vits(child)
            except FileNotFoundError:
                continue
            voices[voice_id] = child.resolve()
    return voices


def parse_speed(raw: Any, *, default: float = 1.0) -> float:
    if raw is None or raw == "":
        return default
    try:
        speed = float(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError("speed must be a number between 0.5 and 2.0") from exc
    if speed < 0.5 or speed > 2.0:
        raise ValueError("speed must be between 0.5 and 2.0")
    return speed


def load_vits_tts(
    model_dir: Path,
    *,
    provider: str,
    threads: int,
) -> Any:
    import sherpa_onnx

    files = _find_vits(model_dir)
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=str(files["model"]),
                tokens=str(files["tokens"]),
                data_dir=str(files["data_dir"]),
            ),
            provider=provider,
            num_threads=threads,
            debug=False,
        ),
        max_num_sentences=2,
    )
    if not cfg.validate():
        raise RuntimeError("Invalid OfflineTtsConfig")
    return sherpa_onnx.OfflineTts(cfg)


class TtsHandler(BaseHTTPRequestHandler):
    model_dir: Path | None = None
    voices_dir: Path | None = None
    threads = 2
    provider = "cpu"
    auth_token: str | None = None
    _voice_dirs: dict[str, Path] = {}
    _tts_cache: dict[str, Any] = {}
    _cache_lock = threading.Lock()
    _default_voice = "default"

    @classmethod
    def refresh_voice_dirs(cls) -> None:
        cls._voice_dirs = discover_voice_dirs(
            model_dir=cls.model_dir,
            voices_dir=cls.voices_dir,
        )
        if "default" in cls._voice_dirs:
            cls._default_voice = "default"
        elif cls._voice_dirs:
            cls._default_voice = next(iter(cls._voice_dirs))
        else:
            cls._default_voice = "default"

    @classmethod
    def known_voice_ids(cls) -> list[str]:
        if not cls._voice_dirs:
            cls.refresh_voice_dirs()
        return sorted(cls._voice_dirs)

    @classmethod
    def get_tts(cls, voice_id: str) -> Any:
        if not cls._voice_dirs:
            cls.refresh_voice_dirs()
        if voice_id not in cls._voice_dirs:
            known = ", ".join(cls.known_voice_ids()) or "(none)"
            raise KeyError(f"unknown voice {voice_id!r}; known: {known}")
        with cls._cache_lock:
            cached = cls._tts_cache.get(voice_id)
            if cached is not None:
                return cached
            t0 = time.time()
            tts = load_vits_tts(
                cls._voice_dirs[voice_id],
                provider=cls.provider,
                threads=cls.threads,
            )
            cls._tts_cache[voice_id] = tts
            print(
                f"[tts] piper vits voice={voice_id} loaded from {cls._voice_dirs[voice_id]} "
                f"in {time.time() - t0:.1f}s threads={cls.threads} provider={cls.provider}",
                file=sys.stderr,
            )
            return tts

    @classmethod
    def load_model(cls) -> None:
        """Eager-load the default voice (startup / backward compat)."""
        cls.refresh_voice_dirs()
        if not cls._voice_dirs:
            raise FileNotFoundError(
                "No TTS voices configured "
                "(set AGENTIC_SPEECH_TTS_MODEL_DIR and/or AGENTIC_SPEECH_TTS_VOICES_DIR)"
            )
        cls.get_tts(cls._default_voice)

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write(
            "%s - - [%s] %s\n"
            % (self.address_string(), self.log_date_time_string(), fmt % args)
        )

    def _unauthorized(self) -> bool:
        if not self.auth_token:
            return False
        header = self.headers.get("Authorization", "")
        expected = f"Bearer {self.auth_token}"
        if header.strip() != expected:
            self.send_error(401, "Unauthorized")
            return True
        return False

    def _json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/", "/health"):
            body = json.dumps(
                {
                    "ok": True,
                    "engine": "sherpa-piper",
                    "voices": self.known_voice_ids(),
                    "default": self._default_voice,
                }
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if self.path == "/v1/audio/voices":
            if self._unauthorized():
                return
            voices_out: list[dict[str, Any]] = []
            for voice_id in self.known_voice_ids():
                sample_rate = 22050
                cached = self._tts_cache.get(voice_id)
                if cached is not None:
                    try:
                        sample_rate = int(cached.sample_rate)
                    except Exception:  # noqa: BLE001
                        pass
                voices_out.append({"id": voice_id, "sample_rate": sample_rate})
            self._json(
                200,
                {"voices": voices_out, "default": self._default_voice},
            )
            return
        self.send_error(404, "Not found")

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/v1/audio/speech":
            self.send_error(404, "Not found")
            return
        if self._unauthorized():
            return

        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self.send_error(400, "invalid json")
            return

        text = (payload.get("text") or payload.get("input") or "").strip()
        if not text:
            self.send_error(400, "missing text")
            return
        if len(text) > 800:
            text = text[:800]

        voice_raw = payload.get("voice")
        voice_id = (
            str(voice_raw).strip()
            if voice_raw is not None and str(voice_raw).strip()
            else self._default_voice
        )
        try:
            speed = parse_speed(payload.get("speed"), default=1.0)
        except ValueError as exc:
            self._json(400, {"error": str(exc)})
            return

        try:
            tts = self.get_tts(voice_id)
        except KeyError as exc:
            self._json(
                400,
                {
                    "error": str(exc),
                    "voices": self.known_voice_ids(),
                    "default": self._default_voice,
                },
            )
            return
        except Exception as exc:  # noqa: BLE001
            print(f"[tts] load error voice={voice_id}: {exc}", file=sys.stderr)
            self.send_error(500, str(exc))
            return

        t0 = time.time()
        try:
            try:
                audio = tts.generate(text, sid=0, speed=speed)
            except TypeError:
                audio = tts.generate(text)

            samples = audio.samples
            rate = int(audio.sample_rate)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                out = Path(tmp.name)
            try:
                _write_wav(out, samples, rate)
                wav_bytes = out.read_bytes()
            finally:
                out.unlink(missing_ok=True)
            print(
                f"[tts] voice={voice_id} speed={speed} chars={len(text)} "
                f"ms={(time.time() - t0) * 1000:.0f} bytes={len(wav_bytes)}",
                file=sys.stderr,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[tts] error: {exc}", file=sys.stderr)
            self.send_error(500, str(exc))
            return

        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(wav_bytes)))
        self.end_headers()
        self.wfile.write(wav_bytes)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument("--host", default=os.environ.get("AGENTIC_SPEECH_TTS_HOST", "127.0.0.1"))
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("AGENTIC_SPEECH_TTS_PORT", "8091")),
    )
    parser.add_argument(
        "--model-dir",
        default=os.environ.get(
            "AGENTIC_SPEECH_TTS_MODEL_DIR",
            os.environ.get("COMSTAR_SHERPA_TTS_DIR", ""),
        ),
    )
    parser.add_argument(
        "--voices-dir",
        default=os.environ.get("AGENTIC_SPEECH_TTS_VOICES_DIR", ""),
        help="Directory of Piper VITS voice subfolders (id = folder name)",
    )
    parser.add_argument(
        "--threads",
        type=int,
        default=int(os.environ.get("AGENTIC_SPEECH_TTS_THREADS", "2")),
    )
    parser.add_argument(
        "--provider",
        default=os.environ.get("AGENTIC_SPEECH_TTS_PROVIDER", "cpu"),
    )
    args = parser.parse_args()

    model_dir = Path(args.model_dir) if str(args.model_dir).strip() else None
    voices_dir = Path(args.voices_dir) if str(args.voices_dir).strip() else None
    if model_dir is None and voices_dir is None:
        print(
            "Model dir required: set AGENTIC_SPEECH_TTS_MODEL_DIR or "
            "AGENTIC_SPEECH_TTS_VOICES_DIR (or --model-dir / --voices-dir)",
            file=sys.stderr,
        )
        return 1

    TtsHandler.model_dir = model_dir
    TtsHandler.voices_dir = voices_dir
    TtsHandler.threads = max(1, args.threads)
    TtsHandler.provider = args.provider
    token = os.environ.get("AGENTIC_SPEECH_TOKEN", "").strip()
    TtsHandler.auth_token = token or None

    if model_dir is not None and not model_dir.is_dir():
        print(f"Model dir missing: {model_dir}", file=sys.stderr)
        return 1
    if voices_dir is not None and not voices_dir.is_dir():
        print(f"Voices dir missing: {voices_dir}", file=sys.stderr)
        return 1

    try:
        TtsHandler.load_model()
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to load TTS voices: {exc}", file=sys.stderr)
        return 1

    server = ThreadingHTTPServer((args.host, args.port), TtsHandler)
    print(
        f"AO TTS (sherpa/piper) on http://{args.host}:{args.port} "
        f"voices={TtsHandler.known_voice_ids()} default={TtsHandler._default_voice}",
        file=sys.stderr,
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.", file=sys.stderr)
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
