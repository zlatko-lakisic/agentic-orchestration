# Agentic orchestration web UI

Chat-style front-end that talks to the Python tool over **WebSockets**. Each message runs:

`python main.py --dynamic "<your text>" --no-save --no-verify` (+ optional `--orchestrator-session`).

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

Open **http://127.0.0.1:3847/** (default). The server listens on **127.0.0.1** only.

## Environment

| Variable | Default | Meaning |
|----------|---------|---------|
| `AGENTIC_TOOL_ROOT` | `../agentic-orchestration-tool` | Directory containing `main.py` |
| `AGENTIC_PYTHON` | `python` | Python executable |
| `AGENTIC_WEB_HOST` | `127.0.0.1` | Bind address |
| `AGENTIC_WEB_PORT` | `3847` | HTTP + WebSocket port |

## Security

This process **executes your local Python orchestrator** with user-supplied text. Do not expose the server to the internet without authentication and hardening.
