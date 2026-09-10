"""Per-overlay-agent lifecycle states for Reach clients.

States are sticky per ``agentProviderId`` on a WebSocket connection. ``pulling``
is first-class (not a reason under ``starting``) and is only used for local
Ollama ensure/pull.
"""

from __future__ import annotations

from typing import Any

AGENT_STATE_DOWN = "down"
AGENT_STATE_STARTING = "starting"
AGENT_STATE_PULLING = "pulling"
AGENT_STATE_READY = "ready"
AGENT_STATE_BUSY = "busy"
AGENT_STATE_STOPPING = "stopping"

AGENT_STATES = frozenset(
    {
        AGENT_STATE_DOWN,
        AGENT_STATE_STARTING,
        AGENT_STATE_PULLING,
        AGENT_STATE_READY,
        AGENT_STATE_BUSY,
        AGENT_STATE_STOPPING,
    }
)


def agent_state_frame(
    agent_provider_id: str,
    state: str,
    *,
    reason: str | None = None,
    detail: str | None = None,
    model: str | None = None,
    progress: float | None = None,
    question_id: str | None = None,
) -> dict[str, Any]:
    """Build a ``type: agent_state`` WebSocket payload."""
    pid = str(agent_provider_id or "").strip()
    st = str(state or "").strip()
    if st not in AGENT_STATES:
        raise ValueError(f"invalid agent state: {state!r}")
    if not pid:
        raise ValueError("agentProviderId is required")
    payload: dict[str, Any] = {
        "type": "agent_state",
        "agentProviderId": pid,
        "state": st,
    }
    if reason:
        payload["reason"] = str(reason)
    if detail:
        payload["detail"] = str(detail)
    if model:
        payload["model"] = str(model)
    if progress is not None:
        try:
            payload["progress"] = max(0.0, min(1.0, float(progress)))
        except (TypeError, ValueError):
            pass
    if question_id:
        payload["questionId"] = str(question_id)
        payload["question_id"] = str(question_id)
    return payload


def overlay_agent_ids(agents: list[dict[str, Any]] | None) -> list[str]:
    out: list[str] = []
    for entry in agents or []:
        if not isinstance(entry, dict):
            continue
        pid = str(entry.get("id") or "").strip()
        if pid:
            out.append(pid)
    return out


def ollama_agent_ids_for_model(
    agents: list[dict[str, Any]] | None,
    model: str,
) -> list[str]:
    """Return overlay agent ids whose Ollama model matches ``model``."""
    wanted = str(model or "").removeprefix("ollama/").strip().casefold()
    if not wanted:
        return []
    out: list[str] = []
    for entry in agents or []:
        if not isinstance(entry, dict):
            continue
        ptype = str(entry.get("type") or entry.get("provider_type") or "").strip().lower()
        if ptype != "ollama":
            continue
        mid = str(entry.get("model") or "").removeprefix("ollama/").strip().casefold()
        if mid != wanted:
            continue
        pid = str(entry.get("id") or "").strip()
        if pid:
            out.append(pid)
    return out


def parse_pull_progress(line: str) -> float | None:
    """Best-effort 0–1 progress from an Ollama pull log line."""
    text = str(line or "")
    if "%" not in text:
        return None
    import re

    m = re.search(r"(\d{1,3}(?:\.\d+)?)\s*%", text)
    if not m:
        return None
    try:
        pct = float(m.group(1))
    except ValueError:
        return None
    return max(0.0, min(1.0, pct / 100.0))


def looks_like_ollama_pull_line(line: str) -> bool:
    lower = str(line or "").casefold()
    return "pulling" in lower or "pull via" in lower or "downloading" in lower
