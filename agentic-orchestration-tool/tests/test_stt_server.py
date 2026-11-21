"""Unit tests for speech/stt_server word-timestamp (verbose_json) mode."""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from http.client import HTTPConnection
from pathlib import Path
from threading import Thread
from types import SimpleNamespace

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from speech.stt_server import (  # noqa: E402
    SttHandler,
    _parse_multipart,
    build_transcription_payload,
    want_word_timestamps,
    words_from_segments,
)

pytestmark = pytest.mark.unit


@dataclass
class _FakeWord:
    word: str
    start: float
    end: float
    probability: float = 0.9


@dataclass
class _FakeSegment:
    text: str
    start: float = 0.0
    end: float = 1.0
    words: list[_FakeWord] | None = None


class _FakeModel:
    def __init__(self, segments: list[_FakeSegment], *, duration: float = 1.5) -> None:
        self._segments = segments
        self._duration = duration
        self.last_kwargs: dict = {}

    def transcribe(self, *_args, **kwargs):
        self.last_kwargs = dict(kwargs)

        def _gen():
            yield from self._segments

        info = SimpleNamespace(language="en", language_probability=0.99, duration=self._duration)
        return _gen(), info


def _multipart(fields: dict[str, str], *, file_name: str = "a.wav", file_bytes: bytes = b"RIFF") -> tuple[bytes, str]:
    boundary = "----AOBoundary"
    chunks: list[bytes] = []
    for name, value in fields.items():
        chunks.append(
            (
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
                f"{value}\r\n"
            ).encode()
        )
    chunks.append(
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{file_name}"\r\n'
            f"Content-Type: audio/wav\r\n\r\n"
        ).encode()
        + file_bytes
        + b"\r\n"
    )
    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def test_want_word_timestamps_defaults_off() -> None:
    assert want_word_timestamps({}) is False
    assert want_word_timestamps({"response_format": "json"}) is False
    assert want_word_timestamps({"response_format": "verbose_json"}) is False


def test_want_word_timestamps_verbose_word() -> None:
    assert (
        want_word_timestamps(
            {"response_format": "verbose_json", "timestamp_granularities": "word"}
        )
        is True
    )
    assert (
        want_word_timestamps(
            {
                "response_format": "verbose_json",
                "timestamp_granularities[]": ["word"],
            }
        )
        is True
    )


def test_words_from_segments_ordered() -> None:
    segs = [
        _FakeSegment(
            text="Mostar bridge",
            words=[
                _FakeWord("Mostar", 0.42, 0.91, 0.98),
                _FakeWord("bridge", 1.0, 1.4, 0.95),
            ],
        )
    ]
    words = words_from_segments(segs)
    assert [w["word"] for w in words] == ["Mostar", "bridge"]
    assert words[0]["start"] == 0.42
    assert words[0]["end"] == 0.91
    assert words[0]["probability"] == 0.98


def test_build_payload_default_text_only() -> None:
    segs = [
        _FakeSegment(
            text="hello",
            words=[_FakeWord("hello", 0.0, 0.5)],
        )
    ]
    payload = build_transcription_payload(
        segments=segs,
        info=SimpleNamespace(language="en", duration=0.5),
        word_timestamps=False,
    )
    assert payload == {"text": "hello"}


def test_build_payload_verbose_includes_words() -> None:
    segs = [
        _FakeSegment(
            text="Mostar",
            end=0.91,
            words=[_FakeWord("Mostar", 0.42, 0.91, 0.98)],
        )
    ]
    payload = build_transcription_payload(
        segments=segs,
        info=SimpleNamespace(language="en", duration=41.8),
        word_timestamps=True,
    )
    assert payload["text"] == "Mostar"
    assert payload["language"] == "en"
    assert payload["duration"] == 41.8
    assert payload["words"] == [
        {"word": "Mostar", "start": 0.42, "end": 0.91, "probability": 0.98}
    ]


def test_http_default_and_verbose_with_fake_model() -> None:
    from http.server import ThreadingHTTPServer

    segments = [
        _FakeSegment(
            text="Mostar bridge",
            end=1.4,
            words=[
                _FakeWord("Mostar", 0.42, 0.91, 0.98),
                _FakeWord("bridge", 1.0, 1.4, 0.95),
            ],
        )
    ]
    fake = _FakeModel(segments, duration=1.4)
    SttHandler._model = fake
    SttHandler.auth_token = None
    server = ThreadingHTTPServer(("127.0.0.1", 0), SttHandler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        host, port = server.server_address

        body, ctype = _multipart({})
        conn = HTTPConnection(host, port, timeout=5)
        conn.request("POST", "/v1/audio/transcriptions", body=body, headers={"Content-Type": ctype})
        resp = conn.getresponse()
        default = json.loads(resp.read().decode())
        conn.close()
        assert resp.status == 200
        assert default == {"text": "Mostar bridge"}
        assert fake.last_kwargs.get("without_timestamps") is True
        assert fake.last_kwargs.get("word_timestamps") is False

        body, ctype = _multipart(
            {
                "response_format": "verbose_json",
                "timestamp_granularities": "word",
            }
        )
        conn = HTTPConnection(host, port, timeout=5)
        conn.request("POST", "/v1/audio/transcriptions", body=body, headers={"Content-Type": ctype})
        resp = conn.getresponse()
        verbose = json.loads(resp.read().decode())
        conn.close()
        assert resp.status == 200
        assert verbose["text"] == "Mostar bridge"
        assert [w["word"] for w in verbose["words"]] == ["Mostar", "bridge"]
        assert verbose["words"][0]["start"] == 0.42
        assert verbose["words"][0]["end"] == 0.91
        assert fake.last_kwargs.get("without_timestamps") is False
        assert fake.last_kwargs.get("word_timestamps") is True
    finally:
        server.shutdown()
        server.server_close()
        SttHandler._model = None


def test_parse_multipart_bracket_granularity_field() -> None:
    body, ctype = _multipart(
        {
            "response_format": "verbose_json",
            "timestamp_granularities[]": "word",
        }
    )
    parsed = _parse_multipart(body, ctype)
    assert want_word_timestamps(parsed) is True
