"""Detect host hardware capabilities and filter provider catalog entries."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from typing import Any

_ARCH_CPU = "cpu"
_ARCH_GPU = "gpu"
_ARCH_TPU = "tpu"
_KNOWN_ARCHS = frozenset({_ARCH_CPU, _ARCH_GPU, _ARCH_TPU})


def _env_flag(name: str) -> bool:
    v = os.getenv(name, "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _parse_architectures(raw: Any) -> set[str]:
    """
    Normalize architecture declarations to {"cpu","gpu","tpu"}.

    Accepted forms:
    - scalar string: "gpu" or "cpu,gpu"
    - list/tuple: ["gpu", "tpu"]
    """
    out: set[str] = set()
    if raw is None:
        return out
    if isinstance(raw, str):
        for part in re.split(r"[\s,;/|]+", raw.strip().lower()):
            if part in _KNOWN_ARCHS:
                out.add(part)
        return out
    if isinstance(raw, (list, tuple)):
        for item in raw:
            out.update(_parse_architectures(item))
        return out
    return out


def provider_required_architectures(entry: dict[str, Any]) -> set[str]:
    """
    Resolve a provider's required runtimes (`cpu`/`gpu`/`tpu`).

    Priority:
    1) ``hardware.architecture`` (preferred)
    2) ``architectures`` (legacy/shortcut)
    3) defaults by provider type
    """
    hardware = entry.get("hardware")
    hardware_arch_raw: Any = None
    if isinstance(hardware, dict):
        hardware_arch_raw = hardware.get("architecture")
    required = _parse_architectures(hardware_arch_raw)
    if required:
        return required

    required = _parse_architectures(entry.get("architectures"))
    if required:
        return required

    # By default, local Ollama models can run on CPU or GPU.
    typ = str(entry.get("type", "")).strip().lower()
    if typ == "ollama":
        return {_ARCH_CPU, _ARCH_GPU}
    # Cloud/backends without explicit local runtime constraints remain unrestricted.
    return set()


def detect_available_architectures() -> set[str]:
    """
    Detect available local runtimes.

    - Always includes CPU.
    - GPU when NVIDIA tooling is present (or user override).
    - TPU based on common TPU runtime env markers (or user override).
    """
    override = _parse_architectures(os.getenv("AGENTIC_AVAILABLE_ARCHITECTURES", ""))
    if override:
        return override

    out = {_ARCH_CPU}
    if _env_flag("AGENTIC_ASSUME_GPU") or shutil.which("nvidia-smi") is not None:
        out.add(_ARCH_GPU)
    if (
        _env_flag("AGENTIC_ASSUME_TPU")
        or os.getenv("COLAB_TPU_ADDR", "").strip()
        or os.getenv("TPU_NAME", "").strip()
        or os.getenv("TPU_WORKER_ID", "").strip()
        or os.getenv("XRT_TPU_CONFIG", "").strip()
        or os.getenv("LIBTPU_INIT_ARGS", "").strip()
        or os.getenv("PJRT_DEVICE", "").strip().lower() == "tpu"
    ):
        out.add(_ARCH_TPU)
    return out


def provider_min_vram_gb(entry: dict[str, Any]) -> float | None:
    """Explicit minimum from YAML: ``min_vram_gb`` or ``hardware.min_vram_gb``."""
    raw = entry.get("min_vram_gb")
    if raw is None and isinstance(entry.get("hardware"), dict):
        raw = entry["hardware"].get("min_vram_gb")
    if raw is None:
        return None
    try:
        v = float(raw)
        return v if v > 0 else None
    except (TypeError, ValueError):
        return None


def _heuristic_min_vram_gb_for_ollama_model(model: str) -> float | None:
    """Rough local VRAM needs when YAML omits ``min_vram_gb`` (full catalog coverage)."""
    m = model.strip().lower()
    if not m:
        return None
    if re.search(r"\b(405|272|132|120|80|72|70|65|60)b\b", m):
        return 40.0
    if re.search(r"\b(40|36|34|32|30)b\b", m):
        return 22.0
    if any(
        x in m
        for x in (
            "mixtral",
            "qwq",
            "magistral",
            "granite4",
            "deepseek-v3",
            "deepseek-v2.5",
            "deepseek-v2",
        )
    ):
        return 16.0
    if any(
        x in m
        for x in (
            "deepseek-r1",
            "deepscaler",
            "openthinker",
            "lfm2.5-thinking",
            "phi4-reasoning",
        )
    ):
        return 14.0
    if any(x in m for x in ("vision", "vl-", "-vl", "llava", "moondream", "minicpm-v", "qwen2.5vl", "qwen3-vl")):
        return 10.0
    if any(x in m for x in ("codestral", "qwen3-coder-next", "devstral", "15b", "13b")):
        return 12.0
    if any(x in m for x in ("tinyllama", "smollm", "1b", "2b", "3b")):
        return 4.0
    # Typical 7B / small instruct class
    return 8.0


def effective_min_vram_gb(entry: dict[str, Any]) -> float | None:
    """Requirement used for filtering: explicit YAML, else optional Ollama heuristic."""
    explicit = provider_min_vram_gb(entry)
    if explicit is not None:
        return explicit
    if os.getenv("AGENTIC_VRAM_HEURISTICS", "1").strip().lower() in ("0", "false", "no", "off"):
        return None
    typ = str(entry.get("type", "")).strip().lower()
    if typ != "ollama":
        return None
    return _heuristic_min_vram_gb_for_ollama_model(str(entry.get("model", "")))


def detect_max_nvidia_vram_gb() -> float | None:
    """Largest single-GPU dedicated memory via ``nvidia-smi`` (GiB). None if unavailable."""
    override = os.getenv("AGENTIC_ASSUME_VRAM_GB", "").strip()
    if override:
        try:
            v = float(override)
            return v if v > 0 else None
        except ValueError:
            pass

    if shutil.which("nvidia-smi") is None:
        return None
    try:
        out = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=memory.total",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=8,
            check=False,
        )
        if out.returncode != 0 or not (out.stdout or "").strip():
            return None
        mib_values: list[float] = []
        for line in out.stdout.strip().splitlines():
            part = line.strip()
            if not part:
                continue
            try:
                mib_values.append(float(part.split(",")[0].strip()))
            except ValueError:
                continue
        if not mib_values:
            return None
        max_mib = max(mib_values)
        return max_mib / 1024.0
    except (OSError, subprocess.TimeoutExpired):
        return None


def _apply_vram_caps(vram_gb: float) -> float:
    """
    Apply user-defined VRAM caps.

    - AGENTIC_MAX_VRAM_GB: absolute cap in GiB
    - AGENTIC_MAX_VRAM_FRACTION: multiplier in (0, 1]; e.g. 0.7 to treat 8 GiB as 5.6 GiB
    """
    v = float(vram_gb)

    frac_raw = os.getenv("AGENTIC_MAX_VRAM_FRACTION", "").strip()
    if frac_raw:
        try:
            frac = float(frac_raw)
            if frac > 0:
                v *= min(1.0, frac)
        except ValueError:
            pass

    cap_raw = os.getenv("AGENTIC_MAX_VRAM_GB", "").strip()
    if cap_raw:
        try:
            cap = float(cap_raw)
            if cap > 0:
                v = min(v, cap)
        except ValueError:
            pass

    return v


def filter_catalog_by_vram(
    entries: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str], float | None]:
    """Drop agent-provider catalog entries whose ``effective_min_vram_gb`` exceeds detected VRAM."""
    if os.getenv("AGENTIC_DISABLE_HARDWARE_FILTER", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    ):
        return list(entries), [], None

    vram = detect_max_nvidia_vram_gb()
    if vram is None:
        return list(entries), [], None
    vram = _apply_vram_caps(vram)

    kept: list[dict[str, Any]] = []
    excluded: list[str] = []
    for e in entries:
        req = effective_min_vram_gb(e)
        pid = str(e.get("id", "")).strip()
        if req is None:
            kept.append(e)
            continue
        if vram >= req:
            kept.append(e)
        elif pid:
            excluded.append(pid)

    return kept, excluded, vram


def filter_catalog_by_architecture(
    entries: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str], set[str]]:
    """
    Drop catalog entries that require an unavailable architecture.

    Entries with no declared architecture are treated as unrestricted.
    """
    if os.getenv("AGENTIC_DISABLE_HARDWARE_FILTER", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    ):
        return list(entries), [], set()

    available = detect_available_architectures()
    kept: list[dict[str, Any]] = []
    excluded: list[str] = []
    for e in entries:
        req = provider_required_architectures(e)
        pid = str(e.get("id", "")).strip()
        if not req or req.intersection(available):
            kept.append(e)
        elif pid:
            excluded.append(pid)
    return kept, excluded, available


def filter_catalog_by_hardware(
    entries: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str], float | None, set[str]]:
    """
    Apply architecture and VRAM filtering.

    Returns: (kept_entries, excluded_ids, detected_vram_gb_or_none, available_architectures)
    """
    arch_kept, arch_excluded, available_arch = filter_catalog_by_architecture(entries)
    vram_kept, vram_excluded, vram = filter_catalog_by_vram(arch_kept)
    return vram_kept, [*arch_excluded, *vram_excluded], vram, available_arch
