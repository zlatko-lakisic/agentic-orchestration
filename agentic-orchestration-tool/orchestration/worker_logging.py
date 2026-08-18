from __future__ import annotations

import sys
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Callable, TextIO

_tls = threading.local()
_wrap_lock = threading.Lock()
_wrap_active = 0
_orig_stdout: TextIO | None = None
_orig_stderr: TextIO | None = None


def worker_log_prefix(*, run_id: str, step_id: str) -> str:
    rid = run_id.strip() or "-"
    sid = step_id.strip() or "-"
    return f"[{rid}/{sid}] "


def _tls_prefix() -> str:
    prefixes: list[str] = getattr(_tls, "prefixes", [])
    return "".join(prefixes)


class _PrefixedTextIO:
    """Prefix each line written to a text stream (K8s Phase 2.2)."""

    def __init__(self, stream: TextIO, prefix: str | Callable[[], str]) -> None:
        self._stream = stream
        self._prefix = prefix
        self._pending = ""

    def _resolved_prefix(self) -> str:
        prefix = self._prefix
        return prefix() if callable(prefix) else prefix

    def _pending_buf(self) -> str:
        if callable(self._prefix):
            return str(getattr(_tls, self._tls_pending_key(), "") or "")
        return self._pending

    def _set_pending_buf(self, value: str) -> None:
        if callable(self._prefix):
            setattr(_tls, self._tls_pending_key(), value)
        else:
            self._pending = value

    def _tls_pending_key(self) -> str:
        return f"pending_{id(self)}"

    def write(self, data: str) -> int:
        if not data:
            return 0
        pending = self._pending_buf() + data
        prefix = self._resolved_prefix()
        while "\n" in pending:
            line, pending = pending.split("\n", 1)
            self._stream.write(f"{prefix}{line}\n")
        self._set_pending_buf(pending)
        return len(data)

    def flush(self) -> None:
        pending = self._pending_buf()
        if pending:
            self._stream.write(f"{self._resolved_prefix()}{pending}")
            self._set_pending_buf("")
        self._stream.flush()

    def isatty(self) -> bool:
        return False

    def fileno(self) -> int:
        return self._stream.fileno()

    def __getattr__(self, name: str):
        return getattr(self._stream, name)


@contextmanager
def worker_log_context(
    *,
    run_id: str,
    step_id: str,
) -> Iterator[str]:
    """Prefix ``stdout``/``stderr`` for this thread without nesting other in-process steps."""
    prefix = worker_log_prefix(run_id=run_id, step_id=step_id)
    prefixes: list[str] = getattr(_tls, "prefixes", [])
    if not prefixes:
        prefixes = []
        _tls.prefixes = prefixes
    prefixes.append(prefix)

    global _wrap_active, _orig_stdout, _orig_stderr
    with _wrap_lock:
        _wrap_active += 1
        if _wrap_active == 1:
            _orig_stdout = sys.stdout
            _orig_stderr = sys.stderr
            sys.stdout = _PrefixedTextIO(_orig_stdout, _tls_prefix)  # type: ignore[assignment]
            sys.stderr = _PrefixedTextIO(_orig_stderr, _tls_prefix)  # type: ignore[assignment]
    try:
        yield prefix
    finally:
        prefixes.pop()
        with _wrap_lock:
            _wrap_active -= 1
            if _wrap_active == 0 and _orig_stdout is not None and _orig_stderr is not None:
                try:
                    sys.stdout.flush()
                    sys.stderr.flush()
                except Exception:  # noqa: BLE001
                    pass
                sys.stdout = _orig_stdout
                sys.stderr = _orig_stderr
                _orig_stdout = None
                _orig_stderr = None


def worker_log(message: str, *, run_id: str, step_id: str, file: TextIO | None = None) -> None:
    """Write one prefixed line (uses raw stream to avoid double prefix)."""
    from orchestration.structured_logging import emit_log, log_format_from_env

    if log_format_from_env() == "json":
        emit_log(message, run_id=run_id, step_id=step_id, component="worker", file=file)
        return
    target = file or sys.stderr
    target.write(f"{worker_log_prefix(run_id=run_id, step_id=step_id)}{message.rstrip()}\n")
    target.flush()
