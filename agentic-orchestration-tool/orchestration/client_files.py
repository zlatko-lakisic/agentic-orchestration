"""Authenticated client file storage for Reach uploads and provider outputs.

Files are owned by the caller's identity (``user_id`` from the client certificate /
resolved headers). Clients never see or send engine filesystem paths — only random
``file_id`` values. Providers resolve ids via :func:`resolve_client_file`.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import sys
import threading
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from orchestration.run_store import shared_run_store_mount_path
from orchestration.user_context import Identity

ALLOWED_MIME_TYPES: frozenset[str] = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "audio/wav",
        "audio/mpeg",
        "video/mp4",
        "application/json",
    }
)

DEFAULT_MAX_BYTES = 200 * 1024 * 1024  # 200 MB
DEFAULT_TTL_HOURS = 24
_META_NAME = "meta.json"
_BLOB_NAME = "blob"
_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")

_cleanup_timer: threading.Timer | None = None
_cleanup_lock = threading.Lock()


class ClientFileError(Exception):
    """Base error for client file operations."""


class ClientFileNotFound(ClientFileError):
    """Missing, expired, or not owned by the caller (always surface as 404)."""


class ClientFileTypeError(ClientFileError):
    """MIME type not in the allow-list (HTTP 415)."""


class ClientFileTooLarge(ClientFileError):
    """Payload exceeds ``AGENTIC_FILES_MAX_BYTES`` (HTTP 413)."""


def files_max_bytes() -> int:
    raw = os.getenv("AGENTIC_FILES_MAX_BYTES", "").strip()
    if not raw:
        return DEFAULT_MAX_BYTES
    try:
        value = int(raw)
    except ValueError as exc:
        raise ClientFileError(f"invalid AGENTIC_FILES_MAX_BYTES={raw!r}") from exc
    if value < 1:
        raise ClientFileError("AGENTIC_FILES_MAX_BYTES must be >= 1")
    return value


def files_ttl_hours() -> float:
    raw = os.getenv("AGENTIC_FILES_TTL_HOURS", "").strip()
    if not raw:
        return float(DEFAULT_TTL_HOURS)
    try:
        value = float(raw)
    except ValueError as exc:
        raise ClientFileError(f"invalid AGENTIC_FILES_TTL_HOURS={raw!r}") from exc
    if value <= 0:
        raise ClientFileError("AGENTIC_FILES_TTL_HOURS must be > 0")
    return value


def files_dir() -> Path:
    """Storage root: ``AGENTIC_FILES_DIR`` or ``{run_store}/files``."""
    raw = os.getenv("AGENTIC_FILES_DIR", "").strip()
    if raw:
        return Path(raw)
    return Path(shared_run_store_mount_path()) / "files"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _parse_iso(raw: str) -> datetime:
    text = str(raw or "").strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    return datetime.fromisoformat(text)


def _safe_name(name: str | None, *, fallback: str = "upload") -> str:
    base = Path(str(name or "").strip() or fallback).name
    cleaned = _SAFE_NAME_RE.sub("_", base).strip("._") or fallback
    return cleaned[:180]


def _owner_key(identity: Identity | str) -> str:
    if isinstance(identity, Identity):
        raw = identity.user_id
    else:
        raw = identity
    text = str(raw or "").strip().lower() or "local"
    cleaned = re.sub(r"[^a-z0-9._-]+", "-", text).strip("-._")
    return (cleaned[:64] or "local").rstrip("-._")


def _file_dir(file_id: str) -> Path:
    safe = str(file_id or "").strip()
    if not safe or "/" in safe or "\\" in safe or ".." in safe:
        raise ClientFileNotFound("file not found")
    return files_dir() / safe


def _meta_path(file_id: str) -> Path:
    return _file_dir(file_id) / _META_NAME


def _blob_path(file_id: str) -> Path:
    return _file_dir(file_id) / _BLOB_NAME


def _read_meta(file_id: str) -> dict[str, Any]:
    path = _meta_path(file_id)
    if not path.is_file():
        raise ClientFileNotFound("file not found")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ClientFileNotFound("file not found") from exc
    if not isinstance(data, dict):
        raise ClientFileNotFound("file not found")
    return data


def _write_meta(file_id: str, meta: dict[str, Any]) -> None:
    path = _meta_path(file_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(meta, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    tmp.replace(path)


def _assert_mime(mime_type: str) -> str:
    mime = str(mime_type or "").strip().lower()
    if mime not in ALLOWED_MIME_TYPES:
        raise ClientFileTypeError(
            f"unsupported media type {mime_type!r}; allowed: "
            + ", ".join(sorted(ALLOWED_MIME_TYPES))
        )
    return mime


def _assert_size(nbytes: int) -> None:
    limit = files_max_bytes()
    if nbytes > limit:
        raise ClientFileTooLarge(f"file exceeds limit of {limit} bytes")


def _public_meta(meta: dict[str, Any], *, include_download_url: bool = False) -> dict[str, Any]:
    out: dict[str, Any] = {
        "file_id": meta["file_id"],
        "name": meta.get("name") or "upload",
        "mime_type": meta["mime_type"],
        "bytes": int(meta["bytes"]),
        "sha256": meta["sha256"],
        "expires_at": meta["expires_at"],
    }
    if include_download_url:
        out["download_url"] = f"/api/v1/files/{meta['file_id']}"
    return out


def _is_expired(meta: dict[str, Any], *, now: datetime | None = None) -> bool:
    try:
        expires = _parse_iso(str(meta.get("expires_at") or ""))
    except ValueError:
        return True
    stamp = now or _utc_now()
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return stamp >= expires


def _remove_file_dir(file_id: str) -> None:
    root = _file_dir(file_id)
    if root.is_dir():
        shutil.rmtree(root, ignore_errors=True)


def cleanup_expired_files(*, now: datetime | None = None) -> int:
    """Delete expired file directories. Returns the number removed."""
    root = files_dir()
    if not root.is_dir():
        return 0
    stamp = now or _utc_now()
    removed = 0
    for child in root.iterdir():
        if not child.is_dir():
            continue
        meta_path = child / _META_NAME
        if not meta_path.is_file():
            shutil.rmtree(child, ignore_errors=True)
            removed += 1
            continue
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            shutil.rmtree(child, ignore_errors=True)
            removed += 1
            continue
        if not isinstance(meta, dict) or _is_expired(meta, now=stamp):
            shutil.rmtree(child, ignore_errors=True)
            removed += 1
    return removed


def start_client_files_cleanup_loop(*, interval_seconds: float = 3600.0) -> None:
    """Run :func:`cleanup_expired_files` at startup and once an hour."""
    global _cleanup_timer
    with _cleanup_lock:
        if _cleanup_timer is not None:
            return
        # Sentinel so a concurrent start is a no-op before the first schedule.
        _cleanup_timer = threading.Timer(0, lambda: None)

    interval = max(60.0, float(interval_seconds))

    def _schedule() -> None:
        global _cleanup_timer
        with _cleanup_lock:
            _cleanup_timer = threading.Timer(interval, tick)
            _cleanup_timer.daemon = True
            _cleanup_timer.start()

    def tick() -> None:
        try:
            n = cleanup_expired_files()
            if n:
                print(f"(engine) client-files cleanup removed {n}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001
            print(f"(engine) client-files cleanup failed: {exc}", file=sys.stderr)
        _schedule()

    try:
        n = cleanup_expired_files()
        if n:
            print(f"(engine) client-files cleanup removed {n}", file=sys.stderr)
    except Exception as exc:  # noqa: BLE001
        print(f"(engine) client-files cleanup failed: {exc}", file=sys.stderr)
    _schedule()


def stop_client_files_cleanup_loop() -> None:
    global _cleanup_timer
    with _cleanup_lock:
        if _cleanup_timer is not None:
            _cleanup_timer.cancel()
            _cleanup_timer = None


def save_client_file(
    identity: Identity | str,
    data: bytes,
    name: str | None,
    mime_type: str,
) -> dict[str, Any]:
    """Store ``data`` for ``identity`` and return the public metadata dict."""
    if not isinstance(data, (bytes, bytearray)):
        raise ClientFileError("data must be bytes")
    payload = bytes(data)
    mime = _assert_mime(mime_type)
    _assert_size(len(payload))
    owner = _owner_key(identity)
    file_id = uuid.uuid4().hex
    expires = _utc_now() + timedelta(hours=files_ttl_hours())
    digest = hashlib.sha256(payload).hexdigest()
    display_name = _safe_name(name)

    dest = _file_dir(file_id)
    dest.mkdir(parents=True, exist_ok=False)
    try:
        _blob_path(file_id).write_bytes(payload)
        meta = {
            "file_id": file_id,
            "owner_id": owner,
            "name": display_name,
            "mime_type": mime,
            "bytes": len(payload),
            "sha256": digest,
            "created_at": _iso(_utc_now()),
            "expires_at": _iso(expires),
        }
        _write_meta(file_id, meta)
    except Exception:
        _remove_file_dir(file_id)
        raise
    return _public_meta(meta)


def resolve_client_file(identity: Identity | str, file_id: str) -> Path:
    """Return the on-disk blob path if ``identity`` owns a non-expired file.

    Raises :class:`ClientFileNotFound` for missing, expired, or foreign files
    (callers should map this to HTTP 404 — never leak ownership).
    """
    meta = _read_meta(file_id)
    owner = _owner_key(identity)
    if str(meta.get("owner_id") or "") != owner:
        raise ClientFileNotFound("file not found")
    if _is_expired(meta):
        _remove_file_dir(file_id)
        raise ClientFileNotFound("file not found")
    blob = _blob_path(file_id)
    if not blob.is_file():
        raise ClientFileNotFound("file not found")
    return blob


def get_client_file_meta(identity: Identity | str, file_id: str) -> dict[str, Any]:
    """Like :func:`resolve_client_file` but returns public metadata + path checks."""
    path = resolve_client_file(identity, file_id)
    meta = _read_meta(file_id)
    public = _public_meta(meta)
    public["_path"] = str(path)  # internal only; routes must strip
    return public


def delete_client_file(identity: Identity | str, file_id: str) -> bool:
    """Delete a file owned by ``identity``. Returns False if absent (caller → 404)."""
    try:
        meta = _read_meta(file_id)
    except ClientFileNotFound:
        return False
    if str(meta.get("owner_id") or "") != _owner_key(identity):
        return False
    _remove_file_dir(file_id)
    return True


def register_output_file(
    identity: Identity | str,
    path: str | Path,
    mime_type: str,
    *,
    name: str | None = None,
    move: bool = False,
) -> dict[str, Any]:
    """Copy or move a provider-produced file into client storage.

    Returns the same public shape as :func:`save_client_file`, plus ``download_url``.
    """
    src = Path(path)
    if not src.is_file():
        raise ClientFileError(f"output file not found: {src}")
    data = src.read_bytes()
    display = name or src.name
    meta = save_client_file(identity, data, display, mime_type)
    if move:
        try:
            src.unlink()
        except OSError:
            pass
    return _public_meta(
        {
            **meta,
            "file_id": meta["file_id"],
            "mime_type": meta["mime_type"],
            "bytes": meta["bytes"],
            "sha256": meta["sha256"],
            "expires_at": meta["expires_at"],
            "name": meta["name"],
        },
        include_download_url=True,
    )
