from __future__ import annotations

import sys
from collections.abc import Iterator
from contextlib import contextmanager
from typing import TextIO


def worker_log_prefix(*, run_id: str, step_id: str) -> str:
    rid = run_id.strip() or "-"
    sid = step_id.strip() or "-"
    return f"[{rid}/{sid}] "


class _PrefixedTextIO:
    """Prefix each line written to a text stream (K8s Phase 2.2)."""

    def __init__(self, stream: TextIO, prefix: str) -> None:
        self._stream = stream
        self._prefix = prefix
        self._pending = ""

    def write(self, data: str) -> int:
        if not data:
            return 0
        self._pending += data
        while "\n" in self._pending:
            line, self._pending = self._pending.split("\n", 1)
            self._stream.write(f"{self._prefix}{line}\n")
        return len(data)

    def flush(self) -> None:
        if self._pending:
            self._stream.write(f"{self._prefix}{self._pending}")
            self._pending = ""
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
    """Install prefixed ``stdout``/``stderr`` for the worker process."""
    prefix = worker_log_prefix(run_id=run_id, step_id=step_id)
    out = sys.stdout
    err = sys.stderr
    sys.stdout = _PrefixedTextIO(out, prefix)  # type: ignore[assignment]
    sys.stderr = _PrefixedTextIO(err, prefix)  # type: ignore[assignment]
    try:
        yield prefix
    finally:
        sys.stdout.flush()
        sys.stderr.flush()
        sys.stdout = out
        sys.stderr = err


def worker_log(message: str, *, run_id: str, step_id: str, file: TextIO | None = None) -> None:
    """Write one prefixed line (uses raw stream to avoid double prefix)."""
    target = file or sys.stderr
    target.write(f"{worker_log_prefix(run_id=run_id, step_id=step_id)}{message.rstrip()}\n")
    target.flush()
