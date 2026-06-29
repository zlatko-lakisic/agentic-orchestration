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

- Markdown answers render client-side with sanitized HTML (using bundled browser ESM vendor assets).
- File uploads are supported in chat; server writes files to `<tool>/_web_uploads/<uuid>/` and passes `--dynamic-attachments` to `main.py`.
- Upload safety limits are enforced server-side (per-file, total bytes, max file count).

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
- `GET /api/agent-providers` returns provider catalog metadata used by the UI selector.

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
