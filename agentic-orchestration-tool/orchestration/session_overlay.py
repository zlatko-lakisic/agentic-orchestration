"""
Ephemeral per-session agent / MCP / skill overlays for ``python -m orchestration.serve``.

Clients register dicts over WebSocket (``session_overlay_register``); ids must use the
``client.*`` namespace and never collide with disk / ``AGENTIC_EXTRA_*`` catalogs.
Overlays live in process memory only — never written under ``config/``.
"""

from __future__ import annotations

import copy
import os
import re
import threading
import time
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any, Iterator

CLIENT_ID_RE = re.compile(r"^client\.[a-z0-9][a-z0-9_.]*$")
#: Stable product identity required on every Reach ``session_overlay_register``.
APP_ID_RE = re.compile(r"^[a-z][a-z0-9_-]{1,63}$")
TUNNEL_URL_PREFIX = "tunnel://session-mcp/"

_DEFAULT_TTL_S = 3600
_DEFAULT_MAX_BYTES = 512 * 1024
_DEFAULT_MAX_ENTRIES = 64

_OVERLAY_KEY: ContextVar[tuple[str, str] | None] = ContextVar(
    "agentic_session_overlay_key", default=None
)
_CONNECTION_ID: ContextVar[str | None] = ContextVar(
    "agentic_session_overlay_connection_id", default=None
)

_lock = threading.RLock()
_overlays: dict[tuple[str, str], "SessionOverlay"] = {}


def _truthy(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in ("1", "true", "yes", "on")


def session_overlay_enabled() -> bool:
    return _truthy("AGENTIC_SERVE_SESSION_OVERLAY")


def mcp_tunnel_enabled() -> bool:
    return _truthy("AGENTIC_SERVE_MCP_TUNNEL")


def overlay_ttl_default_s() -> int:
    raw = os.getenv("AGENTIC_SERVE_SESSION_OVERLAY_TTL_S", "").strip()
    try:
        value = int(raw) if raw else _DEFAULT_TTL_S
    except ValueError:
        value = _DEFAULT_TTL_S
    return max(30, min(86_400, value))


def overlay_max_bytes() -> int:
    raw = os.getenv("AGENTIC_SERVE_SESSION_OVERLAY_MAX_BYTES", "").strip()
    try:
        value = int(raw) if raw else _DEFAULT_MAX_BYTES
    except ValueError:
        value = _DEFAULT_MAX_BYTES
    return max(1024, min(8 * 1024 * 1024, value))


def overlay_max_entries() -> int:
    raw = os.getenv("AGENTIC_SERVE_SESSION_OVERLAY_MAX_ENTRIES", "").strip()
    try:
        value = int(raw) if raw else _DEFAULT_MAX_ENTRIES
    except ValueError:
        value = _DEFAULT_MAX_ENTRIES
    return max(1, min(256, value))


@dataclass
class SessionOverlay:
    user_id: str
    session_id: str
    connection_id: str
    app_id: str
    agents: list[dict[str, Any]] = field(default_factory=list)
    mcps: list[dict[str, Any]] = field(default_factory=list)
    skills: list[dict[str, Any]] = field(default_factory=list)
    expires_at: float = 0.0
    byte_size: int = 0

    @property
    def key(self) -> tuple[str, str]:
        return (self.user_id, self.session_id)

    def is_expired(self, *, now: float | None = None) -> bool:
        return (now if now is not None else time.time()) >= self.expires_at


class SessionOverlayError(ValueError):
    """Invalid overlay payload or disabled feature."""


class SessionOverlayDeniedError(SessionOverlayError):
    """Reach registration denied (missing/invalid appId, etc.)."""

    def __init__(self, message: str, *, error: str) -> None:
        super().__init__(message)
        self.error = str(error or "denied")


def normalize_app_id(raw: Any) -> str:
    """Require a stable product appId (e.g. ``knowbuddy``, ``comstar``)."""
    app_id = str(raw or "").strip().lower()
    if not app_id:
        raise SessionOverlayDeniedError(
            "Reach registration denied: appId is required "
            "(product apps must advertise a stable appId such as 'knowbuddy' or 'comstar')",
            error="app_id_required",
        )
    if not APP_ID_RE.match(app_id):
        raise SessionOverlayDeniedError(
            f"Reach registration denied: appId {app_id!r} is invalid "
            f"(must match {APP_ID_RE.pattern})",
            error="app_id_invalid",
        )
    return app_id


def overlay_key(user_id: str, session_id: str) -> tuple[str, str]:
    return (str(user_id or "").strip(), str(session_id or "").strip())


@contextmanager
def overlay_run_context(
    *,
    user_id: str,
    session_id: str,
    connection_id: str | None = None,
) -> Iterator[None]:
    """Bind identity (+ optional owning WS) for catalog merge / tunnel rewrite."""
    key = overlay_key(user_id, session_id)
    token_key = _OVERLAY_KEY.set(key if key[0] and key[1] else None)
    token_conn = _CONNECTION_ID.set(str(connection_id).strip() or None)
    try:
        yield
    finally:
        _OVERLAY_KEY.reset(token_key)
        _CONNECTION_ID.reset(token_conn)


def current_overlay_key() -> tuple[str, str] | None:
    return _OVERLAY_KEY.get()


def current_connection_id() -> str | None:
    return _CONNECTION_ID.get()


def _estimate_bytes(agents: list, mcps: list, skills: list) -> int:
    import json

    try:
        return len(
            json.dumps(
                {"agents": agents, "mcps": mcps, "skills": skills},
                ensure_ascii=False,
                default=str,
            ).encode("utf-8")
        )
    except (TypeError, ValueError):
        return overlay_max_bytes() + 1


def _require_client_id(entry_id: str, *, kind: str, index: int) -> str:
    pid = str(entry_id or "").strip()
    if not CLIENT_ID_RE.match(pid):
        raise SessionOverlayError(
            f"{kind}[{index}] id {pid!r} must match {CLIENT_ID_RE.pattern} "
            "(session overlays use the client.* namespace only)"
        )
    return pid


def _validate_mcp_entry(entry: dict[str, Any], *, index: int) -> dict[str, Any]:
    pid = _require_client_id(str(entry.get("id", "")), kind="mcps", index=index)
    if entry.get("stdio") is not None:
        raise SessionOverlayError(
            f"mcps[{index}] ({pid}): client MCP must use streamable_http + tunnel:// "
            "(stdio is not allowed in session overlays)"
        )
    sh = entry.get("streamable_http")
    if not isinstance(sh, dict) or not sh:
        raise SessionOverlayError(
            f"mcps[{index}] ({pid}): streamable_http block is required"
        )
    url = str(sh.get("url", "")).strip()
    if not url.startswith(TUNNEL_URL_PREFIX):
        raise SessionOverlayError(
            f"mcps[{index}] ({pid}): streamable_http.url must start with "
            f"{TUNNEL_URL_PREFIX!r} (got {url!r})"
        )
    alias = url[len(TUNNEL_URL_PREFIX) :].strip().strip("/")
    if not alias or "/" in alias or not re.match(r"^[a-z0-9][a-z0-9_.-]*$", alias):
        raise SessionOverlayError(
            f"mcps[{index}] ({pid}): invalid tunnel alias in url {url!r}"
        )
    out = copy.deepcopy(entry)
    out["id"] = pid
    return out


def _validate_agent_entry(entry: dict[str, Any], *, index: int) -> dict[str, Any]:
    if not isinstance(entry, dict):
        raise SessionOverlayError(f"agents[{index}] must be a mapping")
    pid = _require_client_id(str(entry.get("id", "")), kind="agents", index=index)
    out = copy.deepcopy(entry)
    out["id"] = pid
    return out


def _validate_skill_entry(entry: dict[str, Any], *, index: int) -> dict[str, Any]:
    if not isinstance(entry, dict):
        raise SessionOverlayError(f"skills[{index}] must be a mapping")
    pid = _require_client_id(str(entry.get("id", "")), kind="skills", index=index)
    out = copy.deepcopy(entry)
    out["id"] = pid
    return out


def _stock_ids(*, catalog_root: Any | None) -> set[str]:
    """Ids already present in disk + AGENTIC_EXTRA_* catalogs (no session overlays)."""
    ids: set[str] = set()
    if catalog_root is None:
        return ids
    try:
        from pathlib import Path

        from orchestration.dynamic_run import catalog_paths

        root = Path(catalog_root)
        paths = catalog_paths(root)
        from orchestration.agent_providers_catalog import load_agent_providers_catalog_merged
        from orchestration.mcp_providers_catalog import load_mcp_providers_catalog_merged

        # Clear overlay context so merge hooks do not recurse into session store.
        with overlay_run_context(user_id="", session_id=""):
            for e in load_agent_providers_catalog_merged(paths.agent_providers):
                pid = str(e.get("id", "")).strip()
                if pid:
                    ids.add(pid)
            for e in load_mcp_providers_catalog_merged(paths.mcp_providers):
                pid = str(e.get("id", "")).strip()
                if pid:
                    ids.add(pid)
            try:
                from orchestration.agent_skills_catalog import load_agent_skills_catalog_merged

                for e in load_agent_skills_catalog_merged(paths.agent_skills):
                    pid = str(e.get("id", "")).strip()
                    if pid:
                        ids.add(pid)
            except Exception:  # noqa: BLE001
                pass
    except Exception:  # noqa: BLE001
        pass
    return ids


def register_overlay(
    *,
    user_id: str,
    session_id: str,
    connection_id: str,
    app_id: str,
    agents: list[Any] | None = None,
    mcps: list[Any] | None = None,
    skills: list[Any] | None = None,
    ttl_seconds: float | None = None,
    catalog_root: Any | None = None,
    stock_ids: set[str] | None = None,
) -> SessionOverlay:
    """Replace (not merge-patch) the overlay for ``(user_id, session_id)``."""
    if not session_overlay_enabled():
        raise SessionOverlayError(
            "session overlays are disabled (set AGENTIC_SERVE_SESSION_OVERLAY=1)"
        )
    uid = str(user_id or "").strip()
    sid = str(session_id or "").strip()
    cid = str(connection_id or "").strip()
    aid = normalize_app_id(app_id)
    if not uid or not sid:
        raise SessionOverlayError("user_id and session_id are required to register an overlay")
    if not cid:
        raise SessionOverlayError("connection_id is required to register an overlay")

    raw_agents = list(agents or [])
    raw_mcps = list(mcps or [])
    raw_skills = list(skills or [])
    total = len(raw_agents) + len(raw_mcps) + len(raw_skills)
    if total > overlay_max_entries():
        raise SessionOverlayError(
            f"overlay has {total} entries; max is {overlay_max_entries()} "
            "(AGENTIC_SERVE_SESSION_OVERLAY_MAX_ENTRIES)"
        )

    byte_size = _estimate_bytes(raw_agents, raw_mcps, raw_skills)
    if byte_size > overlay_max_bytes():
        raise SessionOverlayError(
            f"overlay payload is {byte_size} bytes; max is {overlay_max_bytes()} "
            "(AGENTIC_SERVE_SESSION_OVERLAY_MAX_BYTES)"
        )

    validated_agents: list[dict[str, Any]] = []
    for i, a in enumerate(raw_agents):
        if not isinstance(a, dict):
            raise SessionOverlayError(f"agents[{i}] must be a mapping")
        validated_agents.append(_validate_agent_entry(a, index=i))
    from orchestration.session_overlay_runtime import rewrite_overlay_ollama_hosts

    validated_agents = rewrite_overlay_ollama_hosts(validated_agents)

    validated_mcps: list[dict[str, Any]] = []
    for i, m in enumerate(raw_mcps):
        if not isinstance(m, dict):
            raise SessionOverlayError(f"mcps[{i}] must be a mapping")
        if not mcp_tunnel_enabled() and m.get("streamable_http"):
            raise SessionOverlayError(
                "MCP tunnel is disabled (set AGENTIC_SERVE_MCP_TUNNEL=1) "
                "before registering session MCP entries"
            )
        validated_mcps.append(_validate_mcp_entry(m, index=i))

    validated_skills: list[dict[str, Any]] = []
    for i, s in enumerate(raw_skills):
        if not isinstance(s, dict):
            raise SessionOverlayError(f"skills[{i}] must be a mapping")
        validated_skills.append(_validate_skill_entry(s, index=i))

    seen: set[str] = set()
    for kind, entries in (
        ("agents", validated_agents),
        ("mcps", validated_mcps),
        ("skills", validated_skills),
    ):
        for e in entries:
            pid = str(e["id"])
            if pid in seen:
                raise SessionOverlayError(f"duplicate id {pid!r} in overlay payload ({kind})")
            seen.add(pid)

    known = stock_ids if stock_ids is not None else _stock_ids(catalog_root=catalog_root)
    collisions = sorted(seen & known)
    if collisions:
        raise SessionOverlayError(
            f"overlay id(s) collide with disk/AGENTIC_EXTRA catalogs: {collisions}"
        )

    ttl = overlay_ttl_default_s() if ttl_seconds is None else float(ttl_seconds)
    ttl = max(30.0, min(86_400.0, ttl))
    now = time.time()
    overlay = SessionOverlay(
        user_id=uid,
        session_id=sid,
        connection_id=cid,
        app_id=aid,
        agents=validated_agents,
        mcps=validated_mcps,
        skills=validated_skills,
        expires_at=now + ttl,
        byte_size=byte_size,
    )
    with _lock:
        sweep_expired_locked(now=now)
        _overlays[overlay.key] = overlay
    return overlay


def clear_overlay(*, user_id: str, session_id: str, connection_id: str | None = None) -> bool:
    """Remove overlay for key. If ``connection_id`` is set, only clear when it owns the entry."""
    key = overlay_key(user_id, session_id)
    with _lock:
        existing = _overlays.get(key)
        if existing is None:
            return False
        if connection_id is not None and existing.connection_id != connection_id:
            return False
        del _overlays[key]
        return True


def clear_overlay_for_connection(connection_id: str) -> list[tuple[str, str]]:
    """Evict every overlay owned by this WebSocket connection."""
    cid = str(connection_id or "").strip()
    if not cid:
        return []
    cleared: list[tuple[str, str]] = []
    with _lock:
        for key, overlay in list(_overlays.items()):
            if overlay.connection_id == cid:
                del _overlays[key]
                cleared.append(key)
    return cleared


def get_overlay(
    user_id: str,
    session_id: str,
    *,
    now: float | None = None,
) -> SessionOverlay | None:
    key = overlay_key(user_id, session_id)
    ts = now if now is not None else time.time()
    with _lock:
        sweep_expired_locked(now=ts)
        overlay = _overlays.get(key)
        if overlay is None:
            return None
        if overlay.is_expired(now=ts):
            del _overlays[key]
            return None
        return overlay


def get_current_overlay(*, now: float | None = None) -> SessionOverlay | None:
    key = current_overlay_key()
    if key is None:
        return None
    return get_overlay(key[0], key[1], now=now)


def sweep_expired_locked(*, now: float | None = None) -> int:
    ts = now if now is not None else time.time()
    dead = [k for k, o in _overlays.items() if o.is_expired(now=ts)]
    for k in dead:
        del _overlays[k]
    return len(dead)


def sweep_expired() -> int:
    with _lock:
        return sweep_expired_locked()


def reset_overlays_for_tests() -> None:
    """Clear all overlays (unit tests only)."""
    with _lock:
        _overlays.clear()


def merge_session_agents(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not session_overlay_enabled():
        return entries
    overlay = get_current_overlay()
    if overlay is None or not overlay.agents:
        return entries
    return list(entries) + [copy.deepcopy(e) for e in overlay.agents]


def merge_session_mcps(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not session_overlay_enabled():
        return entries
    overlay = get_current_overlay()
    if overlay is None or not overlay.mcps:
        return entries
    return list(entries) + [copy.deepcopy(e) for e in overlay.mcps]


def merge_session_skills(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not session_overlay_enabled():
        return entries
    overlay = get_current_overlay()
    if overlay is None or not overlay.skills:
        return entries
    return list(entries) + [copy.deepcopy(e) for e in overlay.skills]


def tunnel_alias_from_url(url: str) -> str | None:
    text = str(url or "").strip()
    if not text.startswith(TUNNEL_URL_PREFIX):
        return None
    alias = text[len(TUNNEL_URL_PREFIX) :].strip().strip("/")
    return alias or None


def overlays_for_connection(connection_id: str) -> list[SessionOverlay]:
    """Snapshot overlays owned by a WebSocket connection id."""
    cid = str(connection_id or "").strip()
    if not cid:
        return []
    with _lock:
        return [o for o in _overlays.values() if o.connection_id == cid]


def list_active_overlays(*, now: float | None = None) -> list[dict[str, Any]]:
    """Admin/read snapshot of live Reach session overlays (no catalog bodies)."""
    ts = now if now is not None else time.time()
    out: list[dict[str, Any]] = []
    with _lock:
        sweep_expired_locked(now=ts)
        for overlay in _overlays.values():
            if overlay.is_expired(now=ts):
                continue
            tunnel_mcps = 0
            for mcp in overlay.mcps:
                url = ""
                http = mcp.get("streamable_http") if isinstance(mcp, dict) else None
                if isinstance(http, dict):
                    url = str(http.get("url") or "")
                elif isinstance(mcp, dict):
                    url = str(mcp.get("url") or "")
                if url.startswith(TUNNEL_URL_PREFIX):
                    tunnel_mcps += 1
            out.append(
                {
                    "appId": overlay.app_id,
                    "userId": overlay.user_id,
                    "sessionId": overlay.session_id,
                    "connectionId": overlay.connection_id,
                    "agentCount": len(overlay.agents),
                    "mcpCount": len(overlay.mcps),
                    "skillCount": len(overlay.skills),
                    "tunnelMcpCount": tunnel_mcps,
                    "expiresAt": overlay.expires_at,
                    "byteSize": overlay.byte_size,
                }
            )
    out.sort(key=lambda row: (row["appId"], row["userId"], row["sessionId"]))
    return out
