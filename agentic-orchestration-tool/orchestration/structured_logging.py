"""Structured log lines for Loki/Datadog correlation (K5.2)."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from typing import Any, TextIO


def log_format_from_env() -> str:
    raw = os.getenv("AGENTIC_LOG_FORMAT", "text").strip().lower()
    return raw if raw in ("text", "json") else "text"


def structured_log_record(
    message: str,
    *,
    level: str = "info",
    run_id: str = "",
    step_id: str = "",
    component: str = "worker",
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    record: dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "level": level.lower(),
        "component": component,
        "message": message,
    }
    if run_id:
        record["run_id"] = run_id
    if step_id:
        record["step_id"] = step_id
    if extra:
        record.update(extra)
    return record


def emit_log(
    message: str,
    *,
    level: str = "info",
    run_id: str = "",
    step_id: str = "",
    component: str = "worker",
    file: TextIO | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Write one log line (text prefix or JSON per ``AGENTIC_LOG_FORMAT``)."""
    target = file or sys.stderr
    if log_format_from_env() == "json":
        line = json.dumps(
            structured_log_record(
                message,
                level=level,
                run_id=run_id,
                step_id=step_id,
                component=component,
                extra=extra,
            ),
            ensure_ascii=False,
        )
        target.write(f"{line}\n")
    else:
        prefix = f"[{run_id}/{step_id}] " if run_id or step_id else ""
        target.write(f"{prefix}{message.rstrip()}\n")
    target.flush()
