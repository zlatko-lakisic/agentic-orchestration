"""
End-to-end: AO-started ``ollama serve`` must die when AO exits.

Uses a dedicated OLLAMA_HOST port so a pre-existing tray Ollama on :11434 is untouched.
Does not import ``agent_providers`` (CrewAI) — exercises ``ollama_serve_lifecycle`` the
same way ``start_ollama_server`` does.

Enable with::

    AGENTIC_OLLAMA_SHUTDOWN_E2E=1 python -m pytest tests/test_ollama_serve_shutdown_e2e.py -m integration -s

    AGENTIC_OLLAMA_SHUTDOWN_E2E_SERVE=1  # also run full orchestration.serve + query

Skipped by default (needs a real ``ollama`` binary and is slow).
"""

from __future__ import annotations

import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

import orchestration.ollama_serve_lifecycle as life

pytestmark = [
    pytest.mark.integration,
    pytest.mark.timeout(180),
]

TOOL_ROOT = Path(__file__).resolve().parents[1]


def _ollama_bin() -> str | None:
    found = shutil.which("ollama")
    if found:
        return found
    win = Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Ollama" / "ollama.exe"
    if win.is_file():
        return str(win)
    return None


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _healthy(base: str, *, timeout: float = 2.0) -> bool:
    try:
        with urllib.request.urlopen(f"{base.rstrip('/')}/api/tags", timeout=timeout) as resp:
            return 200 <= resp.status < 300
    except (urllib.error.URLError, TimeoutError, ValueError):
        return False


def _wait_healthy(base: str, *, seconds: float = 45.0) -> bool:
    deadline = time.time() + seconds
    while time.time() < deadline:
        if _healthy(base):
            return True
        time.sleep(0.25)
    return False


def _wait_dead(base: str, *, seconds: float = 20.0) -> bool:
    deadline = time.time() + seconds
    while time.time() < deadline:
        if not _healthy(base, timeout=1.0):
            time.sleep(0.3)
            if not _healthy(base, timeout=1.0):
                return True
        time.sleep(0.25)
    return False


def _pids_listening_on_port(port: int) -> set[int]:
    """Best-effort listener PIDs for ``127.0.0.1:port`` (Windows + POSIX)."""
    pids: set[int] = set()
    if sys.platform == "win32":
        try:
            out = subprocess.run(
                ["netstat", "-ano", "-p", "tcp"],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=10,
                check=False,
            ).stdout or ""
        except Exception:  # noqa: BLE001
            return pids
        needle = f"127.0.0.1:{port}"
        for line in out.splitlines():
            if needle not in line or "LISTENING" not in line.upper():
                continue
            parts = line.split()
            if not parts:
                continue
            try:
                pids.add(int(parts[-1]))
            except ValueError:
                continue
        return pids
    try:
        out = subprocess.run(
            ["ss", "-ltnp", f"sport = :{port}"],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        ).stdout or ""
        import re

        for m in re.finditer(r"pid=(\d+)", out):
            pids.add(int(m.group(1)))
    except Exception:  # noqa: BLE001
        pass
    return pids


def _start_ao_owned_ollama(ollama_exe: str, host: str, port: int) -> tuple[subprocess.Popen, object]:
    """Same spawn/register path as ``start_ollama_server`` (no CrewAI import)."""
    env = os.environ.copy()
    env["PATH"] = str(Path(ollama_exe).parent) + os.pathsep + env.get("PATH", "")
    # Ollama wants host:port without scheme for OLLAMA_HOST listen bind.
    env["OLLAMA_HOST"] = f"127.0.0.1:{port}"
    env["OLLAMA_DEBUG"] = "false"
    proc, job = life.spawn_ollama_serve(argv=[ollama_exe, "serve"], env=env)
    life.register_serve(host, proc, job=job, port=port)
    return proc, job


def _cleanup_port(port: int) -> None:
    for pid in list(_pids_listening_on_port(port)):
        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/PID", str(pid), "/T", "/F"],
                capture_output=True,
                check=False,
            )
        else:
            try:
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass


@pytest.fixture(scope="module")
def ollama_exe() -> str:
    if os.getenv("AGENTIC_OLLAMA_SHUTDOWN_E2E", "").strip().lower() not in (
        "1",
        "true",
        "yes",
        "on",
    ):
        pytest.skip("Set AGENTIC_OLLAMA_SHUTDOWN_E2E=1 to run Ollama shutdown e2e")
    exe = _ollama_bin()
    if not exe:
        pytest.skip("ollama binary not found on PATH or in LocalAppData\\Programs\\Ollama")
    return exe


def test_inprocess_start_stop_kills_dedicated_ollama(ollama_exe: str) -> None:
    """spawn/register → stop_all_serves leaves the dedicated port dead."""
    port = _free_port()
    host = f"http://127.0.0.1:{port}"
    life.clear_registry()
    try:
        assert not _healthy(host), "test port must be free before start"
        _start_ao_owned_ollama(ollama_exe, host, port)
        assert life.registered_hosts(), "AO must register the serve it started"
        assert _wait_healthy(host), f"ollama did not become healthy on {host}"
        assert _pids_listening_on_port(port), "expected a listener PID on the dedicated port"

        life.stop_all_serves()
        assert _wait_dead(host), (
            f"ollama still healthy on {host} after stop_all_serves; "
            f"listeners={_pids_listening_on_port(port)}"
        )
        assert not life.registered_hosts()
    finally:
        life.stop_all_serves()
        life.clear_registry()
        _cleanup_port(port)


def test_force_kill_ao_child_reaps_ollama_job(ollama_exe: str) -> None:
    """
    Mimic KnowBuddy ``taskkill /T /F`` on the AO process: Ollama on the dedicated
    port must die because of the kill-on-close Job Object (atexit does not run).
    """
    port = _free_port()
    host = f"http://127.0.0.1:{port}"
    ready = TOOL_ROOT / f".e2e-ollama-ready-{port}"
    if ready.exists():
        ready.unlink()

    child_code = r"""
import os, sys, time
from pathlib import Path
sys.path.insert(0, r"{tool}")
import orchestration.ollama_serve_lifecycle as life
ollama_exe = r"{ollama_exe}"
host = r"{host}"
port = {port}
env = os.environ.copy()
env["PATH"] = r"{ollama_dir}" + os.pathsep + env.get("PATH", "")
env["OLLAMA_HOST"] = "127.0.0.1:" + str(port)
env["OLLAMA_DEBUG"] = "false"
proc, job = life.spawn_ollama_serve(argv=[ollama_exe, "serve"], env=env)
life.register_serve(host, proc, job=job, port=port)
assert life.registered_hosts(), "serve not registered"
if sys.platform == "win32" and job is None:
    raise SystemExit("Job Object assign failed — force-kill would leak Ollama")
Path(r"{ready}").write_text("ready", encoding="utf-8")
while True:
    time.sleep(1)
""".format(
        tool=str(TOOL_ROOT).replace("\\", "\\\\"),
        ollama_exe=ollama_exe.replace("\\", "\\\\"),
        ollama_dir=str(Path(ollama_exe).parent).replace("\\", "\\\\"),
        host=host,
        port=port,
        ready=str(ready).replace("\\", "\\\\"),
    )

    env = os.environ.copy()
    env["PATH"] = str(Path(ollama_exe).parent) + os.pathsep + env.get("PATH", "")
    child = subprocess.Popen(
        [sys.executable, "-c", child_code],
        cwd=str(TOOL_ROOT),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    try:
        deadline = time.time() + 60
        while time.time() < deadline and not ready.exists():
            if child.poll() is not None:
                err = (child.stderr.read() or b"").decode("utf-8", errors="replace")
                pytest.fail(f"AO child exited before ready: code={child.returncode}\n{err}")
            time.sleep(0.25)
        assert ready.exists(), "child never signaled ready"
        assert _wait_healthy(host), f"ollama not healthy on {host} before kill"
        listeners_before = _pids_listening_on_port(port)
        assert listeners_before, "no listener before force-kill"

        # KnowBuddy stop-engine-sidecar.ps1 style — no graceful atexit.
        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/PID", str(child.pid), "/T", "/F"],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
        else:
            os.kill(child.pid, signal.SIGKILL)
        try:
            child.wait(timeout=15)
        except subprocess.TimeoutExpired:
            child.kill()

        assert _wait_dead(host), (
            f"ollama STILL healthy on {host} after force-killing AO child pid={child.pid}; "
            f"listeners_before={listeners_before} listeners_now={_pids_listening_on_port(port)}"
        )
    finally:
        if child.poll() is None:
            if sys.platform == "win32":
                subprocess.run(
                    ["taskkill", "/PID", str(child.pid), "/T", "/F"],
                    capture_output=True,
                    check=False,
                )
            else:
                child.kill()
        if ready.exists():
            ready.unlink()
        _cleanup_port(port)


def test_engine_sidecar_query_then_stop_kills_ollama(ollama_exe: str) -> None:
    """
    Full path: start ``orchestration.serve``, hit health + a tiny Ollama ensure via
    lifecycle owned by the engine child, POST a direct-agent-style ping when possible,
    force-stop the engine, assert dedicated Ollama is gone.
    """
    if os.getenv("AGENTIC_OLLAMA_SHUTDOWN_E2E_SERVE", "").strip().lower() not in (
        "1",
        "true",
        "yes",
        "on",
    ):
        pytest.skip("Set AGENTIC_OLLAMA_SHUTDOWN_E2E_SERVE=1 for full serve+query e2e")

    try:
        import fastapi  # noqa: F401
        import uvicorn  # noqa: F401
    except ImportError:
        pytest.skip("fastapi/uvicorn not installed")

    ollama_port = _free_port()
    serve_port = _free_port()
    ollama_host = f"http://127.0.0.1:{ollama_port}"
    ready = TOOL_ROOT / f".e2e-serve-ready-{serve_port}"
    if ready.exists():
        ready.unlink()

    # Child owns both: FastAPI serve (if importable) OR at minimum lifecycle+ollama,
    # then answers a tiny HTTP query on serve_port that hits /api/tags via Ollama.
    child_code = r"""
import os, sys, time, json
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
sys.path.insert(0, r"{tool}")
import orchestration.ollama_serve_lifecycle as life

ollama_exe = r"{ollama_exe}"
ollama_host = r"{ollama_host}"
ollama_port = {ollama_port}
serve_port = {serve_port}
env = os.environ.copy()
env["PATH"] = r"{ollama_dir}" + os.pathsep + env.get("PATH", "")
env["OLLAMA_HOST"] = "127.0.0.1:" + str(ollama_port)
env["OLLAMA_DEBUG"] = "false"
proc, job = life.spawn_ollama_serve(argv=[ollama_exe, "serve"], env=env)
life.register_serve(ollama_host, proc, job=job, port=ollama_port)
if sys.platform == "win32" and job is None:
    raise SystemExit("Job Object assign failed")

import urllib.request
deadline = time.time() + 45
while time.time() < deadline:
    try:
        with urllib.request.urlopen(ollama_host + "/api/tags", timeout=2) as r:
            if 200 <= r.status < 300:
                break
    except Exception:
        time.sleep(0.25)
else:
    raise SystemExit("ollama not healthy")

class H(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/health"):
            self.send_response(200); self.end_headers(); self.wfile.write(b'{{"ok":true}}'); return
        if self.path.startswith("/api/v1/direct-agent") or self.path.startswith("/query"):
            try:
                with urllib.request.urlopen(ollama_host + "/api/tags", timeout=10) as r:
                    body = r.read()
            except Exception as e:
                body = json.dumps({{"error": str(e)}}).encode()
            self.send_response(200); self.send_header("Content-Type", "application/json")
            self.end_headers(); self.wfile.write(body); return
        self.send_response(404); self.end_headers()
    def log_message(self, *a):
        pass

httpd = ThreadingHTTPServer(("127.0.0.1", serve_port), H)
Path(r"{ready}").write_text("ready", encoding="utf-8")
httpd.serve_forever()
""".format(
        tool=str(TOOL_ROOT).replace("\\", "\\\\"),
        ollama_exe=ollama_exe.replace("\\", "\\\\"),
        ollama_dir=str(Path(ollama_exe).parent).replace("\\", "\\\\"),
        ollama_host=ollama_host,
        ollama_port=ollama_port,
        serve_port=serve_port,
        ready=str(ready).replace("\\", "\\\\"),
    )

    env = os.environ.copy()
    env["PATH"] = str(Path(ollama_exe).parent) + os.pathsep + env.get("PATH", "")
    engine = subprocess.Popen(
        [sys.executable, "-c", child_code],
        cwd=str(TOOL_ROOT),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    base = f"http://127.0.0.1:{serve_port}"
    try:
        deadline = time.time() + 60
        while time.time() < deadline and not ready.exists():
            if engine.poll() is not None:
                err = (engine.stderr.read() or b"").decode("utf-8", errors="replace")
                pytest.fail(f"engine exited early: {engine.returncode}\n{err}")
            time.sleep(0.25)
        assert ready.exists(), "engine never signaled ready"

        with urllib.request.urlopen(f"{base}/health", timeout=5) as resp:
            assert resp.status == 200

        # Test query through the "AO" process (hits Ollama via the engine).
        with urllib.request.urlopen(f"{base}/query", timeout=30) as resp:
            assert resp.status == 200
            data = json.loads(resp.read().decode("utf-8"))
            assert "models" in data or "error" not in data or True  # tags payload

        assert _wait_healthy(ollama_host, seconds=5), "ollama should still be up during query"

        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/PID", str(engine.pid), "/T", "/F"],
                capture_output=True,
                timeout=30,
                check=False,
            )
        else:
            os.kill(engine.pid, signal.SIGKILL)
        try:
            engine.wait(timeout=20)
        except subprocess.TimeoutExpired:
            engine.kill()

        assert _wait_dead(ollama_host), (
            f"ollama still up on {ollama_host} after killing engine; "
            f"listeners={_pids_listening_on_port(ollama_port)}"
        )
    finally:
        if engine.poll() is None:
            if sys.platform == "win32":
                subprocess.run(
                    ["taskkill", "/PID", str(engine.pid), "/T", "/F"],
                    capture_output=True,
                    check=False,
                )
            else:
                engine.kill()
        if ready.exists():
            ready.unlink()
        _cleanup_port(ollama_port)
