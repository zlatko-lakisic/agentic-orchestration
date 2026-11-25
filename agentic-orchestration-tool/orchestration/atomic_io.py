"""Crash-safe small-file persistence helpers (sessions, learning stats).

* :func:`atomic_write_text` — temp file in the same directory + ``os.replace``,
  so a kill or a concurrent reader never observes an empty/partial file.
* :func:`file_lock` — per-path lock for read-modify-write cycles: an in-process
  ``RLock`` plus a best-effort advisory ``flock`` on ``<path>.lock`` so separate
  CLI processes (one per chat turn under the Node web server) and daemon threads
  do not lose each other's updates.
* :func:`quarantine_corrupt_file` — move an unreadable file aside (``.corrupt``)
  instead of silently treating it as empty and overwriting it.
"""

from __future__ import annotations

import os
import sys
import tempfile
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

try:  # pragma: no cover - platform dependent
    import fcntl as _fcntl
except ImportError:  # pragma: no cover - Windows
    _fcntl = None  # type: ignore[assignment]

_locks_guard = threading.Lock()
_path_locks: dict[str, threading.RLock] = {}
# Re-entrancy depth per path; only touched while holding that path's RLock.
_held_depth: dict[str, int] = {}


def atomic_write_text(path: Path, text: str, *, encoding: str = "utf-8") -> None:
    """Write ``text`` to ``path`` atomically (same-directory temp + ``os.replace``)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding=encoding) as fh:
            fh.write(text)
            fh.flush()
            try:
                os.fsync(fh.fileno())
            except OSError:
                pass
        # mkstemp creates 0600; keep the mode an existing file had, else the
        # umask default, so behaviour matches the previous ``write_text``.
        try:
            mode = path.stat().st_mode & 0o777
        except OSError:
            umask = os.umask(0)
            os.umask(umask)
            mode = 0o666 & ~umask
        try:
            os.chmod(tmp, mode)
        except OSError:
            pass
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _thread_lock_for(path: Path) -> threading.RLock:
    key = str(path)
    with _locks_guard:
        lock = _path_locks.get(key)
        if lock is None:
            lock = threading.RLock()
            _path_locks[key] = lock
        return lock


@contextmanager
def file_lock(path: Path) -> Iterator[None]:
    """Serialize read-modify-write on ``path`` across threads and (best-effort) processes."""
    try:
        resolved = path.resolve()
    except OSError:
        resolved = path
    tlock = _thread_lock_for(resolved)
    key = str(resolved)
    with tlock:
        # Re-entrant in-thread: only the outermost holder takes the flock (a
        # second descriptor in the same process would block on itself).
        depth = _held_depth.get(key, 0)
        _held_depth[key] = depth + 1
        handle = None
        if _fcntl is not None and depth == 0:
            try:
                resolved.parent.mkdir(parents=True, exist_ok=True)
                handle = open(  # noqa: SIM115 - held for the lock's lifetime
                    resolved.with_name(resolved.name + ".lock"), "a", encoding="utf-8"
                )
                _fcntl.flock(handle.fileno(), _fcntl.LOCK_EX)
            except OSError:
                if handle is not None:
                    try:
                        handle.close()
                    except OSError:
                        pass
                handle = None
        try:
            yield
        finally:
            remaining = _held_depth.get(key, 1) - 1
            if remaining <= 0:
                _held_depth.pop(key, None)
            else:
                _held_depth[key] = remaining
            if handle is not None:
                try:
                    _fcntl.flock(handle.fileno(), _fcntl.LOCK_UN)  # type: ignore[union-attr]
                except OSError:
                    pass
                try:
                    handle.close()
                except OSError:
                    pass


def quarantine_corrupt_file(path: Path, *, reason: str = "") -> Path | None:
    """Move an unreadable file to ``<name>.corrupt-<ts>``; return the backup path."""
    backup = path.with_name(f"{path.name}.corrupt-{int(time.time())}")
    try:
        os.replace(path, backup)
    except OSError:
        return None
    detail = f" ({reason})" if reason else ""
    print(
        f"warning: {path.name} was unreadable{detail}; moved to {backup.name} and starting fresh",
        file=sys.stderr,
    )
    return backup
