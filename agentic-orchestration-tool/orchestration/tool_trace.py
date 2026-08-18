"""Wrap CrewAI BaseTool._run to emit tool_call run-trace spans."""

from __future__ import annotations

import os
import time
from typing import Any

_installed = False
_DEFAULT_TOOL_RESULT_CHARS = 8000


def tool_result_char_cap() -> int:
    raw = os.getenv("AGENTIC_TOOL_RESULT_CHARS", "").strip()
    if raw:
        try:
            return max(500, min(200_000, int(raw)))
        except ValueError:
            pass
    return _DEFAULT_TOOL_RESULT_CHARS


def cap_tool_result(value: Any, *, max_chars: int | None = None) -> Any:
    """Truncate oversized tool output before it re-enters the LLM prompt."""
    cap = tool_result_char_cap() if max_chars is None else max(1, int(max_chars))
    marker = "\n… truncated"
    if isinstance(value, str):
        if len(value) <= cap:
            return value
        return value[: cap - len(marker)] + marker
    if isinstance(value, dict):
        text = value.get("content") or value.get("text") or value.get("result")
        if isinstance(text, str) and len(text) > cap:
            out = dict(value)
            key = "content" if "content" in value else ("text" if "text" in value else "result")
            out[key] = text[: cap - len(marker)] + marker
            return out
        if isinstance(text, list) and text and isinstance(text[0], dict) and "text" in text[0]:
            blob = str(text[0].get("text") or "")
            if len(blob) > cap:
                out = dict(value)
                new_list = list(text)
                new_list[0] = {**text[0], "text": blob[: cap - len(marker)] + marker}
                out["content" if "content" in value else "text"] = new_list
                return out
    return value


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
            return cap_tool_result(original(self, *args, **kwargs))
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
