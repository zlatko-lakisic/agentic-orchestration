"""
Access checks shared by the daemon's HTTP middleware and the WebSocket endpoint.

Three independent gates live here:

* **Operator credential** — every ``/api/v1/admin/*`` route needs
  ``Authorization: Bearer <AGENTIC_SERVE_ADMIN_TOKEN>`` when that env var is set.
  When it is unset, only a direct loopback peer is treated as the operator.
* **Origin** — a browser page on another site must not be able to drive the
  daemon (cross-site WebSocket hijacking / CSRF). Requests without ``Origin``
  (native clients, curl, the Node coordinator) are unaffected.
* **Host** — when the daemon is bound to loopback, the ``Host`` header must be a
  loopback name, which defeats DNS rebinding.
"""

from __future__ import annotations

import hmac
import ipaddress
import os
from typing import Any, Mapping
from urllib.parse import urlsplit

ADMIN_PATH_PREFIX = "/api/v1/admin/"
ADMIN_TOKEN_ENV = "AGENTIC_SERVE_ADMIN_TOKEN"
ALLOWED_ORIGINS_ENV = "AGENTIC_SERVE_ALLOWED_ORIGINS"
ALLOWED_HOSTS_ENV = "AGENTIC_SERVE_ALLOWED_HOSTS"
TRUSTED_PROXIES_ENV = "AGENTIC_SERVE_TRUSTED_PROXIES"

_LOOPBACK_NAMES = frozenset({"localhost", "127.0.0.1", "::1"})
_FORWARDING_HEADERS = ("x-forwarded-for", "forwarded", "x-real-ip")
_STATE_CHANGING_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def _csv_env(name: str) -> list[str]:
    return [p.strip().lower() for p in os.getenv(name, "").split(",") if p.strip()]


def is_loopback_address(host: Any) -> bool:
    """True for ``localhost`` and any loopback IP (including IPv4-mapped IPv6)."""
    text = str(host or "").strip().lower().strip("[]")
    if not text:
        return False
    if text in _LOOPBACK_NAMES:
        return True
    try:
        addr = ipaddress.ip_address(text)
    except ValueError:
        return False
    mapped = getattr(addr, "ipv4_mapped", None)
    if mapped is not None:
        addr = mapped
    return bool(addr.is_loopback)


def hostname_of(value: Any) -> str:
    """Lowercased hostname from a ``Host`` header value or an origin/URL (no port)."""
    text = str(value or "").strip()
    if not text:
        return ""
    if "://" not in text:
        text = f"//{text}"
    try:
        host = urlsplit(text).hostname
    except ValueError:
        return ""
    return (host or "").strip().lower()


def admin_token() -> str:
    return os.getenv(ADMIN_TOKEN_ENV, "").strip()


def is_admin_path(path: str) -> bool:
    cleaned = (path or "").split("?", 1)[0]
    return cleaned == ADMIN_PATH_PREFIX.rstrip("/") or cleaned.startswith(ADMIN_PATH_PREFIX)


def bearer_token(headers: Mapping[str, Any] | None) -> str:
    raw = str((headers.get("authorization") if headers is not None else "") or "").strip()
    scheme, _, value = raw.partition(" ")
    if scheme.lower() != "bearer":
        return ""
    return value.strip()


def _has_forwarding_header(headers: Mapping[str, Any] | None) -> bool:
    if headers is None:
        return False
    return any(str(headers.get(name) or "").strip() for name in _FORWARDING_HEADERS)


def operator_authorized(headers: Mapping[str, Any] | None, client_host: Any) -> bool:
    """
    True when the caller holds the operator credential.

    With ``AGENTIC_SERVE_ADMIN_TOKEN`` set the bearer token is the only way in. Without
    it, the caller must be a direct loopback peer: a request relayed by a local reverse
    proxy (it carries a forwarding header) is not treated as local.
    """
    expected = admin_token()
    if expected:
        presented = bearer_token(headers)
        if not presented:
            return False
        return hmac.compare_digest(presented.encode("utf-8"), expected.encode("utf-8"))
    return is_loopback_address(client_host) and not _has_forwarding_header(headers)


def origin_allowed(headers: Mapping[str, Any] | None) -> bool:
    """
    Reject browser requests from foreign origins.

    No ``Origin`` header → allowed (non-browser client). Otherwise the origin's hostname
    must be a loopback name, match the ``Host`` header, or be listed in
    ``AGENTIC_SERVE_ALLOWED_ORIGINS`` (comma list of origins or hostnames).
    """
    if headers is None:
        return True
    origin = str(headers.get("origin") or "").strip()
    if not origin:
        return True
    if origin.lower() == "null":
        return False
    origin_host = hostname_of(origin)
    if not origin_host:
        return False
    if is_loopback_address(origin_host):
        return True
    if origin_host == hostname_of(headers.get("host")):
        return True
    allowed = _csv_env(ALLOWED_ORIGINS_ENV)
    if origin.lower().rstrip("/") in {a.rstrip("/") for a in allowed}:
        return True
    return origin_host in {hostname_of(a) or a for a in allowed}


def host_allowed(headers: Mapping[str, Any] | None, bound_host: str | None) -> bool:
    """
    DNS-rebinding guard: a loopback-bound daemon only answers to loopback ``Host`` names.

    ``bound_host`` is the address the listener actually bound; ``None`` (no listener, e.g.
    an in-process test client) and non-loopback binds skip the check.
    """
    if not bound_host or not is_loopback_address(bound_host):
        return True
    host = hostname_of(headers.get("host") if headers is not None else "")
    if not host:
        # HTTP/1.0 without Host cannot be a browser rebinding request.
        return True
    if is_loopback_address(host):
        return True
    return host in set(_csv_env(ALLOWED_HOSTS_ENV))


def is_state_changing(method: str) -> bool:
    return str(method or "").upper() in _STATE_CHANGING_METHODS


def _trusted_proxy(peer: str) -> bool:
    if is_loopback_address(peer):
        return True
    try:
        addr = ipaddress.ip_address(peer.strip("[]"))
    except ValueError:
        return False
    for entry in _csv_env(TRUSTED_PROXIES_ENV):
        try:
            if addr in ipaddress.ip_network(entry, strict=False):
                return True
        except ValueError:
            continue
    return False


def client_ip(headers: Mapping[str, Any] | None, peer: Any) -> str:
    """
    Client IP for audit trails.

    Forwarding headers are honoured only when the socket peer is a trusted proxy
    (loopback, or listed in ``AGENTIC_SERVE_TRUSTED_PROXIES`` as IPs / CIDRs); any other
    peer could put whatever it likes in ``X-Forwarded-For``.
    """
    peer_s = str(peer or "").strip()
    if headers is not None and peer_s and _trusted_proxy(peer_s):
        for key in ("x-forwarded-for", "x-real-ip", "cf-connecting-ip"):
            raw = str(headers.get(key) or "").strip()
            if raw:
                return raw.split(",")[0].strip()
    return peer_s
