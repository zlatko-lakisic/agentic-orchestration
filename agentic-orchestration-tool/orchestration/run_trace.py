"""Per-run request trace events (Admin Traces sequence diagram).

``run_id`` is the request correlation id. Events are always written (not gated by
``AGENTIC_LEARNING``) under ``__orchestrator_run_traces__/{run_id}.jsonl``.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

RUN_TRACES_DIR_NAME = "__orchestrator_run_traces__"

# Short arrow labels for Mermaid (full text stays in the event log / modal).
_MERMAID_LABEL_MAX = 40

# Capabilities currently emitted by the runtime (honesty for Admin Traces).
TRACE_CAPABILITIES: dict[str, bool] = {
    "runBoundary": True,
    "planner": True,
    "steps": True,
    "agentSelect": True,
    "directAgent": True,
    "modelCalls": True,
    "toolCalls": True,
    "mcpCalls": True,
    "qa": True,
    "decision": True,
}

DEPTH_KINDS: dict[str, set[str]] = {
    "all": set(),  # empty = no filter
    "boundary": {
        "request_start",
        "run_end",
        "run_error",
        "agent_start",
        "agent_end",
    },
    "decisions": {
        "request_start",
        "run_end",
        "run_error",
        "plan",
        "decision",
    },
    "crew": {
        "request_start",
        "run_end",
        "run_error",
        "step_start",
        "step_end",
        "step_fail",
    },
    "tools": {
        "request_start",
        "run_end",
        "run_error",
        "tool_call",
        "mcp_call",
        "qa",
        "model_call",
    },
}


def run_traces_dir(tool_root: Path) -> Path:
    return (tool_root / RUN_TRACES_DIR_NAME).resolve()


def run_trace_path(tool_root: Path, run_id: str) -> Path:
    rid = str(run_id or "").strip() or "unknown"
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in rid)[:128]
    return run_traces_dir(tool_root) / f"{safe}.jsonl"


def append_run_event(
    tool_root: Path | None,
    run_id: str,
    kind: str,
    *,
    actor: str = "orchestrator",
    message: str = "",
    detail: dict[str, Any] | None = None,
) -> None:
    """Append one JSONL event for ``run_id`` (best-effort, never raises)."""
    rid = str(run_id or "").strip()
    if not rid or tool_root is None:
        return
    try:
        root = Path(tool_root)
        path = run_trace_path(root, rid)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload: dict[str, Any] = {
            "ts": time.time(),
            "run_id": rid,
            "kind": str(kind or "event").strip() or "event",
            "actor": str(actor or "orchestrator").strip() or "orchestrator",
            "message": str(message or "").strip()[:2000],
        }
        if detail:
            payload["detail"] = detail
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception:  # noqa: BLE001
        return


def read_run_events(tool_root: Path, run_id: str, *, limit: int = 500) -> list[dict[str, Any]]:
    """Load events for a run (oldest first), capped at ``limit``."""
    rid = str(run_id or "").strip()
    if not rid:
        return []
    path = run_trace_path(tool_root, rid)
    if not path.is_file():
        return []
    out: list[dict[str, Any]] = []
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:  # noqa: BLE001
                    continue
                if isinstance(obj, dict):
                    out.append(obj)
    except Exception:  # noqa: BLE001
        return []
    if limit > 0 and len(out) > limit:
        out = out[-limit:]
    return out


def filter_events_by_depth(events: list[dict[str, Any]], depth: str | None) -> list[dict[str, Any]]:
    d = str(depth or "all").strip().lower() or "all"
    allowed = DEPTH_KINDS.get(d)
    if not allowed:
        return list(events)
    return [e for e in events if str(e.get("kind") or "") in allowed]


def _detail_identity(events: list[dict[str, Any]]) -> dict[str, Any]:
    client_ip = app_id = user_name = user_id = mode = None
    started_at: float | None = None
    for ev in events:
        ts = ev.get("ts")
        if started_at is None and isinstance(ts, (int, float)):
            started_at = float(ts)
        detail = ev.get("detail") if isinstance(ev.get("detail"), dict) else {}
        if client_ip is None and detail.get("client_ip"):
            client_ip = str(detail.get("client_ip"))
        if app_id is None and detail.get("app_id"):
            app_id = str(detail.get("app_id"))
        if user_name is None and detail.get("user_name"):
            user_name = str(detail.get("user_name"))
        if user_id is None and detail.get("user_id"):
            user_id = str(detail.get("user_id"))
        if mode is None and detail.get("mode"):
            mode = str(detail.get("mode"))
        if client_ip and app_id and user_name and user_id and mode and started_at is not None:
            break
    return {
        "clientIp": client_ip,
        "appId": app_id,
        "userName": user_name,
        "userId": user_id,
        "mode": mode,
        "startedAt": (
            time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(started_at))
            if started_at is not None
            else None
        ),
        "startedTs": started_at,
    }


def sum_model_tokens(events: list[dict[str, Any]]) -> dict[str, int | None]:
    prompt = completion = total = 0
    any_tok = False
    for ev in events:
        if str(ev.get("kind") or "") != "model_call":
            continue
        detail = ev.get("detail") if isinstance(ev.get("detail"), dict) else {}
        for key, bucket in (
            ("prompt_tokens", "prompt"),
            ("completion_tokens", "completion"),
            ("total_tokens", "total"),
        ):
            v = detail.get(key)
            if v is None:
                continue
            try:
                n = int(v)
            except (TypeError, ValueError):
                continue
            any_tok = True
            if key == "prompt_tokens":
                prompt += n
            elif key == "completion_tokens":
                completion += n
            else:
                total += n
    if not any_tok:
        return {"promptTokens": None, "completionTokens": None, "totalTokens": None}
    return {"promptTokens": prompt, "completionTokens": completion, "totalTokens": total}


def enrich_trace_list_item(events: list[dict[str, Any]], *, run_id: str, mtime: float) -> dict[str, Any]:
    last = events[-1] if events else {}
    kinds = {str(e.get("kind") or "") for e in events}
    ident = _detail_identity(events)
    tokens = sum_model_tokens(events)
    return {
        "runId": run_id,
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(mtime)),
        "eventCount": len(events),
        "lastKind": last.get("kind"),
        "lastMessage": last.get("message"),
        "durationMs": trace_duration_ms(events),
        "clientIp": ident["clientIp"],
        "appId": ident["appId"],
        "userName": ident["userName"],
        "userId": ident["userId"],
        "mode": ident["mode"],
        "startedAt": ident["startedAt"],
        "hasPlan": "plan" in kinds,
        "hasDecision": "decision" in kinds,
        "hasSteps": bool(kinds & {"step_start", "step_end", "step_fail"}),
        "hasTools": bool(kinds & {"tool_call", "mcp_call"}),
        "hasQa": "qa" in kinds,
        "promptTokens": tokens["promptTokens"],
        "completionTokens": tokens["completionTokens"],
        "totalTokens": tokens["totalTokens"],
    }


def list_recent_trace_runs(
    tool_root: Path,
    *,
    limit: int = 50,
    client: str | None = None,
    client_ip: str | None = None,
    crew_only: bool = False,
    scan_limit: int = 500,
) -> list[dict[str, Any]]:
    """List recent trace files (by mtime) for the Admin Traces index."""
    root = run_traces_dir(tool_root)
    if not root.is_dir():
        return []
    entries: list[tuple[float, Path]] = []
    try:
        for p in root.glob("*.jsonl"):
            try:
                entries.append((p.stat().st_mtime, p))
            except OSError:
                continue
    except OSError:
        return []
    entries.sort(key=lambda x: x[0], reverse=True)

    client_q = str(client or "").strip().lower()
    ip_q = str(client_ip or "").strip().lower()
    need_filter = bool(client_q or ip_q or crew_only)
    out: list[dict[str, Any]] = []
    for mtime, p in entries[: max(1, scan_limit if need_filter else limit)]:
        rid = p.stem
        events = read_run_events(tool_root, rid, limit=10_000)
        item = enrich_trace_list_item(events, run_id=rid, mtime=mtime)
        if client_q:
            blob = " ".join(
                str(x or "")
                for x in (item.get("appId"), item.get("userName"), item.get("userId"))
            ).lower()
            if client_q not in blob:
                continue
        if ip_q:
            if ip_q not in str(item.get("clientIp") or "").lower():
                continue
        if crew_only:
            if not (item.get("hasPlan") or item.get("hasDecision") or item.get("hasSteps")):
                continue
        out.append(item)
        if len(out) >= max(1, limit):
            break
    return out


def _short_label(*parts: object, limit: int = _MERMAID_LABEL_MAX) -> str:
    raw = " ".join(str(p).strip() for p in parts if p is not None and str(p).strip())
    clean = raw.replace("\n", " ").replace('"', "'").strip() or "event"
    if len(clean) <= limit:
        return clean
    return clean[: max(1, limit - 1)].rstrip() + "…"


def trace_duration_ms(events: list[dict[str, Any]]) -> float | None:
    times = [float(e["ts"]) for e in events if isinstance(e.get("ts"), (int, float))]
    if len(times) < 2:
        return None
    return round((max(times) - min(times)) * 1000.0, 1)


def trace_instrumentation(events: list[dict[str, Any]]) -> dict[str, Any]:
    """Describe what this run recorded vs what the platform can emit."""
    kinds = {str(e.get("kind") or "") for e in events}
    present = {
        "runBoundary": bool(kinds & {"request_start", "run_end", "run_error"}),
        "planner": "plan" in kinds,
        "decision": "decision" in kinds,
        "steps": bool(kinds & {"step_start", "step_end", "step_fail"}),
        "agentSelect": any(
            isinstance(e.get("detail"), dict)
            and isinstance(e["detail"].get("agents"), list)
            and e["detail"]["agents"]
            for e in events
            if e.get("kind") == "plan"
        )
        or "agent_start" in kinds,
        "directAgent": any(
            isinstance(e.get("detail"), dict)
            and str(e["detail"].get("mode") or "") == "direct_agent"
            for e in events
        )
        or "agent_start" in kinds,
        "modelCalls": "model_call" in kinds,
        "toolCalls": "tool_call" in kinds,
        "mcpCalls": "mcp_call" in kinds,
        "qa": "qa" in kinds,
    }
    missing = [
        key
        for key, supported in TRACE_CAPABILITIES.items()
        if supported and not present.get(key)
    ]
    not_instrumented = [key for key, supported in TRACE_CAPABILITIES.items() if not supported]
    return {
        "capabilities": dict(TRACE_CAPABILITIES),
        "present": present,
        "missing": missing,
        "notInstrumented": not_instrumented,
        "summary": (
            "Run boundaries only — step-level spans were not recorded for this run."
            if present.get("runBoundary") and not present.get("planner") and not present.get("steps")
            else "Partial instrumentation — some planner/step spans are present."
            if present.get("planner") or present.get("steps")
            else "No structured spans recorded for this run_id."
        ),
    }


def events_to_mermaid(events: list[dict[str, Any]]) -> str:
    """Build a Mermaid ``sequenceDiagram`` from structured run events.

    Only participants that send or receive a message are declared (no dead
    lifelines). Arrow labels are truncated; full text stays in the event log.
    """
    lines = ["sequenceDiagram"]
    actors: list[str] = []
    declared: set[str] = set()

    def pid_for(actor: str) -> str:
        a = str(actor or "orchestrator").strip() or "orchestrator"
        return "".join(c if c.isalnum() else "_" for c in a)[:40] or "actor"

    def ensure(actor: str) -> str:
        a = str(actor or "orchestrator").strip() or "orchestrator"
        pid = pid_for(a)
        if pid not in declared:
            declared.add(pid)
            actors.append(pid)
            raw = a.replace('"', "'")
            if raw.lower().startswith("agent:"):
                label = raw[6:][:22]
            else:
                label = raw[:28]
            lines.append(f"  participant {pid} as {label}")
        return pid

    if events:
        ensure("client")

    stack: list[str] = ["client"]

    for ev in events:
        actor = ensure(str(ev.get("actor") or "orchestrator"))
        kind = str(ev.get("kind") or "event")
        detail = ev.get("detail") if isinstance(ev.get("detail"), dict) else {}
        mode = str(detail.get("mode") or "").strip()
        provider = str(detail.get("agent_provider_id") or detail.get("provider_id") or "").strip()
        caller = stack[-1] if stack else "client"

        if kind == "request_start":
            label = _short_label(mode or "request")
            lines.append(f"  client->>{actor}: {label}")
            stack = ["client", actor]
        elif kind == "plan":
            lines.append(f"  {caller}->>{actor}: plan")
            note = _short_label(ev.get("message") or "")
            if note and note != "event":
                lines.append(f"  Note over {actor}: {note}")
            agents = detail.get("agents") if isinstance(detail.get("agents"), list) else []
            for ag in agents[:8]:
                aid = ensure(f"agent:{ag}")
                lines.append(f"  {actor}->>{aid}: select")
                lines.append(f"  {aid}-->>{actor}: ok")
            mcps = detail.get("mcps") if isinstance(detail.get("mcps"), list) else []
            if mcps:
                mid = ensure("mcp")
                lines.append(f"  {actor}->>{mid}: {_short_label(', '.join(str(x) for x in mcps[:3]))}")
                lines.append(f"  {mid}-->>{actor}: ok")
            skills = detail.get("skills") if isinstance(detail.get("skills"), list) else []
            if skills:
                sid = ensure("skills")
                lines.append(
                    f"  {actor}->>{sid}: {_short_label(', '.join(str(x) for x in skills[:3]))}"
                )
                lines.append(f"  {sid}-->>{actor}: ok")
            if caller != actor:
                lines.append(f"  {actor}-->>{caller}: ok")
        elif kind == "decision":
            lines.append(f"  {caller}->>{actor}: decision")
            note = _short_label(ev.get("message") or detail.get("reason") or "decision")
            if note and note != "event":
                lines.append(f"  Note over {actor}: {note}")
            if caller != actor:
                lines.append(f"  {actor}-->>{caller}: ok")
        elif kind == "agent_start":
            label = _short_label(provider or ev.get("message") or "agent")
            lines.append(f"  {caller}->>{actor}: {label}")
            stack.append(actor)
        elif kind == "agent_end":
            label = _short_label(ev.get("message") or "done")
            if stack and stack[-1] == actor:
                stack.pop()
            ret_to = stack[-1] if stack else "client"
            lines.append(f"  {actor}-->>{ret_to}: {label}")
        elif kind == "step_start":
            label = _short_label(kind.replace("_", " "), provider or ev.get("message") or "")
            lines.append(f"  {caller}->>{actor}: {label}")
            stack.append(actor)
        elif kind in ("step_end", "step_fail"):
            label = _short_label(kind.replace("_", " "), provider or ev.get("message") or "")
            if stack and stack[-1] == actor:
                stack.pop()
            ret_to = stack[-1] if stack else "client"
            lines.append(f"  {actor}-->>{ret_to}: {label}")
        elif kind == "tool_call":
            phase = str(detail.get("phase") or "")
            name = _short_label(detail.get("name") or ev.get("message") or "tool")
            tid = ensure(f"tool:{detail.get('name') or 'tool'}")
            if phase == "end":
                lines.append(f"  {tid}-->>{caller}: {name}")
            else:
                lines.append(f"  {caller}->>{tid}: {name}")
        elif kind == "mcp_call":
            mid = ensure(f"mcp:{detail.get('mcp_id') or 'mcp'}")
            label = _short_label(detail.get("method") or detail.get("path") or "mcp")
            phase = str(detail.get("phase") or "")
            if phase == "end" or detail.get("status") is not None:
                lines.append(f"  {mid}-->>{caller}: {label}")
            else:
                lines.append(f"  {caller}->>{mid}: {label}")
        elif kind == "model_call":
            mid = ensure(f"model:{detail.get('model') or actor}")
            toks = detail.get("total_tokens")
            label = _short_label(detail.get("model") or "model", f"{toks} tok" if toks is not None else "")
            lines.append(f"  {caller}->>{mid}: {label}")
            lines.append(f"  {mid}-->>{caller}: ok")
        elif kind == "qa":
            lines.append(f"  Note over {actor}: {_short_label('qa', ev.get('message') or detail.get('verdict') or '')}")
        elif kind in ("run_end", "run_error"):
            label = _short_label(ev.get("message") or kind.replace("_", " "))
            lines.append(f"  {actor}-->>client: {label}")
            stack = ["client"]
        else:
            label = _short_label(kind, ev.get("message") or "")
            lines.append(f"  {caller}->>{actor}: {label}")
            if actor != caller:
                stack.append(actor)

    if len(lines) == 1:
        ensure("client")
        lines.append("  Note over client: No events recorded for this run_id")
    return "\n".join(lines)


def build_run_trace_payload(
    tool_root: Path,
    run_id: str,
    *,
    depth: str | None = None,
) -> dict[str, Any] | None:
    rid = str(run_id or "").strip()
    if not rid:
        return None
    events = read_run_events(tool_root, rid, limit=10_000)
    filtered = filter_events_by_depth(events, depth)
    ident = _detail_identity(events)
    tokens = sum_model_tokens(events)
    return {
        "runId": rid,
        "eventCount": len(filtered),
        "events": filtered,
        "mermaid": events_to_mermaid(filtered),
        "durationMs": trace_duration_ms(events),
        "instrumentation": trace_instrumentation(events),
        "depth": str(depth or "all").strip().lower() or "all",
        "clientIp": ident["clientIp"],
        "appId": ident["appId"],
        "userName": ident["userName"],
        "userId": ident["userId"],
        "mode": ident["mode"],
        "promptTokens": tokens["promptTokens"],
        "completionTokens": tokens["completionTokens"],
        "totalTokens": tokens["totalTokens"],
    }
