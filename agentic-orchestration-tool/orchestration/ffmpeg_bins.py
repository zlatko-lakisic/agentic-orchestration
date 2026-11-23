"""Resolve ``ffmpeg`` / ``ffprobe`` for media render and video helpers.

Prefers ``AGENTIC_VIDEO_FFMPEG`` / ``AGENTIC_VIDEO_FFPROBE``, then ``PATH``,
then common host/container locations (edge pods often need hostPath mounts).
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Any

__all__ = [
    "ffmpeg_bin",
    "ffprobe_bin",
    "ffmpeg_health",
    "resolve_media_binary",
]

_CANDIDATE_DIRS = (
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/opt/ffmpeg/bin",
    "/host/usr/bin",
    "/host/usr/local/bin",
)


def _is_executable(path: Path) -> bool:
    try:
        return path.is_file() and os.access(path, os.X_OK)
    except OSError:
        return False


def resolve_media_binary(
    name: str,
    *,
    env_var: str,
    paired_from: str | None = None,
) -> str:
    """Return an absolute path when possible; otherwise the configured name."""
    raw = (os.getenv(env_var) or "").strip()
    if raw:
        path = Path(raw)
        if _is_executable(path):
            return str(path.resolve())
        if "/" in raw or "\\" in raw:
            return raw
        found = shutil.which(raw)
        if found:
            return found
        return raw

    if paired_from:
        paired = Path(paired_from)
        sibling = paired.with_name(name)
        if _is_executable(sibling):
            return str(sibling.resolve())
        text = str(paired_from)
        if text.endswith("ffmpeg"):
            guess = Path(text[: -len("ffmpeg")] + name)
            if _is_executable(guess):
                return str(guess.resolve())

    found = shutil.which(name)
    if found:
        return found

    for directory in _CANDIDATE_DIRS:
        candidate = Path(directory) / name
        if _is_executable(candidate):
            return str(candidate.resolve())
    return name


def ffmpeg_bin() -> str:
    return resolve_media_binary("ffmpeg", env_var="AGENTIC_VIDEO_FFMPEG")


def ffprobe_bin() -> str:
    if (os.getenv("AGENTIC_VIDEO_FFPROBE") or "").strip():
        return resolve_media_binary("ffprobe", env_var="AGENTIC_VIDEO_FFPROBE")
    return resolve_media_binary(
        "ffprobe",
        env_var="AGENTIC_VIDEO_FFPROBE",
        paired_from=ffmpeg_bin(),
    )


def ffmpeg_health() -> dict[str, Any]:
    ff = ffmpeg_bin()
    probe = ffprobe_bin()
    ff_ok = _is_executable(Path(ff)) or (shutil.which(ff) is not None)
    probe_ok = _is_executable(Path(probe)) or (shutil.which(probe) is not None)
    return {
        "ok": bool(ff_ok and probe_ok),
        "ffmpeg": ff,
        "ffprobe": probe,
        "ffmpegFound": bool(ff_ok),
        "ffprobeFound": bool(probe_ok),
    }
