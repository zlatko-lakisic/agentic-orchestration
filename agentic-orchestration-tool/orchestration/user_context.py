"""
Identity resolution from proxy-forwarded headers and optional mTLS client certs.

Header path (Python port of ``agentic-orchestration-web/lib/user-context.mjs``):
an identity-terminating proxy may inject ``x-agentic-user-name`` /
``x-agentic-session-id``. In local mode there are no headers and everything
resolves to an implicit local user.

mTLS path (Reach → AO engine): when a verified peer certificate is present, the
subject CN / SAN is the authoritative user identity and wins over headers.

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
DEFAULT_AVATAR_HEADERS = "x-auth-avatar,x-warpgate-avatar,x-forwarded-avatar"

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


def sanitize_auth_user_id(raw: Any) -> str | None:
    text = str(raw if raw is not None else "").strip()
    if not text or len(text) > 128:
        return None
    if _CONTROL_CHARS.search(text):
        return None
    return text


def sanitize_person_name(raw: Any) -> str | None:
    text = " ".join(str(raw if raw is not None else "").split())
    if not text or len(text) > 64:
        return None
    if _CONTROL_CHARS.search(text):
        return None
    return text


def sanitize_email(raw: Any) -> str | None:
    text = str(raw if raw is not None else "").strip()
    if not text or len(text) > 254:
        return None
    if _CONTROL_CHARS.search(text):
        return None
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", text):
        return None
    return text


def sanitize_logout_url(raw: Any) -> str | None:
    text = str(raw if raw is not None else "").strip()
    if not text or len(text) > 2048:
        return None
    if not re.match(r"^https?://", text, re.IGNORECASE):
        return None
    return text


def normalize_avatar_url(raw: Any) -> str | None:
    text = str(raw if raw is not None else "").strip()
    if not text or len(text) > 500_000:
        return None
    if re.match(r"^https?://", text, re.IGNORECASE):
        return text
    if re.match(r"^data:image/", text, re.IGNORECASE):
        return text
    compact = re.sub(r"\s+", "", text)
    if re.fullmatch(r"[A-Za-z0-9+/=]+", compact) and len(compact) > 20:
        return f"data:image/jpeg;base64,{compact}"
    return None


def resolve_auth_display_name(
    *,
    first_name: str | None = None,
    last_name: str | None = None,
    email: str | None = None,
    legacy_user_name: str | None = None,
    user_id: str | None = None,
) -> str | None:
    if first_name and last_name:
        return f"{first_name} {last_name}"
    if first_name:
        return first_name
    if last_name:
        return last_name
    if email:
        return email
    if legacy_user_name:
        return legacy_user_name
    if user_id:
        return user_id
    return None


def auth_profile_from_request_headers(
    headers: Mapping[str, Any] | None,
) -> dict[str, str | None]:
    """Warpgate / identity-proxy auth profile from inbound request headers."""
    user_id = sanitize_auth_user_id(_header_value(headers, "x-auth-user-id"))
    email = sanitize_email(_header_value(headers, "x-auth-email"))
    first_name = sanitize_person_name(_header_value(headers, "x-auth-first-name"))
    last_name = sanitize_person_name(_header_value(headers, "x-auth-last-name"))
    logout_url = sanitize_logout_url(_header_value(headers, "x-auth-logout-url"))
    avatar_configured = os.getenv("AGENTIC_WEB_AVATAR_HEADER", DEFAULT_AVATAR_HEADERS).strip()
    avatar_url: str | None = None
    for key in _header_keys(avatar_configured):
        avatar_url = normalize_avatar_url(_header_value(headers, key))
        if avatar_url:
            break
    legacy_user_name = user_name_from_request_headers(headers)
    user_name = resolve_auth_display_name(
        first_name=first_name,
        last_name=last_name,
        email=email,
        legacy_user_name=legacy_user_name,
        user_id=user_id,
    )
    return {
        "user_id": user_id,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "logout_url": logout_url,
        "avatar_url": avatar_url,
        "user_name": user_name,
    }


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
    #: True when identity came from a verified TLS client certificate.
    mtls: bool = False
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    logout_url: str | None = None
    avatar_url: str | None = None

    def to_json_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "userName": self.user_name,
            "sessionId": self.session_id,
            "userId": self.user_id,
            "local": self.local,
            "mtls": self.mtls,
        }
        if self.email:
            out["email"] = self.email
        if self.first_name:
            out["firstName"] = self.first_name
        if self.last_name:
            out["lastName"] = self.last_name
        if self.logout_url:
            out["logoutUrl"] = self.logout_url
        if self.avatar_url:
            out["avatarUrl"] = self.avatar_url
        return out


_URI_USER = re.compile(r"^agentic://user/(.+)$", re.IGNORECASE)


def user_name_from_peercert(peercert: Mapping[str, Any] | None) -> str | None:
    """
    Derive a display name from an OpenSSL ``getpeercert()`` dict.

    Preference: SAN URI ``agentic://user/<name>``, then DNS SAN, then subject CN.
    """
    if not peercert:
        return None
    # subjectAltName: (('DNS', 'alice'), ('URI', 'agentic://user/alice'), ...)
    san = peercert.get("subjectAltName") or ()
    uri_name: str | None = None
    dns_name: str | None = None
    for entry in san:
        if not isinstance(entry, (list, tuple)) or len(entry) < 2:
            continue
        kind = str(entry[0]).upper()
        value = str(entry[1]).strip()
        if not value:
            continue
        if kind == "URI":
            match = _URI_USER.match(value)
            if match:
                uri_name = sanitize_user_display_name(match.group(1))
                if uri_name:
                    return uri_name
        elif kind == "DNS" and dns_name is None:
            dns_name = sanitize_user_display_name(value)
    if dns_name:
        return dns_name
    # subject: ((('commonName', 'alice'),),)
    subject = peercert.get("subject") or ()
    for rdn in subject:
        if not isinstance(rdn, (list, tuple)):
            continue
        for attr in rdn:
            if not isinstance(attr, (list, tuple)) or len(attr) < 2:
                continue
            if str(attr[0]).lower() in ("commonname", "cn"):
                return sanitize_user_display_name(attr[1])
    return None


def resolve_identity(
    headers: Mapping[str, Any] | None = None,
    *,
    peercert: Mapping[str, Any] | None = None,
) -> Identity:
    """
    Resolve the caller from a verified client cert and/or forwarded headers.

    When ``peercert`` yields a user name, that identity wins (mTLS). Otherwise
    falls back to headers; no headers → implicit local user unless
    ``AGENTIC_REQUIRE_IDENTITY=1``.
    """
    cert_name = user_name_from_peercert(peercert)
    if cert_name:
        session_id = session_id_from_request_headers(headers) or generate_web_session_id()
        return Identity(
            user_name=cert_name,
            session_id=session_id,
            user_id=user_id_from_display_name(cert_name),
            local=False,
            mtls=True,
        )

    user_name = user_name_from_request_headers(headers)
    session_id = session_id_from_request_headers(headers)
    profile = auth_profile_from_request_headers(headers)
    if profile["user_name"]:
        user_name = profile["user_name"]
    resolved_user_id = profile["user_id"] or user_id_from_display_name(user_name)
    local = user_name is None and profile["user_id"] is None
    if local and require_identity_enabled():
        raise IdentityRequiredError(
            "AGENTIC_REQUIRE_IDENTITY=1 but no identity header was forwarded "
            "and no verified client certificate was presented. "
            "Configure mTLS or inject one of "
            f"{os.getenv('AGENTIC_WEB_USER_NAME_HEADER', DEFAULT_USER_NAME_HEADERS)!r}, "
            "or unset AGENTIC_REQUIRE_IDENTITY for local single-user mode."
        )
    return Identity(
        user_name=user_name,
        session_id=session_id or generate_web_session_id(),
        user_id=resolved_user_id,
        local=local,
        mtls=False,
        email=profile["email"],
        first_name=profile["first_name"],
        last_name=profile["last_name"],
        logout_url=profile["logout_url"],
        avatar_url=profile["avatar_url"],
    )
