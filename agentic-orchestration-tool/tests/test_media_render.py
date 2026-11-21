"""Tests for orchestration.media_render timeline validation and ffmpeg pipeline."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from orchestration.client_files import save_client_file
from orchestration.media_render import (
    MediaRenderError,
    build_ass_captions,
    parse_timeline,
    render_short,
    resolve_timeline_files,
)
from orchestration.user_context import Identity

pytestmark = pytest.mark.unit

HAS_FFMPEG = shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def _ident(uid: str = "alice") -> Identity:
    return Identity(
        user_name=uid.title(),
        session_id=f"s-{uid}",
        user_id=uid,
        local=False,
        mtls=True,
    )


def test_parse_timeline_rejects_path_and_bad_motion() -> None:
    with pytest.raises(MediaRenderError, match="file_id"):
        parse_timeline(
            {
                "segments": [
                    {"type": "image", "file_id": "/etc/passwd", "seconds": 1.0}
                ],
                "narration_file_id": "abc12345",
            }
        )
    with pytest.raises(MediaRenderError, match="motion"):
        parse_timeline(
            {
                "segments": [
                    {
                        "type": "image",
                        "file_id": "abc12345deadbeef",
                        "seconds": 1.0,
                        "motion": "spin",
                    }
                ],
                "narration_file_id": "abc12345deadbeef",
            }
        )


def test_parse_timeline_ok_minimal() -> None:
    tl = parse_timeline(
        json.dumps(
            {
                "segments": [
                    {
                        "type": "image",
                        "file_id": "aaaaaaaaaaaaaaaa",
                        "seconds": 2.5,
                        "motion": "zoom_in",
                    }
                ],
                "narration_file_id": "bbbbbbbbbbbbbbbb",
            }
        )
    )
    assert tl["width"] == 1080
    assert tl["height"] == 1920
    assert tl["segments"][0]["motion"] == "zoom_in"
    assert tl["captions"] is None


def test_resolve_refuses_other_identity(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_FILES_DIR", str(tmp_path / "files"))
    meta = save_client_file(_ident("alice"), b"\xff\xd8\xff", "a.jpg", "image/jpeg")
    tl = parse_timeline(
        {
            "segments": [{"type": "image", "file_id": meta["file_id"], "seconds": 1.0}],
            "narration_file_id": meta["file_id"],
        }
    )
    with pytest.raises(MediaRenderError, match="not found"):
        resolve_timeline_files(tl, _ident("bob"))


def test_build_ass_captions_places_dialogue() -> None:
    ass = build_ass_captions(
        {
            "words": [
                {"word": "Mostar", "start": 0.42, "end": 0.91},
                {"word": "bridge", "start": 1.0, "end": 1.4},
            ],
            "max_words_per_line": 4,
            "highlight_current_word": True,
        },
        width=1080,
        height=1920,
    )
    assert "Dialogue:" in ass
    assert "Mostar" in ass
    assert "Highlight" in ass
    # MarginV ~ 35% of 1920 ≈ 672
    assert "672" in ass or "MarginV" in ass


@pytest.mark.skipif(not HAS_FFMPEG, reason="ffmpeg/ffprobe not installed")
def test_render_short_lavfi_pipeline(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_FILES_DIR", str(tmp_path / "files"))
    monkeypatch.setenv("AGENTIC_MEDIA_RENDER_ENCODER", "libx264")
    work = tmp_path / "gen"
    work.mkdir()
    img = work / "img.jpg"
    clip = work / "clip.mp4"
    wav = work / "n.wav"
    # Tiny JPEG via ffmpeg lavfi
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=blue:s=320x240:d=0.1",
            "-frames:v",
            "1",
            str(img),
        ],
        check=True,
        capture_output=True,
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc=size=320x240:rate=30:duration=2",
            "-pix_fmt",
            "yuv420p",
            str(clip),
        ],
        check=True,
        capture_output=True,
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:duration=3",
            str(wav),
        ],
        check=True,
        capture_output=True,
    )
    alice = _ident("alice")
    img_id = save_client_file(alice, img.read_bytes(), "i.jpg", "image/jpeg")["file_id"]
    clip_id = save_client_file(alice, clip.read_bytes(), "c.mp4", "video/mp4")["file_id"]
    wav_id = save_client_file(alice, wav.read_bytes(), "n.wav", "audio/wav")["file_id"]
    timeline = {
        "width": 1080,
        "height": 1920,
        "fps": 30,
        "segments": [
            {"type": "image", "file_id": img_id, "seconds": 1.0, "motion": "zoom_in"},
            {"type": "video", "file_id": clip_id, "seconds": 1.5},
        ],
        "narration_file_id": wav_id,
        "captions": {
            "words": [
                {"word": "Hello", "start": 0.0, "end": 0.5},
                {"word": "world", "start": 0.5, "end": 1.0},
            ],
            "max_words_per_line": 2,
            "highlight_current_word": True,
        },
    }
    result = render_short(json.dumps(timeline), identity=alice)
    assert result.get("ok") is True, result
    assert result["file_id"]
    assert result["download_url"].startswith("/api/v1/files/")
    assert result["width"] == 1080
    assert result["height"] == 1920
    assert result["has_audio"] is True
    assert result["duration_s"] > 0
    assert result["encoder"] in ("libx264", "h264_nvenc")
