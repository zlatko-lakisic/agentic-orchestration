"""Per-tool isolated venv, wheel install, and MCP HTTP server subprocess lifecycle."""

from __future__ import annotations

import importlib
import os
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


def _runtime_key(*, user_id: str, app_id: str, client_id: str) -> str:
    return f"{user_id}::{app_id}::{client_id}"


def allocate_loopback_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def sandbox_root(tool_root: Path, *, user_id: str, app_id: str, client_id: str) -> Path:
    safe_user = user_id.replace("/", "_").replace("\\", "_") or "anonymous"
    safe_app = app_id.replace("/", "_").replace("\\", "_") or "default"
    safe_client = client_id.replace("/", "_").replace("\\", "_")
    return tool_root / "_tool_sandbox" / safe_user / safe_app / safe_client


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
            subprocess.run(
                [sys.executable, "-m", "venv", str(venv_dir)],
                check=True,
                capture_output=True,
                text=True,
            )
        if sys.platform == "win32":
            py = venv_dir / "Scripts" / "python.exe"
        else:
            py = venv_dir / "bin" / "python"
        if not py.is_file():
            raise ToolSandboxError(f"failed to create venv at {venv_dir}")
        subprocess.run([str(py), "-m", "pip", "install", "-U", "pip", "wheel"], check=True)
        self.venv_python = py
        return py

    def install_wheel(self, wheel_path: Path) -> None:
        py = self.ensure_venv()
        if not wheel_path.is_file():
            raise ToolSandboxError(f"wheel not found: {wheel_path}")
        subprocess.run(
            [str(py), "-m", "pip", "install", "--force-reinstall", str(wheel_path)],
            check=True,
            capture_output=True,
            text=True,
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

        run_env = os.environ.copy()
        run_env["AGENTIC_TOOL_PORT"] = str(port)
        if env:
            run_env.update({k: str(v) for k, v in env.items()})

        self.log_path = self.root / "server.log"
        log_fp = open(self.log_path, "a", encoding="utf-8")  # noqa: SIM115
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


def stop_all_runtimes_for_tests() -> None:
    with _lock:
        runtimes = list(_runtimes.values())
        _runtimes.clear()
    for runtime in runtimes:
        runtime.stop()


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
    runtime = ToolSandboxRuntime(
        manifest=manifest,
        user_id=user_id,
        app_id=app_id,
        root=root,
    )
    runtime.start_http_server(wheel_path=wheel_path, env=env)
    register_runtime(runtime)
    return runtime
