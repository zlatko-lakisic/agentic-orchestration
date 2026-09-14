"""Capped frame preview for Admin Runs box overlays (detection turns)."""

from __future__ import annotations

import base64
import json
import os
from io import BytesIO
from pathlib import Path
from typing import Any

from orchestration.run_trace import RUN_TRACES_DIR_NAME, run_trace_path

DEFAULT_MAX_EDGE = 1280
DEFAULT_MAX_BYTES = 256 * 1024


def _max_edge() -> int:
    raw = os.getenv("AGENTIC_DETECTION_PREVIEW_MAX_EDGE", "").strip()
    try:
        n = int(raw) if raw else DEFAULT_MAX_EDGE
    except ValueError:
        n = DEFAULT_MAX_EDGE
    return max(64, min(4096, n))


def _max_bytes() -> int:
    raw = os.getenv("AGENTIC_DETECTION_PREVIEW_MAX_BYTES", "").strip()
    try:
        n = int(raw) if raw else DEFAULT_MAX_BYTES
    except ValueError:
        n = DEFAULT_MAX_BYTES
    return max(8 * 1024, min(2 * 1024 * 1024, n))


def _first_image_bytes(images: list[Any] | None) -> tuple[bytes, str, str]:
    if not images:
        return b"", "", "image/jpeg"
    first = images[0]
    if hasattr(first, "data"):
        raw = bytes(getattr(first, "data") or b"")
        name = str(getattr(first, "name", "") or "")
        mime = str(getattr(first, "mime_type", "") or "image/jpeg")
        return raw, name, mime or "image/jpeg"
    if isinstance(first, dict):
        data = first.get("data")
        if isinstance(data, str):
            try:
                raw = base64.standard_b64decode(data)
            except Exception:  # noqa: BLE001
                raw = b""
        else:
            raw = bytes(data or b"")
        name = str(first.get("name") or "")
        mime = str(first.get("mimeType") or first.get("mime_type") or "image/jpeg")
        return raw, name, mime or "image/jpeg"
    return b"", "", "image/jpeg"


def build_detection_preview(images: list[Any] | None) -> dict[str, Any] | None:
    """Re-encode first frame as JPEG, max edge ~1280, max ~256KB."""
    raw, name, _mime = _first_image_bytes(images)
    if not raw:
        return None
    try:
        from PIL import Image
    except Exception:  # noqa: BLE001
        return None

    try:
        img = Image.open(BytesIO(raw)).convert("RGB")
    except Exception:  # noqa: BLE001
        return None

    max_edge = _max_edge()
    w, h = img.size
    scale = min(1.0, float(max_edge) / float(max(w, h, 1)))
    if scale < 1.0:
        nw = max(1, int(round(w * scale)))
        nh = max(1, int(round(h * scale)))
        img = img.resize((nw, nh), Image.BILINEAR)
        w, h = img.size

    budget = _max_bytes()
    quality = 85
    data = b""
    while quality >= 40:
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        data = buf.getvalue()
        if len(data) <= budget:
            break
        quality -= 10
    if len(data) > budget:
        # Last resort: shrink further.
        while len(data) > budget and max(w, h) > 320:
            w = max(1, w // 2)
            h = max(1, h // 2)
            img = img.resize((w, h), Image.BILINEAR)
            buf = BytesIO()
            img.save(buf, format="JPEG", quality=60, optimize=True)
            data = buf.getvalue()
    if not data:
        return None

    return {
        "mimeType": "image/jpeg",
        "dataBase64": base64.standard_b64encode(data).decode("ascii"),
        "width": int(w),
        "height": int(h),
        "name": name or None,
    }


def detection_artifact_path(tool_root: Path, run_id: str) -> Path:
    """Sidecar next to the run trace JSONL (keeps JSONL small)."""
    trace = run_trace_path(tool_root, run_id)
    return trace.with_suffix(".detection.json")


def persist_detection_run_artifacts(
    tool_root: Path | None,
    run_id: str,
    *,
    answer: str,
    images: list[Any] | None = None,
    preview: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Write answer excerpt + capped preview for Admin Runs overlay."""
    rid = str(run_id or "").strip()
    if not rid or tool_root is None:
        return None
    try:
        root = Path(tool_root)
        prev = preview if preview is not None else build_detection_preview(images)
        payload: dict[str, Any] = {
            "runId": rid,
            "lastAnswerExcerpt": str(answer or "")[:120_000],
            "detectionPreview": prev,
        }
        path = detection_artifact_path(root, rid)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        return payload
    except Exception:  # noqa: BLE001
        return None


def load_detection_run_artifacts(tool_root: Path | None, run_id: str) -> dict[str, Any] | None:
    rid = str(run_id or "").strip()
    if not rid or tool_root is None:
        return None
    try:
        path = detection_artifact_path(Path(tool_root), rid)
        if not path.is_file():
            return None
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else None
    except Exception:  # noqa: BLE001
        return None


def list_detection_artifact_run_ids(tool_root: Path | None) -> list[tuple[str, float]]:
    """Return ``(run_id, mtime)`` for ``*.detection.json`` sidecars."""
    if tool_root is None:
        return []
    try:
        d = Path(tool_root) / RUN_TRACES_DIR_NAME
        if not d.is_dir():
            return []
        out: list[tuple[str, float]] = []
        for p in d.glob("*.detection.json"):
            rid = p.name[: -len(".detection.json")]
            if not rid:
                continue
            try:
                mtime = p.stat().st_mtime
            except OSError:
                mtime = 0.0
            out.append((rid, mtime))
        return out
    except Exception:  # noqa: BLE001
        return []
