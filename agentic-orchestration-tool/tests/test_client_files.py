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
    delete_client_file,
    register_output_file,
    resolve_client_file,
    save_client_file,
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
    _write_meta(meta2["file_id"], stored2)
    removed = cleanup_expired_files()
    assert removed >= 1
    assert not (files_root / meta2["file_id"]).exists()


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
