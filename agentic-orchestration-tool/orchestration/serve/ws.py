"""
WebSocket protocol for the engine daemon.

The message shapes are a port of ``agentic-orchestration-web/server.mjs`` so existing
frontends can migrate at no cost:

===============  ===========================================================
Client → server  ``ping``, ``client_hello``, ``host_metrics_subscribe``,
                 ``host_metrics_unsubscribe``, ``chat``, ``direct_agent``, ``cancel``, ``rate``,
                 ``session_overlay_register``, ``session_overlay_clear``,
                 ``mcp_tunnel_response``
Server → client  ``hello``, ``pong``, ``host_metrics``, ``preflight``,
                 ``run_start``, ``status``, ``chunk``, ``run_end``, ``error``, ``rated``,
                 ``session_overlay_ack``, ``session_overlay_cleared``,
                 ``mcp_tunnel_request``
===============  ===========================================================

``status`` frames carry ``processing``, ``phase``, and a user-friendly ``message``
for Reach UIs (plus optional ``agentProviderId`` / ``step`` / ``code``). Legacy
stderr ``chunk`` lines still stream for older clients. When
``AGENTIC_SERVE_STREAM_THOUGHTS=1``, intermediate planner/agent text is also
emitted as ``chunk`` with ``stream: "thought"`` (ignored by stdout concatenators).
When ``AGENTIC_SERVE_STREAM_STDOUT=1``, the final answer may arrive as multiple
``stream: "stdout"`` chunks. Clients may send ``cancel`` with ``questionId`` to
stop one in-flight run without closing the socket.

One deliberate extension: a ``question_id`` on ``chat`` / ``direct_agent`` opts into
**concurrent** runs, and every ``chunk`` / ``status`` / ``run_end`` carries it back so a client can
demux interleaved answers. Untagged messages keep the Node behavior — one run per
connection, guarded by a busy lock.

``chat`` / ``direct_agent`` also accept optional ordered
``images: [{mimeType, dataBase64, name?}]``. Omitted or empty keeps the text-only
behavior; non-empty runs a single vision completion instead of the planner / crew
(see ``orchestration.reach_multimodal``) and fails with ``vision_unavailable`` rather
than answering a camera prompt from a text-only model.

Optional session overlays (``AGENTIC_SERVE_SESSION_OVERLAY=1``) and MCP tunnels
(``AGENTIC_SERVE_MCP_TUNNEL=1``) are advertised on ``hello`` when enabled.
Optional speech sidecars (``AGENTIC_SPEECH_ENABLED=1``) add a ``speech`` object
with OpenAI-compatible STT/TTS base URLs for Reach clients.
"""

from __future__ import annotations

import asyncio
import contextlib
import os
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


def _truthy_env(name: str) -> bool:
    return str(os.environ.get(name) or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _stream_stdout_enabled() -> bool:
    return _truthy_env("AGENTIC_SERVE_STREAM_STDOUT")


def _stream_thoughts_enabled() -> bool:
    return _truthy_env("AGENTIC_SERVE_STREAM_THOUGHTS")


def _reach_images(message: dict[str, Any]) -> list[Any]:
    """Decode optional ``images`` on ``chat`` / ``direct_agent`` (empty = text-only)."""
    from orchestration.reach_multimodal import parse_reach_images

    return parse_reach_images(message.get("images"))


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
        self._runs_by_question: dict[str, asyncio.Task[None]] = {}
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
        code: str | None = None,
        phase: str | None = None,
    ) -> None:
        payload: dict[str, Any] = {
            "type": "error",
            "message": message,
            "processing": False,
            "phase": phase or "error",
        }
        if code:
            payload["code"] = code
        if question_id:
            payload["question_id"] = question_id
        if run_id:
            payload["run_id"] = run_id
        await self.send(payload)

    def _emit_status(
        self,
        *,
        phase: str,
        processing: bool,
        tag: dict[str, Any],
        message: str | None = None,
        detail: str | None = None,
        agent_provider_id: str | None = None,
        step: int | None = None,
        step_count: int | None = None,
        code: str | None = None,
        also_stderr: bool = True,
    ) -> None:
        from orchestration.run_status import build_status_event

        event = build_status_event(
            phase=phase,
            processing=processing,
            message=message,
            detail=detail,
            agent_provider_id=agent_provider_id,
            step=step,
            step_count=step_count,
            code=code,
            question_id=tag.get("question_id"),
            run_id=tag.get("run_id"),
        )
        self.send_threadsafe(event)
        if also_stderr:
            self.send_threadsafe(
                {
                    "type": "chunk",
                    "stream": "stderr",
                    "text": f"(engine) {event['message']}\n",
                    **{k: tag[k] for k in ("run_id", "question_id") if k in tag},
                }
            )

    def _progress_to_status(self, line: str, tag: dict[str, Any]) -> None:
        """Map a legacy progress line to status + keep stderr chunk for older clients."""
        from orchestration.run_status import build_status_event, map_progress_line

        mapped = map_progress_line(line)
        text = str(line or "").strip()
        self.send_threadsafe(
            {
                "type": "chunk",
                "stream": "stderr",
                "text": f"(engine) {text}\n",
                **{k: tag[k] for k in ("run_id", "question_id") if k in tag},
            }
        )
        # Intermediate thoughts for Continue (ignored by Reach stdout concatenators).
        if _stream_thoughts_enabled() and text:
            agent_id = None
            phase = "progress"
            if mapped:
                agent_id = mapped.get("agentProviderId")
                phase = str(mapped.get("phase") or phase)
            if text.lower().startswith("plan:"):
                phase = "planner"
            # Skip tiny machine status lines; keep plan text and longer updates.
            if phase == "planner" or len(text) >= 40 or ":" in text:
                self.send_threadsafe(
                    {
                        "type": "chunk",
                        "stream": "thought",
                        "text": text if text.endswith("\n") else f"{text}\n",
                        "agentId": agent_id,
                        "phase": phase,
                        **{k: tag[k] for k in ("run_id", "question_id") if k in tag},
                    }
                )
        if not mapped:
            return
        event = build_status_event(
            phase=str(mapped.get("phase") or "info"),
            processing=True,
            message=mapped.get("message"),
            detail=mapped.get("detail"),
            agent_provider_id=mapped.get("agentProviderId"),
            step=mapped.get("step"),
            step_count=mapped.get("stepCount"),
            question_id=tag.get("question_id"),
            run_id=tag.get("run_id"),
        )
        self.send_threadsafe(event)

    async def _send_stdout_answer(self, answer: str, tag: dict[str, Any]) -> None:
        """Send final answer as one chunk, or many when STREAM_STDOUT is enabled."""
        text = str(answer or "")
        if not text:
            return
        tag_fields = {k: tag[k] for k in ("run_id", "question_id") if k in tag}
        if not _stream_stdout_enabled() or len(text) < 48:
            await self.send({"type": "chunk", "stream": "stdout", "text": text, **tag_fields})
            return
        # Prefer real model streaming when backends support it; otherwise emit
        # small incremental stdout chunks so Continue can type the answer out.
        chunk_size = 24
        for i in range(0, len(text), chunk_size):
            await self.send(
                {
                    "type": "chunk",
                    "stream": "stdout",
                    "text": text[i : i + chunk_size],
                    **tag_fields,
                }
            )
            await asyncio.sleep(0)

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
        if kind == "cancel":
            await self.handle_cancel(message)
            return
        if kind in ("chat", "direct_agent"):
            await self.handle_run(message, kind)
            return
        await self.send_error(f"Unknown message type: {kind or '(missing)'}")

    def _resolve_app_id(self, message: dict[str, Any]) -> str:
        """Best-effort app id for any client on this install.

        Order: message appId → session overlay → token appId fields →
        identity user_name/user_id when they look like product app ids.
        """
        from orchestration.llm_usage import looks_like_app_id, resolve_product_app_id

        app_id = message.get("appId")
        if app_id is None:
            app_id = message.get("app_id")
        app_id_s = str(app_id or "").strip()
        if not app_id_s:
            try:
                from orchestration.session_overlay import overlays_for_connection

                for overlay in overlays_for_connection(self.connection_id):
                    if overlay.app_id:
                        app_id_s = str(overlay.app_id).strip()
                        break
            except Exception:  # noqa: BLE001
                pass
        if not app_id_s:
            for key in ("tokenAppId", "token_app_id", "apiAppId", "api_app_id"):
                cand = str(message.get(key) or "").strip()
                if cand:
                    app_id_s = cand
                    break
        user_name = ""
        user_id = ""
        if self.identity is not None:
            user_name = str(self.identity.user_name or "").strip()
            user_id = str(self.identity.user_id or "").strip()
            if not app_id_s:
                for cand in (user_name, user_id):
                    if looks_like_app_id(cand):
                        app_id_s = cand
                        break
        return resolve_product_app_id(app_id_s, user_name, user_id)

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
                env=message.get("env") if isinstance(message.get("env"), dict) else message.get("secrets"),
                allowed_agent_provider_ids=(
                    message.get("allowedAgentProviderIds")
                    if message.get("allowedAgentProviderIds") is not None
                    else message.get("allowed_agent_provider_ids")
                ),
                allowed_mcp_provider_ids=(
                    message.get("allowedMcpProviderIds")
                    if message.get("allowedMcpProviderIds") is not None
                    else message.get("allowed_mcp_provider_ids")
                ),
                allowed_skill_ids=(
                    message.get("allowedSkillIds")
                    if message.get("allowedSkillIds") is not None
                    else message.get("allowed_skill_ids")
                ),
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
                "envKeys": sorted(overlay.env.keys()),
                "allowedAgentProviderIds": list(overlay.allowed_agent_provider_ids),
                "allowedMcpProviderIds": list(overlay.allowed_mcp_provider_ids),
                "allowedSkillIds": list(overlay.allowed_skill_ids),
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

    async def handle_cancel(self, message: dict[str, Any]) -> None:
        """Cancel one in-flight run by questionId without closing the socket."""
        question_id = _question_id(message)
        if not question_id:
            await self.send_error(
                "cancel requires questionId",
                code="invalid_request",
            )
            return
        task = self._runs_by_question.get(question_id)
        if task is None or task.done():
            await self.send(
                {
                    "type": "status",
                    "processing": False,
                    "phase": "cancelled",
                    "message": "No in-flight run for that questionId.",
                    "code": "not_found",
                    "question_id": question_id,
                }
            )
            return
        task.cancel()

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
            await self.send_error(
                "Empty message",
                question_id=question_id,
                code="invalid_request",
            )
            return
        try:
            images = _reach_images(message)
        except ValueError as exc:
            await self.send_error(
                str(exc),
                question_id=question_id,
                code=getattr(exc, "code", "invalid_images"),
            )
            return
        if question_id is None and self._busy:
            await self.send_error(
                "A run is already in progress for this connection.",
                code="busy",
                phase="busy",
            )
            return
        if question_id is not None and len(self._runs) >= max_concurrent_runs():
            await self.send_error(
                f"Too many concurrent runs (limit {max_concurrent_runs()}); retry shortly.",
                question_id=question_id,
                code="busy",
                phase="busy",
            )
            return
        if question_id is None:
            self._busy = True
        task = asyncio.create_task(self._run(message, kind, text, question_id, images))
        self._runs.add(task)

        def _done(t: asyncio.Task[None], *, qid: str | None = question_id) -> None:
            self._runs.discard(t)
            if qid and self._runs_by_question.get(qid) is t:
                self._runs_by_question.pop(qid, None)

        if question_id is not None:
            self._runs_by_question[question_id] = task
        task.add_done_callback(_done)

    async def _run(
        self,
        message: dict[str, Any],
        kind: str,
        text: str,
        question_id: str | None,
        images: list[Any] | None = None,
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
        app_id_s = self._resolve_app_id(message)
        token_id_s = str(
            message.get("tokenId") or message.get("token_id") or ""
        ).strip()
        user_id_s = self.identity.user_id if self.identity else ""
        user_name_s = self.identity.user_name if self.identity else ""
        usage_tokens: list[Any] = []
        try:
            from orchestration.llm_usage import bind_usage_context
            from orchestration.tool_trace import apply_tool_call_trace_wrap

            apply_tool_call_trace_wrap()
            usage_tokens = bind_usage_context(
                tool_root=self.tool_root,
                run_id=run_id,
                user_id=user_id_s,
                user_name=user_name_s,
                app_id=app_id_s,
                client_ip=self.client_ip or "",
                token_id=token_id_s,
            )
        except Exception:  # noqa: BLE001
            usage_tokens = []
        try:
            from orchestration.app_prefs import effective_run_mode, get_app_prefs
            from orchestration.run_trace import append_run_event

            prefs = get_app_prefs(self.tool_root, app_id_s) if kind == "chat" else {}
            sticky_dynamic = bool(prefs.get("dynamicPlanning")) if kind == "chat" else False
            if kind == "chat":
                run_mode = effective_run_mode(
                    message.get("runMode") or message.get("run_mode"),
                    prefs,
                    fallback="dynamic",
                )
                # Engine chat always runs the dynamic planner path.
                dynamic_planning = True
            elif kind == "direct_agent":
                run_mode = "direct"
                dynamic_planning = False
            else:
                run_mode = None
                dynamic_planning = None

            append_run_event(
                self.tool_root,
                run_id,
                "request_start",
                actor="engine",
                message=kind,
                detail={
                    "mode": kind,
                    "runMode": run_mode,
                    "dynamicPlanning": dynamic_planning,
                    "dynamicPlanningSticky": sticky_dynamic if kind == "chat" else None,
                    "question_id": question_id,
                    "preview": (text[:120] + ("…" if len(text) > 120 else "")),
                    "client_ip": self.client_ip or None,
                    "app_id": app_id_s or None,
                    "user_id": user_id_s or None,
                    "user_name": user_name_s or None,
                    "token_id": token_id_s or None,
                },
            )
        except Exception:  # noqa: BLE001
            pass
        try:
            await self.send(
                {"type": "preflight", "status": "done", "message": "Engine warm.", **tag}
            )
            await self.send(
                {
                    "type": "run_start",
                    "mode": kind,
                    "text": text,
                    "processing": True,
                    **tag,
                }
            )
            await self.send(
                {
                    "type": "status",
                    "processing": True,
                    "phase": "starting",
                    "message": "Starting your request…",
                    **{k: tag[k] for k in ("run_id", "question_id") if k in tag},
                }
            )
            answer = await asyncio.to_thread(
                self._execute, message, kind, text, tag, run_id, images or []
            )
            self._emit_status(
                phase="preparing_response",
                processing=True,
                tag=tag,
                message="Preparing the response…",
            )
            if answer:
                await self._send_stdout_answer(answer, tag)
            elapsed_ms = round((time.monotonic() - started) * 1000, 1)
            await self.send(
                {
                    "type": "status",
                    "processing": False,
                    "phase": "done",
                    "message": "Done.",
                    **{k: tag[k] for k in ("run_id", "question_id") if k in tag},
                }
            )
            await self.send(
                {
                    "type": "run_end",
                    "ok": True,
                    "exitCode": 0,
                    "elapsedMs": elapsed_ms,
                    "processing": False,
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
            elapsed_ms = round((time.monotonic() - started) * 1000, 1)
            await self.send(
                {
                    "type": "status",
                    "processing": False,
                    "phase": "cancelled",
                    "message": "Cancelled.",
                    "code": "cancelled",
                    **{k: tag[k] for k in ("run_id", "question_id") if k in tag},
                }
            )
            await self.send(
                {
                    "type": "run_end",
                    "ok": False,
                    "exitCode": 130,
                    "error": "Cancelled.",
                    "code": "cancelled",
                    "elapsedMs": elapsed_ms,
                    "processing": False,
                    **tag,
                }
            )
            emit_log(
                f"engine {kind} cancelled",
                run_id=run_id,
                component="engine",
                extra=log_extra,
            )
            try:
                record_run_end(ok=False, elapsed_ms=elapsed_ms)
            except Exception:  # noqa: BLE001
                pass
            return
        except (DirectAgentFormatError, DirectAgentEmptyAnswerError) as exc:
            from orchestration.run_status import error_code_for_exception, friendly_error_message

            err_code = error_code_for_exception(exc)
            friendly = friendly_error_message(exc)
            if getattr(exc, "raw", None):
                await self.send({"type": "chunk", "stream": "stdout", "text": exc.raw, **tag})
            await self.send(
                {
                    "type": "status",
                    "processing": False,
                    "phase": "error",
                    "message": friendly,
                    "detail": exc.message,
                    "code": err_code,
                    **{k: tag[k] for k in ("run_id", "question_id") if k in tag},
                }
            )
            await self.send_error(
                friendly,
                question_id=question_id,
                run_id=run_id,
                code=err_code,
            )
            elapsed_ms = round((time.monotonic() - started) * 1000, 1)
            await self.send(
                {
                    "type": "run_end",
                    "ok": False,
                    "exitCode": 0,
                    "error": friendly,
                    "code": err_code,
                    "text": getattr(exc, "raw", None),
                    "elapsedMs": elapsed_ms,
                    "processing": False,
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
            from orchestration.run_status import error_code_for_exception, friendly_error_message

            err_code = error_code_for_exception(exc)
            friendly = friendly_error_message(exc)
            err_msg = str(exc) or exc.__class__.__name__
            await self.send(
                {
                    "type": "status",
                    "processing": False,
                    "phase": "error",
                    "message": friendly,
                    "detail": err_msg,
                    "code": err_code,
                    **{k: tag[k] for k in ("run_id", "question_id") if k in tag},
                }
            )
            await self.send_error(
                friendly,
                question_id=question_id,
                run_id=run_id,
                code=err_code,
            )
            elapsed_ms = round((time.monotonic() - started) * 1000, 1)
            await self.send(
                {
                    "type": "run_end",
                    "ok": False,
                    "exitCode": 1,
                    "error": friendly,
                    "code": err_code,
                    "elapsedMs": elapsed_ms,
                    "processing": False,
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
            try:
                from orchestration.llm_usage import reset_usage_context

                reset_usage_context(usage_tokens)
            except Exception:  # noqa: BLE001
                pass

    def _execute(
        self,
        message: dict[str, Any],
        kind: str,
        text: str,
        tag: dict[str, Any],
        run_id: str,
        images: list[Any] | None = None,
    ) -> str:
        """Blocking engine call; runs in a worker thread."""
        from orchestration.llm_usage import bind_usage_context, reset_usage_context
        from orchestration.session_overlay import overlay_run_context
        from orchestration.tool_trace import apply_tool_call_trace_wrap

        # asyncio.to_thread does not inherit the event-loop contextvars — re-bind here.
        app_id = self._resolve_app_id(message)
        token_id = message.get("tokenId") or message.get("token_id") or ""
        import os

        prev_env = {
            "AGENTIC_RUN_ID": os.environ.get("AGENTIC_RUN_ID"),
            "AGENTIC_TOOL_ROOT": os.environ.get("AGENTIC_TOOL_ROOT"),
            "AGENTIC_APP_ID": os.environ.get("AGENTIC_APP_ID"),
            "AGENTIC_CLIENT_IP": os.environ.get("AGENTIC_CLIENT_IP"),
            "AGENTIC_USER_ID": os.environ.get("AGENTIC_USER_ID"),
            "AGENTIC_USER_NAME": os.environ.get("AGENTIC_USER_NAME"),
            "AGENTIC_API_TOKEN_ID": os.environ.get("AGENTIC_API_TOKEN_ID"),
        }
        os.environ["AGENTIC_RUN_ID"] = str(run_id)
        os.environ["AGENTIC_TOOL_ROOT"] = str(self.tool_root)
        if app_id:
            os.environ["AGENTIC_APP_ID"] = str(app_id)
        if self.client_ip:
            os.environ["AGENTIC_CLIENT_IP"] = str(self.client_ip)
        if self.identity and self.identity.user_id:
            os.environ["AGENTIC_USER_ID"] = str(self.identity.user_id)
        if self.identity and self.identity.user_name:
            os.environ["AGENTIC_USER_NAME"] = str(self.identity.user_name)
        if token_id:
            os.environ["AGENTIC_API_TOKEN_ID"] = str(token_id)
        usage_tokens = bind_usage_context(
            tool_root=self.tool_root,
            run_id=run_id,
            user_id=self.identity.user_id if self.identity else "",
            user_name=self.identity.user_name if self.identity else "",
            app_id=str(app_id or ""),
            client_ip=self.client_ip or "",
            token_id=str(token_id or ""),
        )
        try:
            apply_tool_call_trace_wrap()
        except Exception:  # noqa: BLE001
            pass
        try:
            user_id = self.identity.user_id if self.identity else None
            session_slug = str(
                message.get("sessionId")
                or (self.identity.session_id if self.identity else "")
                or ""
            )
            with overlay_run_context(
                user_id=user_id or "",
                session_id=session_slug or (self.identity.session_id if self.identity else ""),
                connection_id=self.connection_id,
            ):
                return self._execute_inner(
                    message, kind, text, tag, user_id, session_slug, run_id, images or []
                )
        finally:
            reset_usage_context(usage_tokens)
            for key, old in prev_env.items():
                if old is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = old

    def _execute_inner(
        self,
        message: dict[str, Any],
        kind: str,
        text: str,
        tag: dict[str, Any],
        user_id: str | None,
        session_slug: str,
        run_id: str,
        images: list[Any] | None = None,
    ) -> str:
        if images:
            return self._execute_multimodal(message, kind, text, tag, run_id, images)
        return self._execute_text(message, kind, text, tag, user_id, session_slug, run_id)

    def _execute_multimodal(
        self,
        message: dict[str, Any],
        kind: str,
        text: str,
        tag: dict[str, Any],
        run_id: str,
        images: list[Any],
    ) -> str:
        """Vision turn: one VLM completion, no planner and no tools.

        The consumers that send images (HA camera stills) require plain text and
        forbid tool/MCP JSON, and the crew path cannot pass pixels to a model.
        """
        from orchestration.reach_multimodal import run_reach_multimodal
        from orchestration.structured_logging import emit_log

        agent_provider_id = str(
            message.get("agent_provider_id") or message.get("agentProviderId") or ""
        ).strip()
        selected = message.get("selectedAgentProviderIds")
        if selected is None:
            selected = message.get("selected_agent_provider_ids")
        selected_ids: list[str] = []
        if isinstance(selected, list):
            selected_ids = [str(x).strip() for x in selected if str(x or "").strip()]
        if not agent_provider_id and selected_ids:
            agent_provider_id = selected_ids[0]
        if agent_provider_id and agent_provider_id not in selected_ids:
            selected_ids = [agent_provider_id, *selected_ids]

        allowed_ids: list[str] | None = None
        try:
            from orchestration.session_overlay import get_current_overlay

            overlay = get_current_overlay()
            if overlay is not None and overlay.allowed_agent_provider_ids:
                allowed_ids = list(overlay.allowed_agent_provider_ids)
        except Exception:  # noqa: BLE001
            allowed_ids = None

        emit_log(
            f"engine {kind} multimodal start images={len(images)}",
            run_id=run_id,
            component="engine",
            extra={"question_id": tag["question_id"]} if tag.get("question_id") else None,
        )
        try:
            from orchestration.run_trace import append_run_event

            append_run_event(
                self.tool_root,
                run_id,
                "agent_start",
                actor="engine",
                message=agent_provider_id or "vision",
                detail={
                    "mode": "multimodal",
                    "agent_provider_id": agent_provider_id or None,
                    "selected_agent_provider_ids": selected_ids or None,
                    "images": len(images),
                },
            )
        except Exception:  # noqa: BLE001
            pass

        return run_reach_multimodal(
            text=text,
            images=images,
            agent_provider_id=agent_provider_id,
            agent_provider_ids=selected_ids or None,
            allowed_agent_provider_ids=allowed_ids,
            tool_root=self.tool_root,
            on_progress=lambda line: self._progress_to_status(line, tag),
        )

    def _execute_text(
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
                self._progress_to_status(line, tag)

            response_format = message.get("responseFormat") or message.get("response_format")
            json_schema = message.get("jsonSchema") or message.get("json_schema")
            mcp_ids = _mcp_provider_ids(message)
            try:
                from orchestration.run_trace import append_run_event

                append_run_event(
                    self.tool_root,
                    run_id,
                    "agent_start",
                    actor="engine",
                    message=agent_provider_id,
                    detail={
                        "mode": "direct_agent",
                        "agent_provider_id": agent_provider_id,
                        "mcps": mcp_ids,
                    },
                )
            except Exception:  # noqa: BLE001
                pass
            try:
                from orchestration.llm_usage import bind_usage_context, reset_usage_context

                agent_usage_tokens = bind_usage_context(agent_provider_id=agent_provider_id)
            except Exception:  # noqa: BLE001
                agent_usage_tokens = []
            try:
                answer = run_direct_agent(
                    tool_root=self.tool_root,
                    agent_provider_id=agent_provider_id,
                    goal=text,
                    context=str(message.get("context") or ""),
                    session_slug=session_slug or None,
                    user_id=user_id,
                    mcp_provider_ids=mcp_ids,
                    on_progress=progress,
                    response_format=response_format if isinstance(response_format, dict) else None,
                    json_schema=json_schema if isinstance(json_schema, dict) else None,
                )
            except Exception:
                try:
                    from orchestration.run_trace import append_run_event

                    append_run_event(
                        self.tool_root,
                        run_id,
                        "agent_end",
                        actor="engine",
                        message="failed",
                        detail={"agent_provider_id": agent_provider_id, "ok": False},
                    )
                except Exception:  # noqa: BLE001
                    pass
                raise
            finally:
                try:
                    if agent_usage_tokens:
                        reset_usage_context(agent_usage_tokens)
                except Exception:  # noqa: BLE001
                    pass
            try:
                from orchestration.run_trace import append_run_event

                append_run_event(
                    self.tool_root,
                    run_id,
                    "agent_end",
                    actor="engine",
                    message="ok",
                    detail={"agent_provider_id": agent_provider_id, "ok": True},
                )
            except Exception:  # noqa: BLE001
                pass
            return answer

        from orchestration.app_prefs import effective_run_mode, get_app_prefs
        from orchestration.dynamic_run import run_dynamic_goal

        def progress(line: str) -> None:
            self._progress_to_status(line, tag)

        app_id = self._resolve_app_id(message)
        prefs = get_app_prefs(self.tool_root, app_id)
        run_mode = effective_run_mode(
            message.get("runMode") or message.get("run_mode"),
            prefs,
            fallback="dynamic",
        )
        if run_mode == "dynamic-iterative":
            # In-process engine path is single-shot; HTTP / CLI still honor iterative.
            progress("runMode=dynamic-iterative requested; engine chat uses single-shot dynamic")
        else:
            progress(f"runMode={run_mode}")

        selected = message.get("selectedAgentProviderIds")
        if selected is None:
            selected = message.get("selected_agent_provider_ids")
        return run_dynamic_goal(
            tool_root=self.tool_root,
            goal=text,
            session_slug=session_slug or None,
            user_id=user_id,
            agent_provider_ids=[str(x) for x in selected] if isinstance(selected, list) else None,
            on_progress=progress,
            run_id=run_id,
        )
