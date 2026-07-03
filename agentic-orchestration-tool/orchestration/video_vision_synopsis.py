"""
Optional vision LLM pass over sampled video frames (LiteLLM multimodal).

Produces prose appended to the attachment block so non-multimodal crew steps still
receive a textual summary of what appears in the frames.
"""

from __future__ import annotations

import base64
import os
from pathlib import Path
from typing import Sequence

from agent_providers.ollama_provider import litellm_api_base_for_ollama


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def resolve_video_vision_model() -> str:
    raw = (os.getenv("AGENTIC_VIDEO_VISION_MODEL") or "").strip()
    if raw:
        return raw if "/" in raw else f"openai/{raw}"
    planner = (os.getenv("AGENTIC_PLANNER_MODEL") or "gpt-4o-mini").strip()
    if "/" in planner:
        return planner
    return f"openai/{planner}"


def _jpeg_data_url(path: Path) -> str:
    raw = path.read_bytes()
    b64 = base64.standard_b64encode(raw).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def summarize_video_frames_litellm(
    frame_paths: Sequence[Path],
    *,
    user_goal_hint: str,
    source_video_name: str,
) -> str | None:
    """
    Call LiteLLM once with text + images. Returns trimmed prose or None on failure.
    """
    if os.getenv("AGENTIC_VIDEO_VISION_SYNOPSIS", "1").strip().lower() in (
        "0",
        "false",
        "no",
        "off",
    ):
        return None

    paths = [Path(p) for p in frame_paths if Path(p).is_file()]
    if not paths:
        return None

    max_for_llm = max(1, min(24, _env_int("AGENTIC_VIDEO_VISION_MAX_FRAMES", 8)))
    paths = paths[:max_for_llm]

    try:
        import litellm  # type: ignore[import-not-found]
    except Exception:
        return None

    model = resolve_video_vision_model()
    hint = (user_goal_hint or "").strip()
    intro = (
        "These JPEG images are evenly spaced frames from a video file, in chronological order.\n"
        f"Video filename (hint): {source_video_name}\n"
        "Describe what is visible across time: scenes, actions, objects, people, on-screen text, "
        "UI, and any clear narrative or event sequence. If frames are ambiguous or repetitive, say so.\n"
        "Respond in concise prose (no JSON, no markdown fences)."
    )
    if hint:
        intro += f"\n\nUser task / question context:\n{hint}"

    content: list[dict[str, object]] = [{"type": "text", "text": intro}]
    for p in paths:
        content.append({"type": "image_url", "image_url": {"url": _jpeg_data_url(p)}})

    max_tokens = max(256, min(4096, _env_int("AGENTIC_VIDEO_VISION_MAX_TOKENS", 1200)))
    litellm_kwargs: dict[str, object] = {
        "model": model,
        "messages": [{"role": "user", "content": content}],
        "temperature": 0.2,
        "max_tokens": max_tokens,
    }
    if model.lower().startswith("ollama/"):
        litellm_kwargs["api_base"] = litellm_api_base_for_ollama()
    try:
        resp_raw = litellm.completion(**litellm_kwargs)
        if hasattr(resp_raw, "model_dump"):
            resp = resp_raw.model_dump()
        elif hasattr(resp_raw, "dict"):
            resp = resp_raw.dict()
        else:
            resp = resp_raw
        if not isinstance(resp, dict):
            return None
        choices = resp.get("choices") or []
        first = choices[0] if isinstance(choices, list) and choices else {}
        text_out = ""
        if isinstance(first, dict):
            msg = first.get("message")
            if isinstance(msg, dict):
                c = msg.get("content")
                if isinstance(c, str):
                    text_out = c.strip()
        out = text_out.strip()
        return out if out else None
    except Exception:
        return None
