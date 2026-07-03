"""Detect edge / embedded platforms (Jetson, etc.) vs generic PC hosts."""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

_PLATFORM_JETSON = "jetson"
_PLATFORM_PC = "pc"

_KNOWN_PLATFORMS = frozenset({_PLATFORM_JETSON, _PLATFORM_PC, "edge"})


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace").strip()
    except OSError:
        return ""


def is_jetson_tegra() -> bool:
    """True when running on NVIDIA Jetson (Tegra) hardware."""
    if Path("/etc/nv_tegra_release").is_file():
        return True
    model = _read_text(Path("/proc/device-tree/model")).lower()
    if not model:
        return False
    return "nvidia" in model and any(x in model for x in ("jetson", "orin", "xavier", "nano"))


def detect_jetpack_major() -> int | None:
    """Parse JetPack L4T major revision from /etc/nv_tegra_release (e.g. R36 -> 36)."""
    raw = _read_text(Path("/etc/nv_tegra_release"))
    if not raw:
        return None
    m = re.search(r"#\s*R(\d+)", raw, re.IGNORECASE)
    if not m:
        return None
    try:
        return int(m.group(1))
    except ValueError:
        return None


def detect_edge_platform() -> str:
    """
    Resolve host platform profile.

    Override with ``AGENTIC_EDGE_PLATFORM`` (``jetson``, ``pc``, ``edge``).
    Auto-detects Jetson via Tegra markers when unset.
    """
    raw = os.getenv("AGENTIC_EDGE_PLATFORM", "").strip().lower()
    if raw in ("jetson", "tegra", "orin", "nano", "xavier"):
        return _PLATFORM_JETSON
    if raw in ("pc", "desktop", "server"):
        return _PLATFORM_PC
    if raw == "edge":
        return "edge"
    if raw and raw in _KNOWN_PLATFORMS:
        return raw
    if is_jetson_tegra():
        return _PLATFORM_JETSON
    return _PLATFORM_PC


def edge_platform_summary() -> dict[str, Any]:
    """Structured platform facts for logging and the web UI."""
    platform = detect_edge_platform()
    out: dict[str, Any] = {"platform": platform}
    if platform == _PLATFORM_JETSON:
        out["jetpack_major"] = detect_jetpack_major()
        tegra = _read_text(Path("/etc/nv_tegra_release"))
        if tegra:
            out["tegra_release"] = tegra.splitlines()[0].lstrip("# ").strip()
        model = _read_text(Path("/proc/device-tree/model"))
        if model:
            out["device_model"] = model
    return out


def apply_edge_platform_env_defaults() -> dict[str, Any]:
    """
    Set process env defaults for edge hosts (does not override explicit env).

    Called once near orchestrator startup.
    """
    summary = edge_platform_summary()
    platform = str(summary.get("platform") or _PLATFORM_PC)
    if not os.getenv("AGENTIC_EDGE_PLATFORM", "").strip():
        os.environ["AGENTIC_EDGE_PLATFORM"] = platform
    if platform == _PLATFORM_JETSON:
        os.environ.setdefault("AGENTIC_ASSUME_GPU", "1")
    return summary
