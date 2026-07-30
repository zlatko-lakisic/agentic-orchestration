"""
Track and stop ``ollama serve`` processes spawned by this AO process.

Kept free of CrewAI so unit tests and the FastAPI lifespan can import it on a
CLI-only / serve-extras install. Only PIDs registered via ``register_serve`` are
stopped — a pre-existing user/systemd Ollama is never touched.
"""

from __future__ import annotations

import atexit
import os
import subprocess
import sys
from typing import Any

_serve_procs: dict[str, subprocess.Popen] = {}
_shutdown_hooks_installed = False


def serve_key(host: str) -> str:
    return str(host or "").rstrip("/")


def register_serve(host: str, proc: subprocess.Popen) -> None:
    _serve_procs[serve_key(host)] = proc
    ensure_shutdown_hooks()


def stop_serve(host: str) -> None:
    proc = _serve_procs.pop(serve_key(host), None)
    if proc is not None:
        _stop_proc(proc)


def stop_all_serves() -> None:
    """Terminate every ``ollama serve`` this process started."""
    for key in list(_serve_procs.keys()):
        proc = _serve_procs.pop(key, None)
        if proc is not None:
            _stop_proc(proc)


def registered_hosts() -> list[str]:
    """Hosts currently tracked (tests / diagnostics)."""
    return list(_serve_procs.keys())


def clear_registry() -> None:
    """Drop tracked PIDs without stopping them (tests only)."""
    _serve_procs.clear()


def _stop_proc(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    try:
        proc.terminate()
        try:
            proc.wait(timeout=5)
            return
        except subprocess.TimeoutExpired:
            pass
        if sys.platform != "win32":
            try:
                import signal

                os.killpg(proc.pid, signal.SIGKILL)
                proc.wait(timeout=5)
                return
            except (ProcessLookupError, PermissionError, OSError):
                pass
        proc.kill()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pass
    except Exception:  # noqa: BLE001
        return


def ensure_shutdown_hooks() -> None:
    """Register ``atexit`` (+ Unix SIGTERM chain) once."""
    global _shutdown_hooks_installed
    if _shutdown_hooks_installed:
        return
    _shutdown_hooks_installed = True
    atexit.register(stop_all_serves)
    if sys.platform == "win32":
        return
    try:
        import signal
    except ImportError:  # pragma: no cover
        return
    try:
        prev = signal.getsignal(signal.SIGTERM)
    except (ValueError, OSError):
        return

    def _on_sigterm(signum: int, frame: Any) -> None:
        stop_all_serves()
        if callable(prev):
            prev(signum, frame)
            return
        signal.signal(signum, signal.SIG_DFL)
        os.kill(os.getpid(), signum)

    try:
        signal.signal(signal.SIGTERM, _on_sigterm)
    except (ValueError, OSError):
        pass
