import asyncio
import contextlib
import os
from typing import Any

import pytest


class _FakeHeaders(dict):
    def get(self, key: str, default: Any = None) -> Any:
        return super().get(key.lower(), default)


class _FakeWs:
    def __init__(self) -> None:
        self.sent: list[dict[str, Any]] = []
        self.headers = _FakeHeaders()
        self.scope = {"client": ("127.0.0.1", 12345)}
        self.client = ("127.0.0.1", 12345)

    async def send_json(self, payload: dict[str, Any]) -> None:
        self.sent.append(payload)

    async def accept(self) -> None:
        return None


@pytest.mark.asyncio
async def test_cancel_cancels_tagged_run(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_STREAM_STDOUT", "0")
    monkeypatch.setenv("AGENTIC_SERVE_STREAM_THOUGHTS", "0")

    from orchestration.serve.ws import WsConnection
    from orchestration.user_context import Identity

    ws = _FakeWs()
    conn = WsConnection(ws, tool_root=os.getcwd())  # type: ignore[arg-type]
    conn.identity = Identity(user_id="u1", user_name="tester", session_id="s1")
    conn._loop = asyncio.get_running_loop()

    started = asyncio.Event()

    async def fake_run(message, kind, text, question_id, images=None):  # noqa: ANN001
        started.set()
        try:
            await asyncio.sleep(60)
        except asyncio.CancelledError:
            await conn.send(
                {
                    "type": "status",
                    "processing": False,
                    "phase": "cancelled",
                    "code": "cancelled",
                    "question_id": question_id,
                }
            )
            await conn.send(
                {
                    "type": "run_end",
                    "ok": False,
                    "code": "cancelled",
                    "question_id": question_id,
                    "processing": False,
                }
            )
            raise

    conn._run = fake_run  # type: ignore[method-assign]
    await conn.handle_run({"type": "chat", "text": "hello", "questionId": "q-1"}, "chat")
    await asyncio.wait_for(started.wait(), timeout=2)
    assert "q-1" in conn._runs_by_question
    await conn.handle_cancel({"type": "cancel", "questionId": "q-1"})
    await asyncio.sleep(0.05)
    assert any(f.get("code") == "cancelled" and f.get("type") == "run_end" for f in ws.sent)


@pytest.mark.asyncio
async def test_heartbeat_repeats_current_phase_with_elapsed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_HEARTBEAT_SECONDS", "1")

    from orchestration.serve.ws import WsConnection

    ws = _FakeWs()
    conn = WsConnection(ws, tool_root=os.getcwd())  # type: ignore[arg-type]
    conn._loop = asyncio.get_running_loop()
    conn._last_phase = "executing"
    conn._last_message = "Working through 3 steps…"

    task = asyncio.create_task(
        conn._heartbeat({"question_id": "q-1", "run_id": "r-1"}, 0.0)
    )
    await asyncio.sleep(2.2)
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task

    beats = [f for f in ws.sent if f.get("heartbeat")]
    assert len(beats) >= 2
    assert beats[0]["type"] == "status"
    assert beats[0]["phase"] == "executing"
    assert beats[0]["processing"] is True
    assert beats[0]["question_id"] == "q-1"
    assert "Working through 3 steps…" in beats[0]["message"]


@pytest.mark.asyncio
async def test_heartbeat_disabled_returns_immediately(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_HEARTBEAT_SECONDS", "0")

    from orchestration.serve.ws import WsConnection

    ws = _FakeWs()
    conn = WsConnection(ws, tool_root=os.getcwd())  # type: ignore[arg-type]
    conn._loop = asyncio.get_running_loop()

    await asyncio.wait_for(conn._heartbeat({"question_id": "q"}, 0.0), timeout=1)
    assert not [f for f in ws.sent if f.get("heartbeat")]


def test_heartbeat_seconds_parsing(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.serve.ws import HEARTBEAT_SECONDS_DEFAULT, heartbeat_seconds

    monkeypatch.delenv("AGENTIC_SERVE_HEARTBEAT_SECONDS", raising=False)
    assert heartbeat_seconds() == HEARTBEAT_SECONDS_DEFAULT
    monkeypatch.setenv("AGENTIC_SERVE_HEARTBEAT_SECONDS", "0")
    assert heartbeat_seconds() == 0.0
    monkeypatch.setenv("AGENTIC_SERVE_HEARTBEAT_SECONDS", "not-a-number")
    assert heartbeat_seconds() == HEARTBEAT_SECONDS_DEFAULT
    monkeypatch.setenv("AGENTIC_SERVE_HEARTBEAT_SECONDS", "9999")
    assert heartbeat_seconds() == 300.0
    monkeypatch.setenv("AGENTIC_SERVE_HEARTBEAT_SECONDS", "0.01")
    assert heartbeat_seconds() == 1.0


@pytest.mark.asyncio
async def test_send_stdout_streams_when_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SERVE_STREAM_STDOUT", "1")
    from orchestration.serve.ws import WsConnection

    ws = _FakeWs()
    conn = WsConnection(ws, tool_root=os.getcwd())  # type: ignore[arg-type]
    answer = "x" * 80
    await conn._send_stdout_answer(answer, {"question_id": "q", "run_id": "r"})
    chunks = [f for f in ws.sent if f.get("type") == "chunk" and f.get("stream") == "stdout"]
    assert len(chunks) > 1
    assert "".join(c["text"] for c in chunks) == answer
