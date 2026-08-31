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
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request, WebSocket
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from orchestration.serve import engine_version, serve_host, serve_port, tool_root
from orchestration.serve.mtls_tls import (
    is_public_mtls_path,
    mtls_required,
    peercert_from_scope,
)
from orchestration.user_context import Identity, IdentityRequiredError, resolve_identity

#: Identifies this process in ``/api/ping`` (proves a client hit this daemon).
INSTANCE_ID = f"{os.getpid()}-{int(time.time() * 1000):x}"


def identity_from_request(request: Request) -> Identity:
    """Identity dependency: mTLS peer cert wins, else headers / local fallback."""
    try:
        return resolve_identity(
            request.headers,
            peercert=peercert_from_scope(request.scope),
        )
    except IdentityRequiredError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


class MtlsEnrollRequest(BaseModel):
    csr_pem: str = Field(..., alias="csrPem")
    token: str
    client_name: str | None = Field(default=None, alias="clientName")

    model_config = {"populate_by_name": True}


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


class CustomToolActivateRequest(BaseModel):
    artifact_id: str | None = Field(default=None, alias="artifactId")
    app_id: str = Field(..., alias="appId")
    tool_id: str | None = Field(default=None, alias="toolId")
    tool_version: str | None = Field(default=None, alias="toolVersion")
    env: dict[str, str] | None = None

    model_config = {"populate_by_name": True}


class CustomToolDeactivateRequest(BaseModel):
    app_id: str = Field(..., alias="appId")
    client_id: str = Field(..., alias="clientId")

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

    from orchestration.metrics import maybe_init_sentry

    maybe_init_sentry()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Warm catalogs + optional Ollama keepalive; tear down AO-spawned runtimes on exit."""
        from orchestration.dynamic_run import warm_catalogs
        from orchestration.ollama_keepalive import (
            start_ollama_keepalive_loop,
            stop_ollama_keepalive_loop,
        )

        app.state.warm = await run_in_threadpool(warm_catalogs, root)
        from orchestration.execution_queue_broker import start_broker

        app.state.execution_queue_broker = await run_in_threadpool(start_broker)
        await run_in_threadpool(
            lambda: start_ollama_keepalive_loop(log_prefix="(engine) ollama keep-alive")
        )
        try:
            yield
        finally:
            from orchestration.execution_queue_broker import stop_broker

            await run_in_threadpool(stop_broker)
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

    @app.middleware("http")
    async def require_client_cert_when_mtls(request: Request, call_next):
        """Enforce verified client cert on protected routes when mTLS is required."""
        if mtls_required() and not is_public_mtls_path(request.url.path):
            peercert = peercert_from_scope(request.scope)
            if not peercert:
                return JSONResponse(
                    {"ok": False, "error": "client certificate required (mTLS)"},
                    status_code=401,
                )
            from orchestration.serve.mtls_ca import is_peercert_revoked

            if is_peercert_revoked(root, peercert):
                return JSONResponse(
                    {"ok": False, "error": "client certificate revoked"},
                    status_code=403,
                )
        return await call_next(request)

    @app.get("/health")
    async def health() -> dict[str, Any]:
        from orchestration.hardware_profile import hardware_snapshot
        from orchestration.ollama_keepalive import keepalive_status, resolve_keepalive_model_tags
        from orchestration.serve.mtls_ca import ca_exists, mtls_hello_payload
        from orchestration.tool_artifacts import custom_tool_sandbox_enabled

        warm = dict(app.state.warm or {})
        ka = keepalive_status()
        hw = await run_in_threadpool(hardware_snapshot)
        sharing = await run_in_threadpool(_resource_sharing_health)
        payload: dict[str, Any] = {
            "ok": True,
            "version": engine_version(),
            "service": "agentic-orchestration-engine",
            "instance": INSTANCE_ID,
            "toolRoot": str(root),
            "bind": f"{serve_host()}:{serve_port()}",
            "catalogs": warm,
            "hardware": hw,
            "customToolSandbox": custom_tool_sandbox_enabled(),
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
                "resourceSharing": sharing,
            },
        }
        mtls = mtls_hello_payload(root)
        if mtls is not None:
            payload["mtls"] = mtls
        elif ca_exists(root):
            payload["mtls"] = {"enroll": True, "required": mtls_required()}
        return payload

    def _resource_sharing_health() -> dict[str, Any]:
        from orchestration.ollama_resource_manager import resource_sharing_enabled

        if not resource_sharing_enabled():
            return {"enabled": False}
        # Prefer live broker status when OLLAMA_API_BASE is the broker.
        base = (
            os.getenv("OLLAMA_API_BASE", "").strip()
            or os.getenv("OLLAMA_HOST", "").strip()
            or ""
        )
        if not base:
            return {"enabled": True, "error": "OLLAMA_API_BASE not set"}
        try:
            import httpx

            url = base.rstrip("/")
            if not url.startswith("http"):
                url = f"http://{url}"
            res = httpx.get(f"{url}/api/agentic/resource-status", timeout=2.0)
            if res.is_success:
                data = res.json()
                if isinstance(data, dict):
                    data.setdefault("enabled", True)
                    return data
            return {
                "enabled": True,
                "error": f"resource-status HTTP {res.status_code}",
                "base": url,
            }
        except Exception as exc:  # noqa: BLE001
            return {"enabled": True, "error": str(exc)}

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

    @app.get("/api/agentic/execution-queue/status")
    async def execution_queue_status() -> dict[str, Any]:
        from orchestration.execution_queue_broker import broker_status

        return await run_in_threadpool(broker_status)

    @app.get("/api/v1/catalog")
    async def api_v1_catalog(
        kinds: str | None = Query(
            default=None,
            description="Comma-separated: agents,mcps,skills,harnesses (default: all)",
        ),
        _identity: Identity = Depends(identity_from_request),
    ) -> dict[str, Any]:
        """Stock catalog for Reach enablement UIs (ids + requiredSecrets metadata only)."""
        from orchestration.catalog_public import build_reach_catalog

        return await run_in_threadpool(build_reach_catalog, root, kinds=kinds)

    @app.get("/metrics")
    async def metrics() -> Response:
        from orchestration.metrics import metrics_payload

        body, content_type = metrics_payload()
        return Response(content=body, media_type=content_type)

    @app.get("/api/v1/admin/reach-sessions")
    async def api_reach_sessions() -> dict[str, Any]:
        """Read-only Reach session overlay registry for Admin topology."""
        from orchestration.session_overlay import (
            list_active_overlays,
            mcp_tunnel_enabled,
            session_overlay_enabled,
        )
        from orchestration.speech_capability import speech_enabled

        sessions = await run_in_threadpool(list_active_overlays)
        return {
            "ok": True,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "sessionOverlayEnabled": session_overlay_enabled(),
            "mcpTunnelEnabled": mcp_tunnel_enabled(),
            "speechEnabled": speech_enabled(),
            "mtlsRequired": mtls_required(),
            "sessions": sessions,
            "count": len(sessions),
        }

    @app.get("/api/v1/admin/custom-tool-sandboxes")
    async def api_custom_tool_sandboxes() -> dict[str, Any]:
        """Host-wide custom-tool sandbox inventory for Admin topology."""
        from orchestration.tool_artifacts import (
            custom_tool_sandbox_enabled,
            list_artifacts,
        )
        from orchestration.tool_sandbox_runtime import list_runtimes

        def _snapshot() -> dict[str, Any]:
            runtimes = [r.status() for r in list_runtimes()]
            running = [r for r in runtimes if r.get("running")]
            artifacts = [
                {
                    "artifactId": a.storage_key,
                    "toolId": a.manifest.tool_id,
                    "toolVersion": a.manifest.tool_version,
                    "clientId": a.manifest.client_id,
                    "appId": a.app_id,
                    "userId": a.user_id,
                    "activated": bool(a.activated),
                    "runtimeBaseUrl": a.runtime_base_url,
                }
                for a in list_artifacts()
            ]
            return {
                "ok": True,
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "enabled": custom_tool_sandbox_enabled(),
                "runtimes": runtimes,
                "count": len(running),
                "artifacts": artifacts,
                "artifactCount": len(artifacts),
            }

        return await run_in_threadpool(_snapshot)

    @app.post("/api/v1/admin/background-activity/cancel")
    async def api_cancel_background_activity() -> dict[str, Any]:
        """Abort the in-flight Ollama pull / overlay prepare even if the Reach client is gone."""
        from agent_providers.ollama_provider import cancel_active_ollama_pull
        from orchestration.background_activity import clear_activity, snapshot

        def _cancel() -> dict[str, Any]:
            cancelled = cancel_active_ollama_pull(force=True)
            clear_activity()
            return {
                "ok": True,
                "cancelled": cancelled,
                "backgroundActivity": snapshot(),
            }

        return await run_in_threadpool(_cancel)

    @app.get("/api/v1/admin/mtls/clients")
    async def api_mtls_clients() -> dict[str, Any]:
        """Issued / revoked mTLS client leaves for Admin Access."""
        from orchestration.serve.mtls_ca import list_mtls_clients

        clients = await run_in_threadpool(list_mtls_clients, root)
        return {
            "ok": True,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "clients": clients,
            "count": len(clients),
        }

    @app.post("/api/v1/admin/mtls/enroll-tokens")
    async def api_mtls_mint_enroll_token(request: Request) -> dict[str, Any]:
        """Mint a one-time Reach enrollment token (plaintext returned once)."""
        from orchestration.serve.mtls_ca import MtlsCaError, mint_enroll_token

        try:
            body = await request.json()
        except Exception:  # noqa: BLE001
            body = {}
        if not isinstance(body, dict):
            body = {}

        def _mint() -> dict[str, Any]:
            ttl = body.get("ttlSeconds", body.get("ttl", 86400))
            try:
                ttl_i = int(ttl)
            except (TypeError, ValueError):
                ttl_i = 86400
            max_uses = body.get("maxUses", 1)
            try:
                max_uses_i = int(max_uses)
            except (TypeError, ValueError):
                max_uses_i = 1
            return mint_enroll_token(
                root,
                ttl_seconds=ttl_i,
                client_name=body.get("clientName") or body.get("subject"),
                max_uses=max_uses_i,
            )

        try:
            minted = await run_in_threadpool(_mint)
        except MtlsCaError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"ok": True, **minted}

    @app.post("/api/v1/admin/mtls/clients/revoke")
    async def api_mtls_clients_revoke(request: Request) -> dict[str, Any]:
        """Deny one client cert (serial and/or subject CN) without rotating the CA."""
        from orchestration.serve.mtls_ca import MtlsCaError, revoke_mtls_client

        try:
            body = await request.json()
        except Exception:  # noqa: BLE001
            body = {}
        if not isinstance(body, dict):
            body = {}

        def _revoke() -> dict[str, Any]:
            return revoke_mtls_client(
                root,
                serial=body.get("serial"),
                subject=body.get("subject"),
                reason=body.get("reason"),
            )

        try:
            entry = await run_in_threadpool(_revoke)
        except MtlsCaError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"ok": True, "revoked": entry}

    @app.post("/api/v1/admin/mtls/clients/unrevoke")
    async def api_mtls_clients_unrevoke(request: Request) -> dict[str, Any]:
        """Remove a deny-list entry so the client can reconnect with the same cert."""
        from orchestration.serve.mtls_ca import MtlsCaError, unrevoke_mtls_client

        try:
            body = await request.json()
        except Exception:  # noqa: BLE001
            body = {}
        if not isinstance(body, dict):
            body = {}

        def _unrevoke() -> bool:
            return unrevoke_mtls_client(
                root,
                serial=body.get("serial"),
                subject=body.get("subject"),
            )

        try:
            removed = await run_in_threadpool(_unrevoke)
        except MtlsCaError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if not removed:
            raise HTTPException(status_code=404, detail="revoke entry not found")
        return {"ok": True, "unrevoked": True}

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
        from orchestration.direct_agent import (
            DirectAgentEmptyAnswerError,
            DirectAgentFormatError,
            run_direct_agent,
        )

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
        except (DirectAgentFormatError, DirectAgentEmptyAnswerError) as exc:
            return {
                **base,
                "ok": False,
                "error": exc.message,
                "text": getattr(exc, "raw", None),
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

    @app.get("/api/v1/mtls/ca")
    async def api_mtls_ca() -> JSONResponse:
        from orchestration.serve.mtls_ca import MtlsCaError, read_ca_pem

        try:
            pem = await run_in_threadpool(lambda: read_ca_pem(root))
        except MtlsCaError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        return JSONResponse({"ok": True, "caPem": pem})

    @app.post("/api/v1/custom-tools/upload")
    async def api_custom_tools_upload(
        request: Request,
        identity: Identity = Depends(identity_from_request),
    ) -> dict[str, Any]:
        from orchestration.custom_tool_contract import CustomToolContractError
        from orchestration.tool_artifacts import (
            ToolArtifactDenied,
            ToolArtifactError,
            custom_tool_sandbox_enabled,
            ingest_upload,
        )

        if not custom_tool_sandbox_enabled():
            raise HTTPException(
                status_code=403,
                detail="custom tool sandbox is disabled (AGENTIC_CUSTOM_TOOL_SANDBOX=0)",
            )

        content_type = (request.headers.get("content-type") or "").lower()
        app_id = (request.query_params.get("appId") or request.query_params.get("app_id") or "").strip()
        if "multipart/form-data" in content_type:
            form = await request.form()
            upload = form.get("file") or form.get("package")
            if upload is None:
                raise HTTPException(status_code=400, detail="file field is required")
            if not app_id:
                app_id = str(form.get("appId") or form.get("app_id") or "").strip()
            data = await upload.read()  # type: ignore[union-attr]
        else:
            data = await request.body()
        if not app_id:
            raise HTTPException(status_code=400, detail="appId is required")

        try:
            record = await run_in_threadpool(
                lambda: ingest_upload(
                    tool_root=root,
                    user_id=identity.user_id,
                    app_id=app_id,
                    zip_bytes=data,
                )
            )
        except ToolArtifactDenied as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        except (ToolArtifactError, CustomToolContractError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"ok": True, "artifact": record.to_json()}

    @app.post("/api/v1/custom-tools/activate")
    async def api_custom_tools_activate(
        payload: CustomToolActivateRequest,
        identity: Identity = Depends(identity_from_request),
    ) -> dict[str, Any]:
        from orchestration.tool_artifacts import (
            ToolArtifactDenied,
            ToolArtifactError,
            _parse_storage_key,
            activate_artifact,
        )

        tool_id = payload.tool_id
        tool_version = payload.tool_version
        app_id = payload.app_id
        if payload.artifact_id:
            try:
                uid, parsed_app, tool_id, tool_version = _parse_storage_key(payload.artifact_id)
            except ToolArtifactError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            if uid != identity.user_id:
                raise HTTPException(status_code=403, detail="artifact belongs to another user")
            if app_id and app_id != parsed_app:
                raise HTTPException(status_code=400, detail="appId does not match artifact")
            app_id = parsed_app

        if not tool_id or not tool_version:
            raise HTTPException(
                status_code=400,
                detail="artifactId or toolId+toolVersion are required",
            )

        try:
            result = await run_in_threadpool(
                lambda: activate_artifact(
                    tool_root=root,
                    user_id=identity.user_id,
                    app_id=app_id,
                    tool_id=tool_id,
                    tool_version=tool_version,
                    env=payload.env,
                )
            )
        except ToolArtifactDenied as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        except ToolArtifactError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        artifact_id = payload.artifact_id
        if not artifact_id:
            artifact_id = f"{identity.user_id}::{app_id}::{tool_id}@{tool_version}"
        return {
            **result,
            "artifactId": artifact_id,
            "baseUrl": result.get("runtime", {}).get("baseUrl"),
        }

    @app.post("/api/v1/custom-tools/deactivate")
    async def api_custom_tools_deactivate(
        payload: CustomToolDeactivateRequest,
        identity: Identity = Depends(identity_from_request),
    ) -> dict[str, Any]:
        from orchestration.tool_artifacts import deactivate_artifact

        return await run_in_threadpool(
            lambda: deactivate_artifact(
                user_id=identity.user_id,
                app_id=payload.app_id,
                client_id=payload.client_id,
            )
        )

    @app.get("/api/v1/custom-tools")
    async def api_custom_tools_list(
        app_id: str | None = Query(default=None, alias="appId"),
        identity: Identity = Depends(identity_from_request),
    ) -> dict[str, Any]:
        from orchestration.tool_artifacts import custom_tool_sandbox_enabled, list_artifacts

        artifacts = await run_in_threadpool(
            lambda: [a.to_json() for a in list_artifacts(user_id=identity.user_id, app_id=app_id)]
        )
        return {
            "ok": True,
            "enabled": custom_tool_sandbox_enabled(),
            "artifacts": artifacts,
            "count": len(artifacts),
        }

    @app.delete("/api/v1/custom-tools/{artifact_id}")
    async def api_custom_tools_delete(
        artifact_id: str,
        identity: Identity = Depends(identity_from_request),
    ) -> dict[str, Any]:
        from orchestration.tool_artifacts import ToolArtifactDenied, ToolArtifactError, delete_artifact

        try:
            removed = await run_in_threadpool(
                lambda: delete_artifact(
                    tool_root=root,
                    user_id=identity.user_id,
                    artifact_id=artifact_id,
                )
            )
        except ToolArtifactDenied as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        except ToolArtifactError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if not removed:
            raise HTTPException(status_code=404, detail="artifact not found")
        return {"ok": True, "artifactId": artifact_id, "deleted": True}

    @app.post("/api/v1/mtls/enroll")
    async def api_mtls_enroll(payload: MtlsEnrollRequest) -> dict[str, Any]:
        from orchestration.serve.mtls_ca import (
            MtlsCaError,
            consume_enroll_token,
            sign_client_csr,
        )

        csr = (payload.csr_pem or "").strip()
        if not csr:
            raise HTTPException(status_code=400, detail="csrPem is required")

        def _enroll() -> dict[str, Any]:
            token_meta = consume_enroll_token(root, payload.token)
            override = (payload.client_name or "").strip() or token_meta.get("clientName")
            return sign_client_csr(root, csr, common_name_override=override)

        try:
            result = await run_in_threadpool(_enroll)
        except MtlsCaError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"ok": True, **result}

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        from orchestration.serve.ws import WsConnection

        if mtls_required():
            peercert = peercert_from_scope(websocket.scope)
            if not peercert:
                await websocket.close(code=1008, reason="client certificate required (mTLS)")
                return

        await WsConnection(websocket, tool_root=root).serve()

    return app
