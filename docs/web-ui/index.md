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

- **Security-gateway / legacy proxy session ID** — proxy headers `X-Agentic-Session-Id` / `X-Warpgate-Session-Id` (no session field in the UI); tab-scoped transcript in `sessionStorage`.
- **Host resource monitor** — header sparkline pushed over the chat WebSocket (`host_metrics_subscribe`); `GET /api/host-metrics` remains for debugging.
- **Planner greeting** — LLM welcome on first connect; persisted in the tab transcript and restored on refresh; composer locked while loading.
- **Crew log timestamps** — stderr lines in the crew log panel are prefixed with local `[HH:MM:SS]`.
- Markdown answers render client-side with sanitized HTML (using bundled browser ESM vendor assets).
- File uploads are supported in chat; drag & drop or paperclip, with **pending preview chips** (image/video/audio preview or an icon) and per-file cancel before send.
- Server writes files to `<tool>/_web_uploads/<uuid>/` and passes `--dynamic-attachments` to `main.py`.
- Images, audio, and video are first-class (separate byte caps); agents can use MCP `media_understand` tools when enabled.
- Upload safety limits are enforced server-side (per-file by MIME class, total bytes, max file count).
- **Security gateway / reverse proxy** — WebSocket singleton, edge keepalive pings, credentialed PWA manifest fetch.

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
- `GET /api/session` returns a JSON object with `userName` and `sessionId` from proxy headers (security gateway) or a generated `web-*` id.
- `GET /api/host-metrics` returns host CPU, memory, load average, and uptime (Linux reads `/proc`; also pushed over WebSocket).
- `GET /api/agent-providers` returns provider catalog metadata used by the UI selector.

### Orchestrate bridge (external hosts)

`POST /api/v1/orchestrate` runs a dynamic orchestration turn and returns `{ ok: true, output }`.

OpenAI-compatible proxies on the same web process:

- `POST /v1/chat/completions`
- `POST /v1/responses`

All three **require** `Authorization: Bearer <token>` (anonymous calls are rejected). See [[#api-access-tokens]].

- **Body (orchestrate):** JSON with the user prompt (and optional session continuity fields).
- **Connectors:** OpenClaw plugin and future host adapters — see [External integrations]({{ '/external-integrations/' | relative_url }}).

---

<a id="api-access-tokens"></a>
## API access tokens

Mint and revoke tokens in **Admin → Access → API tokens**. Secrets are shown once at mint time; the server stores only a hash (plus plaintext for the two first-party UI assignments below).

### First-party UIs (auto-assign)

| Mint choice | `appId` | Used by |
|---|---|---|
| Admin Web UI | `ao-web` | Admin SPA (`/admin`) — auto-assigned; SPA loads it via `GET /api/v1/admin/web-auth` |
| Chat Web UI | `ao-chat` | Built-in chat (`/`) — auto-assigned; page loads it via `GET /api/v1/admin/chat-auth` and attaches it to HTTP + WebSocket |

You do **not** paste these into the browser. Minting assigns them; revoke and remint if compromised.

### External web apps and connectors

Any other product that calls AO over HTTP (another site, OpenClaw, CI, a field app using the OpenAI SDK against your edge) needs its **own** minted token with a stable **`appId`** for that client (for example `openclaw`, `my-portal`, `field-client`).

**How to use**

1. Admin → Access → **Mint token** → **External client (custom appId)** → set `appId` (and optional label / expiry).
2. Copy the `ao_…` secret once into the external app’s secret store (env, vault, plugin config). Never commit it.
3. On every request, send:

```http
Authorization: Bearer ao_<secret>
Content-Type: application/json
```

**Endpoints that accept external tokens**

| Endpoint | Typical client |
|---|---|
| `POST /api/v1/orchestrate` | OpenClaw, custom bridges |
| `POST /v1/chat/completions` | Apps using an OpenAI-compatible chat SDK |
| `POST /v1/responses` | Apps using an OpenAI-compatible responses SDK |

**Example (orchestrate)**

```bash
curl -sS -X POST "https://ao.example.com/api/v1/orchestrate" \
  -H "Authorization: Bearer ao_…" \
  -H "Content-Type: application/json" \
  -d '{"text":"Summarize today’s irrigation plan"}'
```

**Example (OpenAI-compatible chat)**

Point the SDK `baseURL` at the web origin (for example `https://ao.example.com/v1`) and set `apiKey` to the minted `ao_…` token. The gate uses that Bearer; upstream cloud keys (if any) stay on the server.

**What external tokens do *not* unlock**

- Admin REST (`/api/v1/admin/*` except bootstrap auth endpoints) — reserved for `ao-web`
- Built-in chat session / agent-provider HTTP and the chat WebSocket once `ao-chat` is assigned — reserved for `ao-chat`

Usage (appId, IP, path, status, latency) is recorded per token under Access → Usage.

**Env shared-secret fallback (legacy)**

If set, `AGENTIC_ORCHESTRATE_API_KEY` / `AGENTIC_CHAT_COMPLETIONS_API_KEY` still work as Bearer values for orchestrate / OpenAI proxies (`appId: env` in the ledger). Prefer per-app minted tokens so you can revoke one client without rotating a global secret.

Store path: `AGENTIC_API_TOKENS_DIR` (edge default: hostPath under `var/agentic-api-tokens`). See [Configuration]({{ '/configuration/' | relative_url }}).

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
