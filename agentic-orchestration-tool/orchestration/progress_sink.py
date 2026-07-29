"""
Optional in-process progress sink for daemon clients (WebSocket ``chunk`` frames).

Ollama pull / ensure paths write ``(progress) …`` to stderr for CLI/web log streaming.
When a callback is bound here (e.g. during ``run_direct_agent``), the same lines are
also delivered to that callback so concurrent WS runs can demux via ``question_id``.
"""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from typing import Callable, Iterator

ProgressCallback = Callable[[str], None]

_PROGRESS_CB: ContextVar[ProgressCallback | None] = ContextVar(
    "agentic_progress_cb", default=None
)


def emit_progress(message: str) -> None:
    """Forward a progress line to the active sink, if any (never raises)."""
    cb = _PROGRESS_CB.get()
    if cb is None:
        return
    text = str(message or "").strip()
    if not text:
        return
    try:
        cb(text)
    except Exception:  # noqa: BLE001
        return


@contextmanager
def progress_callback(cb: ProgressCallback | None) -> Iterator[None]:
    """Bind ``cb`` for the current context (worker thread) for the duration of the block."""
    if cb is None:
        yield
        return
    token = _PROGRESS_CB.set(cb)
    try:
        yield
    finally:
        _PROGRESS_CB.reset(token)
