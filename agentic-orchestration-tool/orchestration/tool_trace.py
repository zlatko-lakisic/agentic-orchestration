"""Wrap CrewAI BaseTool._run to emit tool_call run-trace spans."""

from __future__ import annotations

import time
from typing import Any

_installed = False


def apply_tool_call_trace_wrap() -> None:
    """Idempotent monkeypatch of CrewAI ``BaseTool._run``."""
    global _installed
    if _installed:
        return
    try:
        from crewai.tools.base_tool import BaseTool
    except Exception:  # noqa: BLE001
        return

    if getattr(BaseTool._run, "_agentic_tool_trace", False):
        _installed = True
        return

    original = BaseTool._run

    def _wrapped(self: Any, *args: Any, **kwargs: Any) -> Any:
        name = str(getattr(self, "name", None) or self.__class__.__name__ or "tool")
        started = time.monotonic()
        from orchestration.llm_usage import current_tool_root, current_usage_identity
        from orchestration.run_trace import append_run_event

        root = current_tool_root()
        rid = current_usage_identity().get("runId") or ""
        if root is not None and rid:
            try:
                append_run_event(
                    root,
                    rid,
                    "tool_call",
                    actor="tool",
                    message=f"{name} start",
                    detail={"name": name, "phase": "start"},
                )
            except Exception:  # noqa: BLE001
                pass
        ok = True
        err: str | None = None
        try:
            return original(self, *args, **kwargs)
        except Exception as exc:
            ok = False
            err = str(exc)[:500]
            raise
        finally:
            if root is not None and rid:
                try:
                    latency_ms = round((time.monotonic() - started) * 1000.0, 1)
                    append_run_event(
                        root,
                        rid,
                        "tool_call",
                        actor="tool",
                        message=f"{name} {'ok' if ok else 'fail'}",
                        detail={
                            "name": name,
                            "phase": "end",
                            "ok": ok,
                            "latency_ms": latency_ms,
                            "error": err,
                        },
                    )
                except Exception:  # noqa: BLE001
                    pass

    _wrapped._agentic_tool_trace = True  # type: ignore[attr-defined]
    BaseTool._run = _wrapped  # type: ignore[method-assign]
    _installed = True
