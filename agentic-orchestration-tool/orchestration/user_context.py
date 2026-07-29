"""
Identity resolution from proxy-forwarded headers (Python port of
``agentic-orchestration-web/lib/user-context.mjs``).

The engine never authenticates anyone. In server mode an identity-terminating proxy
(Warpgate) injects ``x-agentic-user-name`` / ``x-agentic-session-id``; in local mode
there are no headers at all and everything resolves to an implicit local user.

``AGENTIC_REQUIRE_IDENTITY=1`` turns the implicit fallback off so a misconfigured
server deployment fails loudly instead of silently merging users.
"""

from __future__ import annotations

import os
import re
import secrets
from dataclasses import dataclass
from typing import Any, Mapping

DEFAULT_USER_NAME_HEADERS = "x-agentic-user-name,x-user-name"
DEFAULT_SESSION_ID_HEADERS = "x-agentic-session-id,x-warpgate-session-id"

LOCAL_USER_ID = "local"

_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")
_SESSION_ID_ALLOWED = re.compile(r"^[a-zA-Z0-9._-]+$")
_USER_ID_STRIP = re.compile(r"[^a-z0-9._-]+")


class IdentityRequiredError(RuntimeError):
    """Raised when ``AGENTIC_REQUIRE_IDENTITY=1`` and no identity header was forwarded."""


def sanitize_user_display_name(raw: Any) -> str | None:
    """Collapse whitespace; reject empty, overlong (>120) and control-char values."""
    text = " ".join(str(raw if raw is not None else "").split())
    if not text or len(text) > 120:
        return None
    if _CONTROL_CHARS.search(text):
        return None
    return text


def sanitize_session_id(raw: Any) -> str | None:
    """Reject empty, overlong (>128), control-char and non ``[A-Za-z0-9._-]`` values."""
    text = str(raw if raw is not None else "").strip()
    if not text or len(text) > 128:
        return None
    if _CONTROL_CHARS.search(text):
        return None
    if not _SESSION_ID_ALLOWED.match(text):
        return None
    return text


def _header_keys(configured: str) -> list[str]:
    return [k.strip().lower() for k in configured.split(",") if k.strip()]


def _header_value(headers: Mapping[str, Any] | None, key: str) -> Any:
    if not headers:
        return None
    # Starlette/httpx headers are case-insensitive mappings; plain dicts are not.
    getter = getattr(headers, "get", None)
    if getter is not None:
        raw = getter(key)
        if raw is None:
            raw = getter(key.title())
        if raw is not None:
            return raw
    for name, value in dict(headers).items():
        if str(name).lower() == key:
            return value
    return None


def _first_header_match(
    headers: Mapping[str, Any] | None,
    configured: str,
    sanitize,
) -> str | None:
    for key in _header_keys(configured):
        raw = _header_value(headers, key)
        if raw is None:
            continue
        value = raw[0] if isinstance(raw, (list, tuple)) and raw else raw
        cleaned = sanitize(value)
        if cleaned:
            return cleaned
    return None


def session_id_from_request_headers(
    headers: Mapping[str, Any] | None,
    header_list_env: str | None = None,
) -> str | None:
    """Orchestrator session id from inbound HTTP / WebSocket upgrade headers."""
    configured = (
        header_list_env
        if header_list_env is not None
        else os.getenv("AGENTIC_WEB_SESSION_ID_HEADER", DEFAULT_SESSION_ID_HEADERS)
    ).strip()
    return _first_header_match(headers, configured, sanitize_session_id)


def generate_web_session_id() -> str:
    """``web-<12 hex chars>`` — same shape the Node server generates."""
    return f"web-{secrets.token_hex(6)}"


def resolve_session_id_from_headers(headers: Mapping[str, Any] | None) -> str:
    return session_id_from_request_headers(headers) or generate_web_session_id()


def user_name_from_request_headers(
    headers: Mapping[str, Any] | None,
    header_list_env: str | None = None,
) -> str | None:
    """Display name from inbound HTTP / WebSocket upgrade headers."""
    configured = (
        header_list_env
        if header_list_env is not None
        else os.getenv("AGENTIC_WEB_USER_NAME_HEADER", DEFAULT_USER_NAME_HEADERS)
    ).strip()
    return _first_header_match(headers, configured, sanitize_user_display_name)


def user_display_name_spawn_env(user_name: Any) -> dict[str, str]:
    """Env overlay for spawned CLI runs (parity with the Node helper)."""
    name = sanitize_user_display_name(user_name)
    if not name:
        return {}
    return {"AGENTIC_WEB_USER_DISPLAY_NAME": name}


def require_identity_enabled() -> bool:
    """``AGENTIC_REQUIRE_IDENTITY=1`` — server mode must not fall back to the local user."""
    return os.getenv("AGENTIC_REQUIRE_IDENTITY", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def user_id_from_display_name(user_name: Any) -> str:
    """Stable filesystem-safe key derived from a display name."""
    name = sanitize_user_display_name(user_name)
    if not name:
        return LOCAL_USER_ID
    key = _USER_ID_STRIP.sub("-", name.lower()).strip("-._")
    if len(key) > 64:
        key = key[:64].rstrip("-._")
    return key or LOCAL_USER_ID


@dataclass(frozen=True)
class Identity:
    """Resolved caller identity for one request or WebSocket connection."""

    user_name: str | None
    session_id: str
    user_id: str
    #: True when no identity header was forwarded (local / desktop sidecar mode).
    local: bool = True

    def to_json_dict(self) -> dict[str, Any]:
        return {
            "userName": self.user_name,
            "sessionId": self.session_id,
            "userId": self.user_id,
            "local": self.local,
        }


def resolve_identity(headers: Mapping[str, Any] | None = None) -> Identity:
    """
    Resolve the caller from proxy-forwarded headers.

    No headers → implicit local user (``user_id="local"``), unless
    ``AGENTIC_REQUIRE_IDENTITY=1``, which raises :class:`IdentityRequiredError`.
    """
    user_name = user_name_from_request_headers(headers)
    session_id = session_id_from_request_headers(headers)
    local = user_name is None
    if local and require_identity_enabled():
        raise IdentityRequiredError(
            "AGENTIC_REQUIRE_IDENTITY=1 but no identity header was forwarded. "
            "Configure the proxy to inject one of "
            f"{os.getenv('AGENTIC_WEB_USER_NAME_HEADER', DEFAULT_USER_NAME_HEADERS)!r}, "
            "or unset AGENTIC_REQUIRE_IDENTITY for local single-user mode."
        )
    return Identity(
        user_name=user_name,
        session_id=session_id or generate_web_session_id(),
        user_id=user_id_from_display_name(user_name),
        local=local,
    )
