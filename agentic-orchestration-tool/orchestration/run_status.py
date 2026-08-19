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
PHASE_PREPARING = "preparing"
PHASE_PLANNING = "planning"
PHASE_PLANNED = "planned"
PHASE_WARMING_AGENT = "warming_agent"
PHASE_STARTING_AGENT = "starting_agent"
PHASE_GENERATING = "generating"
PHASE_EXECUTING = "executing"
PHASE_STEP = "step"
PHASE_TOOL = "tool"
PHASE_PREPARING_RESPONSE = "preparing_response"
PHASE_DONE = "done"
PHASE_ERROR = "error"
PHASE_BUSY = "busy"
PHASE_INFO = "info"

_FRIENDLY: dict[str, str] = {
    PHASE_STARTING: "Starting your request…",
    PHASE_PREPARING: "Preparing session overlay…",
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
_OLLAMA_PULL_START = re.compile(r"^ollama pull:\s+starting\s+(\S+)", re.I)
_OLLAMA_PULL_DONE = re.compile(r"^ollama pull:\s+complete\s+(\S+)", re.I)
_OLLAMA_PULL_FAIL = re.compile(r"^ollama pull:\s+failed", re.I)
_OLLAMA_MODEL_READY = re.compile(r"^ollama model ready:\s+(\S+)", re.I)
_OLLAMA_MODEL_MISSING = re.compile(r"^ollama model missing:\s+([^;]+)", re.I)
_PERCENT_RE = re.compile(r"(\d+)\s*%")
_MCP_HANDSHAKE_FAIL = re.compile(
    r"stdio MCP\s+(\S+)\s+failed handshake",
    re.I,
)
_MCP_HANDSHAKE = re.compile(r"stdio MCP handshake:\s+(\S+)", re.I)
_LLM_CONSULTING_RE = re.compile(r"^\(llm\)\s+consulting\s+(.+)$", re.I)
_LLM_CONTINUING_RE = re.compile(r"^\(llm\)\s+continuing\s+(.+)$", re.I)
_TOOL_PROGRESS_RE = re.compile(r"^\(tool\)\s+([^:]+):\s*(.*)$", re.I)
_AGENT_THOUGHT_RE = re.compile(r"^\(agent\)\s+Thought:\s*(.+)", re.I | re.S)
_AGENT_ACTION_RE = re.compile(r"^\(agent\)\s+Action:\s*(.+)", re.I | re.S)
_JUNK_PROGRESS_MARKERS = (
    "model input (",
    "<important_rules>",
    "current task: <system>",
)


def _is_junk_progress_line(text: str) -> bool:
    low = str(text or "").strip().lower()
    if not low:
        return True
    return any(marker in low for marker in _JUNK_PROGRESS_MARKERS)


def is_filtered_progress_line(line: str) -> bool:
    """True when a progress line must not reach user-facing status or thought streams."""
    return _is_junk_progress_line(line)


def map_progress_line(line: str) -> dict[str, Any] | None:
    """
    Map a legacy progress string into structured status fields.

    Returns keys: phase, message, detail?, agentProviderId?, step?, stepCount?,
    percent?, model?
    or None when the line should stay stderr-only.
    """
    text = str(line or "").strip()
    if not text:
        return None
    text = _ENGINE_PREFIX.sub("", text).strip()
    text = _PROGRESS_PREFIX.sub("", text).strip()
    if not text:
        return None
    if _is_junk_progress_line(text):
        return None
    low = text.lower()

    llm_consult = _LLM_CONSULTING_RE.match(text)
    if llm_consult:
        model = llm_consult.group(1).strip()
        return {
            "phase": PHASE_GENERATING,
            "message": f"Consulting {model}…",
            "model": model,
            "detail": text,
        }
    llm_cont = _LLM_CONTINUING_RE.match(text)
    if llm_cont:
        model = llm_cont.group(1).strip()
        return {
            "phase": PHASE_GENERATING,
            "message": f"Still working with {model}…",
            "model": model,
            "detail": text,
        }

    tool_m = _TOOL_PROGRESS_RE.match(text)
    if tool_m:
        tool_name = tool_m.group(1).strip()
        tool_arg = tool_m.group(2).strip()
        name_l = tool_name.lower()
        if "run_terminal" in name_l or name_l in ("terminal", "run_terminal_command"):
            cmd = tool_arg or tool_name
            msg = f"Running: {cmd}" if cmd else f"Running {tool_name}…"
        elif "read_file" in name_l or name_l == "read":
            path = tool_arg or "file"
            msg = f"Reading: {path}"
        elif any(x in name_l for x in ("write_file", "edit_file", "write", "edit")):
            path = tool_arg or "file"
            msg = f"Updating: {path}"
        else:
            msg = f"Using {tool_name}…"
        if len(msg) > 200:
            msg = msg[:197] + "…"
        return {
            "phase": PHASE_TOOL,
            "message": msg,
            "detail": text,
        }

    thought_m = _AGENT_THOUGHT_RE.match(text)
    if thought_m:
        snippet = thought_m.group(1).strip()
        if len(snippet) > 300:
            snippet = snippet[:297] + "…"
        return {
            "phase": PHASE_STEP,
            "message": f"Thought: {snippet}",
            "detail": text,
        }
    action_m = _AGENT_ACTION_RE.match(text)
    if action_m:
        snippet = action_m.group(1).strip()
        if len(snippet) > 300:
            snippet = snippet[:297] + "…"
        return {
            "phase": PHASE_STEP,
            "message": f"Action: {snippet}",
            "detail": text,
        }

    if low in ("planning", "dynamic planning"):
        return {"phase": PHASE_PLANNING, "message": default_message_for_phase(PHASE_PLANNING)}
    if low == "generating":
        return {"phase": PHASE_GENERATING, "message": default_message_for_phase(PHASE_GENERATING)}

    pull_start = _OLLAMA_PULL_START.match(text)
    if pull_start:
        model = pull_start.group(1).strip()
        return {
            "phase": PHASE_PREPARING,
            "message": f"Downloading {model}…",
            "model": model,
            "detail": text,
        }
    pull_done = _OLLAMA_PULL_DONE.match(text)
    if pull_done:
        model = pull_done.group(1).strip()
        return {
            "phase": PHASE_WARMING_AGENT,
            "message": f"Downloaded {model}.",
            "model": model,
            "percent": 100,
            "detail": text,
        }
    if _OLLAMA_PULL_FAIL.match(text):
        return {
            "phase": PHASE_ERROR,
            "message": "Model download failed.",
            "detail": text,
        }
    missing = _OLLAMA_MODEL_MISSING.match(text)
    if missing:
        model = missing.group(1).strip()
        return {
            "phase": PHASE_PREPARING,
            "message": f"Downloading {model}…",
            "model": model,
            "detail": text,
        }
    ready = _OLLAMA_MODEL_READY.match(text)
    if ready:
        model = ready.group(1).strip()
        return {
            "phase": PHASE_WARMING_AGENT,
            "message": f"{model} is ready.",
            "model": model,
            "detail": text,
        }
    if "ollama pull:" in low or ("pulling" in low and _PERCENT_RE.search(text)):
        pct_m = _PERCENT_RE.search(text)
        percent = int(pct_m.group(1)) if pct_m else None
        model = ""
        try:
            from orchestration.background_activity import snapshot as _activity_snapshot

            model = str(_activity_snapshot().get("model") or "").strip()
        except Exception:  # noqa: BLE001
            model = ""
        if model and percent is not None:
            msg = f"Downloading {model} — {percent}%"
        elif model:
            msg = f"Downloading {model}…"
        elif percent is not None:
            msg = f"Downloading model — {percent}%"
        else:
            msg = "Downloading model…"
        out: dict[str, Any] = {
            "phase": PHASE_PREPARING,
            "message": msg,
            "detail": text,
        }
        if percent is not None:
            out["percent"] = percent
        if model:
            out["model"] = model
        return out

    mcp_fail = _MCP_HANDSHAKE_FAIL.search(text)
    if mcp_fail:
        label = mcp_fail.group(1).strip()
        return {
            "phase": PHASE_INFO,
            "message": f"Connecting {label} tools… unavailable, continuing without them.",
            "detail": text,
        }
    mcp_hs = _MCP_HANDSHAKE.search(text)
    if mcp_hs:
        label = mcp_hs.group(1).strip()
        return {
            "phase": PHASE_PREPARING,
            "message": f"Connecting {label} tools…",
            "detail": text,
        }
    if "failed handshake" in low:
        return {
            "phase": PHASE_INFO,
            "message": "Connecting tools… some are unavailable.",
            "detail": text,
        }

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

    if "warming" in low or "ensuring runtime" in low:
        return {
            "phase": PHASE_WARMING_AGENT,
            "message": default_message_for_phase(PHASE_WARMING_AGENT),
            "detail": text,
        }
    if any(k in low for k in ("pulling", "downloading", "ollama")):
        return {
            "phase": PHASE_PREPARING,
            "message": text if len(text) < 180 else (text[:177] + "…"),
            "detail": text,
        }

    # Generic fallback: still user-visible
    return {
        "phase": PHASE_INFO,
        "message": text if len(text) < 180 else (text[:177] + "…"),
        "detail": text if len(text) >= 180 else None,
    }


def error_code_for_exception(exc: BaseException) -> str:
    explicit = getattr(exc, "code", "")
    if isinstance(explicit, str) and explicit.strip():
        return explicit.strip()
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
