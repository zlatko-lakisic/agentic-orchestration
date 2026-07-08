# media-understand MCP (stdio)

First-party MCP server for **local file paths** under orchestration uploads.

## What it does

| Tool | Input | Output |
|------|-------|--------|
| `describe_image_file` | image path | Vision model description (LiteLLM) |
| `transcribe_audio_file` | audio path | Speech transcript (faster-whisper or OpenAI) |
| `analyze_video_file` | video path | ffmpeg frame samples + vision synopsis |

## What it does **not** do

- No native video tensor / end-to-end multimodal model inside the server.
- No guarantee of perfect scene understanding — answers should follow harness **media grounding evidence** (ffprobe scene-cut count, audio levels) injected before the answering step.

## Transport

- **stdio** (`python -m mcp_servers.media_understand`) — works with worker stdio MCPs on Kubernetes when `AGENTIC_K8S_WORKER_STDIO_MCPS` includes `media_understand`.
- Not shipped as `streamable_http` today; K8s deployments should use worker stdio or document local-only use.

## Opt-in

Set `AGENTIC_MCP_MEDIA_ENABLED=1`. Optional: `pip install faster-whisper`, `ffmpeg` on PATH.

## Harness grounding

`orchestration/media_grounding.py` runs the same analyze helpers **before** the crew step when attachments include image/audio/video. If extraction fails and tools are unavailable, the run returns a fixed gate message (no model prose). Confabulated answers that contradict technical facts are rejected.
