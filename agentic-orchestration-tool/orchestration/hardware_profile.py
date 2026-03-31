"""Detect host GPU memory and filter provider catalog entries by ``min_vram_gb``."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from typing import Any


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
