"""
User file attachments for dynamic orchestration.

The web UI (or CLI) passes a JSON manifest of local file paths. This module
validates paths, infers categories, and builds a planner/crew context block so
the planner can route steps to appropriate agent providers.
"""

from __future__ import annotations

import json
import mimetypes
import os
import sys
from pathlib import Path
from typing import Any

from orchestration.video_frames import extract_video_frames
from orchestration.video_vision_synopsis import summarize_video_frames_litellm
from orchestration.cloud_anonymize import anonymize_cloud_enabled, redact_for_cloud


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _allow_untrusted_paths(tool_root: Path) -> bool:
    return os.getenv("AGENTIC_ATTACHMENTS_ALLOW_ABSOLUTE", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def _trusted_uploads_root(tool_root: Path) -> Path:
    return (tool_root / "_web_uploads").resolve()


def _validate_attachment_path(path: Path, *, tool_root: Path) -> Path:
    resolved = path.resolve()
    if not resolved.is_file():
        raise FileNotFoundError(f"Attachment path is not a file: {resolved}")
    uploads = _trusted_uploads_root(tool_root)
    try:
        resolved.relative_to(uploads)
    except ValueError:
        if not _allow_untrusted_paths(tool_root):
            raise PermissionError(
                f"Attachment path must be under {uploads} (got {resolved}). "
                "For local manifests pointing elsewhere, set AGENTIC_ATTACHMENTS_ALLOW_ABSOLUTE=1."
            ) from None
    return resolved


def _normalize_manifest_files(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, dict) and "files" in raw:
        inner = raw.get("files")
    elif isinstance(raw, list):
        inner = raw
    else:
        raise ValueError("Attachment manifest must be a JSON array or an object with a 'files' array.")
    if not isinstance(inner, list):
        raise ValueError("Attachment manifest 'files' must be an array.")
    out: list[dict[str, Any]] = []
    for i, item in enumerate(inner):
        if not isinstance(item, dict):
            raise ValueError(f"Attachment manifest files[{i}] must be an object.")
        p = str(item.get("path") or "").strip()
        if not p:
            raise ValueError(f"Attachment manifest files[{i}] is missing 'path'.")
        out.append(item)
    return out


def load_manifest(manifest_path: Path) -> list[dict[str, Any]]:
    text = manifest_path.read_text(encoding="utf-8")
    data = json.loads(text)
    return _normalize_manifest_files(data)


_EXT_CATEGORY: dict[str, tuple[str, str]] = {
    ".csv": ("tabular", "tabular / spreadsheet data; prefer agents with data analysis or integration hints."),
    ".tsv": ("tabular", "tabular / spreadsheet data; prefer agents with data analysis or integration hints."),
    ".json": ("structured", "structured JSON; prefer agents strong at APIs, config, or data modeling."),
    ".yaml": ("structured", "YAML/config; prefer agents strong at DevOps, integration, or configuration."),
    ".yml": ("structured", "YAML/config; prefer agents strong at DevOps, integration, or configuration."),
    ".xml": ("structured", "XML/markup; prefer agents that handle enterprise or document-style data."),
    ".md": ("document", "Markdown document; prefer writing, research, or documentation-oriented agents."),
    ".txt": ("text", "Plain text; prefer agents suited to reading and summarizing prose or logs."),
    ".log": ("text", "Log text; prefer debugging or observability-oriented agents."),
    ".pdf": ("document", "PDF document (binary); prefer document review or research agents; agents may need tools to extract text."),
    ".png": ("image", "Raster image; prefer multimodal/vision-capable agents when available, otherwise describe limitations."),
    ".jpg": ("image", "Raster image; prefer multimodal/vision-capable agents when available."),
    ".jpeg": ("image", "Raster image; prefer multimodal/vision-capable agents when available."),
    ".gif": ("image", "Raster image; prefer multimodal/vision-capable agents when available."),
    ".webp": ("image", "Raster image; prefer multimodal/vision-capable agents when available."),
    ".py": ("code", "Python source; prefer software engineering / implementation agents."),
    ".ts": ("code", "TypeScript source; prefer software engineering / implementation agents."),
    ".tsx": ("code", "TypeScript/React source; prefer software engineering / implementation agents."),
    ".js": ("code", "JavaScript source; prefer software engineering / implementation agents."),
    ".jsx": ("code", "JavaScript/React source; prefer software engineering / implementation agents."),
    ".rs": ("code", "Rust source; prefer software engineering / implementation agents."),
    ".go": ("code", "Go source; prefer software engineering / implementation agents."),
    ".java": ("code", "Java source; prefer software engineering / implementation agents."),
    ".cs": ("code", "C# source; prefer software engineering / implementation agents."),
    ".sql": ("code", "SQL; prefer data engineering or database-oriented agents."),
    ".html": ("code", "HTML; prefer web or frontend-oriented agents."),
    ".css": ("code", "CSS; prefer web or frontend-oriented agents."),
    ".zip": ("archive", "Zip archive; prefer agents that can reason about packaging or request extraction via tools."),
    ".xlsx": ("spreadsheet", "Excel spreadsheet (binary); prefer data/finance agents; text may need specialized tools."),
    ".xls": ("spreadsheet", "Legacy Excel (binary); prefer data/finance agents."),
    ".mp4": ("media", "Video (MP4); JPEG frames are extracted for vision—see following frame attachments."),
    ".webm": ("media", "Video (WebM); JPEG frames are extracted for vision—see following frame attachments."),
    ".mov": ("media", "Video (QuickTime); JPEG frames are extracted for vision—see following frame attachments."),
    ".mkv": ("media", "Video (Matroska); JPEG frames are extracted for vision—see following frame attachments."),
    ".m4v": ("media", "Video (M4V); JPEG frames are extracted for vision—see following frame attachments."),
    ".avi": ("media", "Video (AVI); JPEG frames are extracted for vision—see following frame attachments."),
    ".mp3": ("audio", "Audio (MP3); prefer media_audio_transcribe / media_understand MCP for speech."),
    ".wav": ("audio", "Audio (WAV); prefer media_audio_transcribe / media_understand MCP for speech."),
    ".m4a": ("audio", "Audio (M4A); prefer media_audio_transcribe / media_understand MCP for speech."),
    ".ogg": ("audio", "Audio (OGG); prefer media_audio_transcribe / media_understand MCP for speech."),
    ".flac": ("audio", "Audio (FLAC); prefer media_audio_transcribe / media_understand MCP for speech."),
    ".aac": ("audio", "Audio (AAC); prefer media_audio_transcribe / media_understand MCP for speech."),
    ".wma": ("audio", "Audio (WMA); prefer media_audio_transcribe / media_understand MCP for speech."),
    ".opus": ("audio", "Audio (Opus); prefer media_audio_transcribe / media_understand MCP for speech."),
}


_VIDEO_SUFFIXES = frozenset({".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v"})


_TEXT_EXCERPT_CATEGORIES = frozenset(
    {"tabular", "structured", "text", "document", "code", "log"}
)


def _guess_mime(path: Path, declared: str | None) -> str:
    if declared and str(declared).strip():
        return str(declared).strip()
    mime, _enc = mimetypes.guess_type(path.name)
    return mime or "application/octet-stream"


def _category_for(path: Path, mime: str) -> tuple[str, str]:
    ext = path.suffix.lower()
    if ext in _EXT_CATEGORY:
        return _EXT_CATEGORY[ext]
    mt = mime.lower()
    if mt.startswith("image/"):
        return "image", "Image binary; prefer multimodal/vision agents when available."
    if mt.startswith("video/"):
        return (
            "media",
            "Video; ffmpeg extracts evenly spaced JPEG frames—listed below as image attachments with an optional automated synopsis.",
        )
    if mt.startswith("audio/"):
        return (
            "audio",
            "Audio; attach media_audio_transcribe or media_understand and call transcribe_audio_file "
            "with this path when speech content matters.",
        )
    if "pdf" in mt:
        return "document", "PDF-style document; prefer document-oriented agents."
    if "json" in mt or "yaml" in mt or "xml" in mt:
        return "structured", "Structured data; prefer integration or API-oriented agents."
    if "csv" in mt or "spreadsheet" in mt:
        return "tabular", "Tabular data; prefer data-oriented agents."
    return "unknown", "Unknown binary or uncommon type; pick agents conservatively and mention tool limits in the plan."


def _read_text_excerpt(path: Path, max_chars: int) -> str:
    try:
        raw = path.read_bytes()[: max_chars * 2 + 64]
    except OSError as exc:
        return f"(could not read file: {exc})"
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = raw.decode("utf-8", errors="replace")
        except Exception:  # noqa: BLE001
            return "(non-UTF8 binary; excerpt omitted)"
    text = text.replace("\r\n", "\n").strip()
    if len(text) > max_chars:
        return text[: max_chars - 1] + "…"
    return text


def _is_video_attachment(path: Path, mime: str) -> bool:
    if mime.lower().startswith("video/"):
        return True
    return path.suffix.lower() in _VIDEO_SUFFIXES


def _video_frame_extract_enabled() -> bool:
    return os.getenv("AGENTIC_VIDEO_EXTRACT_FRAMES", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def build_attachment_block(
    *,
    tool_root: Path,
    manifest_path: Path,
    user_goal_hint: str = "",
) -> str:
    """
    Build markdown to append to the user goal for planner + crew ({topic}).

    Video attachments: when ffmpeg is available, evenly spaced JPEG frames are written next to the
    video file and listed as separate image attachments; optional LiteLLM vision synopsis is inlined.
    """
    max_files = max(1, min(32, _env_int("AGENTIC_ATTACHMENTS_MAX_FILES", 12)))
    per_excerpt = max(400, min(12000, _env_int("AGENTIC_ATTACHMENT_EXCERPT_CHARS", 4000)))
    max_block = max(2000, min(120000, _env_int("AGENTIC_ATTACHMENT_MAX_PLANNER_CHARS", 28000)))

    entries = load_manifest(manifest_path)[:max_files]
    if not entries:
        return ""

    lines: list[str] = [
        "## Attached files (local paths; analyzed by the orchestrator)",
        "",
        "The planner MUST use these paths, MIME/types, and routing hints to pick `agent_provider_id` "
        "values whose `planner_hint`, `role`, and `goal` fit the file kinds (e.g. data vs code vs documents vs images). "
        "For videos, JPEG frames extracted via ffmpeg are listed below—route vision/multimodal agents to those paths; "
        "plain-language synopsis text may also be present. "
        "For deeper media understanding, attach MCP `media_understand` (or `media_audio_transcribe` / "
        "`media_video_analyze`) and call describe_image_file / transcribe_audio_file / analyze_video_file "
        "with the absolute **Path** values below.",
        "Sequential steps may first extract/interpret files, then act on the results.",
        "",
    ]

    used = 0
    display_idx = 0
    trunc_tail = (
        f"\n_(Further attachments omitted to respect AGENTIC_ATTACHMENT_MAX_PLANNER_CHARS={max_block}.)_"
    )

    def append_chunk(chunk_lines: list[str]) -> bool:
        nonlocal used
        chunk = "\n".join(chunk_lines) + "\n"
        if used + len(chunk) > max_block:
            lines.append(trunc_tail)
            return False
        lines.append(chunk)
        used += len(chunk)
        return True

    goal_hint = (user_goal_hint or "").strip()[:12000]

    for spec in entries:
        raw_path = Path(str(spec.get("path") or "").strip())
        validated = _validate_attachment_path(raw_path, tool_root=tool_root)
        name = str(spec.get("name") or validated.name).strip() or validated.name
        mime = _guess_mime(validated, spec.get("mime") if isinstance(spec.get("mime"), str) else None)
        try:
            size = int(spec.get("size")) if spec.get("size") is not None else validated.stat().st_size
        except OSError:
            size = -1
        cat, route = _category_for(validated, mime)

        display_idx += 1
        chunk_lines = [
            f"{display_idx}. **{name}**",
            f"   - **Path:** `{validated}`",
            f"   - **MIME:** `{mime}`  ·  **category:** **{cat}**  ·  **size_bytes:** {size}",
            f"   - **Routing:** {route}",
        ]
        if cat in _TEXT_EXCERPT_CATEGORIES or mime.startswith("text/"):
            ex = _read_text_excerpt(validated, per_excerpt)
            if anonymize_cloud_enabled():
                # Keep paths intact for tools; scrub PII inside file excerpts only.
                ex = redact_for_cloud(ex, force=True)
            chunk_lines.append("   - **Excerpt (UTF-8, truncated):**")
            chunk_lines.append("")
            chunk_lines.append("```")
            chunk_lines.append(ex)
            chunk_lines.append("```")
        else:
            chunk_lines.append(
                "   - **Excerpt:** (not inlined — binary or non-text; agents should use tools or reasoning as appropriate.)"
            )

        video_frames: list[Path] = []
        if _is_video_attachment(validated, mime) and _video_frame_extract_enabled():
            chunk_lines.append(
                "   - **Video frames:** evenly spaced JPEGs via ffmpeg (see numbered attachments below)."
            )
            video_frames = extract_video_frames(validated)
            if not video_frames:
                chunk_lines.append(
                    "   - **Frame extraction:** failed or ffmpeg/ffprobe unavailable—install ffmpeg or set "
                    "AGENTIC_VIDEO_EXTRACT_FRAMES=0 to silence this path."
                )
                print(
                    f"(attachments) video frame extraction produced no frames for {validated.name!s}",
                    file=sys.stderr,
                )
            else:
                synopsis = summarize_video_frames_litellm(
                    video_frames,
                    user_goal_hint=goal_hint,
                    source_video_name=name,
                )
                if synopsis:
                    if anonymize_cloud_enabled():
                        synopsis = redact_for_cloud(synopsis, force=True)
                    chunk_lines.append("   - **Automated vision synopsis (sampled frames):**")
                    chunk_lines.append("")
                    for ln in synopsis.split("\n"):
                        chunk_lines.append(f"     {ln}".rstrip())

        if not append_chunk(chunk_lines):
            break

        truncated = False
        for fi, fp in enumerate(video_frames, start=1):
            display_idx += 1
            try:
                fsize = fp.stat().st_size
            except OSError:
                fsize = -1
            frame_cat = "image"
            frame_route = (
                f"JPEG frame {fi}/{len(video_frames)} sampled from video `{name}`; "
                "prefer multimodal/vision agents using this file path."
            )
            fchunk = [
                f"{display_idx}. **{fp.name}** (frame {fi}/{len(video_frames)} from **{name}**)",
                f"   - **Path:** `{fp.resolve()}`",
                f"   - **MIME:** `image/jpeg`  ·  **category:** **{frame_cat}**  ·  **size_bytes:** {fsize}",
                f"   - **Routing:** {frame_route}",
                "   - **Excerpt:** (not inlined — binary image; use vision-capable agents or the synopsis above.)",
            ]
            if not append_chunk(fchunk):
                truncated = True
                break
        if truncated:
            break

    return "\n".join(lines).strip()


def resolve_manifest_path(raw: str, *, tool_root: Path) -> Path:
    """Resolve a manifest path for CLI (cwd-relative) or web (absolute)."""
    p = Path(str(raw).strip()).expanduser()
    if p.is_absolute():
        return p.resolve()
    cand = (Path.cwd() / p).resolve()
    if cand.is_file():
        return cand
    cand2 = (tool_root / p).resolve()
    return cand2 if cand2.is_file() else cand


def compose_goal_with_attachments(logical_user_goal: str, attachment_block: str) -> str:
    """Combine the user goal (possibly refined mid-run) with attachment context."""
    base = (logical_user_goal or "").strip()
    block = (attachment_block or "").strip()
    if not block:
        return base
    if not base:
        return block
    return f"{base}\n\n{block}"
