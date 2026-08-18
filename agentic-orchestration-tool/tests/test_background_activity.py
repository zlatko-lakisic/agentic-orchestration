"""Tests for background activity snapshot and Ollama pull cancel."""

from __future__ import annotations

import io
import json
import threading
import time

import pytest

from orchestration.background_activity import (
    clear_activity,
    observe_progress,
    reset_for_tests,
    set_activity,
    should_emit_status,
    snapshot,
)

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _reset_activity() -> None:
    reset_for_tests()
    yield
    reset_for_tests()


def test_observe_pull_line_sets_model_and_percent() -> None:
    observe_progress("ollama pull: starting qwen3.6:27b")
    snap = observe_progress("ollama pull: pulling abcdef  42%")
    assert snap["active"] is True
    assert snap["kind"] == "model_pull"
    assert snap["model"] == "qwen3.6:27b"
    assert snap["percent"] == 42
    assert "42%" in snap["message"]


def test_observe_handshake_kind() -> None:
    snap = observe_progress("stdio MCP handshake: filesystem_local")
    assert snap["kind"] == "mcp_handshake"
    assert "filesystem_local" in snap["message"]


def test_should_emit_throttles_identical_messages(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("orchestration.background_activity.STATUS_THROTTLE_SECONDS", 10.0)
    assert should_emit_status("Downloading qwen — 10%") is True
    assert should_emit_status("Downloading qwen — 10%") is False
    assert should_emit_status("Downloading qwen — 11%") is True


def test_clear_activity_respects_connection_id() -> None:
    set_activity(kind="model_pull", message="Downloading x", connection_id="c1")
    clear_activity(connection_id="c2")
    assert snapshot()["active"] is True
    clear_activity(connection_id="c1")
    assert snapshot()["active"] is False


def test_http_pull_cancel_closes_stream(monkeypatch: pytest.MonkeyPatch) -> None:
    from agent_providers.ollama_provider import (
        OllamaPullCancelled,
        cancel_active_ollama_pull,
        pull_ollama_model,
    )

    started = threading.Event()
    lines = [
        json.dumps({"status": "pulling manifest"}).encode() + b"\n",
        json.dumps({"status": "pulling abc", "completed": 1, "total": 10}).encode() + b"\n",
    ]

    class _Resp:
        def __init__(self) -> None:
            self._i = 0
            self.closed = False

        def readline(self) -> bytes:
            started.set()
            while not self.closed:
                if self._i < len(lines):
                    raw = lines[self._i]
                    self._i += 1
                    return raw
                time.sleep(0.05)
            return b""

        def close(self) -> None:
            self.closed = True

    resp = _Resp()

    def fake_urlopen(_req, timeout=None):  # noqa: ANN001
        return resp

    monkeypatch.setattr("agent_providers.ollama_provider.urllib.request.urlopen", fake_urlopen)
    monkeypatch.setattr(
        "agent_providers.ollama_provider.ollama_has_model", lambda *_a, **_k: False
    )

    err: list[BaseException] = []

    def worker() -> None:
        try:
            pull_ollama_model("qwen3.6:27b", "http://127.0.0.1:11434")
        except BaseException as exc:  # noqa: BLE001
            err.append(exc)

    t = threading.Thread(target=worker)
    t.start()
    assert started.wait(2)
    assert cancel_active_ollama_pull(force=True) is True
    t.join(timeout=5)
    assert t.is_alive() is False
    assert err and isinstance(err[0], OllamaPullCancelled)
    assert resp.closed is True
