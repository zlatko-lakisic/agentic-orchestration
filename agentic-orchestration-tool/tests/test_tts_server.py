"""Unit tests for speech/tts_server multi-voice + speed support."""

from __future__ import annotations

import json
import sys
from http.client import HTTPConnection
from pathlib import Path
from threading import Thread

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from speech.tts_server import (  # noqa: E402
    TtsHandler,
    discover_voice_dirs,
    parse_speed,
)

pytestmark = pytest.mark.unit


def _fake_vits_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    (path / "model.onnx").write_bytes(b"onnx")
    (path / "tokens.txt").write_text("a\n", encoding="utf-8")
    (path / "espeak-ng-data").mkdir(exist_ok=True)
    (path / "espeak-ng-data" / "phontab").write_text("x", encoding="utf-8")
    return path


class _FakeAudio:
    def __init__(self, marker: float) -> None:
        # Constant sample so WAV is tiny but valid.
        self.samples = [marker] * 8
        self.sample_rate = 22050


class _FakeTts:
    def __init__(self, voice_id: str) -> None:
        self.voice_id = voice_id
        self.sample_rate = 22050
        self.last_speed: float | None = None
        self.calls = 0

    def generate(self, text: str, sid: int = 0, speed: float = 1.0):
        self.calls += 1
        self.last_speed = float(speed)
        # Encode voice into sample amplitude for assertions.
        marker = 0.1 if self.voice_id == "default" else 0.5
        return _FakeAudio(marker)


def test_parse_speed_bounds() -> None:
    assert parse_speed(None) == 1.0
    assert parse_speed(1.25) == 1.25
    with pytest.raises(ValueError):
        parse_speed(0.4)
    with pytest.raises(ValueError):
        parse_speed(2.1)
    with pytest.raises(ValueError):
        parse_speed("fast")


def test_discover_voice_dirs(tmp_path: Path) -> None:
    default = _fake_vits_dir(tmp_path / "default-model")
    voices = tmp_path / "voices"
    en = _fake_vits_dir(voices / "en_US-lessac")
    _fake_vits_dir(voices / "incomplete")  # will be valid too if complete
    (voices / "empty").mkdir()
    found = discover_voice_dirs(model_dir=default, voices_dir=voices)
    assert set(found) == {"default", "en_US-lessac", "incomplete"}
    assert found["default"] == default.resolve()
    assert found["en_US-lessac"] == en.resolve()


def test_http_voices_and_speech_selection(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from http.server import ThreadingHTTPServer

    default = _fake_vits_dir(tmp_path / "default-model")
    voices = tmp_path / "voices"
    _fake_vits_dir(voices / "alt")

    loaded: dict[str, _FakeTts] = {}

    def fake_load(model_dir: Path, *, provider: str, threads: int):
        # Map path back to voice id via folder name / default marker.
        voice_id = "default" if model_dir == default.resolve() else model_dir.name
        tts = _FakeTts(voice_id)
        loaded[voice_id] = tts
        return tts

    monkeypatch.setattr("speech.tts_server.load_vits_tts", fake_load)

    TtsHandler.model_dir = default
    TtsHandler.voices_dir = voices
    TtsHandler.auth_token = None
    TtsHandler._tts_cache = {}
    TtsHandler._voice_dirs = {}
    TtsHandler.refresh_voice_dirs()

    server = ThreadingHTTPServer(("127.0.0.1", 0), TtsHandler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        host, port = server.server_address
        conn = HTTPConnection(host, port, timeout=5)
        conn.request("GET", "/v1/audio/voices")
        resp = conn.getresponse()
        listing = json.loads(resp.read().decode())
        conn.close()
        assert resp.status == 200
        ids = {v["id"] for v in listing["voices"]}
        assert ids == {"alt", "default"}
        assert listing["default"] == "default"

        def _post(body: dict) -> tuple[int, bytes]:
            raw = json.dumps(body).encode()
            c = HTTPConnection(host, port, timeout=5)
            c.request(
                "POST",
                "/v1/audio/speech",
                body=raw,
                headers={"Content-Type": "application/json"},
            )
            r = c.getresponse()
            data = r.read()
            status = r.status
            c.close()
            return status, data

        status, wav = _post({"text": "hello"})
        assert status == 200
        assert wav[:4] == b"RIFF"
        assert "default" in loaded
        assert loaded["default"].last_speed == 1.0

        status, wav_alt = _post({"text": "hello", "voice": "alt", "speed": 1.5})
        assert status == 200
        assert "alt" in loaded
        assert loaded["alt"].last_speed == 1.5
        # Different fake amplitude → different PCM payload.
        assert wav != wav_alt

        status, err = _post({"text": "hello", "voice": "nope"})
        assert status == 400
        body = json.loads(err.decode())
        assert "unknown voice" in body["error"]
        assert "alt" in body["voices"]

        status, err = _post({"text": "hello", "speed": 3.0})
        assert status == 400
        assert b"0.5" in err
    finally:
        server.shutdown()
        server.server_close()
        TtsHandler._tts_cache = {}
        TtsHandler._voice_dirs = {}
