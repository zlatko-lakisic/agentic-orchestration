"""
FastAPI application factory for the engine daemon.

Route conventions follow the Node web server (``/api/ping``, ``/api/session``,
``/api/host-metrics``) so an existing frontend can be pointed at either process; the
new product surfaces live under ``/api/v1/``.
"""

from __future__ import annotations

import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request, WebSocket
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from orchestration.serve import engine_version, serve_host, serve_port, tool_root
from orchestration.user_context import Identity, IdentityRequiredError, resolve_identity

#: Identifies this process in ``/api/ping`` (proves a client hit this daemon).
INSTANCE_ID = f"{os.getpid()}-{int(time.time() * 1000):x}"


def identity_from_request(request: Request) -> Identity:
    """Identity dependency: proxy headers in server mode, implicit local user otherwise."""
    try:
        return resolve_identity(request.headers)
    except IdentityRequiredError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


class DirectAgentResponseFormat(BaseModel):
    type: str = "text"

    model_config = {"populate_by_name": True}


class DirectAgentRequest(BaseModel):
    agent_provider_id: str = Field(..., alias="agentProviderId")
    text: str
    context: str = ""
    question_id: str | None = Field(default=None, alias="questionId")
    session_id: str | None = Field(default=None, alias="sessionId")
    mcp_provider_ids: list[str] | None = Field(default=None, alias="mcpProviderIds")
    response_format: DirectAgentResponseFormat | dict[str, Any] | None = Field(
        default=None, alias="responseFormat"
    )
    json_schema: dict[str, Any] | None = Field(default=None, alias="jsonSchema")

    model_config = {"populate_by_name": True}


class KbIngestRequest(BaseModel):
    content: str
    user_goal: str = Field(default="", alias="userGoal")
    session_id: str | None = Field(default=None, alias="sessionId")
    deal_id: str | None = Field(default=None, alias="dealId")
    scope: str | None = None
    source_id: str | None = Field(default=None, alias="sourceId")
    vintage: float | None = None
    fast: bool = True

    model_config = {"populate_by_name": True}


class KbUpsertRequest(BaseModel):
    source_id: str = Field(..., alias="sourceId")
    content: str
    user_goal: str = Field(default="", alias="userGoal")
    session_id: str | None = Field(default=None, alias="sessionId")
    deal_id: str | None = Field(default=None, alias="dealId")
    scope: str | None = None
    vintage: float | None = None

    model_config = {"populate_by_name": True}


def _check_deal_access(*, root: Path, identity: Identity, deal_id: str | None) -> None:
    from orchestration.deal_auth import DealAccessDenied, check_deal_access

    try:
        check_deal_access(tool_root=root, user_id=identity.user_id, deal_id=deal_id)
    except DealAccessDenied as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


def create_app(*, tool_root_path: Path | None = None) -> FastAPI:
    root = tool_root_path or tool_root()

    # Before any CrewAI kickoff: never block the daemon on stdin tracing prompts.
    from orchestration.crewai_noninteractive import configure_crewai_noninteractive

    configure_crewai_noninteractive()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Warm catalogs + optional Ollama keepalive; tear down AO-spawned runtimes on exit."""
        from orchestration.dynamic_run import warm_catalogs
        from orchestration.ollama_keepalive import (
            start_ollama_keepalive_loop,
            stop_ollama_keepalive_loop,
        )

        app.state.warm = await run_in_threadpool(warm_catalogs, root)
        await run_in_threadpool(
            lambda: start_ollama_keepalive_loop(log_prefix="(engine) ollama keep-alive")
        )
        try:
            yield
        finally:
            await run_in_threadpool(stop_ollama_keepalive_loop)
            from orchestration.ollama_serve_lifecycle import stop_all_serves

            await run_in_threadpool(stop_all_serves)

    app = FastAPI(
        title="agentic-orchestration engine daemon",
        version=engine_version(),
        description=(
            "Warm engine API. The CLI (main.py) and the Node web server remain fully "
            "functional; this daemon is opt-in."
        ),
        lifespan=lifespan,
    )
    app.state.tool_root = root
    app.state.warm = {}

    @app.get("/health")
    async def health() -> dict[str, Any]:
        from orchestration.hardware_profile import hardware_snapshot
        from orchestration.ollama_keepalive import keepalive_status, resolve_keepalive_model_tags

        warm = dict(app.state.warm or {})
        ka = keepalive_status()
        hw = await run_in_threadpool(hardware_snapshot)
        return {
            "ok": True,
            "version": engine_version(),
            "service": "agentic-orchestration-engine",
            "instance": INSTANCE_ID,
            "toolRoot": str(root),
            "bind": f"{serve_host()}:{serve_port()}",
            "catalogs": warm,
            "hardware": hw,
            "resident": {
                "keepaliveModels": ka.get("models") or resolve_keepalive_model_tags(),
                "keepaliveOk": ka.get("ok"),
                "keepaliveTs": ka.get("ts"),
                "vramGbAvailable": hw.get("vramGbAvailable"),
                "ollamaNumParallel": (
                    os.getenv("AGENTIC_OLLAMA_NUM_PARALLEL", "").strip()
                    or os.getenv("OLLAMA_NUM_PARALLEL", "").strip()
                    or None
                ),
            },
        }

    @app.get("/api/ping")
    async def api_ping() -> JSONResponse:
        return JSONResponse(
            {
                "ok": True,
                "service": "agentic-orchestration-engine",
                "pid": os.getpid(),
                "instance": INSTANCE_ID,
            },
            headers={"X-Agentic-Engine": "1"},
        )

    @app.get("/api/session")
    async def api_session(identity: Identity = Depends(identity_from_request)) -> dict[str, Any]:
        return {"ok": True, **identity.to_json_dict()}

    @app.get("/api/host-metrics")
    async def api_host_metrics() -> dict[str, Any]:
        from orchestration.host_metrics import sample_host_metrics

        return await run_in_threadpool(sample_host_metrics)

    @app.post("/api/v1/direct-agent")
    async def api_direct_agent(
        payload: DirectAgentRequest,
        identity: Identity = Depends(identity_from_request),
    ) -> dict[str, Any]:
        from orchestration.direct_agent import DirectAgentFormatError, run_direct_agent

        text = (payload.text or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="text is required")
        response_format: dict[str, Any] | None = None
        if payload.response_format is not None:
            if isinstance(payload.response_format, DirectAgentResponseFormat):
                response_format = payload.response_format.model_dump()
            elif isinstance(payload.response_format, dict):
                response_format = dict(payload.response_format)
        started = time.monotonic()
        base: dict[str, Any] = {
            "questionId": payload.question_id,
            "agentProviderId": payload.agent_provider_id,
        }
        if response_format is not None:
            base["responseFormat"] = response_format
        try:
            from orchestration.session_overlay import overlay_run_context

            def _run() -> str:
                with overlay_run_context(
                    user_id=identity.user_id,
                    session_id=payload.session_id or identity.session_id,
                ):
                    return run_direct_agent(
                        tool_root=root,
                        agent_provider_id=payload.agent_provider_id,
                        goal=text,
                        context=payload.context or "",
                        session_slug=payload.session_id or identity.session_id,
                        user_id=identity.user_id,
                        mcp_provider_ids=payload.mcp_provider_ids,
                        response_format=response_format,
                        json_schema=payload.json_schema,
                    )

            answer = await run_in_threadpool(_run)
        except DirectAgentFormatError as exc:
            return {
                **base,
                "ok": False,
                "error": exc.message,
                "text": exc.raw,
                "elapsedMs": round((time.monotonic() - started) * 1000, 1),
            }
        except (LookupError, ValueError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {
            **base,
            "ok": True,
            "text": answer,
            "elapsedMs": round((time.monotonic() - started) * 1000, 1),
        }

    @app.post("/api/v1/kb/ingest")
    async def api_kb_ingest(
        payload: KbIngestRequest,
        identity: Identity = Depends(identity_from_request),
    ) -> dict[str, Any]:
        from orchestration.knowledge_base import add_document, fast_ingest

        if not (payload.content or "").strip():
            raise HTTPException(status_code=400, detail="content is required")
        _check_deal_access(root=root, identity=identity, deal_id=payload.deal_id)
        session_slug = payload.session_id or identity.session_id
        if payload.fast:
            result = await run_in_threadpool(
                lambda: fast_ingest(
                    tool_root=root,
                    content=payload.content,
                    user_goal=payload.user_goal,
                    session_slug=session_slug,
                    user_id=identity.user_id,
                    deal_id=payload.deal_id,
                    scope=payload.scope,
                    source_id=payload.source_id,
                    vintage=payload.vintage,
                )
            )
            return {"ok": True, **result}
        doc_id = await run_in_threadpool(
            lambda: add_document(
                tool_root=root,
                session_slug=session_slug,
                user_goal=payload.user_goal or "(ingest)",
                content=payload.content,
                user_id=identity.user_id,
                deal_id=payload.deal_id,
                scope=payload.scope,
                source_id=payload.source_id,
                vintage=payload.vintage,
            )
        )
        return {"ok": True, "docId": doc_id}

    @app.post("/api/v1/kb/upsert")
    async def api_kb_upsert(
        payload: KbUpsertRequest,
        identity: Identity = Depends(identity_from_request),
    ) -> dict[str, Any]:
        from orchestration.knowledge_base import upsert_by_source

        _check_deal_access(root=root, identity=identity, deal_id=payload.deal_id)
        try:
            result = await run_in_threadpool(
                lambda: upsert_by_source(
                    tool_root=root,
                    source_id=payload.source_id,
                    content=payload.content,
                    user_goal=payload.user_goal,
                    session_slug=payload.session_id or identity.session_id,
                    user_id=identity.user_id,
                    deal_id=payload.deal_id,
                    scope=payload.scope,
                    vintage=payload.vintage,
                )
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"ok": True, **result}

    @app.delete("/api/v1/kb/scope/{deal_id}")
    async def api_kb_delete_scope(
        deal_id: str,
        identity: Identity = Depends(identity_from_request),
    ) -> dict[str, Any]:
        from orchestration.knowledge_base import delete_by_scope

        _check_deal_access(root=root, identity=identity, deal_id=deal_id)
        try:
            removed = await run_in_threadpool(
                lambda: delete_by_scope(tool_root=root, deal_id=deal_id)
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"ok": True, "dealId": deal_id, "removed": removed}

    @app.get("/api/v1/kb/search")
    async def api_kb_search(
        q: str = Query(..., min_length=1),
        limit: int = Query(4, ge=1, le=12),
        scope: str | None = None,
        deal_id: str | None = Query(default=None, alias="dealId"),
        identity: Identity = Depends(identity_from_request),
    ) -> dict[str, Any]:
        from orchestration.knowledge_base import search

        _check_deal_access(root=root, identity=identity, deal_id=deal_id)
        hits = await run_in_threadpool(
            lambda: search(
                tool_root=root,
                query=q,
                limit=limit,
                scope=scope,
                deal_id=deal_id,
            )
        )
        return {"ok": True, "query": q, "hits": [h.to_json_dict() for h in hits]}

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        from orchestration.serve.ws import WsConnection

        await WsConnection(websocket, tool_root=root).serve()

    return app
