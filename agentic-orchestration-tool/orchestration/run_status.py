"""
User-facing run status for Reach / engine WebSocket clients.

Emits structured ``type: "status"`` frames alongside legacy stderr ``chunk`` lines
so clients can stream friendly text and track phase / processing / errors.
"""

from __future__ import annotations

import re
from typing import Any

# Stable phase ids clients can switch on (forward-compatible: treat unknown as detail).
PHASE_STARTING = "starting"
PHASE_PLANNING = "planning"
PHASE_PLANNED = "planned"
PHASE_WARMING_AGENT = "warming_agent"
PHASE_STARTING_AGENT = "starting_agent"
PHASE_GENERATING = "generating"
PHASE_EXECUTING = "executing"
PHASE_STEP = "step"
PHASE_PREPARING_RESPONSE = "preparing_response"
PHASE_DONE = "done"
PHASE_ERROR = "error"
PHASE_BUSY = "busy"
PHASE_INFO = "info"

_FRIENDLY: dict[str, str] = {
    PHASE_STARTING: "Starting your request…",
    PHASE_PLANNING: "Planning the best approach…",
    PHASE_PLANNED: "Plan ready — starting work…",
    PHASE_WARMING_AGENT: "Warming up the agent…",
    PHASE_STARTING_AGENT: "Starting the agent…",
    PHASE_GENERATING: "Thinking and drafting a response…",
    PHASE_EXECUTING: "Working through the plan…",
    PHASE_STEP: "Working on the next step…",
    PHASE_PREPARING_RESPONSE: "Preparing the response…",
    PHASE_DONE: "Done.",
    PHASE_ERROR: "Something went wrong.",
    PHASE_BUSY: "Another request is already running — please wait.",
    PHASE_INFO: "Working…",
}

_AGENT_DISPLAY = re.compile(r"[_./-]+")


def friendly_agent_label(agent_id: str | None) -> str:
    raw = str(agent_id or "").strip()
    if not raw:
        return "the agent"
    # client.foo_bar → foo bar; gpt_research → gpt research
    bare = raw.split(".")[-1] if raw.startswith("client.") else raw
    return _AGENT_DISPLAY.sub(" ", bare).strip() or raw


def default_message_for_phase(phase: str, *, agent_provider_id: str | None = None) -> str:
    p = str(phase or "").strip() or PHASE_INFO
    if p == PHASE_WARMING_AGENT and agent_provider_id:
        return f"Warming up {friendly_agent_label(agent_provider_id)}…"
    if p == PHASE_STARTING_AGENT and agent_provider_id:
        return f"Starting {friendly_agent_label(agent_provider_id)}…"
    if p == PHASE_GENERATING and agent_provider_id:
        return f"Talking with {friendly_agent_label(agent_provider_id)}…"
    if p == PHASE_STEP and agent_provider_id:
        return f"Working with {friendly_agent_label(agent_provider_id)}…"
    return _FRIENDLY.get(p, _FRIENDLY[PHASE_INFO])


def build_status_event(
    *,
    phase: str,
    processing: bool,
    message: str | None = None,
    detail: str | None = None,
    agent_provider_id: str | None = None,
    step: int | None = None,
    step_count: int | None = None,
    code: str | None = None,
    question_id: str | None = None,
    run_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a WebSocket ``status`` payload (never includes secrets)."""
    pid = str(agent_provider_id or "").strip() or None
    msg = (message or "").strip() or default_message_for_phase(phase, agent_provider_id=pid)
    out: dict[str, Any] = {
        "type": "status",
        "processing": bool(processing),
        "phase": str(phase or PHASE_INFO),
        "message": msg,
    }
    if detail is not None and str(detail).strip():
        out["detail"] = str(detail).strip()
    if pid:
        out["agentProviderId"] = pid
    if step is not None:
        out["step"] = int(step)
    if step_count is not None:
        out["stepCount"] = int(step_count)
    if code:
        out["code"] = str(code)
    if question_id:
        out["question_id"] = str(question_id)
    if run_id:
        out["run_id"] = str(run_id)
    if extra:
        for k, v in extra.items():
            if v is None or k in out:
                continue
            out[k] = v
    return out


_ENSURE_RE = re.compile(r"^ensuring runtime for\s+(.+)$", re.I)
_STARTING_RE = re.compile(r"^starting\s+(.+)$", re.I)
_PLAN_RE = re.compile(r"^plan:\s*(.+)$", re.I)
_EXEC_RE = re.compile(r"^executing\s+(\d+)\s+step", re.I)
_STEP_RE = re.compile(
    r"^(?:starting task|running task|task)\s*[#:]?\s*(\d+)?\s*(?:/|\s+of\s+)?(\d+)?\s*:?\s*(.*)$",
    re.I,
)
_PROGRESS_PREFIX = re.compile(r"^\(progress\)\s*", re.I)
_ENGINE_PREFIX = re.compile(r"^\(engine\)\s*", re.I)


def map_progress_line(line: str) -> dict[str, Any] | None:
    """
    Map a legacy progress string into structured status fields.

    Returns keys: phase, message, detail?, agentProviderId?, step?, stepCount?
    or None when the line should stay stderr-only.
    """
    text = str(line or "").strip()
    if not text:
        return None
    text = _ENGINE_PREFIX.sub("", text).strip()
    text = _PROGRESS_PREFIX.sub("", text).strip()
    if not text:
        return None
    low = text.lower()

    if low in ("planning", "dynamic planning"):
        return {"phase": PHASE_PLANNING, "message": default_message_for_phase(PHASE_PLANNING)}
    if low == "generating":
        return {"phase": PHASE_GENERATING, "message": default_message_for_phase(PHASE_GENERATING)}

    m = _ENSURE_RE.match(text)
    if m:
        aid = m.group(1).strip()
        return {
            "phase": PHASE_WARMING_AGENT,
            "agentProviderId": aid,
            "message": default_message_for_phase(PHASE_WARMING_AGENT, agent_provider_id=aid),
            "detail": text,
        }
    m = _STARTING_RE.match(text)
    if m:
        aid = m.group(1).strip()
        # Avoid matching "starting task …"
        if aid.lower().startswith("task"):
            pass
        else:
            return {
                "phase": PHASE_STARTING_AGENT,
                "agentProviderId": aid,
                "message": default_message_for_phase(PHASE_STARTING_AGENT, agent_provider_id=aid),
                "detail": text,
            }

    m = _PLAN_RE.match(text)
    if m:
        summary = m.group(1).strip()
        return {
            "phase": PHASE_PLANNED,
            "message": f"Plan ready: {summary}" if summary else default_message_for_phase(PHASE_PLANNED),
            "detail": text,
        }

    m = _EXEC_RE.match(text)
    if m:
        n = int(m.group(1))
        return {
            "phase": PHASE_EXECUTING,
            "stepCount": n,
            "message": f"Working through {n} step{'s' if n != 1 else ''}…",
            "detail": text,
        }

    if low.startswith("runmode="):
        return {
            "phase": PHASE_INFO,
            "message": "Preparing your request…",
            "detail": text,
        }

    # Runner progress: "starting task …" / human labels
    if "previous step output" in low:
        return {
            "phase": PHASE_STEP,
            "message": "Using earlier results for the next step…",
            "detail": text,
        }
    if low.startswith("starting task") or low.startswith("running task") or low.startswith("task "):
        m = _STEP_RE.match(text)
        step = int(m.group(1)) if m and m.group(1) else None
        total = int(m.group(2)) if m and m.group(2) else None
        label = (m.group(3).strip() if m and m.group(3) else "") or text
        # Try to pull agent id from "with agent X" patterns
        agent = None
        am = re.search(r"\b(?:agent|provider)\s+[\"']?([a-z0-9_.-]+)", text, re.I)
        if am:
            agent = am.group(1)
        msg = label if len(label) < 160 else (label[:157] + "…")
        if not msg.lower().startswith("working"):
            msg = f"Working on: {msg}" if not msg.lower().startswith("starting") else msg
        return {
            "phase": PHASE_STEP,
            "message": msg[:200],
            "detail": text,
            "step": step,
            "stepCount": total,
            "agentProviderId": agent,
        }

    # Pull / download noise → warming
    if any(k in low for k in ("pulling", "downloading", "ollama", "warming")):
        return {
            "phase": PHASE_WARMING_AGENT,
            "message": "Warming up models and tools…",
            "detail": text,
        }

    # Generic fallback: still user-visible
    return {
        "phase": PHASE_INFO,
        "message": text if len(text) < 180 else (text[:177] + "…"),
        "detail": text if len(text) >= 180 else None,
    }


def error_code_for_exception(exc: BaseException) -> str:
    name = exc.__class__.__name__
    mapping = {
        "DirectAgentFormatError": "direct_agent_format",
        "DirectAgentEmptyAnswerError": "direct_agent_empty",
        "LookupError": "not_found",
        "ValueError": "invalid_request",
        "TimeoutError": "timeout",
        "CancelledError": "cancelled",
    }
    return mapping.get(name, "run_failed")


def friendly_error_message(exc: BaseException) -> str:
    raw = str(exc).strip() or exc.__class__.__name__
    # Keep technical detail available via detail; soften common cases.
    low = raw.lower()
    if "already in progress" in low or "too many concurrent" in low:
        return default_message_for_phase(PHASE_BUSY)
    if "empty" in low and "answer" in low:
        return "The agent finished without a usable answer."
    if "format" in low or "json" in low:
        return "The agent returned a response in an unexpected format."
    if len(raw) > 240:
        return raw[:237] + "…"
    return raw
