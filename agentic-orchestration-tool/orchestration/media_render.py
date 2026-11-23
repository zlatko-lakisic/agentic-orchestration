"""Deterministic vertical-short renderer (ffmpeg) for AO Quill.

Entrypoint: :func:`render_short` — timeline JSON in ``text``, identity via
``user_id`` / ``identity`` kwargs forwarded from :func:`run_deterministic_step`.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any

from orchestration.client_files import (
    ClientFileError,
    ClientFileNotFound,
    register_output_file,
    resolve_client_file,
)
from orchestration.user_context import Identity

ALLOWED_MOTIONS = frozenset({"zoom_in", "zoom_out", "pan_left", "pan_right", "none"})
_SAFE_ID_RE = re.compile(r"^[a-fA-F0-9]{8,64}$|^[A-Za-z0-9._-]{8,128}$")


class MediaRenderError(ValueError):
    """Invalid timeline or render failure."""


def _ffmpeg_bin() -> str:
    from orchestration.ffmpeg_bins import ffmpeg_bin

    return ffmpeg_bin()


def _ffprobe_bin() -> str:
    from orchestration.ffmpeg_bins import ffprobe_bin

    return ffprobe_bin()


def _timeout_s() -> float:
    raw = os.getenv("AGENTIC_MEDIA_RENDER_TIMEOUT_S", "").strip()
    if not raw:
        return 600.0
    try:
        return max(30.0, float(raw))
    except ValueError as exc:
        raise MediaRenderError(f"invalid AGENTIC_MEDIA_RENDER_TIMEOUT_S={raw!r}") from exc


def _font_name() -> str:
    return (os.getenv("AGENTIC_MEDIA_RENDER_FONT") or "DejaVu Sans Bold").strip() or "DejaVu Sans Bold"


def _encoder_preference() -> str:
    return (os.getenv("AGENTIC_MEDIA_RENDER_ENCODER") or "").strip().lower()


def _truthy(raw: Any) -> bool:
    if isinstance(raw, bool):
        return raw
    return str(raw or "").strip().lower() in ("1", "true", "yes", "on")


def _owner_identity(identity: Identity | str | None, user_id: str | None) -> Identity | str:
    if isinstance(identity, Identity):
        return identity
    if identity is not None and str(identity).strip():
        return str(identity).strip()
    if user_id is not None and str(user_id).strip():
        return str(user_id).strip()
    return "local"


def _require_file_id(raw: Any, *, field: str) -> str:
    text = str(raw or "").strip()
    if not text:
        raise MediaRenderError(f"{field} is required")
    if "/" in text or "\\" in text or ".." in text or text.startswith("."):
        raise MediaRenderError(f"{field} must be a file_id, not a path")
    if not _SAFE_ID_RE.match(text):
        # Still allow hex uuids and similar; reject obvious paths above.
        if any(ch in text for ch in (":", " ")):
            raise MediaRenderError(f"{field} must be a file_id, not a path")
    return text


def parse_timeline(raw: str | dict[str, Any]) -> dict[str, Any]:
    """Validate timeline JSON; return a normalized dict (file ids unresolved)."""
    if isinstance(raw, dict):
        data = raw
    else:
        text = str(raw or "").strip()
        if not text:
            raise MediaRenderError("timeline JSON is empty")
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise MediaRenderError(f"timeline JSON invalid: {exc}") from exc
    if not isinstance(data, dict):
        raise MediaRenderError("timeline must be a JSON object")

    width = int(data.get("width") or 1080)
    height = int(data.get("height") or 1920)
    fps = int(data.get("fps") or 30)
    if width < 16 or height < 16:
        raise MediaRenderError("width/height must be >= 16")
    if fps < 1 or fps > 120:
        raise MediaRenderError("fps must be between 1 and 120")

    segments_raw = data.get("segments")
    if not isinstance(segments_raw, list) or not segments_raw:
        raise MediaRenderError("segments must be a non-empty list")

    segments: list[dict[str, Any]] = []
    for i, item in enumerate(segments_raw):
        if not isinstance(item, dict):
            raise MediaRenderError(f"segments[{i}] must be an object")
        typ = str(item.get("type") or "").strip().lower()
        if typ not in ("image", "video"):
            raise MediaRenderError(f"segments[{i}].type must be image or video")
        file_id = _require_file_id(item.get("file_id"), field=f"segments[{i}].file_id")
        try:
            seconds = float(item.get("seconds"))
        except (TypeError, ValueError) as exc:
            raise MediaRenderError(f"segments[{i}].seconds must be a number") from exc
        if seconds <= 0:
            raise MediaRenderError(f"segments[{i}].seconds must be > 0")
        motion = str(item.get("motion") or "none").strip().lower() or "none"
        if typ == "image" and motion not in ALLOWED_MOTIONS:
            raise MediaRenderError(
                f"segments[{i}].motion must be one of {sorted(ALLOWED_MOTIONS)}"
            )
        if typ == "video":
            motion = "none"
        segments.append(
            {
                "type": typ,
                "file_id": file_id,
                "seconds": seconds,
                "motion": motion,
            }
        )

    narration_file_id = _require_file_id(
        data.get("narration_file_id"), field="narration_file_id"
    )

    captions = data.get("captions")
    captions_out: dict[str, Any] | None = None
    if captions is not None:
        if not isinstance(captions, dict):
            raise MediaRenderError("captions must be an object")
        words_raw = captions.get("words")
        if not isinstance(words_raw, list):
            raise MediaRenderError("captions.words must be a list")
        words: list[dict[str, Any]] = []
        for i, w in enumerate(words_raw):
            if not isinstance(w, dict):
                raise MediaRenderError(f"captions.words[{i}] must be an object")
            token = str(w.get("word") or "").strip()
            if not token:
                continue
            try:
                start = float(w.get("start"))
                end = float(w.get("end"))
            except (TypeError, ValueError) as exc:
                raise MediaRenderError(
                    f"captions.words[{i}] start/end must be numbers"
                ) from exc
            if end < start:
                raise MediaRenderError(f"captions.words[{i}] end must be >= start")
            words.append({"word": token, "start": start, "end": end})
        max_words = int(captions.get("max_words_per_line") or 4)
        if max_words < 1:
            raise MediaRenderError("captions.max_words_per_line must be >= 1")
        captions_out = {
            "words": words,
            "max_words_per_line": max_words,
            "highlight_current_word": _truthy(captions.get("highlight_current_word")),
        }

    return {
        "width": width,
        "height": height,
        "fps": fps,
        "segments": segments,
        "narration_file_id": narration_file_id,
        "captions": captions_out,
    }


def resolve_timeline_files(
    timeline: dict[str, Any],
    identity: Identity | str,
) -> dict[str, Any]:
    """Resolve every file_id to a Path; refuse foreign/missing/expired ids."""
    resolved_segments: list[dict[str, Any]] = []
    for i, seg in enumerate(timeline["segments"]):
        try:
            path = resolve_client_file(identity, seg["file_id"])
        except ClientFileNotFound as exc:
            raise MediaRenderError(
                f"segments[{i}].file_id not found for this identity"
            ) from exc
        except ClientFileError as exc:
            raise MediaRenderError(str(exc)) from exc
        resolved_segments.append({**seg, "path": path})
    try:
        narration = resolve_client_file(identity, timeline["narration_file_id"])
    except ClientFileNotFound as exc:
        raise MediaRenderError("narration_file_id not found for this identity") from exc
    except ClientFileError as exc:
        raise MediaRenderError(str(exc)) from exc
    return {
        **timeline,
        "segments": resolved_segments,
        "narration_path": narration,
    }


def _run(cmd: list[str], *, timeout: float, label: str) -> None:
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except FileNotFoundError as exc:
        raise MediaRenderError(
            f"{label}: binary not found ({cmd[0]}). "
            "Install ffmpeg in the runtime image, mount host ffmpeg via "
            "jetson-mount-ffmpeg.sh, or set AGENTIC_VIDEO_FFMPEG / "
            "AGENTIC_VIDEO_FFPROBE."
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise MediaRenderError(f"{label}: timed out after {timeout:.0f}s") from exc
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()
        tail = "\n".join(err.splitlines()[-20:])
        raise MediaRenderError(f"{label} failed: {tail or f'exit {proc.returncode}'}")


def _probe_duration(path: Path) -> float:
    cmd = [
        _ffprobe_bin(),
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(path),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60, check=False)
    except FileNotFoundError:
        return 0.0
    if proc.returncode != 0:
        return 0.0
    try:
        return float((proc.stdout or "").strip() or 0.0)
    except ValueError:
        return 0.0


def _probe_media(path: Path) -> dict[str, Any]:
    cmd = [
        _ffprobe_bin(),
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,r_frame_rate:format=duration",
        "-of",
        "json",
        str(path),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60, check=False)
    except FileNotFoundError:
        return {"width": 0, "height": 0, "fps": 0, "duration_s": 0.0, "has_audio": False}
    data: dict[str, Any] = {}
    if proc.returncode == 0 and proc.stdout:
        try:
            data = json.loads(proc.stdout)
        except json.JSONDecodeError:
            data = {}
    streams = data.get("streams") or []
    fmt = data.get("format") or {}
    width = height = fps = 0
    if streams:
        width = int(streams[0].get("width") or 0)
        height = int(streams[0].get("height") or 0)
        rate = str(streams[0].get("r_frame_rate") or "0/1")
        if "/" in rate:
            num, den = rate.split("/", 1)
            try:
                fps = int(round(float(num) / float(den))) if float(den) else 0
            except ValueError:
                fps = 0
    duration = 0.0
    try:
        duration = float(fmt.get("duration") or 0.0)
    except (TypeError, ValueError):
        duration = 0.0
    # Audio presence
    has_audio = False
    cmd_a = [
        _ffprobe_bin(),
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=index",
        "-of",
        "csv=p=0",
        str(path),
    ]
    try:
        pa = subprocess.run(cmd_a, capture_output=True, text=True, timeout=30, check=False)
        has_audio = bool((pa.stdout or "").strip())
    except FileNotFoundError:
        has_audio = False
    return {
        "width": width,
        "height": height,
        "fps": fps,
        "duration_s": duration,
        "has_audio": has_audio,
    }


def _nvenc_available() -> bool:
    if _encoder_preference() != "nvenc":
        return False
    try:
        proc = subprocess.run(
            [_ffmpeg_bin(), "-hide_banner", "-encoders"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False
    return "h264_nvenc" in (proc.stdout or "")


def _video_encode_args() -> tuple[list[str], str]:
    if _nvenc_available():
        return ["-c:v", "h264_nvenc", "-pix_fmt", "yuv420p"], "h264_nvenc"
    return ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p"], "libx264"


def _zoompan_filter(motion: str, *, seconds: float, fps: int, width: int, height: int) -> str:
    frames = max(1, int(round(seconds * fps)))
    # Scale to cover then zoompan. Expressions use on/in frame index.
    base = (
        f"scale={width}:{height}:force_original_aspect_ratio=increase,"
        f"crop={width}:{height}"
    )
    if motion == "none":
        return f"{base},fps={fps}"
    if motion == "zoom_in":
        z = f"min(1.2\\,1+0.2*on/{frames})"
        return f"{base},zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={width}x{height}:fps={fps}"
    if motion == "zoom_out":
        z = f"max(1.0\\,1.2-0.2*on/{frames})"
        return f"{base},zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={width}x{height}:fps={fps}"
    if motion == "pan_left":
        return (
            f"{base},zoompan=z='1.1':x='(iw-iw/zoom)*on/{frames}':y='ih/2-(ih/zoom/2)':"
            f"d={frames}:s={width}x{height}:fps={fps}"
        )
    if motion == "pan_right":
        return (
            f"{base},zoompan=z='1.1':x='(iw-iw/zoom)*(1-on/{frames})':y='ih/2-(ih/zoom/2)':"
            f"d={frames}:s={width}x{height}:fps={fps}"
        )
    return f"{base},fps={fps}"


def _render_segment(
    seg: dict[str, Any],
    *,
    out_path: Path,
    width: int,
    height: int,
    fps: int,
    timeout: float,
) -> None:
    seconds = float(seg["seconds"])
    src = Path(seg["path"])
    vencode, _ = _video_encode_args()
    if seg["type"] == "image":
        vf = _zoompan_filter(seg["motion"], seconds=seconds, fps=fps, width=width, height=height)
        cmd = [
            _ffmpeg_bin(),
            "-y",
            "-loop",
            "1",
            "-i",
            str(src),
            "-vf",
            vf,
            "-t",
            f"{seconds:.3f}",
            "-an",
            *vencode,
            str(out_path),
        ]
    else:
        vf = (
            f"scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height},fps={fps}"
        )
        cmd = [
            _ffmpeg_bin(),
            "-y",
            "-i",
            str(src),
            "-vf",
            vf,
            "-t",
            f"{seconds:.3f}",
            "-an",
            *vencode,
            str(out_path),
        ]
    _run(cmd, timeout=timeout, label=f"segment {src.name}")


def build_ass_captions(
    captions: dict[str, Any],
    *,
    width: int,
    height: int,
) -> str:
    """Build ASS dialogue events; place around 65% of frame height."""
    font = _font_name().replace(",", "\\,")
    # MarginV from bottom: ~35% of height so text sits near 65% from top.
    margin_v = max(40, int(round(height * 0.35)))
    fontsize = max(28, int(round(height * 0.035)))
    header = (
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        f"PlayResX: {width}\n"
        f"PlayResY: {height}\n"
        "WrapStyle: 0\n"
        "\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Default,{font},{fontsize},&H00FFFFFF,&H000000FF,&H00000000,"
        f"&H80000000,-1,0,0,0,100,100,0,0,1,3,0,2,40,40,{margin_v},1\n"
        f"Style: Highlight,{font},{fontsize},&H0000FFFF,&H000000FF,&H00000000,"
        f"&H80000000,-1,0,0,0,100,100,0,0,1,3,0,2,40,40,{margin_v},1\n"
        "\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    words = captions.get("words") or []
    max_words = int(captions.get("max_words_per_line") or 4)
    highlight = bool(captions.get("highlight_current_word"))
    lines: list[str] = []

    def _ts(sec: float) -> str:
        if sec < 0:
            sec = 0.0
        h = int(sec // 3600)
        m = int((sec % 3600) // 60)
        s = sec % 60
        return f"{h}:{m:02d}:{s:05.2f}"

    # Group into lines of max_words spanning the group's time range.
    i = 0
    while i < len(words):
        group = words[i : i + max_words]
        i += max_words
        start = float(group[0]["start"])
        end = float(group[-1]["end"])
        if highlight:
            # One event per word with the current word marked.
            for j, w in enumerate(group):
                parts: list[str] = []
                for k, other in enumerate(group):
                    token = str(other["word"])
                    if k == j:
                        parts.append(r"{\rHighlight}" + token + r"{\rDefault}")
                    else:
                        parts.append(token)
                text = " ".join(parts)
                w_start = float(w["start"])
                w_end = float(w["end"])
                lines.append(
                    f"Dialogue: 0,{_ts(w_start)},{_ts(w_end)},Default,,0,0,0,,{text}"
                )
        else:
            text = " ".join(str(w["word"]) for w in group)
            lines.append(f"Dialogue: 0,{_ts(start)},{_ts(end)},Default,,0,0,0,,{text}")
    return header + "\n".join(lines) + ("\n" if lines else "")


def _apply_duration_rules(
    segments: list[dict[str, Any]],
    narration_duration: float,
) -> list[dict[str, Any]]:
    """Extend last segment if narration is longer; trim video end if shorter."""
    segs = [dict(s) for s in segments]
    total = sum(float(s["seconds"]) for s in segs)
    if narration_duration <= 0:
        return segs
    if narration_duration > total and segs:
        segs[-1]["seconds"] = float(segs[-1]["seconds"]) + (narration_duration - total)
        return segs
    if narration_duration + 0.5 < total:
        target = narration_duration + 0.5
        acc = 0.0
        trimmed: list[dict[str, Any]] = []
        for seg in segs:
            if acc >= target:
                break
            remaining = target - acc
            sec = float(seg["seconds"])
            if sec <= remaining:
                trimmed.append(seg)
                acc += sec
            else:
                trimmed.append({**seg, "seconds": remaining})
                acc = target
        return trimmed or segs
    return segs


def render_timeline_to_mp4(
    timeline: dict[str, Any],
    *,
    work_dir: Path,
) -> tuple[Path, str]:
    """Render resolved timeline to an MP4 under ``work_dir``. Returns (path, encoder)."""
    timeout = _timeout_s()
    width = int(timeline["width"])
    height = int(timeline["height"])
    fps = int(timeline["fps"])
    narration_path = Path(timeline["narration_path"])
    narration_dur = _probe_duration(narration_path)
    segments = _apply_duration_rules(list(timeline["segments"]), narration_dur)

    part_paths: list[Path] = []
    for idx, seg in enumerate(segments):
        part = work_dir / f"seg_{idx:03d}.mp4"
        _render_segment(
            seg,
            out_path=part,
            width=width,
            height=height,
            fps=fps,
            timeout=timeout,
        )
        part_paths.append(part)

    concat_list = work_dir / "concat.txt"
    # Relative paths keep the concat demuxer portable on Windows drive letters.
    concat_list.write_text(
        "".join(f"file '{p.name}'\n" for p in part_paths),
        encoding="utf-8",
    )
    silent = work_dir / "silent.mp4"
    vencode, encoder_name = _video_encode_args()
    _run(
        [
            _ffmpeg_bin(),
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list),
            "-an",
            *vencode,
            str(silent),
        ],
        timeout=timeout,
        label="concat",
    )

    ass_path: Path | None = None
    captions = timeline.get("captions")
    if captions and captions.get("words"):
        ass_path = work_dir / "captions.ass"
        ass_path.write_text(
            build_ass_captions(captions, width=width, height=height),
            encoding="utf-8",
        )

    out = work_dir / "short.mp4"
    vf_parts: list[str] = []
    if ass_path is not None:
        ass_esc = ass_path.as_posix().replace("\\", "/").replace(":", "\\:")
        vf_parts.append(f"ass={ass_esc}")
    cmd = [
        _ffmpeg_bin(),
        "-y",
        "-i",
        str(silent),
        "-i",
        str(narration_path),
    ]
    if vf_parts:
        cmd.extend(["-vf", ",".join(vf_parts)])
    cmd.extend(
        [
            *vencode,
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(out),
        ]
    )
    _run(cmd, timeout=timeout, label="mux")
    return out, encoder_name


def render_short(
    text: str = "",
    context: str = "",
    mcp_tool_results_or_handles: Any = None,
    *,
    identity: Identity | str | None = None,
    user_id: str | None = None,
) -> dict[str, Any]:
    """Deterministic entrypoint: timeline JSON → registered MP4 metadata."""
    del context, mcp_tool_results_or_handles
    t0 = time.time()
    try:
        timeline = parse_timeline(text)
        owner = _owner_identity(identity, user_id)
        resolved = resolve_timeline_files(timeline, owner)
        with tempfile.TemporaryDirectory(prefix="ao-render-") as tmp:
            work = Path(tmp)
            mp4, encoder = render_timeline_to_mp4(resolved, work_dir=work)
            meta = register_output_file(
                owner,
                mp4,
                "video/mp4",
                name="short.mp4",
                move=False,
            )
            probe = _probe_media(mp4)
        return {
            "ok": True,
            "file_id": meta["file_id"],
            "download_url": meta.get("download_url") or f"/api/v1/files/{meta['file_id']}",
            "width": probe["width"] or resolved["width"],
            "height": probe["height"] or resolved["height"],
            "fps": probe["fps"] or resolved["fps"],
            "duration_s": probe["duration_s"],
            "has_audio": probe["has_audio"],
            "encoder": encoder,
            "render_ms": int(round((time.time() - t0) * 1000)),
        }
    except (MediaRenderError, ClientFileError) as exc:
        return {"ok": False, "error": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}
