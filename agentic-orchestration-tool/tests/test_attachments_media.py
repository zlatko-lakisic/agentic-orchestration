"""Tests for attachment categorization (audio/video/image routing)."""

from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.attachments import _category_for


@pytest.mark.unit
def test_audio_category_from_mime() -> None:
    cat, route = _category_for(Path("clip.mp3"), "audio/mpeg")
    assert cat == "audio"
    assert "transcribe" in route.lower() or "media_understand" in route.lower()


@pytest.mark.unit
def test_audio_category_from_extension() -> None:
    cat, _ = _category_for(Path("memo.wav"), "application/octet-stream")
    assert cat == "audio"


@pytest.mark.unit
def test_video_category_from_mime() -> None:
    cat, route = _category_for(Path("clip.mp4"), "video/mp4")
    assert cat == "media"
    assert "frame" in route.lower() or "video" in route.lower()


@pytest.mark.unit
def test_image_category() -> None:
    cat, _ = _category_for(Path("shot.png"), "image/png")
    assert cat == "image"
