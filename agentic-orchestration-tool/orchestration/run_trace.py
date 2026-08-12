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
    "modelCalls": False,
    "toolCalls": False,
    "mcpCalls": False,
    "qa": False,
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


def list_recent_trace_runs(tool_root: Path, *, limit: int = 50) -> list[dict[str, Any]]:
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
    out: list[dict[str, Any]] = []
    for mtime, p in entries[: max(1, limit)]:
        rid = p.stem
        events = read_run_events(tool_root, rid, limit=10_000)
        last = events[-1] if events else {}
        out.append(
            {
                "runId": rid,
                "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(mtime)),
                "eventCount": len(events),
                "lastKind": last.get("kind"),
                "lastMessage": last.get("message"),
                "durationMs": trace_duration_ms(events),
            }
        )
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
            label = a.replace('"', "'")[:48]
            lines.append(f"  participant {pid} as {label}")
        return pid

    # Always show the client edge when we have any events.
    if events:
        ensure("client")

    prev = "client"
    for ev in events:
        actor = ensure(str(ev.get("actor") or "orchestrator"))
        kind = str(ev.get("kind") or "event")
        detail = ev.get("detail") if isinstance(ev.get("detail"), dict) else {}
        mode = str(detail.get("mode") or "").strip()
        provider = str(detail.get("agent_provider_id") or detail.get("provider_id") or "").strip()

        if kind == "request_start":
            label = _short_label(mode or "request")
            lines.append(f"  client->>{actor}: {label}")
            prev = actor
        elif kind == "plan":
            lines.append(f"  {prev}->>{actor}: plan")
            note = _short_label(ev.get("message") or "")
            if note and note != "event":
                lines.append(f"  Note over {actor}: {note}")
            agents = detail.get("agents") if isinstance(detail.get("agents"), list) else []
            for ag in agents[:8]:
                aid = ensure(f"agent:{ag}")
                lines.append(f"  {actor}->>{aid}: select")
            mcps = detail.get("mcps") if isinstance(detail.get("mcps"), list) else []
            if mcps:
                mid = ensure("mcp")
                lines.append(f"  {actor}->>{mid}: {_short_label(', '.join(str(x) for x in mcps[:3]))}")
            skills = detail.get("skills") if isinstance(detail.get("skills"), list) else []
            if skills:
                sid = ensure("skills")
                lines.append(
                    f"  {actor}->>{sid}: {_short_label(', '.join(str(x) for x in skills[:3]))}"
                )
            prev = actor
        elif kind == "agent_start":
            label = _short_label(provider or ev.get("message") or "agent")
            lines.append(f"  {prev}->>{actor}: {label}")
            prev = actor
        elif kind == "agent_end":
            label = _short_label(ev.get("message") or "done")
            lines.append(f"  {actor}-->>{prev}: {label}")
        elif kind in ("step_start", "step_end", "step_fail"):
            arrow = "-->>" if kind == "step_end" else "->>"
            label = _short_label(kind.replace("_", " "), provider or ev.get("message") or "")
            lines.append(f"  {prev}{arrow}{actor}: {label}")
            prev = actor
        elif kind in ("run_end", "run_error"):
            label = _short_label(ev.get("message") or kind.replace("_", " "))
            lines.append(f"  {actor}-->>client: {label}")
            prev = "client"
        else:
            label = _short_label(kind, ev.get("message") or "")
            lines.append(f"  {prev}->>{actor}: {label}")
            prev = actor

    if len(lines) == 1:
        ensure("client")
        lines.append("  Note over client: No events recorded for this run_id")
    return "\n".join(lines)


def build_run_trace_payload(tool_root: Path, run_id: str) -> dict[str, Any] | None:
    rid = str(run_id or "").strip()
    if not rid:
        return None
    events = read_run_events(tool_root, rid, limit=10_000)
    return {
        "runId": rid,
        "eventCount": len(events),
        "events": events,
        "mermaid": events_to_mermaid(events),
        "durationMs": trace_duration_ms(events),
        "instrumentation": trace_instrumentation(events),
    }
