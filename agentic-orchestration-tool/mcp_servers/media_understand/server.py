"""Media-understand MCP server — tools for local image / audio / video files.

Transport: stdio (default) via FastMCP.
"""

from __future__ import annotations

import sys
from typing import Any

from mcp_servers.media_understand.analyze import analyze_video, describe_image, transcribe_audio


def create_mcp_server():
    try:
        from mcp.server.fastmcp import FastMCP
    except ImportError:
        sys.stderr.write(
            "media-understand MCP: install the official Python SDK: pip install 'mcp>=1.2.0'\n"
        )
        raise

    mcp = FastMCP(
        "media-understand",
        instructions=(
            "Analyze local uploaded media files under orchestration upload directories. "
            "Use describe_image for photos/screenshots, transcribe_audio for speech, "
            "and analyze_video for MP4/WebM/etc. Pass absolute paths from attachment manifests."
        ),
    )

    @mcp.tool()
    def describe_image_file(path: str, question: str = "") -> dict[str, Any]:
        """Describe a local image file with a vision model.

        Args:
            path: Absolute path to an image (PNG/JPEG/WebP/GIF).
            question: Optional focus question (e.g. "OCR the text" or "list objects").
        """
        return describe_image(path, question=question)

    @mcp.tool()
    def transcribe_audio_file(path: str, language: str = "") -> dict[str, Any]:
        """Transcribe speech from a local audio file (mp3/wav/m4a/ogg/…).

        Args:
            path: Absolute path to an audio file.
            language: Optional ISO language code hint (e.g. "en").
        """
        return transcribe_audio(path, language=language)

    @mcp.tool()
    def analyze_video_file(path: str, question: str = "", max_frames: int = 6) -> dict[str, Any]:
        """Sample frames from a local video and summarize what is shown.

        Args:
            path: Absolute path to a video (mp4/webm/mov/…).
            question: Optional focus question for the vision synopsis.
            max_frames: How many evenly spaced frames to sample (1–16).
        """
        return analyze_video(path, question=question, max_frames=max_frames)

    return mcp


def main() -> None:
    mcp = create_mcp_server()
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
