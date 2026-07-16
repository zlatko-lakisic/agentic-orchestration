---
layout: single
title: "Web UI"
permalink: /web-ui/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# Web UI

**Package:** `agentic-orchestration-web/`

## Role

Browser **chat** front-end using **WebSockets**. Each user message spawns the Python tool with dynamic flags:

- `python main.py --dynamic "<text>" --no-save --no-verify` (and optional session), or
- `python main.py --dynamic-iterative "..."` with round limits / auto-controller flags

Defaults in the UI favor **iterative** + **auto** where configured.

Recent behavior updates:

- **Warpgate session ID** — proxy headers `X-Agentic-Session-Id` / `X-Warpgate-Session-Id` (no session field in the UI); tab-scoped transcript in `sessionStorage`.
- **Host resource monitor** — header sparkline pushed over the chat WebSocket (`host_metrics_subscribe`); `GET /api/host-metrics` remains for debugging.
- **Planner greeting** — LLM welcome on first connect; persisted in the tab transcript and restored on refresh; composer locked while loading.
- **Crew log timestamps** — stderr lines in the crew log panel are prefixed with local `[HH:MM:SS]`.
- Markdown answers render client-side with sanitized HTML (using bundled browser ESM vendor assets).
- File uploads are supported in chat; drag & drop or paperclip, with **pending preview chips** (image/video/audio preview or an icon) and per-file cancel before send.
- Server writes files to `<tool>/_web_uploads/<uuid>/` and passes `--dynamic-attachments` to `main.py`.
- Images, audio, and video are first-class (separate byte caps); agents can use MCP `media_understand` tools when enabled.
- Upload safety limits are enforced server-side (per-file by MIME class, total bytes, max file count).
- **Warpgate / reverse-proxy** — WebSocket singleton, edge keepalive pings, credentialed PWA manifest fetch.

## Setup

```bash
cd agentic-orchestration-web
npm install
npm start
```

**Python:** Install `agentic-orchestration-tool` deps in a venv; the server prefers `agentic-orchestration-tool/.venv/Scripts/python.exe` (Windows) when `AGENTIC_PYTHON` is unset.

## URLs

- Default: `http://127.0.0.1:3847/`
- LAN: set `AGENTIC_WEB_HOST=0.0.0.0` in **`agentic-orchestration-web/.env`**

Health endpoints and metadata:

- `GET /api/ping` returns instance/pid metadata (useful to verify restarts and active process).
- `GET /api/session` returns a JSON object with `userName` and `sessionId` from proxy headers (Warpgate) or a generated `web-*` id.
- `GET /api/host-metrics` returns host CPU, memory, load average, and uptime (Linux reads `/proc`; also pushed over WebSocket).
- `GET /api/agent-providers` returns provider catalog metadata used by the UI selector.

### OpenClaw orchestrate bridge

`POST /api/v1/orchestrate` runs a dynamic orchestration turn and returns `{ ok: true, output }`.

- **Auth:** `Authorization: Bearer <key>` or `X-Api-Key` using `AGENTIC_ORCHESTRATE_API_KEY` (fallback: `AGENTIC_CHAT_COMPLETIONS_API_KEY`).
- **Body:** JSON with the user prompt (and optional session continuity fields used by the OpenClaw plugin).
- **Plugin:** install from ClawHub as `@zlatko-lakisic/openclaw-agentic-orchestration` (`openclaw plugins install clawhub:@zlatko-lakisic/openclaw-agentic-orchestration`). Enable `hooks.allowConversationAccess` in OpenClaw. Separate repo: [agentic-orchestration-openclaw](https://github.com/zlatko-lakisic/agentic-orchestration-openclaw).

## Scripts

| Script | Purpose |
|--------|---------|
| `start-web.ps1` / `start-web.sh` | Foreground `npm start` with auto-restart |
| `start-web-bg.ps1` / `start-web-bg.sh` | Detached server |
| `stop-web-bg.ps1` / `stop-web-bg.sh` | Stop detached server |

Host/port for background starters follow the same `.env` as foreground.

## Security

The server runs **local Python** with **user-supplied text**. Do **not** expose it to the internet without authentication and hardening.

## Related

- `agentic-orchestration-web/README.md`
- [Configuration]({{ '/configuration/' | relative_url }}) — `AGENTIC_*` web variables
- [Dynamic planning]({{ '/dynamic-planning/' | relative_url }})
- [Sessions learning and knowledge base]({{ '/sessions-learning-kb/' | relative_url }}) — ratings
