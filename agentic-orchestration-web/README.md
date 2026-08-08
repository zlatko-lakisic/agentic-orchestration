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

## Behavior notes

- **Session ID** is not shown in the UI. The server reads proxy headers or generates a `web-*` id; chat transcript (including the welcome message) is stored in `sessionStorage` per tab.
- **Host metrics** are pushed on the chat WebSocket after `host_metrics_subscribe` (HTTP `GET /api/host-metrics` remains for debugging).
- The composer (prompt, send, attach) is disabled while the welcome message loads or a run is in progress.

## Security

This process **executes your local Python orchestrator** with user-supplied text. Do not expose the server to the internet without authentication and hardening.
