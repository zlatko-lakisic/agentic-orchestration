"""
TLS / mTLS helpers for ``python -m orchestration.serve``.

Uses uvicorn SSL kwargs plus an optional peer-cert stash (uvicorn does not put
client certificates in the ASGI scope). When a client CA is configured we use
``CERT_OPTIONAL`` at the handshake and enforce presence in application code so
``/api/v1/mtls/enroll`` and ``/api/v1/mtls/ca`` can run without a client cert.
"""

from __future__ import annotations

import os
import ssl
from pathlib import Path
from typing import Any

# (host, port) -> cryptography/OpenSSL peercert dict from transport.get_extra_info
_PEER_CERTS: dict[tuple[str, int], dict[str, Any] | None] = {}

# Paths that stay reachable with server TLS only (no client cert).
MTLS_PUBLIC_PATHS = frozenset(
    {
        "/health",
        "/metrics",
        "/api/ping",
        "/api/agentic/execution-queue/status",
        "/api/v1/admin/reach-sessions",
        "/api/v1/admin/custom-tool-sandboxes",
        "/api/v1/admin/background-activity/cancel",
        "/api/v1/admin/mtls/clients",
        "/api/v1/mtls/ca",
        "/api/v1/mtls/enroll",
    }
)


def _truthy(raw: str | None) -> bool:
    return (raw or "").strip().lower() in ("1", "true", "yes", "on")


def tls_certfile() -> str | None:
    raw = os.getenv("AGENTIC_SERVE_TLS_CERTFILE", "").strip()
    return raw or None


def tls_keyfile() -> str | None:
    raw = os.getenv("AGENTIC_SERVE_TLS_KEYFILE", "").strip()
    return raw or None


def tls_ca_file() -> str | None:
    raw = os.getenv("AGENTIC_SERVE_TLS_CA_FILE", "").strip()
    return raw or None


def tls_configured() -> bool:
    return bool(tls_certfile() and tls_keyfile())


def client_ca_configured() -> bool:
    return bool(tls_ca_file())


def mtls_required() -> bool:
    """
    When client CA is set, require a verified client cert on protected routes.

    Override with ``AGENTIC_SERVE_TLS_REQUIRE_CLIENT_CERT=0`` during enroll-only
    windows, or ``=1`` to force on.
    """
    raw = os.getenv("AGENTIC_SERVE_TLS_REQUIRE_CLIENT_CERT", "").strip()
    if raw:
        return _truthy(raw)
    return client_ca_configured()


def build_ssl_context() -> ssl.SSLContext | None:
    """Return an SSLContext for uvicorn, or None for cleartext."""
    cert = tls_certfile()
    key = tls_keyfile()
    if not cert or not key:
        return None
    for label, path in (("cert", cert), ("key", key)):
        if not Path(path).is_file():
            raise FileNotFoundError(f"AGENTIC_SERVE_TLS_{label.upper()}FILE not found: {path}")

    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    ctx.load_cert_chain(certfile=cert, keyfile=key)

    ca = tls_ca_file()
    if ca:
        if not Path(ca).is_file():
            raise FileNotFoundError(f"AGENTIC_SERVE_TLS_CA_FILE not found: {ca}")
        ctx.load_verify_locations(cafile=ca)
        # OPTIONAL so enroll/ca work; app layer enforces when mtls_required().
        ctx.verify_mode = ssl.CERT_OPTIONAL
        ctx.check_hostname = False
    return ctx


def uvicorn_ssl_kwargs() -> dict[str, Any]:
    """Kwargs for ``uvicorn.run`` when TLS is configured."""
    cert = tls_certfile()
    key = tls_keyfile()
    if not cert or not key:
        return {}
    for label, path in (("cert", cert), ("key", key)):
        if not Path(path).is_file():
            raise FileNotFoundError(f"AGENTIC_SERVE_TLS_{label.upper()}FILE not found: {path}")
    kwargs: dict[str, Any] = {
        "ssl_certfile": cert,
        "ssl_keyfile": key,
    }
    ca = tls_ca_file()
    if ca:
        if not Path(ca).is_file():
            raise FileNotFoundError(f"AGENTIC_SERVE_TLS_CA_FILE not found: {ca}")
        kwargs["ssl_ca_certs"] = ca
        # OPTIONAL so enroll/ca work; app layer enforces when mtls_required().
        kwargs["ssl_cert_reqs"] = ssl.CERT_OPTIONAL
    return kwargs


def install_peercert_hooks() -> None:
    """Monkeypatch uvicorn HTTP/WS protocols to stash ``peercert`` by client addr."""
    try:
        from uvicorn.protocols.http.h11_impl import H11Protocol
    except ImportError:
        H11Protocol = None  # type: ignore[misc, assignment]
    try:
        from uvicorn.protocols.http.httptools_impl import HttpToolsProtocol
    except ImportError:
        HttpToolsProtocol = None  # type: ignore[misc, assignment]
    try:
        from uvicorn.protocols.websockets.websockets_impl import WebSocketProtocol
    except ImportError:
        WebSocketProtocol = None  # type: ignore[misc, assignment]
    try:
        from uvicorn.protocols.websockets.wsproto_impl import WSProtocol
    except ImportError:
        WSProtocol = None  # type: ignore[misc, assignment]

    def _wrap(cls: type | None) -> None:
        if cls is None or getattr(cls, "_agentic_peercert_patched", False):
            return
        orig_made = cls.connection_made
        orig_lost = cls.connection_lost

        def connection_made(self: Any, transport: Any) -> None:
            orig_made(self, transport)
            peername = transport.get_extra_info("peername")
            peercert = transport.get_extra_info("peercert")
            if peername and isinstance(peername, tuple) and len(peername) >= 2:
                key = (str(peername[0]), int(peername[1]))
                _PEER_CERTS[key] = peercert if peercert else None

        def connection_lost(self: Any, exc: Exception | None) -> None:
            transport = getattr(self, "transport", None)
            if transport is not None:
                peername = transport.get_extra_info("peername")
                if peername and isinstance(peername, tuple) and len(peername) >= 2:
                    _PEER_CERTS.pop((str(peername[0]), int(peername[1])), None)
            orig_lost(self, exc)

        cls.connection_made = connection_made  # type: ignore[method-assign]
        cls.connection_lost = connection_lost  # type: ignore[method-assign]
        cls._agentic_peercert_patched = True

    for protocol in (H11Protocol, HttpToolsProtocol, WebSocketProtocol, WSProtocol):
        _wrap(protocol)


def peercert_for_client(host: str | None, port: int | None) -> dict[str, Any] | None:
    if not host or port is None:
        return None
    return _PEER_CERTS.get((str(host), int(port)))


def peercert_from_scope(scope: dict[str, Any]) -> dict[str, Any] | None:
    """Best-effort client certificate for an ASGI connection."""
    extensions = scope.get("extensions") or {}
    for bucket_name in ("tls", "ssl"):
        bucket = extensions.get(bucket_name) or {}
        if not isinstance(bucket, dict):
            continue
        for key in ("client_cert_chain", "client_cert", "peercert"):
            if key in bucket and bucket[key]:
                val = bucket[key]
                if isinstance(val, (list, tuple)) and val:
                    return val[0] if isinstance(val[0], dict) else {"raw": val[0]}
                if isinstance(val, dict):
                    return val
    client = scope.get("client")
    if isinstance(client, (list, tuple)) and len(client) >= 2:
        return peercert_for_client(str(client[0]), int(client[1]))
    return None


def is_public_mtls_path(path: str) -> bool:
    cleaned = (path or "").split("?", 1)[0].rstrip("/") or "/"
    if cleaned in MTLS_PUBLIC_PATHS:
        return True
    # Admin mTLS client registry + enroll-token mint — coordinator proxy, no client cert.
    if cleaned == "/api/v1/admin/mtls/clients" or cleaned.startswith(
        "/api/v1/admin/mtls/clients/"
    ):
        return True
    if cleaned == "/api/v1/admin/mtls/enroll-tokens":
        return True
    # Allow trailing-slash variants already normalized above.
    return cleaned in {p.rstrip("/") for p in MTLS_PUBLIC_PATHS}
