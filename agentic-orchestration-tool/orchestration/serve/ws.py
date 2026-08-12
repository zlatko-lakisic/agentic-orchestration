"""
WebSocket protocol for the engine daemon.

The message shapes are a port of ``agentic-orchestration-web/server.mjs`` so existing
frontends can migrate at no cost:

===============  ===========================================================
Client → server  ``ping``, ``client_hello``, ``host_metrics_subscribe``,
                 ``host_metrics_unsubscribe``, ``chat``, ``direct_agent``, ``rate``,
                 ``session_overlay_register``, ``session_overlay_clear``,
                 ``mcp_tunnel_response``
Server → client  ``hello``, ``pong``, ``host_metrics``, ``preflight``,
                 ``run_start``, ``chunk``, ``run_end``, ``error``, ``rated``,
                 ``session_overlay_ack``, ``session_overlay_cleared``,
                 ``mcp_tunnel_request``
===============  ===========================================================

One deliberate extension: a ``question_id`` on ``chat`` / ``direct_agent`` opts into
**concurrent** runs, and every ``chunk`` / ``run_end`` carries it back so a client can
demux interleaved answers. Untagged messages keep the Node behavior — one run per
connection, guarded by a busy lock.

Optional session overlays (``AGENTIC_SERVE_SESSION_OVERLAY=1``) and MCP tunnels
(``AGENTIC_SERVE_MCP_TUNNEL=1``) are advertised on ``hello`` when enabled.
Optional speech sidecars (``AGENTIC_SPEECH_ENABLED=1``) add a ``speech`` object
with OpenAI-compatible STT/TTS base URLs for Reach clients.
"""

from __future__ import annotations

import asyncio
import contextlib
import time
import uuid
from pathlib import Path
from typing import Any

from starlette.websockets import WebSocket, WebSocketDisconnect

from orchestration.serve import engine_version
from orchestration.serve.mtls_tls import peercert_from_scope
from orchestration.user_context import Identity, IdentityRequiredError, resolve_identity

#: Close code for a policy violation (missing identity under AGENTIC_REQUIRE_IDENTITY).
WS_CLOSE_POLICY_VIOLATION = 1008

MAX_CONCURRENT_RUNS_DEFAULT = 8


def client_ip_from_websocket(websocket: WebSocket) -> str:
    """Best-effort peer IP for Reach Topology (X-Forwarded-For, then socket)."""
    headers = websocket.headers
    for key in ("x-forwarded-for", "x-real-ip", "cf-connecting-ip"):
        raw = headers.get(key)
        if raw and str(raw).strip():
            return str(raw).split(",")[0].strip()
    client = websocket.client
    if client and getattr(client, "host", None):
        return str(client.host).strip()
    if isinstance(client, (tuple, list)) and client:
        return str(client[0]).strip()
    return ""


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


def _mcp_provider_ids(message: dict[str, Any]) -> list[str] | None:
    raw = message.get("mcp_provider_ids")
    if raw is None:
        raw = message.get("mcpProviderIds")
    if raw is None:
        return None
    if not isinstance(raw, list):
        raise ValueError("mcpProviderIds must be a list of strings")
    return [str(x).strip() for x in raw if str(x).strip()]


class WsConnection:
    """One client connection: identity, host-metrics push, and run dispatch."""

    def __init__(self, websocket: WebSocket, *, tool_root: Path) -> None:
        self.ws = websocket
        self.tool_root = tool_root
        self.identity: Identity | None = None
        self.connection_id = str(uuid.uuid4())
        self.client_ip = client_ip_from_websocket(websocket)
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

    async def send_error(
        self,
        message: str,
        *,
        question_id: str | None = None,
        run_id: str | None = None,
    ) -> None:
        payload: dict[str, Any] = {"type": "error", "message": message}
        if question_id:
            payload["question_id"] = question_id
        if run_id:
            payload["run_id"] = run_id
        await self.send(payload)

    # ---- lifecycle -------------------------------------------------------

    async def serve(self) -> None:
        self._loop = asyncio.get_running_loop()
        await self.ws.accept()
        peercert = peercert_from_scope(self.ws.scope)
        try:
            self.identity = resolve_identity(
                self.ws.headers,
                peercert=peercert,
            )
        except IdentityRequiredError as exc:
            await self.send_error(str(exc))
            await self.ws.close(code=WS_CLOSE_POLICY_VIOLATION)
            return

        from orchestration.session_overlay import mcp_tunnel_enabled, session_overlay_enabled
        from orchestration.serve.mtls_ca import is_peercert_revoked, mtls_hello_payload
        from orchestration.speech_capability import speech_hello_payload

        if peercert and is_peercert_revoked(self.tool_root, peercert):
            await self.send_error("client certificate revoked")
            await self.ws.close(code=WS_CLOSE_POLICY_VIOLATION)
            return

        hello: dict[str, Any] = {
            "type": "hello",
            "service": "agentic-orchestration-engine",
            "version": engine_version(),
            "toolRoot": str(self.tool_root),
            "protocol": "engine-ws/1",
            "questionTags": True,
            "sessionOverlay": session_overlay_enabled(),
            "mcpTunnel": mcp_tunnel_enabled(),
            "userName": self.identity.user_name,
            "sessionId": self.identity.session_id,
            "userId": self.identity.user_id,
            "mtls": self.identity.mtls,
        }
        speech = speech_hello_payload()
        if speech is not None:
            hello["speech"] = speech
        mtls = mtls_hello_payload(self.tool_root)
        if mtls is not None:
            hello["mtlsInfo"] = mtls
        await self.send(hello)
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
        from orchestration.mcp_tunnel import unregister_connection_bridge
        from orchestration.session_overlay import clear_overlay_for_connection

        clear_overlay_for_connection(self.connection_id)
        unregister_connection_bridge(self.connection_id)

    # ---- dispatch --------------------------------------------------------

    async def handle(self, message: dict[str, Any]) -> None:
        kind = str(message.get("type") or "").strip()
        if kind == "ping":
            await self.send({"type": "pong"})
            return
        if kind == "client_hello":
            from orchestration.session_overlay import mcp_tunnel_enabled, session_overlay_enabled
            from orchestration.speech_capability import speech_hello_payload

            reply: dict[str, Any] = {
                "type": "hello",
                "resume": bool(message.get("resume")),
                "sessionId": (self.identity.session_id if self.identity else None),
                "sessionOverlay": session_overlay_enabled(),
                "mcpTunnel": mcp_tunnel_enabled(),
            }
            speech = speech_hello_payload()
            if speech is not None:
                reply["speech"] = speech
            await self.send(reply)
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
        if kind == "session_overlay_register":
            await self.handle_session_overlay_register(message)
            return
        if kind == "session_overlay_clear":
            await self.handle_session_overlay_clear()
            return
        if kind == "mcp_tunnel_response":
            await self.handle_mcp_tunnel_response(message)
            return
        if kind in ("chat", "direct_agent"):
            await self.handle_run(message, kind)
            return
        await self.send_error(f"Unknown message type: {kind or '(missing)'}")

    async def handle_session_overlay_register(self, message: dict[str, Any]) -> None:
        from orchestration.mcp_tunnel import register_connection_bridge
        from orchestration.session_overlay import (
            SessionOverlayDeniedError,
            SessionOverlayError,
            clear_overlay,
            register_overlay,
        )
        from orchestration.session_overlay_runtime import ensure_session_overlay_ollama_models

        if self.identity is None:
            await self.send_error("identity required for session_overlay_register")
            return
        ttl_raw = message.get("ttlSeconds")
        if ttl_raw is None:
            ttl_raw = message.get("ttl_seconds")
        try:
            ttl = float(ttl_raw) if ttl_raw is not None else None
        except (TypeError, ValueError):
            await self.send_error("ttlSeconds must be a number")
            return
        app_id = message.get("appId")
        if app_id is None:
            app_id = message.get("app_id")
        try:
            overlay = register_overlay(
                user_id=self.identity.user_id,
                session_id=self.identity.session_id,
                connection_id=self.connection_id,
                app_id=str(app_id or ""),
                agents=message.get("agents") if isinstance(message.get("agents"), list) else [],
                mcps=message.get("mcps") if isinstance(message.get("mcps"), list) else [],
                skills=message.get("skills") if isinstance(message.get("skills"), list) else [],
                ttl_seconds=ttl,
                catalog_root=self.tool_root,
                client_ip=self.client_ip,
            )
        except SessionOverlayDeniedError as exc:
            await self.send(
                {
                    "type": "session_overlay_denied",
                    "error": exc.error,
                    "message": str(exc),
                }
            )
            return
        except SessionOverlayError as exc:
            await self.send_error(str(exc))
            return
        except Exception as exc:  # noqa: BLE001
            await self.send_error(f"session_overlay_register failed: {exc}")
            return

        def progress(line: str) -> None:
            self.send_threadsafe(
                {"type": "chunk", "stream": "stderr", "text": f"(engine) {line}\n"}
            )

        try:
            await asyncio.to_thread(
                ensure_session_overlay_ollama_models,
                overlay.agents,
                on_progress=progress,
            )
        except Exception as exc:  # noqa: BLE001
            clear_overlay(
                user_id=self.identity.user_id,
                session_id=self.identity.session_id,
                connection_id=self.connection_id,
            )
            await self.send_error(str(exc) or exc.__class__.__name__)
            return

        if overlay.mcps:
            register_connection_bridge(self.connection_id, self.send_threadsafe)
        else:
            from orchestration.mcp_tunnel import unregister_connection_bridge

            unregister_connection_bridge(self.connection_id)

        await self.send(
            {
                "type": "session_overlay_ack",
                "agentIds": [str(e.get("id")) for e in overlay.agents],
                "mcpIds": [str(e.get("id")) for e in overlay.mcps],
                "skillIds": [str(e.get("id")) for e in overlay.skills],
                "expiresAt": overlay.expires_at,
            }
        )

    async def handle_session_overlay_clear(self) -> None:
        from orchestration.mcp_tunnel import unregister_connection_bridge
        from orchestration.session_overlay import clear_overlay

        if self.identity is None:
            await self.send_error("identity required for session_overlay_clear")
            return
        clear_overlay(
            user_id=self.identity.user_id,
            session_id=self.identity.session_id,
            connection_id=self.connection_id,
        )
        unregister_connection_bridge(self.connection_id)
        await self.send({"type": "session_overlay_cleared"})

    async def handle_mcp_tunnel_response(self, message: dict[str, Any]) -> None:
        from orchestration.mcp_tunnel import deliver_tunnel_response

        if not deliver_tunnel_response(self.connection_id, message):
            await self.send_error(
                "unknown or expired mcp_tunnel_response requestId "
                "(or tunnel owned by another connection)"
            )

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
        from orchestration.direct_agent import DirectAgentEmptyAnswerError, DirectAgentFormatError
        from orchestration.metrics import record_run_end
        from orchestration.run_store import new_run_id
        from orchestration.structured_logging import emit_log

        started = time.monotonic()
        run_id = new_run_id()
        tag: dict[str, Any] = {"run_id": run_id}
        if question_id:
            tag["question_id"] = question_id
        response_format = message.get("responseFormat") or message.get("response_format")
        if isinstance(response_format, dict):
            tag["responseFormat"] = response_format
        log_extra = {"question_id": question_id} if question_id else None
        emit_log(
            f"engine {kind} start",
            run_id=run_id,
            component="engine",
            extra=log_extra,
        )
        try:
            from orchestration.run_trace import append_run_event

            append_run_event(
                self.tool_root,
                run_id,
                "request_start",
                actor="engine",
                message=f"{kind}: {(text[:100] + '…') if len(text) > 100 else text}",
                detail={"mode": kind, "question_id": question_id},
            )
        except Exception:  # noqa: BLE001
            pass
        try:
            await self.send(
                {"type": "preflight", "status": "done", "message": "Engine warm.", **tag}
            )
            await self.send({"type": "run_start", "mode": kind, "text": text, **tag})
            answer = await asyncio.to_thread(self._execute, message, kind, text, tag, run_id)
            if answer:
                await self.send({"type": "chunk", "stream": "stdout", "text": answer, **tag})
            elapsed_ms = round((time.monotonic() - started) * 1000, 1)
            await self.send(
                {
                    "type": "run_end",
                    "ok": True,
                    "exitCode": 0,
                    "elapsedMs": elapsed_ms,
                    **tag,
                }
            )
            emit_log(
                f"engine {kind} end",
                run_id=run_id,
                component="engine",
                extra=log_extra,
            )
            try:
                from orchestration.run_trace import append_run_event

                append_run_event(
                    self.tool_root, run_id, "run_end", actor="engine", message="ok"
                )
            except Exception:  # noqa: BLE001
                pass
            try:
                record_run_end(ok=True, elapsed_ms=elapsed_ms)
            except Exception:  # noqa: BLE001
                pass
        except asyncio.CancelledError:
            raise
        except (DirectAgentFormatError, DirectAgentEmptyAnswerError) as exc:
            if getattr(exc, "raw", None):
                await self.send({"type": "chunk", "stream": "stdout", "text": exc.raw, **tag})
            await self.send_error(exc.message, question_id=question_id, run_id=run_id)
            elapsed_ms = round((time.monotonic() - started) * 1000, 1)
            await self.send(
                {
                    "type": "run_end",
                    "ok": False,
                    "exitCode": 0,
                    "error": exc.message,
                    "text": getattr(exc, "raw", None),
                    "elapsedMs": elapsed_ms,
                    **tag,
                }
            )
            emit_log(
                f"engine {kind} error: {exc.message}",
                level="error",
                run_id=run_id,
                component="engine",
                extra=log_extra,
            )
            try:
                from orchestration.run_trace import append_run_event

                append_run_event(
                    self.tool_root,
                    run_id,
                    "run_error",
                    actor="engine",
                    message=str(exc.message)[:500],
                )
            except Exception:  # noqa: BLE001
                pass
            try:
                record_run_end(ok=False, elapsed_ms=elapsed_ms)
            except Exception:  # noqa: BLE001
                pass
        except Exception as exc:  # noqa: BLE001
            err_msg = str(exc) or exc.__class__.__name__
            await self.send_error(err_msg, question_id=question_id, run_id=run_id)
            elapsed_ms = round((time.monotonic() - started) * 1000, 1)
            await self.send(
                {
                    "type": "run_end",
                    "ok": False,
                    "exitCode": 1,
                    "elapsedMs": elapsed_ms,
                    **tag,
                }
            )
            emit_log(
                f"engine {kind} error: {err_msg}",
                level="error",
                run_id=run_id,
                component="engine",
                extra=log_extra,
            )
            try:
                record_run_end(ok=False, elapsed_ms=elapsed_ms)
            except Exception:  # noqa: BLE001
                pass
        finally:
            if question_id is None:
                self._busy = False

    def _execute(
        self,
        message: dict[str, Any],
        kind: str,
        text: str,
        tag: dict[str, Any],
        run_id: str,
    ) -> str:
        """Blocking engine call; runs in a worker thread."""
        from orchestration.session_overlay import overlay_run_context

        user_id = self.identity.user_id if self.identity else None
        session_slug = str(
            message.get("sessionId") or (self.identity.session_id if self.identity else "") or ""
        )
        with overlay_run_context(
            user_id=user_id or "",
            session_id=session_slug or (self.identity.session_id if self.identity else ""),
            connection_id=self.connection_id,
        ):
            return self._execute_inner(message, kind, text, tag, user_id, session_slug, run_id)

    def _execute_inner(
        self,
        message: dict[str, Any],
        kind: str,
        text: str,
        tag: dict[str, Any],
        user_id: str | None,
        session_slug: str,
        run_id: str,
    ) -> str:
        if kind == "direct_agent":
            from orchestration.direct_agent import run_direct_agent
            from orchestration.structured_logging import emit_log

            agent_provider_id = str(
                message.get("agent_provider_id") or message.get("agentProviderId") or ""
            ).strip()
            if not agent_provider_id:
                raise ValueError("direct_agent requires agent_provider_id")

            emit_log(
                "direct_agent start",
                run_id=run_id,
                component="engine",
                extra={"question_id": tag["question_id"]} if tag.get("question_id") else None,
            )

            def progress(line: str) -> None:
                self.send_threadsafe(
                    {"type": "chunk", "stream": "stderr", "text": f"(engine) {line}\n", **tag}
                )

            response_format = message.get("responseFormat") or message.get("response_format")
            json_schema = message.get("jsonSchema") or message.get("json_schema")
            return run_direct_agent(
                tool_root=self.tool_root,
                agent_provider_id=agent_provider_id,
                goal=text,
                context=str(message.get("context") or ""),
                session_slug=session_slug or None,
                user_id=user_id,
                mcp_provider_ids=_mcp_provider_ids(message),
                on_progress=progress,
                response_format=response_format if isinstance(response_format, dict) else None,
                json_schema=json_schema if isinstance(json_schema, dict) else None,
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
            run_id=run_id,
        )
