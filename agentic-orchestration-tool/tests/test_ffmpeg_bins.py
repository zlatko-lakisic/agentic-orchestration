"""Unit tests for ffmpeg/ffprobe resolution (#125)."""

from __future__ import annotations

from pathlib import Path

import pytest

from orchestration import ffmpeg_bins as fb

pytestmark = pytest.mark.unit


def test_env_override(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    fake = tmp_path / "ffmpeg"
    fake.write_bytes(b"#!/bin/sh\n")
    fake.chmod(0o755)
    monkeypatch.setenv("AGENTIC_VIDEO_FFMPEG", str(fake))
    monkeypatch.delenv("AGENTIC_VIDEO_FFPROBE", raising=False)
    assert fb.ffmpeg_bin() == str(fake.resolve())
    probe = tmp_path / "ffprobe"
    probe.write_bytes(b"#!/bin/sh\n")
    probe.chmod(0o755)
    assert fb.ffprobe_bin() == str(probe.resolve())


def test_health_shape(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_VIDEO_FFMPEG", raising=False)
    monkeypatch.delenv("AGENTIC_VIDEO_FFPROBE", raising=False)
    health = fb.ffmpeg_health()
    assert "ok" in health
    assert "ffmpeg" in health
    assert "ffprobe" in health
    assert "ffmpegFound" in health
    assert "ffprobeFound" in health


def test_candidate_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_VIDEO_FFMPEG", raising=False)
    monkeypatch.delenv("AGENTIC_VIDEO_FFPROBE", raising=False)
    monkeypatch.setattr(fb, "_CANDIDATE_DIRS", (str(tmp_path),))
    monkeypatch.setattr(fb.shutil, "which", lambda _name: None)
    fake = tmp_path / "ffmpeg"
    fake.write_bytes(b"#!/bin/sh\n")
    fake.chmod(0o755)
    assert fb.ffmpeg_bin() == str(fake.resolve())
