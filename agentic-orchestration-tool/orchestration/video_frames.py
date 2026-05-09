"""
Extract evenly spaced JPEG frames from local video files using ffmpeg.

Used so downstream planner + vision models can reason over still frames when
native video tensors are not wired through CrewAI.
"""

from __future__ import annotations

import json
import math
import os
import shutil
import subprocess
from pathlib import Path


_FRAME_META = ".agentic_video_frames_meta.json"


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _ffmpeg_bin() -> str:
    return (os.getenv("AGENTIC_VIDEO_FFMPEG") or "ffmpeg").strip() or "ffmpeg"


def _ffprobe_bin() -> str:
    return (os.getenv("AGENTIC_VIDEO_FFPROBE") or "ffprobe").strip() or "ffprobe"


def probe_duration_seconds(video_path: Path, *, ffprobe_bin: str | None = None) -> float | None:
    bin_name = ffprobe_bin or _ffprobe_bin()
    try:
        proc = subprocess.run(
            [
                bin_name,
                "-hide_banner",
                "-loglevel",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(video_path),
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=60,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if proc.returncode != 0:
        return None
    try:
        v = float((proc.stdout or "").strip().splitlines()[0])
    except (IndexError, ValueError):
        return None
    if v <= 0 or math.isnan(v):
        return None
    return v


def _cache_dir(video_path: Path) -> Path:
    return video_path.parent / f"{video_path.name}.agentic_frames"


def _cache_load_meta(cache_dir: Path) -> dict | None:
    p = cache_dir / _FRAME_META
    if not p.is_file():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _cache_write_meta(cache_dir: Path, *, video: Path, max_frames: int, max_width: int) -> None:
    try:
        st = video.stat()
        payload = {
            "video": str(video.resolve()),
            "size": st.st_size,
            "mtime_ns": getattr(st, "st_mtime_ns", int(st.st_mtime * 1e9)),
            "max_frames": max_frames,
            "max_width": max_width,
        }
        (cache_dir / _FRAME_META).write_text(json.dumps(payload), encoding="utf-8")
    except OSError:
        pass


def _cached_frames_if_valid(
    cache_dir: Path,
    video: Path,
    *,
    max_frames: int,
    max_width: int,
) -> list[Path] | None:
    meta = _cache_load_meta(cache_dir)
    if not isinstance(meta, dict):
        return None
    try:
        st = video.stat()
    except OSError:
        return None
    if meta.get("size") != st.st_size:
        return None
    mtime_ns = getattr(st, "st_mtime_ns", int(st.st_mtime * 1e9))
    if meta.get("mtime_ns") != mtime_ns:
        return None
    if int(meta.get("max_frames") or 0) != max_frames or int(meta.get("max_width") or 0) != max_width:
        return None
    frames = sorted(cache_dir.glob("frame_*.jpg"))
    if not frames:
        return None
    return frames


def extract_video_frames(
    video_path: Path,
    *,
    max_frames: int | None = None,
    max_width: int | None = None,
    ffmpeg_bin: str | None = None,
    ffprobe_bin: str | None = None,
    reuse_cache: bool | None = None,
) -> list[Path]:
    """
    Write ``frame_001.jpg``, … under ``<video>.agentic_frames/`` next to the video file.

    Returns sorted frame paths, or an empty list if ffmpeg/ffprobe is unavailable or extraction fails.
    """
    mf_default = max(1, min(64, _env_int("AGENTIC_VIDEO_MAX_FRAMES", 16)))
    mw_default = max(320, min(2048, _env_int("AGENTIC_VIDEO_FRAME_MAX_WIDTH", 896)))
    max_frames = mf_default if max_frames is None else max(1, min(64, max_frames))
    max_width = mw_default if max_width is None else max(320, min(2048, max_width))

    if reuse_cache is None:
        reuse_cache = os.getenv("AGENTIC_VIDEO_FRAME_CACHE", "1").strip().lower() not in (
            "0",
            "false",
            "no",
            "off",
        )

    ffmpeg_exe = ffmpeg_bin or _ffmpeg_bin()
    ffprobe_exe = ffprobe_bin or _ffprobe_bin()

    cache_dir = _cache_dir(video_path)
    if reuse_cache:
        hit = _cached_frames_if_valid(
            cache_dir,
            video_path,
            max_frames=max_frames,
            max_width=max_width,
        )
        if hit is not None:
            return hit

    duration = probe_duration_seconds(video_path, ffprobe_bin=ffprobe_exe)
    if duration is None:
        duration = 1.0
    fps_expr = max_frames / duration

    try:
        cache_dir.mkdir(parents=True, exist_ok=True)
        for old in cache_dir.glob("frame_*.jpg"):
            try:
                old.unlink()
            except OSError:
                pass
        meta_path = cache_dir / _FRAME_META
        if meta_path.is_file():
            try:
                meta_path.unlink()
            except OSError:
                pass

        out_pattern = str(cache_dir / "frame_%03d.jpg")
        cmd = [
            ffmpeg_exe,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(video_path),
            "-vf",
            f"fps={fps_expr:.8f},scale={max_width}:-2:flags=lanczos",
            "-frames:v",
            str(max_frames),
            out_pattern,
        ]
        proc = subprocess.run(cmd, check=False, capture_output=True, text=True, timeout=600)
        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "").strip()
            raise RuntimeError(err or f"ffmpeg exited {proc.returncode}")

        frames = sorted(cache_dir.glob("frame_*.jpg"))
        if not frames:
            raise RuntimeError("ffmpeg produced no JPEG frames")

        _cache_write_meta(cache_dir, video=video_path, max_frames=max_frames, max_width=max_width)
        return frames
    except (OSError, subprocess.TimeoutExpired, RuntimeError):
        try:
            if cache_dir.is_dir():
                shutil.rmtree(cache_dir, ignore_errors=True)
        except Exception:  # noqa: BLE001
            pass
        return []
