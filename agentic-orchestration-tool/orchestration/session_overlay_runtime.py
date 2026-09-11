"""
Ensure Ollama models for ephemeral session-overlay agents (HTTP API only).

Session overlays often omit ``ollama_host`` / set ``selfcontained: false``. On Jetson the
engine talks to host Ollama via ``OLLAMA_API_BASE`` — never spawn workflow/local ``ollama``
binaries inside the engine pod for these agents.
"""

from __future__ import annotations

import os
import re
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


def looks_like_openai_cloud_model(model: str) -> bool:
    """True for OpenAI-hosted model ids that Ollama can never serve."""
    raw = str(model or "").strip().lower()
    if not raw:
        return False
    bare = raw.removeprefix("openai/")
    return bool(re.match(r"^(gpt-|chatgpt-|o1\b|o3\b|o4\b)", bare))


def coerce_overlay_agent_type(entry: dict[str, Any]) -> dict[str, Any]:
    """Fix ``type: ollama`` entries whose ``model`` is an OpenAI cloud id.

    Reach clients ship agent YAML by hand; a mismatch here would otherwise make the
    engine try to ``ollama pull gpt-4o-mini`` forever.
    """
    data = dict(entry)
    ptype = str(data.get("type") or data.get("provider_type") or "").strip().lower()
    if ptype == "ollama" and looks_like_openai_cloud_model(data.get("model", "")):
        data["type"] = "openai"
        data.pop("ollama_host", None)
    return data


def rewrite_overlay_ollama_hosts(agents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Fill/normalize ``ollama_host`` on ollama agents so later runs hit the engine API base."""
    out: list[dict[str, Any]] = []
    for entry in agents:
        if not isinstance(entry, dict):
            continue
        data = coerce_overlay_agent_type(entry)
        ptype = str(data.get("type") or data.get("provider_type") or "").strip().lower()
        if ptype == "ollama":
            data["ollama_host"] = resolve_overlay_ollama_host(data)
        out.append(data)
    return out


def collect_overlay_ollama_models(agents: list[dict[str, Any]]) -> list[tuple[str, str]]:
    """Unique ``(model, host)`` pairs for ollama agents (order-preserving)."""
    return [(m, h) for m, h, _e in collect_overlay_ollama_entries(agents)]


def collect_overlay_ollama_entries(
    agents: list[dict[str, Any]],
) -> list[tuple[str, str, dict[str, Any]]]:
    """Unique ``(model, host, entry)`` triples for ollama agents (order-preserving)."""
    seen: set[tuple[str, str]] = set()
    pairs: list[tuple[str, str, dict[str, Any]]] = []
    for raw_entry in agents:
        if not isinstance(raw_entry, dict):
            continue
        entry = coerce_overlay_agent_type(raw_entry)
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
        pairs.append((model, host, entry))
    return pairs


def _parse_positive_float(raw: Any) -> float | None:
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    try:
        value = float(text)
    except (TypeError, ValueError):
        return None
    if value <= 0:
        return None
    return value


def _parse_boolish(raw: Any) -> bool | None:
    if raw is None:
        return None
    if isinstance(raw, bool):
        return raw
    text = str(raw).strip().lower()
    if not text:
        return None
    if text in ("1", "true", "yes", "on"):
        return True
    if text in ("0", "false", "no", "off"):
        return False
    return None


def overlay_prewarm_enabled(entry: dict[str, Any] | None = None) -> bool:
    """Whether to VRAM-warm an overlay Ollama agent before ``ready``.

    Agent YAML ``prewarm`` wins when parseable; else ``AGENTIC_OLLAMA_OVERLAY_PREWARM``
    (default off).
    """
    if isinstance(entry, dict):
        parsed = _parse_boolish(entry.get("prewarm"))
        if parsed is None and isinstance(entry.get("options"), dict):
            parsed = _parse_boolish(entry["options"].get("prewarm"))
        if parsed is not None:
            return parsed
    env = _parse_boolish(os.getenv("AGENTIC_OLLAMA_OVERLAY_PREWARM"))
    return bool(env)


def overlay_prewarm_timeout_sec(entry: dict[str, Any] | None = None) -> float:
    """Warmup wall timeout: YAML ``prewarm_timeout_sec`` → env → 300; clamp [30, 7200]."""
    raw: Any = None
    if isinstance(entry, dict):
        raw = entry.get("prewarm_timeout_sec")
        if raw is None and isinstance(entry.get("options"), dict):
            raw = entry["options"].get("prewarm_timeout_sec")
    value = _parse_positive_float(raw)
    if value is None:
        value = _parse_positive_float(os.getenv("AGENTIC_OLLAMA_PREWARM_TIMEOUT_SEC"))
    if value is None:
        value = 300.0
    return max(30.0, min(7200.0, float(value)))


def ensure_session_overlay_ollama_models(
    agents: list[dict[str, Any]],
    *,
    on_progress: Callable[[str], None] | None = None,
    cancel_event: threading.Event | None = None,
    connection_id: str | None = None,
    on_lifecycle: Callable[[str, dict[str, Any]], None] | None = None,
) -> None:
    """Pull missing models for overlay ollama agents against the resolved HTTP API base.

    Serializes pulls (one at a time). Does not install or spawn Ollama. Ignores the
    catalog ``selfcontained`` gate used by ``should_ensure_ollama``.

    Optional per-agent / env prewarm loads the model into VRAM before overlay ``ready``.

    ``on_lifecycle`` receives ``("pulling"|"loading"|"ready", {"model": ...})``.
    """
    if not session_overlay_ensure_ollama_enabled():
        return
    entries = collect_overlay_ollama_entries(agents)
    if not entries:
        return

    from agent_providers.ollama_provider import (
        OllamaPullCancelled,
        ensure_ollama_model_on_api,
        warmup_ollama_model_on_api,
    )

    log = on_progress or (lambda _m: None)
    with _pull_lock:
        for model, host, entry in entries:
            if cancel_event is not None and cancel_event.is_set():
                raise OllamaPullCancelled(model)
            ensure_ollama_model_on_api(
                model=model,
                host=host,
                on_progress=log,
                cancel_event=cancel_event,
                connection_id=connection_id,
                on_lifecycle=on_lifecycle,
            )
            if not overlay_prewarm_enabled(entry):
                continue
            try:
                warmup_ollama_model_on_api(
                    model=model,
                    host=host,
                    timeout_seconds=overlay_prewarm_timeout_sec(entry),
                    on_progress=log,
                    on_lifecycle=on_lifecycle,
                )
            except Exception as exc:  # noqa: BLE001
                # Soft-fail: disk ensure already succeeded; chat timeout covers cold path.
                log(f"ollama prewarm skipped for {model}: {exc}")


def ensure_client_agent_ollama_runtime(
    entry: dict[str, Any],
    *,
    on_progress: Callable[[str], None] | None = None,
    on_lifecycle: Callable[[str, dict[str, Any]], None] | None = None,
) -> None:
    """HTTP ensure for a single ``client.*`` ollama agent (first-use / direct_agent path)."""
    if not session_overlay_ensure_ollama_enabled():
        return
    pid = str(entry.get("id") or "").strip()
    if not pid.startswith("client."):
        return
    entry = coerce_overlay_agent_type(entry)
    ptype = str(entry.get("type") or entry.get("provider_type") or "").strip().lower()
    if ptype != "ollama":
        return
    model = str(entry.get("model") or "").removeprefix("ollama/").strip()
    if not model:
        return
    host = resolve_overlay_ollama_host(entry)
    from agent_providers.ollama_provider import ensure_ollama_model_on_api, warmup_ollama_model_on_api

    log = on_progress or (lambda _m: None)
    with _pull_lock:
        ensure_ollama_model_on_api(
            model=model,
            host=host,
            on_progress=on_progress,
            on_lifecycle=on_lifecycle,
        )
        if not overlay_prewarm_enabled(entry):
            return
        try:
            warmup_ollama_model_on_api(
                model=model,
                host=host,
                timeout_seconds=overlay_prewarm_timeout_sec(entry),
                on_progress=on_progress,
                on_lifecycle=on_lifecycle,
            )
        except Exception as exc:  # noqa: BLE001
            log(f"ollama prewarm skipped for {model}: {exc}")
