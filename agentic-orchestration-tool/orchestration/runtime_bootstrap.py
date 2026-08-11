"""Auto-bootstrap Python and selected agent runtimes at startup.

Controlled by ``AGENTIC_AUTO_ENSURE_RUNTIME`` (default: on).

When enabled:
- Ensure a usable Python venv + ``requirements.txt`` if core imports fail.
- For each Ollama agent used in a run, install Ollama for the platform if missing,
  start ``ollama serve`` when unhealthy, and pull the configured model.

Kubernetes executions keep legacy behaviour (only ``selfcontained: true`` agents
auto-ensure) unless ``AGENTIC_AUTO_ENSURE_RUNTIME=1`` is forced.
"""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable, Sequence


def _env_truthy(name: str, default: str = "1") -> bool:
    return os.getenv(name, default).strip().lower() not in ("0", "false", "no", "off")


def auto_ensure_runtime_enabled() -> bool:
    """Master switch for Python + provider auto-install."""
    return _env_truthy("AGENTIC_AUTO_ENSURE_RUNTIME", "1")


def should_ensure_ollama(*, selfcontained: bool) -> bool:
    """
    Decide whether to install/serve/pull Ollama for an agent.

    Respects ``AGENTIC_OLLAMA_MODE`` (see ``orchestration.ollama_ownership``):
    - ``external`` / ``managed_k8s``: never spawn in this process.
    - ``managed_process``: allow install + spawn (+ pull).
    - ``auto``: healthy API → external (no spawn); else k8s → no spawn; else spawn.
    """
    from orchestration.ollama_ownership import (
        MODE_MANAGED_PROCESS,
        resolve_ollama_mode,
    )

    mode = resolve_ollama_mode()
    if mode != MODE_MANAGED_PROCESS:
        return False

    if not auto_ensure_runtime_enabled():
        return bool(selfcontained)

    return True


def _tool_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _venv_python(tool_root: Path | None = None) -> Path:
    root = tool_root or _tool_root()
    if platform.system().lower().startswith("win"):
        return root / ".venv" / "Scripts" / "python.exe"
    return root / ".venv" / "bin" / "python"


def _emit(msg: str, *, progress: bool = True) -> None:
    prefix = "(progress) " if progress else ""
    try:
        sys.__stderr__.write(f"{prefix}{msg}\n")
        sys.__stderr__.flush()
    except Exception:  # noqa: BLE001
        pass


def _run(cmd: Sequence[str], *, timeout: int = 600) -> None:
    subprocess.run(list(cmd), check=True, timeout=timeout)


def _can_import_core(python_exe: str | None = None) -> bool:
    """Return True if dotenv (and preferably crewai) import in the target interpreter."""
    py = python_exe or sys.executable
    code = "import dotenv\n"
    try:
        chk = subprocess.run(
            [py, "-c", code],
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )
        return chk.returncode == 0
    except Exception:  # noqa: BLE001
        return False


def _install_python_via_platform() -> None:
    system = platform.system().lower()
    _emit("Python missing or unusable — attempting platform install…")
    try:
        if "windows" in system:
            _run(
                [
                    "winget",
                    "install",
                    "--id",
                    "Python.Python.3.12",
                    "-e",
                    "--accept-package-agreements",
                    "--accept-source-agreements",
                ],
                timeout=900,
            )
            return
        if "darwin" in system:
            if shutil.which("brew") is None:
                raise RuntimeError("Homebrew is required to install Python on macOS.")
            _run(["brew", "install", "python@3.12"], timeout=900)
            return
        # Linux: try apt when available (may require sudo privileges).
        if shutil.which("apt-get"):
            apt = ["apt-get", "install", "-y", "python3", "python3-venv", "python3-pip"]
            if os.geteuid() != 0 and shutil.which("sudo"):
                apt = ["sudo", *apt]
            _run(apt, timeout=900)
            return
        raise RuntimeError(
            "No supported package manager found to install Python. "
            "Install Python 3.12+ manually and retry."
        )
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(
            "Failed to install Python automatically. Install Python 3.12+ and retry."
        ) from exc


def _resolve_bootstrap_python() -> str:
    """Prefer an existing interpreter suitable for creating a venv."""
    candidates = [
        os.getenv("AGENTIC_BOOTSTRAP_PYTHON", "").strip(),
        shutil.which("python3.12") or "",
        shutil.which("python3") or "",
        shutil.which("python") or "",
        sys.executable,
    ]
    for c in candidates:
        if not c:
            continue
        try:
            chk = subprocess.run(
                [c, "-c", "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)"],
                check=False,
                capture_output=True,
                timeout=20,
            )
            if chk.returncode == 0:
                return c
        except Exception:  # noqa: BLE001
            continue
    return ""


def ensure_python_runtime(*, tool_root: Path | None = None) -> str:
    """
    Ensure ``.venv`` exists and requirements are installed.

    Returns the Python executable path that should be used for subsequent work
    when possible (venv python). Does not replace the current process.
    """
    if not auto_ensure_runtime_enabled():
        return sys.executable

    root = tool_root or _tool_root()
    venv_py = _venv_python(root)
    requirements = root / "requirements.txt"

    if venv_py.is_file() and _can_import_core(str(venv_py)):
        return str(venv_py)

    bootstrap_py = _resolve_bootstrap_python()
    if not bootstrap_py:
        if auto_ensure_runtime_enabled():
            _install_python_via_platform()
            bootstrap_py = _resolve_bootstrap_python()
        if not bootstrap_py:
            raise RuntimeError(
                "Python 3.10+ is required. Install it (winget/brew/apt) and retry."
            )

    if not venv_py.is_file():
        _emit(f"Creating Python venv at {root / '.venv'} …")
        _run([bootstrap_py, "-m", "venv", str(root / ".venv")], timeout=180)

    if not venv_py.is_file():
        raise RuntimeError(f"Failed to create venv python at {venv_py}")

    if not _can_import_core(str(venv_py)):
        if not requirements.is_file():
            raise RuntimeError(f"Missing requirements.txt at {requirements}")
        _emit("Installing Python dependencies into .venv …")
        _run([str(venv_py), "-m", "pip", "install", "--upgrade", "pip"], timeout=300)
        _run(
            [str(venv_py), "-m", "pip", "install", "-r", str(requirements)],
            timeout=900,
        )

    if not _can_import_core(str(venv_py)):
        raise RuntimeError(
            "Python dependencies are still missing after install. "
            f"Try: {venv_py} -m pip install -r {requirements}"
        )

    # Soft hint when the running interpreter is not the venv.
    try:
        if Path(sys.executable).resolve() != venv_py.resolve():
            _emit(
                f"Note: running under {sys.executable}; recommended: {venv_py}",
                progress=False,
            )
    except Exception:  # noqa: BLE001
        pass

    return str(venv_py)


def ensure_ollama_for_agent(
    *,
    model: str,
    host: str,
    selfcontained: bool,
) -> None:
    """Install/serve/pull Ollama when policy allows."""
    if not should_ensure_ollama(selfcontained=selfcontained):
        return
    from agent_providers.ollama_provider import ensure_ollama_runtime, normalize_ollama_host

    model_clean = str(model or "").removeprefix("ollama/").strip()
    if not model_clean:
        raise RuntimeError("Ollama agent is missing a model id")
    host_n = normalize_ollama_host(host or os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434"))
    _emit(f"Ensuring Ollama runtime for model '{model_clean}' at {host_n} …")
    ensure_ollama_runtime(model=model_clean, host=host_n)


def ensure_planner_runtime_if_ollama() -> None:
    """If AGENTIC_PLANNER_MODEL is an Ollama model, ensure install/serve/pull."""
    if not auto_ensure_runtime_enabled():
        return
    raw = os.getenv("AGENTIC_PLANNER_MODEL", "").strip()
    if not raw:
        return
    low = raw.casefold()
    provider = os.getenv("AGENTIC_PLANNER_PROVIDER", "").strip().lower()
    if not (low.startswith("ollama/") or provider == "ollama"):
        return
    model = raw.removeprefix("ollama/").strip() or "llama3.2"
    host = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
    ensure_ollama_for_agent(model=model, host=host, selfcontained=True)


def bootstrap_tool_runtime(*, tool_root: Path | None = None) -> None:
    """Entry point for ``main.py``: Python first, then planner Ollama if needed."""
    if not auto_ensure_runtime_enabled():
        return
    ensure_python_runtime(tool_root=tool_root)
    try:
        ensure_planner_runtime_if_ollama()
    except Exception as exc:  # noqa: BLE001
        # Planner ensure is best-effort at process start; agents still ensure on init.
        _emit(f"Planner Ollama ensure skipped/failed: {exc}", progress=False)


def ensure_provider_payloads(
    payloads: Sequence[dict[str, Any]],
    *,
    progress: Callable[[str], None] | None = None,
) -> None:
    """
    Ensure runtimes for agent-provider YAML payloads selected for a run.

    Called from the runner before/alongside ``initialize()``.
    """
    if not auto_ensure_runtime_enabled():
        return
    log = progress or (lambda m: _emit(m))
    for data in payloads:
        if not isinstance(data, dict):
            continue
        ptype = str(data.get("type") or data.get("provider_type") or "").strip().lower()
        if ptype != "ollama":
            continue
        model = str(data.get("model") or "").strip()
        pid = str(data.get("id") or "").strip()
        if pid.startswith("client."):
            from orchestration.session_overlay_runtime import ensure_client_agent_ollama_runtime

            msg = f"Ensuring Ollama for session agent '{pid}' ({model})…"
            log(msg)
            if progress is not None:
                _emit(msg)
            ensure_client_agent_ollama_runtime(data, on_progress=progress or log)
            continue
        host = str(data.get("ollama_host") or os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434"))
        if str(host).strip().casefold() == "workflow":
            from agent_providers.ollama_provider import litellm_api_base_for_ollama

            host = litellm_api_base_for_ollama()
        selfcontained = bool(data.get("selfcontained", False))
        msg = f"Ensuring Ollama for agent '{data.get('id', '?')}' ({model})…"
        log(msg)
        if progress is not None:
            # ``progress`` is the daemon sink; still mirror to stderr for CLI logs.
            _emit(msg)
        ensure_ollama_for_agent(model=model, host=host, selfcontained=selfcontained)
