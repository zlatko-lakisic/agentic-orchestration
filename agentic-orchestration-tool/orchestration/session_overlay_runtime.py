"""
Ensure Ollama models for ephemeral session-overlay agents (HTTP API only).

Session overlays often omit ``ollama_host`` / set ``selfcontained: false``. On Jetson the
engine talks to host Ollama via ``OLLAMA_API_BASE`` — never spawn workflow/local ``ollama``
binaries inside the engine pod for these agents.
"""

from __future__ import annotations

import os
import threading
from typing import Any, Callable

_WORKFLOW_HOST_TOKEN = "workflow"
_pull_lock = threading.Lock()


def session_overlay_ensure_ollama_enabled() -> bool:
    """Master switch for overlay model ensure (default on when overlays are enabled)."""
    raw = os.getenv("AGENTIC_SERVE_SESSION_OVERLAY_ENSURE_OLLAMA", "").strip().lower()
    if raw in ("0", "false", "no", "off"):
        return False
    if raw in ("1", "true", "yes", "on"):
        return True
    # Default: follow session-overlay flag (only meaningful when overlays are on).
    from orchestration.session_overlay import session_overlay_enabled

    return session_overlay_enabled()


def resolve_overlay_ollama_host(entry: dict[str, Any] | None = None) -> str:
    """Resolve API base for a session-overlay ollama agent.

    Prefers an explicit non-``workflow`` ``ollama_host`` on the entry; otherwise
    ``OLLAMA_API_BASE`` → ``OLLAMA_HOST`` → loopback (via ``litellm_api_base_for_ollama``).
    """
    from agent_providers.ollama_provider import litellm_api_base_for_ollama, normalize_ollama_host

    raw = ""
    if isinstance(entry, dict):
        raw = str(entry.get("ollama_host") or "").strip()
    if raw and raw.casefold() != _WORKFLOW_HOST_TOKEN:
        return normalize_ollama_host(raw)
    return litellm_api_base_for_ollama()


def rewrite_overlay_ollama_hosts(agents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Fill/normalize ``ollama_host`` on ollama agents so later runs hit the engine API base."""
    out: list[dict[str, Any]] = []
    for entry in agents:
        if not isinstance(entry, dict):
            continue
        data = dict(entry)
        ptype = str(data.get("type") or data.get("provider_type") or "").strip().lower()
        if ptype == "ollama":
            data["ollama_host"] = resolve_overlay_ollama_host(data)
        out.append(data)
    return out


def collect_overlay_ollama_models(agents: list[dict[str, Any]]) -> list[tuple[str, str]]:
    """Unique ``(model, host)`` pairs for ollama agents (order-preserving)."""
    seen: set[tuple[str, str]] = set()
    pairs: list[tuple[str, str]] = []
    for entry in agents:
        if not isinstance(entry, dict):
            continue
        ptype = str(entry.get("type") or entry.get("provider_type") or "").strip().lower()
        if ptype != "ollama":
            continue
        model = str(entry.get("model") or "").removeprefix("ollama/").strip()
        if not model:
            continue
        host = resolve_overlay_ollama_host(entry)
        key = (model, host)
        if key in seen:
            continue
        seen.add(key)
        pairs.append(key)
    return pairs


def ensure_session_overlay_ollama_models(
    agents: list[dict[str, Any]],
    *,
    on_progress: Callable[[str], None] | None = None,
) -> None:
    """Pull missing models for overlay ollama agents against the resolved HTTP API base.

    Serializes pulls (one at a time). Does not install or spawn Ollama. Ignores the
    kubernetes ``selfcontained`` gate used by ``should_ensure_ollama``.
    """
    if not session_overlay_ensure_ollama_enabled():
        return
    pairs = collect_overlay_ollama_models(agents)
    if not pairs:
        return

    from agent_providers.ollama_provider import ensure_ollama_model_on_api

    log = on_progress or (lambda _m: None)
    with _pull_lock:
        for model, host in pairs:
            ensure_ollama_model_on_api(model=model, host=host, on_progress=log)


def ensure_client_agent_ollama_runtime(
    entry: dict[str, Any],
    *,
    on_progress: Callable[[str], None] | None = None,
) -> None:
    """HTTP ensure for a single ``client.*`` ollama agent (first-use / direct_agent path)."""
    if not session_overlay_ensure_ollama_enabled():
        return
    pid = str(entry.get("id") or "").strip()
    if not pid.startswith("client."):
        return
    ptype = str(entry.get("type") or entry.get("provider_type") or "").strip().lower()
    if ptype != "ollama":
        return
    model = str(entry.get("model") or "").removeprefix("ollama/").strip()
    if not model:
        return
    host = resolve_overlay_ollama_host(entry)
    from agent_providers.ollama_provider import ensure_ollama_model_on_api

    with _pull_lock:
        ensure_ollama_model_on_api(model=model, host=host, on_progress=on_progress)
