"""Unit tests for orchestration.client_files storage helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from orchestration.client_files import (
    ClientFileNotFound,
    ClientFileTooLarge,
    ClientFileTypeError,
    cleanup_expired_files,
    client_file_is_pinned,
    delete_client_file,
    files_output_ttl_hours,
    pin_client_file,
    register_output_file,
    resolve_client_file,
    save_client_file,
    unpin_client_file,
)
from orchestration.user_context import Identity

pytestmark = pytest.mark.unit


def _identity(user_id: str = "alice") -> Identity:
    return Identity(
        user_name=user_id.title(),
        session_id=f"sess-{user_id}",
        user_id=user_id,
        local=False,
        mtls=True,
    )


@pytest.fixture
def files_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    root = tmp_path / "files"
    monkeypatch.setenv("AGENTIC_FILES_DIR", str(root))
    monkeypatch.setenv("AGENTIC_FILES_TTL_HOURS", "24")
    monkeypatch.setenv("AGENTIC_FILES_MAX_BYTES", str(1024 * 1024))
    return root


def test_save_and_resolve_roundtrip(files_root: Path) -> None:
    alice = _identity("alice")
    payload = b"\xff\xd8\xff" + b"jpeg-bytes"
    meta = save_client_file(alice, payload, "shot.jpg", "image/jpeg")
    assert meta["file_id"]
    assert meta["name"] == "shot.jpg"
    assert meta["mime_type"] == "image/jpeg"
    assert meta["bytes"] == len(payload)
    assert len(meta["sha256"]) == 64
    assert "expires_at" in meta
    assert "download_url" not in meta

    path = resolve_client_file(alice, meta["file_id"])
    assert path.read_bytes() == payload
    assert path.is_relative_to(files_root)


def test_resolve_rejects_other_owner(files_root: Path) -> None:
    meta = save_client_file(_identity("alice"), b"png", "a.png", "image/png")
    with pytest.raises(ClientFileNotFound):
        resolve_client_file(_identity("bob"), meta["file_id"])


def test_expiry_cleanup_removes_file(files_root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_FILES_TTL_HOURS", "0.000001")
    monkeypatch.setenv("AGENTIC_FILES_CLEANUP_MIN_AGE_HOURS", "0")
    meta = save_client_file(_identity("alice"), b"wav-data", "n.wav", "audio/wav")
    # Force expiry in meta by rewriting expires_at into the past.
    from orchestration.client_files import _read_meta, _write_meta

    stored = _read_meta(meta["file_id"])
    past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
    stored["expires_at"] = past
    _write_meta(meta["file_id"], stored)

    with pytest.raises(ClientFileNotFound):
        resolve_client_file(_identity("alice"), meta["file_id"])

    # Re-save and cleanup pass
    meta2 = save_client_file(_identity("alice"), b"wav-data-2", "n2.wav", "audio/wav")
    stored2 = _read_meta(meta2["file_id"])
    stored2["expires_at"] = past
    stored2["created_at"] = past
    _write_meta(meta2["file_id"], stored2)
    removed = cleanup_expired_files()
    assert removed >= 1
    assert not (files_root / meta2["file_id"]).exists()


def test_cleanup_skips_pinned_and_young_files(
    files_root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_FILES_CLEANUP_MIN_AGE_HOURS", "2")
    from orchestration.client_files import _read_meta, _write_meta

    past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat().replace(
        "+00:00", "Z"
    )
    meta = save_client_file(_identity("alice"), b"mp4bytes", "clip.mp4", "video/mp4")
    stored = _read_meta(meta["file_id"])
    stored["expires_at"] = past
    _write_meta(meta["file_id"], stored)
    # Young + expired → still kept (handoff race guard).
    assert cleanup_expired_files() == 0
    assert (files_root / meta["file_id"]).exists()

    pin_client_file(meta["file_id"])
    assert client_file_is_pinned(meta["file_id"])
    monkeypatch.setenv("AGENTIC_FILES_CLEANUP_MIN_AGE_HOURS", "0")
    stored["created_at"] = past
    _write_meta(meta["file_id"], stored)
    assert cleanup_expired_files() == 0  # pinned
    unpin_client_file(meta["file_id"])
    assert cleanup_expired_files() == 1
    assert not (files_root / meta["file_id"]).exists()


def test_register_output_uses_longer_ttl(
    files_root: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_FILES_TTL_HOURS", "1")
    monkeypatch.setenv("AGENTIC_FILES_OUTPUT_TTL_HOURS", "48")
    src = tmp_path / "out.mp4"
    src.write_bytes(b"ftypisom")
    meta = register_output_file(_identity("alice"), src, "video/mp4", name="clip.mp4")
    from orchestration.client_files import _read_meta

    stored = _read_meta(meta["file_id"])
    created = datetime.fromisoformat(stored["created_at"].replace("Z", "+00:00"))
    expires = datetime.fromisoformat(stored["expires_at"].replace("Z", "+00:00"))
    assert (expires - created) >= timedelta(hours=47)
    assert files_output_ttl_hours() == 48.0


def test_bad_mime_type_rejected(files_root: Path) -> None:
    with pytest.raises(ClientFileTypeError):
        save_client_file(_identity("alice"), b"x", "x.exe", "application/octet-stream")


def test_size_limit_rejected(files_root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_FILES_MAX_BYTES", "8")
    with pytest.raises(ClientFileTooLarge):
        save_client_file(_identity("alice"), b"0123456789", "big.png", "image/png")


def test_delete_owner_only(files_root: Path) -> None:
    meta = save_client_file(_identity("alice"), b"{}", "meta.json", "application/json")
    assert delete_client_file(_identity("bob"), meta["file_id"]) is False
    assert resolve_client_file(_identity("alice"), meta["file_id"]).is_file()
    assert delete_client_file(_identity("alice"), meta["file_id"]) is True
    with pytest.raises(ClientFileNotFound):
        resolve_client_file(_identity("alice"), meta["file_id"])


def test_register_output_file_adds_download_url(files_root: Path, tmp_path: Path) -> None:
    src = tmp_path / "out.mp4"
    src.write_bytes(b"ftypisom")
    meta = register_output_file(_identity("alice"), src, "video/mp4", name="clip.mp4")
    assert meta["download_url"] == f"/api/v1/files/{meta['file_id']}"
    assert resolve_client_file(_identity("alice"), meta["file_id"]).read_bytes() == b"ftypisom"
    assert "path" not in meta
    assert str(files_root) not in str(meta)
