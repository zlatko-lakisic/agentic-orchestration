"""Transparent HTTP broker in front of Ollama with VRAM-aware admission.

Listen address is the public Ollama API (``AGENTIC_OLLAMA_BROKER_PORT``, default
11434). Upstream daemon is ``AGENTIC_OLLAMA_UPSTREAM`` (default
``http://127.0.0.1:11435``).

Run::

    python -m orchestration.ollama_resource_broker
"""

from __future__ import annotations

import json
import os
import sys
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse

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

    app = FastAPI(title="agentic-ollama-resource-broker", lifespan=lifespan)

    @app.get("/api/agentic/resource-status")
    async def resource_status() -> dict[str, Any]:
        mgr = app.state.manager
        return mgr.status()

    @app.get("/health")
    async def health() -> dict[str, Any]:
        mgr = app.state.manager
        st = mgr.status()
        return {
            "ok": True,
            "service": "agentic-ollama-resource-broker",
            "resourceSharing": resource_sharing_enabled(),
            "upstream": st.get("upstream"),
            "queueDepth": st.get("queueDepth"),
            "active": st.get("active"),
            "loaded": st.get("loaded"),
        }

    @app.api_route(
        "/{full_path:path}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    )
    async def proxy(full_path: str, request: Request) -> Response:
        mgr = app.state.manager
        path = "/" + (full_path or "").lstrip("/")
        if path in ("/api/agentic/resource-status",):
            return JSONResponse(mgr.status())

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
                import asyncio

                lease = await asyncio.to_thread(mgr.acquire, model)
            except TimeoutError as exc:
                return JSONResponse(
                    {
                        "error": str(exc),
                        "code": "ollama_resource_timeout",
                    },
                    status_code=503,
                )
            except RuntimeError as exc:
                return JSONResponse(
                    {
                        "error": str(exc),
                        "code": "ollama_resource_busy",
                    },
                    status_code=503,
                )
            except ValueError as exc:
                return JSONResponse({"error": str(exc)}, status_code=400)

        headers = {
            k: v
            for k, v in request.headers.items()
            if k.lower() not in HOP_BY_HOP
        }

        client: httpx.AsyncClient = getattr(app.state, "http", None)
        if client is None:
            client = httpx.AsyncClient(timeout=None)
            app.state.http = client

        try:
            req = client.build_request(
                request.method,
                url,
                headers=headers,
                content=body if body else None,
            )
            upstream_res = await client.send(req, stream=True)
        except httpx.HTTPError as exc:
            if lease is not None:
                mgr.release(lease)
            return JSONResponse(
                {"error": f"upstream ollama unreachable: {exc}"},
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
            finally:
                await upstream_res.aclose()
                if lease is not None:
                    mgr.release(lease)
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
                if lease is not None:
                    mgr.release(lease)

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
