#!/usr/bin/env python3
"""AO speech sidecar — OpenAI-compatible Orpheus TTS (POST /v1/audio/speech → audio/wav).

Orpheus 3B (Canopy Labs) is loaded on demand by the engine residency manager.
This process keeps the decoder resident only while serving; ``POST /v1/unload``
drops weights so VRAM can be reclaimed.

Backends (``AGENTIC_ORPHEUS_BACKEND``):
  - ``http`` (default): proxy to ``AGENTIC_ORPHEUS_UPSTREAM_URL`` OpenAI-compatible TTS
  - ``stub``: generate a short silence WAV (CI / wiring smoke without GPU weights)

Env:
  AGENTIC_SPEECH_ORPHEUS_HOST / PORT   bind (default 127.0.0.1:8092)
  AGENTIC_ORPHEUS_UPSTREAM_URL         when backend=http
  AGENTIC_SPEECH_TOKEN                optional bearer
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys
import threading
import time
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def _truthy(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in ("1", "true", "yes", "on")


def _silence_wav(*, seconds: float = 0.25, rate: int = 24000) -> bytes:
    n = max(1, int(seconds * rate))
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\x00\x00" * n)
    return buf.getvalue()


class OrpheusState:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.loaded = False
        self.backend = (os.getenv("AGENTIC_ORPHEUS_BACKEND") or "http").strip().lower()
        self.upstream = (os.getenv("AGENTIC_ORPHEUS_UPSTREAM_URL") or "").strip().rstrip("/")
        self.loaded_at: float | None = None
        self.last_used_at: float | None = None

    def ensure_loaded(self) -> None:
        with self.lock:
            if self.loaded:
                return
            if self.backend == "http" and not self.upstream:
                raise RuntimeError(
                    "AGENTIC_ORPHEUS_UPSTREAM_URL required for backend=http "
                    "(or set AGENTIC_ORPHEUS_BACKEND=stub)"
                )
            self.loaded = True
            self.loaded_at = time.time()

    def unload(self) -> None:
        with self.lock:
            self.loaded = False
            self.loaded_at = None

    def synthesize(self, text: str, *, voice: str, speed: float) -> bytes:
        self.ensure_loaded()
        with self.lock:
            self.last_used_at = time.time()
        if self.backend == "stub":
            # Length scales lightly with text so chunk joins stay plausible.
            secs = min(2.0, 0.15 + 0.02 * max(1, len(text.split())))
            return _silence_wav(seconds=secs)
        body = json.dumps(
            {"input": text, "text": text, "voice": voice, "speed": speed, "model": "orpheus"}
        ).encode("utf-8")
        req = Request(
            f"{self.upstream}/v1/audio/speech",
            data=body,
            headers={"Content-Type": "application/json", "Accept": "audio/wav"},
            method="POST",
        )
        try:
            with urlopen(req, timeout=float(os.getenv("AGENTIC_ORPHEUS_TIMEOUT_S", "180") or 180)) as resp:
                return resp.read()
        except HTTPError as exc:
            raise RuntimeError(f"upstream HTTP {exc.code}: {exc.read()[:200]!r}") from exc
        except URLError as exc:
            raise RuntimeError(f"upstream unreachable: {exc}") from exc


STATE = OrpheusState()


def make_handler(token: str | None) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt: str, *args: Any) -> None:  # noqa: A003
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

        def _auth_ok(self) -> bool:
            if not token:
                return True
            hdr = self.headers.get("Authorization", "")
            return hdr.strip() == f"Bearer {token}"

        def _json(self, code: int, payload: dict[str, Any]) -> None:
            raw = json.dumps(payload).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def do_GET(self) -> None:  # noqa: N802
            if self.path.split("?", 1)[0] in ("/health", "/v1/health"):
                self._json(
                    200,
                    {
                        "ok": True,
                        "engine": "orpheus",
                        "loaded": STATE.loaded,
                        "backend": {"name": STATE.backend},
                        "emotionTags": [
                            "<laugh>",
                            "<sigh>",
                            "<chuckle>",
                            "<cough>",
                            "<sniff>",
                            "<groan>",
                            "<yawn>",
                            "<gasp>",
                        ],
                    },
                )
                return
            self._json(404, {"ok": False, "error": "not found"})

        def do_POST(self) -> None:  # noqa: N802
            if not self._auth_ok():
                self._json(401, {"ok": False, "error": "unauthorized"})
                return
            path = self.path.split("?", 1)[0]
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length else b"{}"
            if path == "/v1/unload":
                STATE.unload()
                self._json(200, {"ok": True, "loaded": False})
                return
            if path != "/v1/audio/speech":
                self._json(404, {"ok": False, "error": "not found"})
                return
            try:
                data = json.loads(raw.decode("utf-8") or "{}")
            except json.JSONDecodeError:
                self._json(400, {"ok": False, "error": "invalid json"})
                return
            if not isinstance(data, dict):
                self._json(400, {"ok": False, "error": "body must be object"})
                return
            text = str(data.get("input") or data.get("text") or "").strip()
            if not text:
                self._json(400, {"ok": False, "error": "text required"})
                return
            voice = str(data.get("voice") or "default")
            try:
                speed = float(data.get("speed") or 1.0)
            except (TypeError, ValueError):
                self._json(400, {"ok": False, "error": "speed must be a number"})
                return
            try:
                audio = STATE.synthesize(text, voice=voice, speed=speed)
            except Exception as exc:  # noqa: BLE001
                self._json(503, {"ok": False, "error": str(exc)})
                return
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(audio)))
            self.send_header("X-AO-TTS-Engine", "orpheus")
            self.end_headers()
            self.wfile.write(audio)

    return Handler


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="AO Orpheus TTS sidecar")
    p.add_argument("--host", default=os.getenv("AGENTIC_SPEECH_ORPHEUS_HOST", "127.0.0.1"))
    p.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("AGENTIC_SPEECH_ORPHEUS_PORT", "8092") or 8092),
    )
    args = p.parse_args(argv)
    token = os.getenv("AGENTIC_SPEECH_TOKEN", "").strip() or None
    httpd = ThreadingHTTPServer((args.host, args.port), make_handler(token))
    print(f"orpheus TTS on http://{args.host}:{args.port} backend={STATE.backend}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        STATE.unload()
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
