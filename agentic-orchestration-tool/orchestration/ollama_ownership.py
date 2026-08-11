"""Ollama ownership modes: external, managed_process, or managed_k8s.

``AGENTIC_OLLAMA_MODE``:
  - ``auto`` (default): healthy configured API base → external; else k8s → managed_k8s;
    else managed_process
  - ``external``: use ``OLLAMA_API_BASE`` / ``OLLAMA_HOST`` only (never spawn)
  - ``managed_process``: AO owns a child ``ollama serve``
  - ``managed_k8s``: AO owns Deployment ``agentic-ollama`` (in-cluster Service)
"""

from __future__ import annotations

import json
import os
import signal
import time
from pathlib import Path
from typing import Any, Literal

OllamaMode = Literal["external", "managed_process", "managed_k8s"]

MODE_EXTERNAL: OllamaMode = "external"
MODE_MANAGED_PROCESS: OllamaMode = "managed_process"
MODE_MANAGED_K8S: OllamaMode = "managed_k8s"

K8S_OLLAMA_SERVICE_BASE = "http://agentic-ollama:11434"
K8S_OLLAMA_DEPLOYMENT = "agentic-ollama"


def _env_truthy(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() not in ("0", "false", "no", "off", "")


def configured_api_base() -> str:
    raw = (
        os.getenv("OLLAMA_API_BASE", "").strip()
        or os.getenv("OLLAMA_HOST", "").strip()
        or "http://127.0.0.1:11434"
    )
    if "://" not in raw:
        raw = f"http://{raw}"
    return raw.rstrip("/")


def _is_healthy(api_base: str) -> bool:
    from agent_providers.ollama_provider import is_ollama_healthy

    return is_ollama_healthy(api_base)


def in_kubernetes() -> bool:
    if os.path.isdir("/var/run/secrets/kubernetes.io/serviceaccount"):
        return True
    backend = os.getenv("AGENTIC_EXECUTION_BACKEND", "").strip().lower()
    return backend == "kubernetes"


def parse_ollama_mode_raw(raw: str | None = None) -> str:
    value = (raw if raw is not None else os.getenv("AGENTIC_OLLAMA_MODE", "auto")).strip().lower()
    aliases = {
        "auto": "auto",
        "external": MODE_EXTERNAL,
        "managed": MODE_MANAGED_PROCESS,
        "managed_process": MODE_MANAGED_PROCESS,
        "process": MODE_MANAGED_PROCESS,
        "child": MODE_MANAGED_PROCESS,
        "managed_k8s": MODE_MANAGED_K8S,
        "k8s": MODE_MANAGED_K8S,
        "kubernetes": MODE_MANAGED_K8S,
    }
    return aliases.get(value, "auto")


def resolve_ollama_mode(
    *,
    healthy: bool | None = None,
    in_k8s: bool | None = None,
    env_mode: str | None = None,
) -> OllamaMode:
    """Resolve effective ownership mode."""
    mode = parse_ollama_mode_raw(env_mode)
    if mode in (MODE_EXTERNAL, MODE_MANAGED_PROCESS, MODE_MANAGED_K8S):
        return mode  # type: ignore[return-value]

    # auto
    if healthy is None:
        healthy = _is_healthy(configured_api_base())
    if healthy:
        return MODE_EXTERNAL
    k8s = in_kubernetes() if in_k8s is None else bool(in_k8s)
    if k8s:
        return MODE_MANAGED_K8S
    return MODE_MANAGED_PROCESS


def ollama_pid_path(tool_root: Path | None = None) -> Path:
    root = tool_root or Path(
        os.getenv("AGENTIC_TOOL_ROOT")
        or Path(__file__).resolve().parent.parent
    )
    return root / "var" / "agentic-ollama" / "serve.pid"


def write_managed_serve_pid(pid: int, *, tool_root: Path | None = None) -> None:
    path = ollama_pid_path(tool_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(str(int(pid)), encoding="utf-8")


def read_managed_serve_pid(*, tool_root: Path | None = None) -> int | None:
    path = ollama_pid_path(tool_root)
    try:
        raw = path.read_text(encoding="utf-8").strip()
        return int(raw) if raw else None
    except (OSError, ValueError):
        return None


def clear_managed_serve_pid(*, tool_root: Path | None = None) -> None:
    path = ollama_pid_path(tool_root)
    try:
        path.unlink(missing_ok=True)  # type: ignore[call-arg]
    except TypeError:
        if path.is_file():
            path.unlink()
    except OSError:
        pass


def _pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def stop_managed_process_ollama(*, tool_root: Path | None = None) -> dict[str, Any]:
    """Stop AO-tracked child serve (in-process registry + pid file)."""
    from orchestration.ollama_serve_lifecycle import stop_all_serves

    stop_all_serves()
    pid = read_managed_serve_pid(tool_root=tool_root)
    killed = False
    if pid and _pid_alive(pid):
        try:
            os.kill(pid, signal.SIGTERM)
            for _ in range(20):
                if not _pid_alive(pid):
                    break
                time.sleep(0.25)
            if _pid_alive(pid):
                os.kill(pid, signal.SIGKILL)
            killed = True
        except OSError:
            pass
    clear_managed_serve_pid(tool_root=tool_root)
    return {"stopped": True, "pid": pid, "killed": killed}


def start_managed_process_ollama(*, host: str | None = None) -> dict[str, Any]:
    from agent_providers.ollama_provider import is_ollama_healthy, start_ollama_server
    from orchestration.ollama_serve_lifecycle import registered_hosts

    base = host or configured_api_base()
    if not is_ollama_healthy(base):
        start_ollama_server(base)
    # Best-effort pid file from registry after spawn
    try:
        from orchestration import ollama_serve_lifecycle as life

        hosts = registered_hosts()
        for h in hosts:
            entry = life._serve_entries.get(life.serve_key(h))  # noqa: SLF001
            if entry is not None and getattr(entry.proc, "pid", None):
                write_managed_serve_pid(int(entry.proc.pid))
                break
    except Exception:  # noqa: BLE001
        pass
    return {"started": True, "apiBase": base, "healthy": is_ollama_healthy(base)}


def restart_managed_ollama(*, tool_root: Path | None = None) -> dict[str, Any]:
    """Restart AO-owned Ollama for the current mode."""
    mode = resolve_ollama_mode()
    if mode == MODE_EXTERNAL:
        raise RuntimeError("Ollama is external — AO does not own the process")
    if mode == MODE_MANAGED_K8S:
        raise RuntimeError(
            "Ollama is managed_k8s — restart the agentic-ollama Deployment via Control / kubectl"
        )
    stop = stop_managed_process_ollama(tool_root=tool_root)
    start = start_managed_process_ollama()
    return {"ok": True, "mode": mode, "stop": stop, "start": start}


def ollama_status(
    *,
    healthy: bool | None = None,
    in_k8s: bool | None = None,
    deployment_present: bool | None = None,
) -> dict[str, Any]:
    base = configured_api_base()
    if healthy is None:
        healthy = _is_healthy(base)
    mode = resolve_ollama_mode(healthy=healthy, in_k8s=in_k8s)
    owned = mode in (MODE_MANAGED_PROCESS, MODE_MANAGED_K8S)
    restartable = False
    reason = None
    if mode == MODE_EXTERNAL:
        reason = f"External Ollama at {base} (set AGENTIC_OLLAMA_MODE=managed_* to own it)"
    elif mode == MODE_MANAGED_PROCESS:
        restartable = True
    elif mode == MODE_MANAGED_K8S:
        if deployment_present is False:
            reason = "Deployment agentic-ollama is not present"
            restartable = False
        else:
            restartable = deployment_present is not False
            if not healthy and deployment_present is None:
                reason = "Waiting for agentic-ollama Service"
    return {
        "mode": mode,
        "owned": owned,
        "apiBase": base,
        "healthy": bool(healthy),
        "restartable": restartable,
        "reason": reason,
        "deployment": K8S_OLLAMA_DEPLOYMENT if mode == MODE_MANAGED_K8S else None,
        "serviceBase": K8S_OLLAMA_SERVICE_BASE if mode == MODE_MANAGED_K8S else None,
    }


def should_spawn_ollama_process(*, selfcontained: bool = False) -> bool:
    """True when bootstrap may install/spawn a local ``ollama serve``."""
    mode = resolve_ollama_mode()
    if mode == MODE_EXTERNAL:
        return False
    if mode == MODE_MANAGED_K8S:
        return False
    if mode == MODE_MANAGED_PROCESS:
        return True
    # auto already resolved above
    return False


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="AO Ollama ownership helpers")
    parser.add_argument("cmd", choices=["status", "restart", "mode"])
    args = parser.parse_args()
    if args.cmd == "mode":
        print(resolve_ollama_mode())
        return
    if args.cmd == "status":
        print(json.dumps(ollama_status(), indent=2))
        return
    print(json.dumps(restart_managed_ollama(), indent=2))


if __name__ == "__main__":
    main()
