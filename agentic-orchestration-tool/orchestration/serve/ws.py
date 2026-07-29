"""
WebSocket protocol for the engine daemon.

The message shapes are a port of ``agentic-orchestration-web/server.mjs`` so existing
frontends can migrate at no cost:

===============  ===========================================================
Client → server  ``ping``, ``client_hello``, ``host_metrics_subscribe``,
                 ``host_metrics_unsubscribe``, ``chat``, ``direct_agent``, ``rate``
Server → client  ``hello``, ``pong``, ``host_metrics``, ``preflight``,
                 ``run_start``, ``chunk``, ``run_end``, ``error``, ``rated``
===============  ===========================================================

One deliberate extension: a ``question_id`` on ``chat`` / ``direct_agent`` opts into
**concurrent** runs, and every ``chunk`` / ``run_end`` carries it back so a client can
demux interleaved answers. Untagged messages keep the Node behavior — one run per
connection, guarded by a busy lock.
"""

from __future__ import annotations

import asyncio
import contextlib
import time
from pathlib import Path
from typing import Any

from starlette.websockets import WebSocket, WebSocketDisconnect

from orchestration.serve import engine_version
from orchestration.user_context import Identity, IdentityRequiredError, resolve_identity

#: Close code for a policy violation (missing identity under AGENTIC_REQUIRE_IDENTITY).
WS_CLOSE_POLICY_VIOLATION = 1008

MAX_CONCURRENT_RUNS_DEFAULT = 8


def max_concurrent_runs() -> int:
    import os

    raw = os.getenv("AGENTIC_SERVE_MAX_CONCURRENT_RUNS", "").strip()
    try:
        value = int(raw) if raw else MAX_CONCURRENT_RUNS_DEFAULT
    except ValueError:
        value = MAX_CONCURRENT_RUNS_DEFAULT
    return max(1, min(64, value))


def _question_id(message: dict[str, Any]) -> str | None:
    raw = message.get("question_id") or message.get("questionId")
    text = str(raw or "").strip()
    return text[:128] or None


class WsConnection:
    """One client connection: identity, host-metrics push, and run dispatch."""

    def __init__(self, websocket: WebSocket, *, tool_root: Path) -> None:
        self.ws = websocket
        self.tool_root = tool_root
        self.identity: Identity | None = None
        self._send_lock = asyncio.Lock()
        self._busy = False
        self._runs: set[asyncio.Task[None]] = set()
        self._metrics_task: asyncio.Task[None] | None = None
        self._loop: asyncio.AbstractEventLoop | None = None

    # ---- transport -------------------------------------------------------

    async def send(self, payload: dict[str, Any]) -> None:
        async with self._send_lock:
            with contextlib.suppress(RuntimeError, WebSocketDisconnect):
                await self.ws.send_json(payload)

    def send_threadsafe(self, payload: dict[str, Any]) -> None:
        """Send from a worker thread (progress callbacks run off the event loop)."""
        if self._loop is None:
            return
        with contextlib.suppress(RuntimeError):
            asyncio.run_coroutine_threadsafe(self.send(payload), self._loop)

    async def send_error(self, message: str, *, question_id: str | None = None) -> None:
        payload: dict[str, Any] = {"type": "error", "message": message}
        if question_id:
            payload["question_id"] = question_id
        await self.send(payload)

    # ---- lifecycle -------------------------------------------------------

    async def serve(self) -> None:
        self._loop = asyncio.get_running_loop()
        await self.ws.accept()
        try:
            self.identity = resolve_identity(self.ws.headers)
        except IdentityRequiredError as exc:
            await self.send_error(str(exc))
            await self.ws.close(code=WS_CLOSE_POLICY_VIOLATION)
            return

        await self.send(
            {
                "type": "hello",
                "service": "agentic-orchestration-engine",
                "version": engine_version(),
                "toolRoot": str(self.tool_root),
                "protocol": "engine-ws/1",
                "questionTags": True,
                "userName": self.identity.user_name,
                "sessionId": self.identity.session_id,
                "userId": self.identity.user_id,
            }
        )
        try:
            while True:
                try:
                    message = await self.ws.receive_json()
                except WebSocketDisconnect:
                    return
                except (ValueError, TypeError):
                    await self.send_error("Invalid JSON message")
                    continue
                if not isinstance(message, dict):
                    await self.send_error("Invalid JSON message")
                    continue
                await self.handle(message)
        finally:
            await self.shutdown()

    async def shutdown(self) -> None:
        if self._metrics_task is not None:
            self._metrics_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._metrics_task
            self._metrics_task = None
        for task in list(self._runs):
            task.cancel()
        for task in list(self._runs):
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await task
        self._runs.clear()

    # ---- dispatch --------------------------------------------------------

    async def handle(self, message: dict[str, Any]) -> None:
        kind = str(message.get("type") or "").strip()
        if kind == "ping":
            await self.send({"type": "pong"})
            return
        if kind == "client_hello":
            await self.send(
                {
                    "type": "hello",
                    "resume": bool(message.get("resume")),
                    "sessionId": (self.identity.session_id if self.identity else None),
                }
            )
            return
        if kind == "host_metrics_subscribe":
            await self.start_host_metrics()
            return
        if kind == "host_metrics_unsubscribe":
            await self.stop_host_metrics()
            return
        if kind == "rate":
            await self.handle_rate(message)
            return
        if kind in ("chat", "direct_agent"):
            await self.handle_run(message, kind)
            return
        await self.send_error(f"Unknown message type: {kind or '(missing)'}")

    async def handle_rate(self, message: dict[str, Any]) -> None:
        from orchestration.learning_store import enqueue_user_rating

        fingerprint = (
            str(message.get("attachmentFingerprint") or message.get("mcpFingerprint") or "none").strip()
            or "none"
        )
        session_slug = str(
            message.get("sessionId") or (self.identity.session_id if self.identity else "") or ""
        )
        try:
            enqueue_user_rating(
                self.tool_root,
                {
                    "session_slug": session_slug,
                    "provider_id": str(message.get("providerId") or ""),
                    "attachment_fingerprint": fingerprint,
                    "mcp_fingerprint": fingerprint,
                    "task_tag": str(message.get("taskTag") or "general"),
                    "rating": message.get("rating"),
                },
                user_id=self.identity.user_id if self.identity else None,
            )
        except Exception as exc:  # noqa: BLE001
            await self.send_error(f"Failed to record rating: {exc}")
            return
        await self.send({"type": "rated", "ok": True})

    # ---- host metrics ----------------------------------------------------

    async def start_host_metrics(self) -> None:
        if self._metrics_task is not None and not self._metrics_task.done():
            return
        self._metrics_task = asyncio.create_task(self._push_host_metrics())

    async def stop_host_metrics(self) -> None:
        if self._metrics_task is None:
            return
        self._metrics_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._metrics_task
        self._metrics_task = None

    async def _push_host_metrics(self) -> None:
        from orchestration.host_metrics import host_metrics_push_ms, sample_host_metrics

        interval = host_metrics_push_ms() / 1000.0
        try:
            while True:
                metrics = await asyncio.to_thread(sample_host_metrics)
                await self.send({"type": "host_metrics", **metrics})
                await asyncio.sleep(interval)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            await self.send_error(f"host metrics stopped: {exc}")

    # ---- runs ------------------------------------------------------------

    async def handle_run(self, message: dict[str, Any], kind: str) -> None:
        question_id = _question_id(message)
        text = str(message.get("text") or "").strip()
        if not text:
            await self.send_error("Empty message", question_id=question_id)
            return
        if question_id is None and self._busy:
            await self.send_error("A run is already in progress for this connection.")
            return
        if question_id is not None and len(self._runs) >= max_concurrent_runs():
            await self.send_error(
                f"Too many concurrent runs (limit {max_concurrent_runs()}); retry shortly.",
                question_id=question_id,
            )
            return
        if question_id is None:
            self._busy = True
        task = asyncio.create_task(self._run(message, kind, text, question_id))
        self._runs.add(task)
        task.add_done_callback(self._runs.discard)

    async def _run(
        self,
        message: dict[str, Any],
        kind: str,
        text: str,
        question_id: str | None,
    ) -> None:
        started = time.monotonic()
        tag: dict[str, Any] = {"question_id": question_id} if question_id else {}
        try:
            await self.send(
                {"type": "preflight", "status": "done", "message": "Engine warm.", **tag}
            )
            await self.send({"type": "run_start", "mode": kind, "text": text, **tag})
            answer = await asyncio.to_thread(self._execute, message, kind, text, tag)
            if answer:
                await self.send({"type": "chunk", "stream": "stdout", "text": answer, **tag})
            await self.send(
                {
                    "type": "run_end",
                    "ok": True,
                    "exitCode": 0,
                    "elapsedMs": round((time.monotonic() - started) * 1000, 1),
                    **tag,
                }
            )
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            await self.send_error(str(exc) or exc.__class__.__name__, question_id=question_id)
            await self.send(
                {
                    "type": "run_end",
                    "ok": False,
                    "exitCode": 1,
                    "elapsedMs": round((time.monotonic() - started) * 1000, 1),
                    **tag,
                }
            )
        finally:
            if question_id is None:
                self._busy = False

    def _execute(
        self,
        message: dict[str, Any],
        kind: str,
        text: str,
        tag: dict[str, Any],
    ) -> str:
        """Blocking engine call; runs in a worker thread."""
        user_id = self.identity.user_id if self.identity else None
        session_slug = str(
            message.get("sessionId") or (self.identity.session_id if self.identity else "") or ""
        )
        if kind == "direct_agent":
            from orchestration.direct_agent import run_direct_agent

            agent_provider_id = str(
                message.get("agent_provider_id") or message.get("agentProviderId") or ""
            ).strip()
            if not agent_provider_id:
                raise ValueError("direct_agent requires agent_provider_id")

            def progress(line: str) -> None:
                self.send_threadsafe(
                    {"type": "chunk", "stream": "stderr", "text": f"(engine) {line}\n", **tag}
                )

            return run_direct_agent(
                tool_root=self.tool_root,
                agent_provider_id=agent_provider_id,
                goal=text,
                context=str(message.get("context") or ""),
                session_slug=session_slug or None,
                user_id=user_id,
                on_progress=progress,
            )

        from orchestration.dynamic_run import run_dynamic_goal

        def progress(line: str) -> None:
            self.send_threadsafe(
                {"type": "chunk", "stream": "stderr", "text": f"(engine) {line}\n", **tag}
            )

        selected = message.get("selectedAgentProviderIds")
        return run_dynamic_goal(
            tool_root=self.tool_root,
            goal=text,
            session_slug=session_slug or None,
            user_id=user_id,
            agent_provider_ids=[str(x) for x in selected] if isinstance(selected, list) else None,
            on_progress=progress,
        )
