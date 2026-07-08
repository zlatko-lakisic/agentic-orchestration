"""Analyze local image / audio / video files for agent tools."""

from __future__ import annotations

import base64
import mimetypes
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

# Tool root (…/agentic-orchestration-tool) so we can reuse orchestration helpers.
_TOOL_ROOT = Path(__file__).resolve().parents[2]
if str(_TOOL_ROOT) not in sys.path:
    sys.path.insert(0, str(_TOOL_ROOT))


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _resolve_path(path: str) -> Path:
    p = Path(str(path or "").strip()).expanduser()
    if not p.is_absolute():
        p = (Path.cwd() / p).resolve()
    else:
        p = p.resolve()
    if not p.is_file():
        raise FileNotFoundError(f"Not a file: {p}")
    return p


def _mime_of(path: Path) -> str:
    mime, _ = mimetypes.guess_type(path.name)
    return mime or "application/octet-stream"


def _ffmpeg() -> str:
    return (os.getenv("AGENTIC_VIDEO_FFMPEG") or "ffmpeg").strip() or "ffmpeg"


def _ffprobe() -> str:
    return (os.getenv("AGENTIC_VIDEO_FFPROBE") or "ffprobe").strip() or "ffprobe"


def _vision_model() -> str:
    raw = (os.getenv("AGENTIC_MEDIA_VISION_MODEL") or os.getenv("AGENTIC_VIDEO_VISION_MODEL") or "").strip()
    if raw:
        return raw if "/" in raw else f"openai/{raw}"
    planner = (os.getenv("AGENTIC_PLANNER_MODEL") or "gpt-4o-mini").strip()
    return planner if "/" in planner else f"openai/{planner}"


def _whisper_model() -> str:
    return (os.getenv("AGENTIC_MEDIA_WHISPER_MODEL") or "base").strip() or "base"


def _litellm_complete(messages: list[dict[str, Any]]) -> str:
    import litellm

    kwargs: dict[str, Any] = {
        "model": _vision_model(),
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": _env_int("AGENTIC_MEDIA_VISION_MAX_TOKENS", 800),
    }
    api_base = (os.getenv("OPENAI_API_BASE") or os.getenv("OLLAMA_HOST") or "").strip()
    model_l = _vision_model().lower()
    use_local = bool(api_base) and (
        "ollama" in model_l or not (os.getenv("OPENAI_API_KEY") or "").strip()
    )
    if use_local:
        try:
            from agent_providers.ollama_provider import litellm_api_base_for_ollama

            kwargs["api_base"] = litellm_api_base_for_ollama() or api_base
            kwargs.setdefault("api_key", os.getenv("OPENAI_API_KEY") or "ollama")
        except Exception:  # noqa: BLE001
            kwargs["api_base"] = api_base
            kwargs.setdefault("api_key", "ollama")
    resp = litellm.completion(**kwargs)
    choice = (resp.choices or [None])[0]
    if choice is None:
        return ""
    content = getattr(choice.message, "content", None) or ""
    return str(content).strip()


def _jpeg_data_url(path: Path) -> str:
    raw = path.read_bytes()
    b64 = base64.standard_b64encode(raw).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def describe_image(path: str, question: str = "") -> dict[str, Any]:
    """Describe a local image with a vision LLM (LiteLLM)."""
    try:
        file_path = _resolve_path(path)
    except FileNotFoundError as exc:
        return {"ok": False, "error": str(exc), "path": str(path)}
    mime = _mime_of(file_path)
    if not mime.startswith("image/") and file_path.suffix.lower() not in {
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".bmp",
    }:
        return {
            "ok": False,
            "error": f"Path does not look like an image (mime={mime})",
            "path": str(file_path),
        }

    q = (question or "").strip() or "Describe what you see in this image for an assistant that cannot open the file."
    try:
        # Prefer JPEG data URL; PNG/WebP work with many providers as image bytes.
        if file_path.suffix.lower() in {".jpg", ".jpeg"}:
            url = _jpeg_data_url(file_path)
        else:
            b64 = base64.standard_b64encode(file_path.read_bytes()).decode("ascii")
            mt = mime if mime.startswith("image/") else "image/png"
            url = f"data:{mt};base64,{b64}"
        text = _litellm_complete(
            [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": q},
                        {"type": "image_url", "image_url": {"url": url}},
                    ],
                }
            ]
        )
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc), "path": str(file_path), "mime": mime}

    return {
        "ok": True,
        "path": str(file_path),
        "mime": mime,
        "size_bytes": file_path.stat().st_size,
        "description": text,
        "model": _vision_model(),
    }


def transcribe_audio(path: str, language: str = "") -> dict[str, Any]:
    """Transcribe speech from a local audio file (faster-whisper if available, else ffmpeg+whisper CLI)."""
    try:
        file_path = _resolve_path(path)
    except FileNotFoundError as exc:
        return {"ok": False, "error": str(exc), "path": str(path)}
    mime = _mime_of(file_path)
    lang = (language or "").strip() or None

    # Prefer faster-whisper (pure Python) when installed.
    try:
        from faster_whisper import WhisperModel  # type: ignore

        model = WhisperModel(_whisper_model(), device="cpu", compute_type="int8")
        segments, info = model.transcribe(str(file_path), language=lang)
        parts = [seg.text.strip() for seg in segments if (seg.text or "").strip()]
        text = " ".join(parts).strip()
        return {
            "ok": True,
            "path": str(file_path),
            "mime": mime,
            "size_bytes": file_path.stat().st_size,
            "language": getattr(info, "language", lang) or lang,
            "transcript": text,
            "engine": "faster-whisper",
            "model": _whisper_model(),
        }
    except ImportError:
        pass
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": f"faster-whisper failed: {exc}", "path": str(file_path)}

    # Fallback: OpenAI-compatible audio transcription if configured.
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if api_key and api_key not in {"ollama", "sk-local"}:
        try:
            import litellm

            with file_path.open("rb") as fh:
                resp = litellm.transcription(
                    model=os.getenv("AGENTIC_MEDIA_TRANSCRIBE_MODEL") or "whisper-1",
                    file=fh,
                    language=lang,
                )
            text = str(getattr(resp, "text", None) or resp.get("text") if isinstance(resp, dict) else "").strip()
            return {
                "ok": True,
                "path": str(file_path),
                "mime": mime,
                "size_bytes": file_path.stat().st_size,
                "language": lang,
                "transcript": text,
                "engine": "litellm-transcription",
            }
        except Exception as exc:  # noqa: BLE001
            return {
                "ok": False,
                "error": (
                    f"Transcription unavailable (install faster-whisper, or configure OpenAI transcription). "
                    f"Detail: {exc}"
                ),
                "path": str(file_path),
                "mime": mime,
                "hint": "pip install faster-whisper",
            }

    return {
        "ok": False,
        "error": "No transcription engine available. Install faster-whisper or set OPENAI_API_KEY for whisper-1.",
        "path": str(file_path),
        "mime": mime,
        "hint": "pip install faster-whisper",
    }


def analyze_video(path: str, question: str = "", max_frames: int | None = None) -> dict[str, Any]:
    """Extract sampled frames and produce a vision synopsis of a local video."""
    try:
        file_path = _resolve_path(path)
    except FileNotFoundError as exc:
        return {"ok": False, "error": str(exc), "path": str(path)}
    mime = _mime_of(file_path)
    q = (question or "").strip() or (
        "Summarize what happens in these sampled video frames: subjects, actions, text overlays, and scene changes."
    )
    n_frames = max_frames if max_frames is not None else _env_int("AGENTIC_MEDIA_VIDEO_FRAMES", 6)
    n_frames = max(1, min(16, int(n_frames)))

    try:
        from orchestration.video_frames import extract_video_frames
        from orchestration.video_vision_synopsis import summarize_video_frames_litellm
    except ImportError:
        extract_video_frames = None  # type: ignore
        summarize_video_frames_litellm = None  # type: ignore

    frames: list[Path] = []
    if extract_video_frames is not None:
        try:
            # Temporarily nudge frame count via env.
            prev = os.environ.get("AGENTIC_VIDEO_FRAME_COUNT")
            os.environ["AGENTIC_VIDEO_FRAME_COUNT"] = str(n_frames)
            try:
                frames = list(extract_video_frames(file_path) or [])
            finally:
                if prev is None:
                    os.environ.pop("AGENTIC_VIDEO_FRAME_COUNT", None)
                else:
                    os.environ["AGENTIC_VIDEO_FRAME_COUNT"] = prev
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": f"Frame extraction failed: {exc}", "path": str(file_path)}

    if not frames and shutil.which(_ffmpeg()):
        # Minimal ffmpeg fallback when orchestration helpers are missing.
        with tempfile.TemporaryDirectory(prefix="agentic-vid-") as td:
            out_pat = str(Path(td) / "frame_%03d.jpg")
            try:
                subprocess.run(
                    [
                        _ffmpeg(),
                        "-hide_banner",
                        "-loglevel",
                        "error",
                        "-i",
                        str(file_path),
                        "-vf",
                        f"fps=1/{max(1, n_frames)}",
                        "-frames:v",
                        str(n_frames),
                        out_pat,
                    ],
                    check=False,
                    capture_output=True,
                    timeout=120,
                )
            except (OSError, subprocess.TimeoutExpired) as exc:
                return {"ok": False, "error": f"ffmpeg failed: {exc}", "path": str(file_path)}
            frames = sorted(Path(td).glob("frame_*.jpg"))
            if not frames:
                return {
                    "ok": False,
                    "error": "No frames extracted (is ffmpeg installed?)",
                    "path": str(file_path),
                    "ffprobe": _ffprobe(),
                }
            # Copy out of temp before closing.
            keep = file_path.parent / f"{file_path.name}.agentic_media_frames"
            keep.mkdir(parents=True, exist_ok=True)
            copied: list[Path] = []
            for i, fp in enumerate(frames, start=1):
                dest = keep / f"frame_{i:03d}.jpg"
                shutil.copy2(fp, dest)
                copied.append(dest)
            frames = copied

    if not frames:
        return {
            "ok": False,
            "error": "Could not extract video frames. Install ffmpeg and ensure AGENTIC_VIDEO_EXTRACT_FRAMES is enabled.",
            "path": str(file_path),
            "mime": mime,
        }

    synopsis = ""
    if summarize_video_frames_litellm is not None:
        try:
            synopsis = summarize_video_frames_litellm(
                frames,
                user_goal_hint=q,
                source_video_name=file_path.name,
            ) or ""
        except Exception as exc:  # noqa: BLE001
            synopsis = ""
            vision_err = str(exc)
        else:
            vision_err = ""
    else:
        vision_err = ""
        # Direct vision on first few frames.
        try:
            content: list[dict[str, Any]] = [{"type": "text", "text": q}]
            for fp in frames[: min(4, len(frames))]:
                content.append({"type": "image_url", "image_url": {"url": _jpeg_data_url(fp)}})
            synopsis = _litellm_complete([{"role": "user", "content": content}])
        except Exception as exc:  # noqa: BLE001
            vision_err = str(exc)

    out: dict[str, Any] = {
        "ok": bool(synopsis) or not vision_err,
        "path": str(file_path),
        "mime": mime,
        "size_bytes": file_path.stat().st_size,
        "frame_count": len(frames),
        "frame_paths": [str(p) for p in frames],
        "synopsis": synopsis,
        "question": q,
    }
    if vision_err and not synopsis:
        out["ok"] = False
        out["error"] = vision_err
    return out
