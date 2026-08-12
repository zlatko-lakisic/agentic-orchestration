"""Resolve Ollama install/runtime backend (native vs Jetson container) for edge hosts."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from orchestration.edge_platform import detect_edge_platform, detect_jetpack_major

_RUNTIME_NATIVE = "native"
_RUNTIME_JETSON_CONTAINER = "jetson-container"
_RUNTIME_MANAGED_K8S = "managed_k8s"
_RUNTIME_NONE = "none"


def _env_flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in ("1", "true", "yes", "on")


def _run(cmd: list[str], *, timeout: float = 8.0) -> subprocess.CompletedProcess[str] | None:
    try:
        return subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None


def jetson_ollama_container_image() -> str | None:
    """
    Recommended dustynv/ollama tag for this JetPack generation.

    See https://forums.developer.nvidia.com/t/introducing-ollama-support-for-jetson-devices/289333
    and jetson-containers packages/llm/ollama.
    """
    override = os.getenv("AGENTIC_JETSON_OLLAMA_IMAGE", "").strip()
    if override:
        return override
    major = detect_jetpack_major()
    if major is None:
        return None
    if major >= 36:
        return "dustynv/ollama:r36.2.0"
    if major >= 35:
        return "dustynv/ollama:r35.4.1"
    return None


def _detect_native_ollama() -> dict[str, Any] | None:
    bin_path = shutil.which("ollama")
    if not bin_path:
        for candidate in ("/usr/local/bin/ollama", "/usr/bin/ollama"):
            if Path(candidate).is_file():
                bin_path = candidate
                break
    if not bin_path:
        return None
    version = ""
    proc = _run([bin_path, "--version"])
    if proc and proc.stdout:
        version = proc.stdout.strip()
    elif proc and proc.stderr:
        version = proc.stderr.strip()
    systemd_active = False
    if shutil.which("systemctl"):
        st = _run(["systemctl", "is-active", "ollama.service"])
        systemd_active = bool(st and st.stdout.strip() == "active")
    return {
        "binary": bin_path,
        "version": version,
        "systemd_active": systemd_active,
    }


def _detect_jetson_container_ollama() -> dict[str, Any] | None:
    if not shutil.which("docker"):
        return None
    proc = _run(
        ["docker", "ps", "--format", "{{.Image}}"],
        timeout=12.0,
    )
    if not proc or proc.returncode != 0:
        return None
    for line in (proc.stdout or "").splitlines():
        image = line.strip()
        if not image:
            continue
        if "dustynv/ollama" in image.lower() or image.lower().startswith("ollama:"):
            return {"image": image, "running": True}
    recommended = jetson_ollama_container_image()
    if not recommended:
        return None
    img_proc = _run(["docker", "image", "inspect", recommended], timeout=12.0)
    if img_proc and img_proc.returncode == 0:
        return {"image": recommended, "running": False, "image_present": True}
    return None


def resolve_ollama_runtime_preference() -> str:
    raw = os.getenv("AGENTIC_OLLAMA_RUNTIME", "auto").strip().lower()
    if raw in (_RUNTIME_NATIVE, _RUNTIME_JETSON_CONTAINER, "container", "jetson"):
        if raw in ("container", "jetson"):
            return _RUNTIME_JETSON_CONTAINER
        return raw
    return "auto"


def detect_ollama_runtime() -> dict[str, Any]:
    """
    Detect which Ollama backend is active or should be used.

    Returns dict with ``backend`` in ``native``, ``jetson-container``,
    ``managed_k8s``, or ``none``, plus diagnostic fields for logging.
    """
    pref = resolve_ollama_runtime_preference()
    native = _detect_native_ollama()
    container = _detect_jetson_container_ollama()
    platform = detect_edge_platform()
    ollama_mode = os.getenv("AGENTIC_OLLAMA_MODE", "").strip().lower()

    if ollama_mode == _RUNTIME_MANAGED_K8S:
        backend = _RUNTIME_MANAGED_K8S
    elif pref == _RUNTIME_JETSON_CONTAINER:
        if container and container.get("running"):
            backend = _RUNTIME_JETSON_CONTAINER
        elif native:
            backend = _RUNTIME_NATIVE
        else:
            backend = _RUNTIME_NONE
    elif pref == _RUNTIME_NATIVE:
        if native:
            backend = _RUNTIME_NATIVE
        elif container and container.get("running"):
            backend = _RUNTIME_JETSON_CONTAINER
        else:
            backend = _RUNTIME_NONE
    else:
        if platform == "jetson":
            if container and container.get("running"):
                backend = _RUNTIME_JETSON_CONTAINER
            elif native:
                backend = _RUNTIME_NATIVE
            else:
                backend = _RUNTIME_NONE
        else:
            if native:
                backend = _RUNTIME_NATIVE
            elif container and container.get("running"):
                backend = _RUNTIME_JETSON_CONTAINER
            else:
                backend = _RUNTIME_NONE

    api_raw = (
        os.getenv("OLLAMA_API_BASE", "").strip()
        or os.getenv("OLLAMA_HOST", "").strip()
        or "http://127.0.0.1:11434"
    )
    if "://" not in api_raw:
        api_raw = f"http://{api_raw}"
    parsed = urlparse(api_raw)
    api_base = f"{parsed.scheme}://{parsed.hostname or '127.0.0.1'}:{parsed.port or 11434}"

    return {
        "backend": backend,
        "preference": pref,
        "platform": platform,
        "api_base": api_base,
        "native": native,
        "container": container,
        "mode": ollama_mode or None,
        "recommended_container_image": jetson_ollama_container_image(),
    }


def format_ollama_runtime_log_line(info: dict[str, Any] | None = None) -> str:
    data = info if info is not None else detect_ollama_runtime()
    backend = str(data.get("backend") or _RUNTIME_NONE)
    platform = str(data.get("platform") or detect_edge_platform())
    parts = [f"platform={platform}", f"ollama_runtime={backend}"]
    native = data.get("native")
    if isinstance(native, dict) and native.get("version"):
        parts.append(f"native_version={native['version']}")
    container = data.get("container")
    if isinstance(container, dict) and container.get("image"):
        running = "running" if container.get("running") else "stopped"
        parts.append(f"container_image={container['image']} ({running})")
    rec = data.get("recommended_container_image")
    if rec and backend == _RUNTIME_NATIVE and platform == "jetson":
        parts.append(f"jetson_container_available={rec}")
    parts.append(f"api_base={data.get('api_base', '')}")
    return "(agentic) " + "; ".join(parts)


def apply_ollama_runtime_env_defaults() -> dict[str, Any]:
    """Record detected runtime in env when not explicitly set."""
    info = detect_ollama_runtime()
    if not os.getenv("AGENTIC_OLLAMA_RUNTIME", "").strip():
        os.environ["AGENTIC_OLLAMA_RUNTIME"] = str(info.get("backend") or _RUNTIME_NONE)
    return info


def install_ollama_for_platform() -> None:
    """
    Install or enable Ollama appropriate for this host.

  - Jetson + ``AGENTIC_OLLAMA_RUNTIME=jetson-container``: start dustynv container (host network).
  - Jetson + auto/native: upstream install.sh (CUDA-enabled ARM64 binary per NVIDIA forum).
  - Other Linux: upstream install.sh.
    """
    from agent_providers.ollama_provider import install_ollama_native_linux, is_ollama_healthy

    pref = resolve_ollama_runtime_preference()
    platform = detect_edge_platform()
    api_base = (
        os.getenv("OLLAMA_API_BASE", "").strip()
        or os.getenv("OLLAMA_HOST", "").strip()
        or "http://127.0.0.1:11434"
    )
    if is_ollama_healthy(api_base if "://" in api_base else f"http://{api_base}"):
        return

    want_container = pref == _RUNTIME_JETSON_CONTAINER or (
        pref == "auto" and platform == "jetson" and _env_flag("AGENTIC_OLLAMA_PREFER_JETSON_CONTAINER")
    )
    if want_container and platform == "jetson":
        _install_jetson_container_ollama()
        return

    install_ollama_native_linux()


def _install_jetson_container_ollama() -> None:
    image = jetson_ollama_container_image()
    if not image:
        raise RuntimeError(
            "Jetson Ollama container image unknown for this JetPack version. "
            "Set AGENTIC_JETSON_OLLAMA_IMAGE or use AGENTIC_OLLAMA_RUNTIME=native."
        )
    if not shutil.which("docker"):
        raise RuntimeError(
            "Docker is required for jetson-container Ollama. "
            "Install Docker or set AGENTIC_OLLAMA_RUNTIME=native."
        )
    models_dir = os.getenv("AGENTIC_JETSON_OLLAMA_MODELS_DIR", "").strip() or str(
        Path.home() / "ollama"
    )
    Path(models_dir).mkdir(parents=True, exist_ok=True)
    name = os.getenv("AGENTIC_JETSON_OLLAMA_CONTAINER_NAME", "jetson-ollama").strip()
    # Stop native service to free port 11434.
    if shutil.which("systemctl"):
        subprocess.run(
            ["systemctl", "stop", "ollama.service"],
            capture_output=True,
            check=False,
        )
    subprocess.run(["docker", "rm", "-f", name], capture_output=True, check=False)
    proc = subprocess.run(
        [
            "docker",
            "run",
            "--runtime",
            "nvidia",
            "-d",
            "--name",
            name,
            "--restart",
            "unless-stopped",
            "--network",
            "host",
            "-v",
            f"{models_dir}:/ollama",
            "-e",
            "OLLAMA_MODELS=/ollama",
            image,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(
            f"Failed to start Jetson Ollama container {image}: {err or 'unknown error'}"
        )


def runtime_status_json() -> str:
    from orchestration.edge_platform import apply_edge_platform_env_defaults

    edge = apply_edge_platform_env_defaults()
    ollama = apply_ollama_runtime_env_defaults()
    return json.dumps({"edge": edge, "ollama": ollama}, indent=2, default=str)
