"""Per-tool venv, wheel install, and MCP HTTP server subprocess lifecycle.

This is dependency isolation (a venv per tool) plus a minimal process environment. It
is **not** an OS sandbox: the tool runs as the daemon's user and can reach the network
and the filesystem that user can. Treat uploading a custom tool as operator-level code
execution; the manifest ``permissions`` block is checked at admission only.
"""

from __future__ import annotations

import importlib
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

from orchestration.custom_tool_contract import CustomToolManifest

_lock = threading.RLock()
_runtimes: dict[str, "ToolSandboxRuntime"] = {}


class ToolSandboxError(RuntimeError):
    """Sandbox install/start/stop failure."""


#: pip can hang on a dead index; never pin a worker thread forever.
PIP_TIMEOUT_SECONDS = 600
VENV_TIMEOUT_SECONDS = 180

#: Process environment the tool server inherits. Everything else — provider keys,
#: ``AGENTIC_*`` secrets, tokens — is withheld.
_BASE_ENV_ALLOWLIST = (
    "PATH",
    "HOME",
    "USER",
    "LOGNAME",
    "LANG",
    "LANGUAGE",
    "LC_ALL",
    "LC_CTYPE",
    "TZ",
    "TMPDIR",
    "TMP",
    "TEMP",
    "SYSTEMROOT",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
    "SSL_CERT_FILE",
    "SSL_CERT_DIR",
    "REQUESTS_CA_BUNDLE",
)

_ENV_NAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def env_passthrough_names() -> frozenset[str]:
    """Process env names the operator lets custom tools read
    (``AGENTIC_CUSTOM_TOOL_ENV_PASSTHROUGH``, comma list). Empty by default."""
    raw = os.getenv("AGENTIC_CUSTOM_TOOL_ENV_PASSTHROUGH", "")
    return frozenset(n.strip() for n in raw.split(",") if _ENV_NAME_RE.match(n.strip()))


def build_tool_env(
    *,
    port: int,
    manifest: CustomToolManifest,
    activation_env: dict[str, str] | None = None,
) -> dict[str, str]:
    """
    Minimal environment for a tool server.

    Order: basic OS variables, then process variables the manifest declares
    (``permissions.env`` / ``requiredEnv``) **and** the operator has listed in
    ``AGENTIC_CUSTOM_TOOL_ENV_PASSTHROUGH``, then the activation env supplied with the
    request. A manifest cannot grant itself the daemon's secrets by naming them.
    """
    env: dict[str, str] = {}
    for name in _BASE_ENV_ALLOWLIST:
        value = os.environ.get(name)
        if value is not None:
            env[name] = value
    declared = {*manifest.permissions.env, *manifest.required_env}
    for name in sorted(declared & env_passthrough_names()):
        value = os.environ.get(name)
        if value is not None:
            env[name] = value
    for name, value in (activation_env or {}).items():
        if _ENV_NAME_RE.match(str(name)):
            env[str(name)] = str(value)
    env["AGENTIC_TOOL_PORT"] = str(port)
    return env


def _safe_segment(value: str, fallback: str) -> str:
    cleaned = str(value or "").replace("/", "_").replace("\\", "_").replace("\x00", "_")
    if cleaned in ("", ".", ".."):
        return fallback
    return cleaned


def _run_checked(cmd: list[str], *, timeout: float, what: str) -> None:
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        raise ToolSandboxError(f"{what} timed out after {timeout:g}s") from exc
    except subprocess.CalledProcessError as exc:
        tail = (exc.stderr or exc.stdout or "").strip()[-1500:]
        raise ToolSandboxError(f"{what} failed (exit {exc.returncode}): {tail}") from exc
    except OSError as exc:
        raise ToolSandboxError(f"{what} failed: {exc}") from exc


def _runtime_key(*, user_id: str, app_id: str, client_id: str) -> str:
    return f"{user_id}::{app_id}::{client_id}"


def allocate_loopback_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def sandbox_root(tool_root: Path, *, user_id: str, app_id: str, client_id: str) -> Path:
    base = (tool_root / "_tool_sandbox").resolve()
    root = (
        base
        / _safe_segment(user_id, "anonymous")
        / _safe_segment(app_id, "default")
        / _safe_segment(client_id, "tool")
    ).resolve()
    if base not in root.parents:
        raise ToolSandboxError("sandbox path escapes the sandbox root")
    return root


@dataclass
class ToolSandboxRuntime:
    manifest: CustomToolManifest
    user_id: str
    app_id: str
    root: Path
    venv_python: Path | None = None
    port: int | None = None
    base_url: str | None = None
    process: subprocess.Popen[Any] | None = None
    started_at: float = 0.0
    log_path: Path | None = None
    _stopped: bool = field(default=False, repr=False)

    @property
    def client_id(self) -> str:
        return self.manifest.client_id

    @property
    def runtime_key(self) -> str:
        return _runtime_key(
            user_id=self.user_id,
            app_id=self.app_id,
            client_id=self.client_id,
        )

    def ensure_venv(self) -> Path:
        if self.venv_python is not None and self.venv_python.is_file():
            return self.venv_python
        self.root.mkdir(parents=True, exist_ok=True)
        venv_dir = self.root / ".venv"
        if venv_dir.exists():
            if sys.platform == "win32":
                py_candidate = venv_dir / "Scripts" / "python.exe"
            else:
                py_candidate = venv_dir / "bin" / "python"
            if not py_candidate.is_file():
                shutil.rmtree(venv_dir, ignore_errors=True)
        if not venv_dir.exists():
            _run_checked(
                [sys.executable, "-m", "venv", str(venv_dir)],
                timeout=VENV_TIMEOUT_SECONDS,
                what="venv creation",
            )
        if sys.platform == "win32":
            py = venv_dir / "Scripts" / "python.exe"
        else:
            py = venv_dir / "bin" / "python"
        if not py.is_file():
            raise ToolSandboxError(f"failed to create venv at {venv_dir}")
        _run_checked(
            [str(py), "-m", "pip", "install", "-U", "pip", "wheel"],
            timeout=PIP_TIMEOUT_SECONDS,
            what="pip bootstrap",
        )
        self.venv_python = py
        return py

    def install_wheel(self, wheel_path: Path) -> None:
        py = self.ensure_venv()
        if not wheel_path.is_file():
            raise ToolSandboxError(f"wheel not found: {wheel_path}")
        _run_checked(
            [str(py), "-m", "pip", "install", "--force-reinstall", str(wheel_path)],
            timeout=PIP_TIMEOUT_SECONDS,
            what="wheel install",
        )

    def _http_entrypoint(self) -> tuple[str, str]:
        module = self.manifest.http_module
        if not module:
            raise ToolSandboxError("manifest has no entrypoints.mcp (or http_module)")
        return module, self.manifest.http_callable

    def start_http_server(
        self,
        *,
        wheel_path: Path,
        env: dict[str, str] | None = None,
        startup_timeout_s: float = 15.0,
    ) -> str:
        if self.process is not None and self.process.poll() is None:
            return str(self.base_url or "")

        self.install_wheel(wheel_path)
        py = self.ensure_venv()
        port = allocate_loopback_port()
        module_name, callable_name = self._http_entrypoint()

        launcher = (
            "import importlib, os, sys; "
            f"mod = importlib.import_module({module_name!r}); "
            f"fn = getattr(mod, {callable_name!r}); "
            f"port = int(os.environ['AGENTIC_TOOL_PORT']); "
            "fn(port=port)"
        )

        # Never ``os.environ.copy()``: the daemon's environment holds every provider
        # key and operator secret, and this process runs client-supplied code.
        run_env = build_tool_env(port=port, manifest=self.manifest, activation_env=env)

        self.log_path = self.root / "server.log"
        # The child keeps its own copy of the descriptor; close ours right away.
        with open(self.log_path, "a", encoding="utf-8") as log_fp:
            self.process = subprocess.Popen(
                [str(py), "-c", launcher],
                env=run_env,
                stdout=log_fp,
                stderr=subprocess.STDOUT,
                cwd=str(self.root),
            )
        self.port = port
        self.base_url = f"http://127.0.0.1:{port}"
        self.started_at = time.time()

        deadline = time.time() + startup_timeout_s
        health_url = f"{self.base_url}{self.manifest.healthcheck.path}"
        last_err = ""
        while time.time() < deadline:
            if self.process.poll() is not None:
                tail = ""
                if self.log_path and self.log_path.is_file():
                    tail = self.log_path.read_text(encoding="utf-8", errors="replace")[-2000:]
                raise ToolSandboxError(
                    f"tool server exited early (code {self.process.returncode}): {tail}"
                )
            try:
                req = Request(health_url, method="GET")
                with urlopen(req, timeout=1.0) as resp:
                    if 200 <= resp.status < 300:
                        return self.base_url
            except URLError as exc:
                last_err = str(exc)
            except Exception as exc:  # noqa: BLE001
                last_err = str(exc)
            time.sleep(0.15)

        self.stop()
        raise ToolSandboxError(
            f"tool server healthcheck timed out at {health_url}: {last_err}"
        )

    def stop(self) -> None:
        self._stopped = True
        proc = self.process
        self.process = None
        if proc is None:
            return
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5.0)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=3.0)

    def cleanup(self, *, remove_tree: bool = False) -> None:
        self.stop()
        if remove_tree and self.root.exists():
            shutil.rmtree(self.root, ignore_errors=True)

    def mcp_entry(self) -> dict[str, Any]:
        if not self.base_url:
            raise ToolSandboxError("sandbox server is not running")
        desc = self.manifest.description or f"Custom tool {self.manifest.tool_id}"
        return {
            "id": self.manifest.client_id,
            "description": desc,
            "streamable_http": {
                "url": f"{self.base_url.rstrip('/')}/mcp",
                "headers": {},
            },
            "sandbox": {
                "toolId": self.manifest.tool_id,
                "toolVersion": self.manifest.tool_version,
                "baseUrl": self.base_url,
                "appId": self.app_id,
            },
        }

    def status(self) -> dict[str, Any]:
        running = self.process is not None and self.process.poll() is None
        return {
            "clientId": self.manifest.client_id,
            "toolId": self.manifest.tool_id,
            "toolVersion": self.manifest.tool_version,
            "appId": self.app_id,
            "userId": self.user_id,
            "running": running,
            "baseUrl": self.base_url,
            "port": self.port,
            "startedAt": self.started_at or None,
            "logPath": str(self.log_path) if self.log_path else None,
        }


def get_runtime(*, user_id: str, app_id: str, client_id: str) -> ToolSandboxRuntime | None:
    key = _runtime_key(user_id=user_id, app_id=app_id, client_id=client_id)
    with _lock:
        return _runtimes.get(key)


def register_runtime(runtime: ToolSandboxRuntime) -> None:
    with _lock:
        _runtimes[runtime.runtime_key] = runtime


def remove_runtime(*, user_id: str, app_id: str, client_id: str) -> ToolSandboxRuntime | None:
    key = _runtime_key(user_id=user_id, app_id=app_id, client_id=client_id)
    with _lock:
        return _runtimes.pop(key, None)


def list_runtimes(*, user_id: str | None = None, app_id: str | None = None) -> list[ToolSandboxRuntime]:
    with _lock:
        items = list(_runtimes.values())
    if user_id is not None:
        items = [r for r in items if r.user_id == user_id]
    if app_id is not None:
        items = [r for r in items if r.app_id == app_id]
    return items


def stop_all_runtimes() -> int:
    """Stop every tool server (daemon shutdown). Returns how many were tracked."""
    with _lock:
        runtimes = list(_runtimes.values())
        _runtimes.clear()
    for runtime in runtimes:
        try:
            runtime.stop()
        except Exception:  # noqa: BLE001 — keep stopping the rest
            pass
    return len(runtimes)


def stop_all_runtimes_for_tests() -> None:
    stop_all_runtimes()


_start_locks: dict[str, threading.Lock] = {}


def _start_lock_for(key: str) -> threading.Lock:
    with _lock:
        lock = _start_locks.get(key)
        if lock is None:
            lock = _start_locks[key] = threading.Lock()
        return lock


def start_tool_sandbox(
    *,
    tool_root: Path,
    manifest: CustomToolManifest,
    wheel_path: Path,
    user_id: str,
    app_id: str,
    env: dict[str, str] | None = None,
) -> ToolSandboxRuntime:
    root = sandbox_root(tool_root, user_id=user_id, app_id=app_id, client_id=manifest.client_id)
    key = _runtime_key(user_id=user_id, app_id=app_id, client_id=manifest.client_id)
    # One start per tool at a time: two concurrent activations would otherwise both
    # launch a server and the second registration would orphan the first process.
    with _start_lock_for(key):
        existing = get_runtime(user_id=user_id, app_id=app_id, client_id=manifest.client_id)
        if existing is not None and existing.process is not None and existing.process.poll() is None:
            return existing
        runtime = ToolSandboxRuntime(
            manifest=manifest,
            user_id=user_id,
            app_id=app_id,
            root=root,
        )
        runtime.start_http_server(wheel_path=wheel_path, env=env)
        register_runtime(runtime)
        return runtime
