# Agentic orchestration web UI

<p align="center">
  <img src="../assets/brand/ao-logo-horizontal-steel.svg" alt="Agentic Orchestration" width="360" />
</p>

Chat-style front-end that talks to the Python tool over **WebSockets**. Each message runs either:

- `python main.py --dynamic "<your text>" --no-save --no-verify` (+ optional `--orchestrator-session`)
- `python main.py --dynamic-iterative "<your text>" --dynamic-iterative-rounds N --no-save --no-verify` (+ optional `--orchestrator-session`)

## Prerequisites

- **Node.js 18+** (LTS). The server uses modern JavaScript; distro packages that ship Node 12 or 14 will fail with parse errors such as `Unexpected token '.'` until you upgrade (e.g. [nvm](https://github.com/nvm-sh/nvm), [NodeSource](https://github.com/nodesource/distributions), or your OS Node package).
- On startup, `server.mjs` refuses to run if `process.version` is below Node 14; **18+ is still recommended** (`package.json` `engines`).

## Setup

From this directory:

```powershell
npm install
```

Ensure `agentic-orchestration-tool/.env` has `OPENAI_API_KEY` (and any Ollama vars you need). The server **spawns Python** in that folder.

**Install Python deps** in the tool (required: `crewai`, etc.):

```powershell
cd ..\agentic-orchestration-tool
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If `AGENTIC_PYTHON` is unset, the web server automatically uses `agentic-orchestration-tool\.venv\Scripts\python.exe` when that file exists; otherwise it runs `python` from your PATH (which often has no `crewai`).

## Run

```powershell
npm start
```

Open **http://127.0.0.1:3847/** (default). To listen on **every interface** (LAN, WSL, etc.), copy `.env.example` to `.env` and set `AGENTIC_WEB_HOST=0.0.0.0`, then use this machine’s IP (e.g. `http://192.168.1.10:3847/`).

## Environment

On `npm start`, **`agentic-orchestration-web/.env`** is read by the server (simple `KEY=value` lines); existing environment variables are not overwritten.

| Variable | Default | Meaning |
|----------|---------|---------|
| `AGENTIC_TOOL_ROOT` | `../agentic-orchestration-tool` | Directory containing `main.py` |
| `AGENTIC_PYTHON` | `python` | Python executable |
| `AGENTIC_WEB_HOST` | `127.0.0.1` | Bind address (`0.0.0.0` = all interfaces) |
| `AGENTIC_WEB_PORT` | `3847` | HTTP + WebSocket port |
| `AGENTIC_WEB_SESSION_ID_HEADER` | `X-Agentic-Session-Id,X-Warpgate-Session-Id` | Proxy-injected orchestrator session slug |
| `AGENTIC_WEB_USER_NAME_HEADER` | `X-Agentic-User-Name,X-User-Name` | Proxy-injected display name for planner greet |
| `AGENTIC_WEB_HOST_METRICS_PUSH_MS` | `2000` | WebSocket host-metrics push interval |
| `AGENTIC_WEB_PLANNER_GREET` | `1` | LLM welcome on first connect (`0` = static message only) |
| `AGENTIC_WEB_TRUSTED_PROXIES` | empty | IPs/CIDRs of your auth proxy. Only these peers (and loopback clients with no proxy headers) may fetch the UI token or bootstrap tokens; identity headers are honoured only from them once set |
| `AGENTIC_WEB_AUTH_BOOTSTRAP` | unset | `open` hands the UI token to any caller again (previous behaviour; not recommended) |
| `AGENTIC_WEB_ALLOWED_ORIGINS` | empty | Extra browser origins allowed on WebSocket upgrades and state-changing requests |
| `AGENTIC_WEB_ALLOWED_HOSTS` | empty | Extra `Host` names accepted when bound to loopback |
| `AGENTIC_SERVE_ADMIN_TOKEN` | unset | Sent as Bearer on the engine daemon's `/api/v1/admin/*` routes; must match the daemon |
| `AGENTIC_WEB_MAX_PROMPT_BYTES` | `2000000` | Prompt size limit (long prompts are streamed to the engine over stdin) |
| `AGENTIC_WEB_RUN_TIMEOUT_SECONDS` | `7200` | Run deadline (`0` disables) |
| `AGENTIC_WEB_KILL_RUN_ON_DISCONNECT` | `1` | Stop the run when its client disconnects |
| `AGENTIC_WEB_MAX_CONCURRENT_RUNS` | `16` | Concurrent orchestrator processes |

More limits are listed in [`.env.example`](.env.example).

## Behavior notes

- **Session ID** is not shown in the UI. The server reads proxy headers or generates a `web-*` id; chat transcript (including the welcome message) is stored in `sessionStorage` per tab.
- **Host metrics** are pushed on the chat WebSocket after `host_metrics_subscribe` (HTTP `GET /api/host-metrics` remains for debugging).
- The composer (prompt, send, attach) is disabled while the welcome message loads or a run is in progress.

## Security

This process **executes your local Python orchestrator** with user-supplied text. Do not expose the server to the internet without authentication and hardening.

What the server enforces on its own:

- **UI token hand-out.** `GET /api/v1/admin/web-auth` and `/chat-auth` return the token only to a trusted source (loopback with no proxy headers, or a peer in `AGENTIC_WEB_TRUSTED_PROXIES`). Others get `403 web_auth_untrusted_source`. Behind Traefik/Warpgate you must set `AGENTIC_WEB_TRUSTED_PROXIES`.
- **UI tokens are not API keys.** `ao-web` / `ao-chat` tokens are refused on `/v1/chat/completions`, `/v1/responses` and `/api/v1/orchestrate`.
- **Origin and Host checks.** A page on another site cannot open the WebSocket or send state-changing requests; a loopback bind only answers to loopback `Host` names.
- **WebSocket auth** travels in the `Sec-WebSocket-Protocol` header (`ao-auth`, `ao-bearer.<token>`), not the URL. `?access_token=` is still accepted for old clients.
- **Prompts** are passed to `main.py` after `--` or over stdin, so they cannot be parsed as options.

These do not replace an authenticating proxy for anything reachable from an untrusted network.
