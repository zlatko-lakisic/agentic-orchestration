"""Transparent HTTP broker in front of Ollama with VRAM-aware admission.

Listen address is the public Ollama API (``AGENTIC_OLLAMA_BROKER_PORT``, default
11434). Upstream daemon is ``AGENTIC_OLLAMA_UPSTREAM`` (default
``http://127.0.0.1:11435``).

Run::

    python -m orchestration.ollama_resource_broker
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse

_LOG = logging.getLogger(__name__)

from orchestration.ollama_resource_manager import (
    extract_model_from_body,
    get_resource_manager,
    path_needs_admission,
    resolve_upstream_base,
    resource_sharing_enabled,
    broker_listen_host,
    broker_listen_port,
)


HOP_BY_HOP = frozenset(
    {
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailers",
        "transfer-encoding",
        "upgrade",
        "content-length",
        "host",
    }
)


def _upstream_timeout() -> httpx.Timeout:
    """Upstream Ollama timeouts.

    ``AGENTIC_OLLAMA_BROKER_READ_TIMEOUT_SECONDS`` bounds the gap between bytes
    from upstream (default 1800s; ``0`` = unbounded). Without it a hung Ollama
    request holds its VRAM lease forever.
    """
    raw = os.getenv("AGENTIC_OLLAMA_BROKER_READ_TIMEOUT_SECONDS", "").strip()
    try:
        read_s: float | None = float(raw) if raw else 1800.0
    except ValueError:
        read_s = 1800.0
    if read_s is not None and read_s <= 0:
        read_s = None
    return httpx.Timeout(connect=10.0, read=read_s, write=120.0, pool=30.0)


def create_broker_app(*, manager: Any | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        mgr = manager or get_resource_manager()
        app.state.manager = mgr
        if resource_sharing_enabled():
            mgr.start_idle_reconciler()
        print(
            f"(agentic) ollama resource broker: upstream={resolve_upstream_base()} "
            f"sharing={resource_sharing_enabled()}",
            file=sys.stderr,
        )
        try:
            yield
        finally:
            mgr.stop_idle_reconciler()
            client = getattr(app.state, "http", None)
            if client is not None:
                try:
                    await client.aclose()
                except Exception:  # noqa: BLE001
                    pass
                app.state.http = None

    app = FastAPI(title="agentic-ollama-resource-broker", lifespan=lifespan)

    @app.get("/api/agentic/resource-status")
    async def resource_status() -> dict[str, Any]:
        mgr = app.state.manager
        # Deep status hits upstream /api/ps — keep it off the event loop.
        return await asyncio.to_thread(mgr.status)

    @app.get("/health")
    async def health() -> dict[str, Any]:
        """Liveness: in-memory only. Never waits on upstream Ollama."""
        mgr = app.state.manager
        st = mgr.local_status()
        return {
            "ok": True,
            "service": "agentic-ollama-resource-broker",
            "resourceSharing": resource_sharing_enabled(),
            "upstream": st.get("upstream"),
            "queueDepth": st.get("queueDepth"),
            "active": st.get("active"),
        }

    @app.get("/ready")
    async def ready() -> Response:
        """Readiness: short upstream ping in a thread (≤1s)."""
        mgr = app.state.manager
        ok = await asyncio.to_thread(mgr.ping_upstream, timeout_s=1.0)
        body = {
            "ok": ok,
            "service": "agentic-ollama-resource-broker",
            "upstream": resolve_upstream_base(),
        }
        if not ok:
            return JSONResponse(body, status_code=503)
        return JSONResponse(body)

    @app.api_route(
        "/{full_path:path}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    )
    async def proxy(full_path: str, request: Request) -> Response:
        mgr = app.state.manager
        path = "/" + (full_path or "").lstrip("/")
        if path in ("/api/agentic/resource-status",):
            return JSONResponse(await asyncio.to_thread(mgr.status))

        upstream = resolve_upstream_base().rstrip("/")
        url = f"{upstream}{path}"
        if request.url.query:
            url = f"{url}?{request.url.query}"

        body = await request.body()
        model = ""
        parsed: dict[str, Any] | None = None
        needs = path_needs_admission(path) and request.method.upper() == "POST"
        client_wants_stream = False
        if body:
            try:
                maybe = json.loads(body)
            except (json.JSONDecodeError, UnicodeDecodeError):
                maybe = None
            if isinstance(maybe, dict):
                parsed = maybe
                client_wants_stream = bool(maybe.get("stream"))
            if needs:
                model = extract_model_from_body(parsed)

        lease = None
        if needs and resource_sharing_enabled() and model:
            try:
                # Blocking admission in a thread so the event loop stays responsive.
                lease = await asyncio.to_thread(mgr.acquire, model)
            except TimeoutError:
                _LOG.warning("ollama resource acquire timed out for model=%s", model, exc_info=True)
                return JSONResponse(
                    {
                        "error": "resource acquire timed out",
                        "code": "ollama_resource_timeout",
                    },
                    status_code=503,
                )
            except RuntimeError:
                _LOG.warning("ollama resource busy for model=%s", model, exc_info=True)
                return JSONResponse(
                    {
                        "error": "resource busy",
                        "code": "ollama_resource_busy",
                    },
                    status_code=503,
                )
            except ValueError:
                _LOG.warning("invalid ollama resource request for model=%s", model, exc_info=True)
                return JSONResponse(
                    {"error": "invalid resource request"},
                    status_code=400,
                )

        headers = {
            k: v
            for k, v in request.headers.items()
            if k.lower() not in HOP_BY_HOP
        }

        async def _release(lease_obj: Any) -> None:
            # ``release`` drains the queue with synchronous upstream HTTP calls;
            # never run it on the event loop (it would stall every proxied
            # stream and ``/health`` exactly when upstream is saturated).
            if lease_obj is not None:
                await asyncio.to_thread(mgr.release, lease_obj)

        client: httpx.AsyncClient = getattr(app.state, "http", None)
        if client is None:
            client = httpx.AsyncClient(timeout=_upstream_timeout())
            app.state.http = client

        try:
            req = client.build_request(
                request.method,
                url,
                headers=headers,
                content=body if body else None,
            )
            upstream_res = await client.send(req, stream=True)
        except httpx.HTTPError:
            await _release(lease)
            _LOG.warning("upstream ollama unreachable for path=%s", path, exc_info=True)
            return JSONResponse(
                {"error": "upstream ollama unreachable"},
                status_code=502,
            )

        out_headers = {
            k: v
            for k, v in upstream_res.headers.items()
            if k.lower() not in HOP_BY_HOP
        }

        # Non-streaming responses: buffer so leases release reliably and TestClient works.
        if not client_wants_stream:
            try:
                content = await upstream_res.aread()
            except httpx.HTTPError:
                _LOG.warning("upstream ollama read failed for path=%s", path, exc_info=True)
                return JSONResponse(
                    {"error": "upstream ollama read failed"},
                    status_code=504,
                )
            finally:
                await upstream_res.aclose()
                await _release(lease)
            return Response(
                content=content,
                status_code=upstream_res.status_code,
                headers=out_headers,
            )

        async def stream_body() -> AsyncIterator[bytes]:
            try:
                async for chunk in upstream_res.aiter_bytes():
                    yield chunk
            finally:
                await upstream_res.aclose()
                await _release(lease)

        return StreamingResponse(
            stream_body(),
            status_code=upstream_res.status_code,
            headers=out_headers,
        )

    return app


def main(argv: list[str] | None = None) -> int:
    _ = argv
    # Ensure sharing is on when launched as the dedicated broker process unless
    # the operator explicitly disabled it.
    if os.getenv("AGENTIC_OLLAMA_RESOURCE_SHARING") is None:
        os.environ["AGENTIC_OLLAMA_RESOURCE_SHARING"] = "1"

    import uvicorn

    host = broker_listen_host()
    port = broker_listen_port()
    app = create_broker_app()
    uvicorn.run(app, host=host, port=port, log_level="info")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
