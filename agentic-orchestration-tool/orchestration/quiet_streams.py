"""Thread-aware muting of ``sys.stdout`` / ``sys.stderr`` for quiet crew kickoffs.

``contextlib.redirect_stdout`` swaps the *process-global* stream and restores
whatever it saw on entry. With two overlapping runs in threads (the engine
daemon) the second exit "restores" the first run's already-closed sink, after
which every ``print(..., file=sys.stderr)`` in the process raises
``ValueError: I/O operation on closed file`` until restart.

:func:`quiet_streams` instead installs a pass-through proxy (ref-counted, never
closed) and drops only the writes that belong to a quiet kickoff:

* the thread that entered the scope, and
* threads born while a quiet scope is active (kickoff helper threads — they are
  what the old global redirect silenced in the single-run CLI case).

Threads that already existed (other runs outside their own quiet scope, daemon
housekeeping) keep writing to the real streams.
"""

from __future__ import annotations

import sys
import threading
import weakref
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any, TextIO

_tls = threading.local()
_lock = threading.RLock()
_depth = 0
_active_mute = {"stdout": 0, "stderr": 0}
_baseline_threads: "weakref.WeakSet[threading.Thread]" = weakref.WeakSet()
# (original stream or None when we reused an existing proxy, installed proxy)
_installed: dict[str, tuple[Any, "_ThreadMuteStream"]] = {}


def _tls_count(kind: str) -> int:
    return int(getattr(_tls, f"mute_{kind}", 0) or 0)


def _is_muted(kind: str) -> bool:
    if _tls_count(kind) > 0:
        return True
    if _active_mute[kind] <= 0:
        return False
    # Born during a quiet scope: treat as a helper thread of a quiet kickoff.
    return threading.current_thread() not in _baseline_threads


class _ThreadMuteStream:
    """Pass-through text stream that drops writes from muted threads."""

    def __init__(self, target: TextIO, kind: str) -> None:
        self._target = target
        self._kind = kind

    def write(self, data: str) -> int:
        if _is_muted(self._kind):
            return len(data) if data else 0
        return self._target.write(data)

    def writelines(self, lines: Any) -> None:
        if _is_muted(self._kind):
            return
        self._target.writelines(lines)

    def flush(self) -> None:
        if _is_muted(self._kind):
            return
        try:
            self._target.flush()
        except ValueError:
            # Underlying stream closed by its owner; nothing to flush.
            return

    def isatty(self) -> bool:
        if _is_muted(self._kind):
            return False
        try:
            return bool(self._target.isatty())
        except Exception:  # noqa: BLE001
            return False

    def __getattr__(self, name: str) -> Any:
        return getattr(self._target, name)


def _install(kind: str) -> None:
    current = getattr(sys, kind)
    if isinstance(current, _ThreadMuteStream):
        _installed[kind] = (None, current)
        return
    proxy = _ThreadMuteStream(current, kind)
    _installed[kind] = (current, proxy)
    setattr(sys, kind, proxy)


def _uninstall(kind: str) -> None:
    original, proxy = _installed.pop(kind, (None, None))
    if original is None or proxy is None:
        return
    # Only restore when our proxy is still the active stream; if other code
    # wrapped or replaced it meanwhile, leave theirs (the proxy stays a
    # harmless pass-through and is never closed).
    if getattr(sys, kind) is proxy:
        setattr(sys, kind, original)


@contextmanager
def quiet_streams(*, stdout: bool = True, stderr: bool = True) -> Iterator[None]:
    """Mute this thread's (and its helper threads') stdout/stderr writes."""
    global _depth
    kinds = [k for k, on in (("stdout", stdout), ("stderr", stderr)) if on]
    if not kinds:
        yield
        return
    with _lock:
        if _depth == 0:
            _baseline_threads.clear()
            for thread in threading.enumerate():
                _baseline_threads.add(thread)
            _install("stdout")
            _install("stderr")
        # A thread entering its own scope is a run thread, not a kickoff helper:
        # once it leaves its scope it must be audible again.
        _baseline_threads.add(threading.current_thread())
        _depth += 1
        for kind in kinds:
            _active_mute[kind] += 1
    for kind in kinds:
        setattr(_tls, f"mute_{kind}", _tls_count(kind) + 1)
    try:
        yield
    finally:
        for kind in kinds:
            setattr(_tls, f"mute_{kind}", max(0, _tls_count(kind) - 1))
        with _lock:
            for kind in kinds:
                _active_mute[kind] = max(0, _active_mute[kind] - 1)
            _depth = max(0, _depth - 1)
            if _depth == 0:
                _uninstall("stdout")
                _uninstall("stderr")
                _baseline_threads.clear()


def active_quiet_scopes() -> int:
    """Number of active quiet scopes (tests / diagnostics)."""
    return _depth
