#!/usr/bin/env python3
"""AO speech sidecar — OpenAI-compatible TTS (POST /v1/audio/speech → audio/wav).

Uses sherpa-onnx Piper VITS. Model dir must contain ``*.onnx``, ``tokens.txt``,
and ``espeak-ng-data/``.

Optional: ``AGENTIC_SPEECH_TOKEN`` — require ``Authorization: Bearer <token>``.

Env:
  AGENTIC_SPEECH_TTS_MODEL_DIR  model directory
  AGENTIC_SPEECH_TTS_THREADS    default 2
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
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


class TtsHandler(BaseHTTPRequestHandler):
    model_dir: Path | None = None
    threads = 2
    provider = "cpu"
    auth_token: str | None = None
    _tts = None

    @classmethod
    def load_model(cls) -> None:
        if cls._tts is not None:
            return
        import sherpa_onnx

        assert cls.model_dir is not None
        files = _find_vits(cls.model_dir)
        t0 = time.time()
        cfg = sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                    model=str(files["model"]),
                    tokens=str(files["tokens"]),
                    data_dir=str(files["data_dir"]),
                ),
                provider=cls.provider,
                num_threads=cls.threads,
                debug=False,
            ),
            max_num_sentences=2,
        )
        if not cfg.validate():
            raise RuntimeError("Invalid OfflineTtsConfig")
        cls._tts = sherpa_onnx.OfflineTts(cfg)
        print(
            f"[tts] piper vits loaded from {cls.model_dir} "
            f"in {time.time() - t0:.1f}s threads={cls.threads} provider={cls.provider}",
            file=sys.stderr,
        )

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

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/", "/health"):
            body = b'{"ok":true,"engine":"sherpa-piper"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
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

        self.load_model()
        assert self._tts is not None

        t0 = time.time()
        try:
            try:
                audio = self._tts.generate(text, sid=0, speed=1.0)
            except TypeError:
                audio = self._tts.generate(text)

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
                f"[tts] chars={len(text)} ms={(time.time() - t0) * 1000:.0f} "
                f"bytes={len(wav_bytes)}",
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
        "--threads",
        type=int,
        default=int(os.environ.get("AGENTIC_SPEECH_TTS_THREADS", "2")),
    )
    parser.add_argument(
        "--provider",
        default=os.environ.get("AGENTIC_SPEECH_TTS_PROVIDER", "cpu"),
    )
    args = parser.parse_args()

    if not args.model_dir:
        print(
            "Model dir required: set AGENTIC_SPEECH_TTS_MODEL_DIR or --model-dir",
            file=sys.stderr,
        )
        return 1

    TtsHandler.model_dir = Path(args.model_dir)
    TtsHandler.threads = max(1, args.threads)
    TtsHandler.provider = args.provider
    token = os.environ.get("AGENTIC_SPEECH_TOKEN", "").strip()
    TtsHandler.auth_token = token or None
    if not TtsHandler.model_dir.is_dir():
        print(f"Model dir missing: {TtsHandler.model_dir}", file=sys.stderr)
        return 1

    TtsHandler.load_model()
    server = ThreadingHTTPServer((args.host, args.port), TtsHandler)
    print(f"AO TTS (sherpa/piper) on http://{args.host}:{args.port}", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.", file=sys.stderr)
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
