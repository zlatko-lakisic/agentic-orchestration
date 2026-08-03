#!/usr/bin/env python3
"""AO speech sidecar — OpenAI-compatible STT (POST /v1/audio/transcriptions).

Uses faster-whisper. Bind loopback by default; for Reach clients on the LAN set
``--host 0.0.0.0`` (or the LAN interface) and advertise that URL via
``AGENTIC_SPEECH_ADVERTISE_STT_URL`` on the engine.

Optional: ``AGENTIC_SPEECH_TOKEN`` — require ``Authorization: Bearer <token>``.

Usage:
  python3 -m venv .venv-stt && source .venv-stt/bin/activate
  pip install -r speech/requirements-stt.txt
  python speech/stt_server.py --model base --device cuda
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


def _require_faster_whisper():
    try:
        from faster_whisper import WhisperModel  # noqa: F401
    except ImportError as exc:
        print(
            "faster-whisper is not installed.\n"
            "  pip install -r speech/requirements-stt.txt\n"
            "Then re-run this script.",
            file=sys.stderr,
        )
        raise SystemExit(2) from exc
    from faster_whisper import WhisperModel

    return WhisperModel


def _parse_multipart(body: bytes, content_type: str) -> dict[str, Any]:
    match = re.search(r"boundary=([^;\s]+)", content_type)
    if not match:
        raise ValueError("multipart boundary missing")
    boundary = match.group(1).strip('"').encode()
    parts: dict[str, Any] = {"files": {}}
    for chunk in body.split(b"--" + boundary):
        chunk = chunk.strip(b"\r\n-")
        if not chunk or chunk == b"--":
            continue
        header_blob, _, payload = chunk.partition(b"\r\n\r\n")
        headers = header_blob.decode("utf-8", errors="replace")
        name_match = re.search(r'name="([^"]+)"', headers)
        if not name_match:
            continue
        name = name_match.group(1)
        if 'filename="' in headers:
            parts["files"][name] = payload.rstrip(b"\r\n")
        else:
            parts[name] = payload.rstrip(b"\r\n").decode("utf-8", errors="replace")
    return parts


class SttHandler(BaseHTTPRequestHandler):
    model_name = "base"
    beam_size = 5
    device = "cpu"
    compute_type = "int8"
    auth_token: str | None = None
    _model = None

    @classmethod
    def load_model(cls) -> None:
        if cls._model is not None:
            return
        WhisperModel = _require_faster_whisper()
        t0 = time.time()
        cls._model = WhisperModel(
            cls.model_name,
            device=cls.device,
            compute_type=cls.compute_type,
        )
        print(
            f"[stt] faster-whisper {cls.model_name} loaded in {time.time() - t0:.1f}s "
            f"device={cls.device} compute_type={cls.compute_type} beam_size={cls.beam_size}",
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

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/v1/audio/transcriptions":
            self.send_error(404, "Not found")
            return
        if self._unauthorized():
            return

        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            self.send_error(400, "Expected multipart/form-data")
            return

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        try:
            parsed = _parse_multipart(body, content_type)
        except ValueError as exc:
            self.send_error(400, str(exc))
            return

        file_bytes = parsed.get("files", {}).get("file")
        if not file_bytes:
            self.send_error(400, "Missing file field")
            return

        language = (parsed.get("language") or "en").strip() or "en"

        self.load_model()
        assert self._model is not None

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = Path(tmp.name)

        text = ""
        t0 = time.time()
        try:
            segments, info = self._model.transcribe(
                str(tmp_path),
                language=language,
                task="transcribe",
                vad_filter=False,
                beam_size=self.beam_size,
                best_of=self.beam_size,
                temperature=0.0,
                condition_on_previous_text=False,
                without_timestamps=True,
                no_speech_threshold=0.6,
                compression_ratio_threshold=2.4,
                log_prob_threshold=-1.0,
            )
            text = " ".join(segment.text.strip() for segment in segments).strip()
            print(
                f"[stt] bytes={len(file_bytes)} model={self.model_name} "
                f"ms={(time.time() - t0) * 1000:.0f} "
                f"lang={getattr(info, 'language', '?')} "
                f"prob={getattr(info, 'language_probability', 0):.2f} text={text!r}",
                file=sys.stderr,
            )
        finally:
            tmp_path.unlink(missing_ok=True)

        payload = json.dumps({"text": text}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/", "/health"):
            body = json.dumps(
                {
                    "ok": True,
                    "engine": "faster-whisper",
                    "model": self.model_name,
                    "device": self.device,
                    "beam_size": self.beam_size,
                }
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_error(404, "Not found")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument("--host", default=os.environ.get("AGENTIC_SPEECH_STT_HOST", "127.0.0.1"))
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("AGENTIC_SPEECH_STT_PORT", "8090")),
    )
    parser.add_argument(
        "--model",
        default=os.environ.get("AGENTIC_SPEECH_WHISPER_MODEL", "base"),
    )
    parser.add_argument(
        "--device",
        default=os.environ.get("AGENTIC_SPEECH_WHISPER_DEVICE", "cpu"),
        help="faster-whisper device: cpu, cuda, auto",
    )
    parser.add_argument(
        "--compute-type",
        default=os.environ.get("AGENTIC_SPEECH_WHISPER_COMPUTE", ""),
        help="Default: float16 on cuda, int8 on cpu",
    )
    parser.add_argument(
        "--beam-size",
        type=int,
        default=int(os.environ.get("AGENTIC_SPEECH_WHISPER_BEAM", "5")),
    )
    args = parser.parse_args()

    compute = args.compute_type.strip()
    if not compute:
        compute = "float16" if args.device.startswith("cuda") else "int8"

    SttHandler.model_name = args.model
    SttHandler.beam_size = max(1, args.beam_size)
    SttHandler.device = args.device
    SttHandler.compute_type = compute
    token = os.environ.get("AGENTIC_SPEECH_TOKEN", "").strip()
    SttHandler.auth_token = token or None
    SttHandler.load_model()
    server = ThreadingHTTPServer((args.host, args.port), SttHandler)
    print(
        f"AO STT (faster-whisper/{args.model}) on http://{args.host}:{args.port}",
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
