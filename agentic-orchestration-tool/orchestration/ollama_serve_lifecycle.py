"""
Track and stop ``ollama serve`` processes spawned by this AO process.

Kept free of CrewAI so unit tests and the FastAPI lifespan can import it on a
CLI-only / serve-extras install. Only PIDs registered via ``register_serve`` are
stopped — a pre-existing user/systemd Ollama is never touched.

On Windows, children are placed in a Job Object with ``KILL_ON_JOB_CLOSE`` so a
force-kill of the AO/sidecar process (``taskkill /F``) still reaps Ollama and its
runners. ``terminate()`` alone is not enough: Ollama spawns descendants that
outlive the direct child.
"""

from __future__ import annotations

import atexit
import os
import subprocess
import sys
from dataclasses import dataclass
from typing import Any

_serve_entries: dict[str, "_ServeEntry"] = {}
_shutdown_hooks_installed = False


@dataclass
class _ServeEntry:
    proc: subprocess.Popen
    #: Windows Job Object handle (ctypes), or None on POSIX / when job creation failed.
    job: Any = None


def serve_key(host: str) -> str:
    return str(host or "").rstrip("/")


def register_serve(host: str, proc: subprocess.Popen, *, job: Any = None) -> None:
    """Remember an AO-spawned serve. ``job`` is an optional Windows Job Object handle."""
    key = serve_key(host)
    prev = _serve_entries.pop(key, None)
    if prev is not None:
        _stop_entry(prev)
    if job is None and sys.platform == "win32":
        job = _windows_assign_kill_on_close_job(proc)
    _serve_entries[key] = _ServeEntry(proc=proc, job=job)
    ensure_shutdown_hooks()


def stop_serve(host: str) -> None:
    entry = _serve_entries.pop(serve_key(host), None)
    if entry is not None:
        _stop_entry(entry)


def stop_all_serves() -> None:
    """Terminate every ``ollama serve`` this process started (and their descendants)."""
    for key in list(_serve_entries.keys()):
        entry = _serve_entries.pop(key, None)
        if entry is not None:
            _stop_entry(entry)


def registered_hosts() -> list[str]:
    """Hosts currently tracked (tests / diagnostics)."""
    return list(_serve_entries.keys())


def clear_registry() -> None:
    """Drop tracked PIDs without stopping them (tests only)."""
    for entry in _serve_entries.values():
        _windows_close_job(entry.job, terminate=False)
    _serve_entries.clear()


def spawn_ollama_serve(*, argv: list[str], env: dict[str, str]) -> tuple[subprocess.Popen, Any]:
    """
    Start ``ollama serve`` in a way that can be torn down with AO.

    Windows: no new session; assign to a kill-on-close Job Object when possible.
    POSIX: ``start_new_session=True`` so we can ``killpg`` the whole session.
    """
    if sys.platform == "win32":
        proc = subprocess.Popen(
            argv,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        job = _windows_assign_kill_on_close_job(proc)
        return proc, job
    proc = subprocess.Popen(
        argv,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    return proc, None


def _stop_entry(entry: _ServeEntry) -> None:
    proc = entry.proc
    pid = getattr(proc, "pid", None)
    # Prefer Job Object close on Windows — kills the whole tree atomically.
    if entry.job is not None:
        _windows_close_job(entry.job, terminate=True)
        entry.job = None
        try:
            proc.wait(timeout=5)
            return
        except Exception:  # noqa: BLE001
            pass
    if pid and sys.platform == "win32":
        _windows_taskkill_tree(pid)
        try:
            proc.wait(timeout=5)
        except Exception:  # noqa: BLE001
            pass
        return
    _stop_proc_posix_or_simple(proc)


def _stop_proc_posix_or_simple(proc: subprocess.Popen) -> None:
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


def _windows_taskkill_tree(pid: int) -> None:
    """Force-kill ``pid`` and all descendants (Ollama runners)."""
    try:
        subprocess.run(
            ["taskkill", "/PID", str(pid), "/T", "/F"],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
    except Exception:  # noqa: BLE001
        return


def _windows_assign_kill_on_close_job(proc: subprocess.Popen) -> Any:
    """Put ``proc`` in a Job Object that dies when the last handle closes."""
    if sys.platform != "win32":
        return None
    handle = getattr(proc, "_handle", None)
    if handle is None:
        return None
    try:
        import ctypes
        from ctypes import wintypes
    except ImportError:
        return None

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

    JobObjectExtendedLimitInformation = 9
    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000

    class IO_COUNTERS(ctypes.Structure):
        _fields_ = [
            ("ReadOperationCount", ctypes.c_uint64),
            ("WriteOperationCount", ctypes.c_uint64),
            ("OtherOperationCount", ctypes.c_uint64),
            ("ReadTransferCount", ctypes.c_uint64),
            ("WriteTransferCount", ctypes.c_uint64),
            ("OtherTransferCount", ctypes.c_uint64),
        ]

    class JOBOBJECT_BASIC_LIMIT_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("PerProcessUserTimeLimit", ctypes.c_int64),
            ("PerJobUserTimeLimit", ctypes.c_int64),
            ("LimitFlags", wintypes.DWORD),
            ("MinimumWorkingSetSize", ctypes.c_size_t),
            ("MaximumWorkingSetSize", ctypes.c_size_t),
            ("ActiveProcessLimit", wintypes.DWORD),
            ("Affinity", ctypes.c_size_t),
            ("PriorityClass", wintypes.DWORD),
            ("SchedulingClass", wintypes.DWORD),
        ]

    class JOBOBJECT_EXTENDED_LIMIT_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("BasicLimitInformation", JOBOBJECT_BASIC_LIMIT_INFORMATION),
            ("IoInfo", IO_COUNTERS),
            ("ProcessMemoryLimit", ctypes.c_size_t),
            ("JobMemoryLimit", ctypes.c_size_t),
            ("PeakProcessMemoryUsed", ctypes.c_size_t),
            ("PeakJobMemoryUsed", ctypes.c_size_t),
        ]

    CreateJobObjectW = kernel32.CreateJobObjectW
    CreateJobObjectW.argtypes = [wintypes.LPVOID, wintypes.LPCWSTR]
    CreateJobObjectW.restype = wintypes.HANDLE

    SetInformationJobObject = kernel32.SetInformationJobObject
    SetInformationJobObject.argtypes = [
        wintypes.HANDLE,
        ctypes.c_int,
        wintypes.LPVOID,
        wintypes.DWORD,
    ]
    SetInformationJobObject.restype = wintypes.BOOL

    AssignProcessToJobObject = kernel32.AssignProcessToJobObject
    AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
    AssignProcessToJobObject.restype = wintypes.BOOL

    job = CreateJobObjectW(None, None)
    if not job:
        return None

    info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION()
    info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    ok = SetInformationJobObject(
        job,
        JobObjectExtendedLimitInformation,
        ctypes.byref(info),
        ctypes.sizeof(info),
    )
    if not ok:
        kernel32.CloseHandle(job)
        return None

    proc_handle = wintypes.HANDLE(int(handle))
    if not AssignProcessToJobObject(job, proc_handle):
        # Already in a non-nested job, or access denied — fall back to taskkill on stop.
        kernel32.CloseHandle(job)
        return None
    return job


def _windows_close_job(job: Any, *, terminate: bool) -> None:
    if job is None or sys.platform != "win32":
        return
    try:
        import ctypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        if terminate:
            # Closing the last handle with KILL_ON_JOB_CLOSE terminates members.
            pass
        kernel32.CloseHandle(job)
    except Exception:  # noqa: BLE001
        return


def ensure_shutdown_hooks() -> None:
    """Register ``atexit``, Unix SIGTERM, and Windows console Ctrl handler once."""
    global _shutdown_hooks_installed
    if _shutdown_hooks_installed:
        return
    _shutdown_hooks_installed = True
    atexit.register(stop_all_serves)
    if sys.platform == "win32":
        _install_windows_console_handler()
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


def _install_windows_console_handler() -> None:
    """Ctrl+C / console close should stop AO-spawned Ollama before the process dies."""
    try:
        import ctypes
        from ctypes import wintypes
    except ImportError:
        return

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    HandlerRoutine = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.DWORD)

    @HandlerRoutine
    def _handler(ctrl_type: int) -> bool:
        # CTRL_C_EVENT=0, CTRL_BREAK=1, CTRL_CLOSE=2, CTRL_LOGOFF=5, CTRL_SHUTDOWN=6
        if ctrl_type in (0, 1, 2, 5, 6):
            stop_all_serves()
        return False  # let the default handler continue

    # Keep a module-level ref so the callback is not GC'd.
    global _win_ctrl_handler  # noqa: PLW0603
    _win_ctrl_handler = _handler
    kernel32.SetConsoleCtrlHandler(_handler, True)


_win_ctrl_handler = None
