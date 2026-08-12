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
            }
        )
    return out


def events_to_mermaid(events: list[dict[str, Any]]) -> str:
    """Build a Mermaid ``sequenceDiagram`` from structured run events."""
    lines = ["sequenceDiagram"]
    actors: list[str] = []

    def ensure(actor: str) -> str:
        a = str(actor or "orchestrator").strip() or "orchestrator"
        # Mermaid participant ids: alphanumeric
        pid = "".join(c if c.isalnum() else "_" for c in a)[:40] or "actor"
        if pid not in actors:
            actors.append(pid)
            label = a.replace('"', "'")[:48]
            lines.append(f'  participant {pid} as {label}')
        return pid

    ensure("client")
    ensure("orchestrator")
    prev = "client"
    for ev in events:
        actor = ensure(str(ev.get("actor") or "orchestrator"))
        kind = str(ev.get("kind") or "event")
        msg = str(ev.get("message") or kind).replace("\n", " ").replace('"', "'")[:80]
        detail = ev.get("detail") if isinstance(ev.get("detail"), dict) else {}
        if kind == "request_start":
            lines.append(f'  client->>{actor}: {msg or "request"}')
            prev = actor
        elif kind == "plan":
            lines.append(f'  {prev}->>{actor}: plan')
            if msg:
                lines.append(f'  Note over {actor}: {msg}')
            agents = detail.get("agents") if isinstance(detail.get("agents"), list) else []
            for ag in agents[:8]:
                aid = ensure(f"agent:{ag}")
                lines.append(f'  {actor}->>{aid}: select')
            mcps = detail.get("mcps") if isinstance(detail.get("mcps"), list) else []
            if mcps:
                mid = ensure("mcp")
                lines.append(f'  {actor}->>{mid}: {", ".join(str(x) for x in mcps[:4])}')
            skills = detail.get("skills") if isinstance(detail.get("skills"), list) else []
            if skills:
                sid = ensure("skills")
                lines.append(f'  {actor}->>{sid}: {", ".join(str(x) for x in skills[:4])}')
            prev = actor
        elif kind in ("step_start", "step_end", "step_fail"):
            arrow = "-->>" if kind == "step_end" else "->>"
            lines.append(f'  {prev}{arrow}{actor}: {msg or kind}')
            prev = actor
        elif kind in ("run_end", "run_error"):
            lines.append(f'  {actor}-->>client: {msg or kind}')
            prev = "client"
        else:
            lines.append(f'  {prev}->>{actor}: {msg or kind}')
            prev = actor
    if len(lines) == 1:
        lines.append("  Note over client: No events recorded for this run_id")
    return "\n".join(lines)
