"""Unit tests for media_understand analyze helpers (no live LLM)."""

from __future__ import annotations

from pathlib import Path

import pytest

from mcp_servers.media_understand.analyze import describe_image, transcribe_audio


@pytest.mark.unit
def test_describe_image_missing_file(tmp_path: Path) -> None:
    out = describe_image(str(tmp_path / "nope.png"))
    assert out["ok"] is False
    assert "error" in out or "Not a file" in str(out.get("error", out))


@pytest.mark.unit
def test_transcribe_audio_missing_file(tmp_path: Path) -> None:
    out = transcribe_audio(str(tmp_path / "nope.wav"))
    assert out["ok"] is False


@pytest.mark.unit
def test_describe_image_rejects_non_image(tmp_path: Path) -> None:
    p = tmp_path / "notes.txt"
    p.write_text("hello", encoding="utf-8")
    out = describe_image(str(p))
    assert out["ok"] is False
    assert "image" in str(out.get("error", "")).lower()
