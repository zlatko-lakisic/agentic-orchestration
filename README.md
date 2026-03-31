# Agentic Orchestration

Repository for experimenting with CrewAI orchestration in two ways:

- a simple hands-on demo
- a YAML-driven orchestration tool that builds providers, tasks, and execution flow dynamically

## Project Structure

- `crew-ai-demo/`  
  Minimal CrewAI example with two agents and sequential tasks.

- `agentic-orchestration-tool/`  
  YAML-first orchestration project. `main.py` reads `config/workflows/*.yaml`, creates providers (agents), builds tasks, applies `task_sequence`, and runs CrewAI.

- `agentic-orchestration-web/`  
  Node **WebSocket** + static chat UI that runs `main.py --dynamic` locally (see its `README.md`).

## Prerequisites

- Python 3.12 recommended
- PowerShell
- OpenAI API key

## Quick Start

### 1) Run the simple demo

```powershell
cd .\crew-ai-demo
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
```

Set `OPENAI_API_KEY` in `.env`, then run:

```powershell
$env:PYTHONUTF8=1
python main.py
```

### 2) Run the YAML-driven orchestration tool

```powershell
cd .\agentic-orchestration-tool
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
```

Set `OPENAI_API_KEY` in `.env`, then run:

```powershell
$env:PYTHONUTF8=1
python main.py
```

Optional custom config:

```powershell
python main.py --config config/workflows/workflow.yaml
```

## YAML-Driven Tool Overview

`agentic-orchestration-tool/config/workflows/workflow.yaml` (and siblings) control:

- `workflow.agent_providers[]`: agent-provider definitions (mapped to CrewAI agents; legacy `workflow.providers` still works)
- `workflow.tasks[]`: task definitions, each linked by `agent_provider_id` (legacy `provider_id` still works)
- `workflow.task_sequence[]`: ordered task execution
- `workflow.process`: Crew process (`sequential` or `hierarchical`)

No hardcoded provider/task chain is required in `main.py`; the workflow is assembled from YAML at runtime.

The orchestration tool also supports **extra agent-provider modules** via `AGENTIC_EXTRA_AGENT_PROVIDERS_PATH` (or legacy `AGENTIC_EXTRA_PROVIDERS_PATH`), **dynamic planning** (`--dynamic`) using `config/agent_providers/*.yaml`, and an **Ollama-powered workflow router**: `python main.py "your task"` scans `config/workflows/` for YAML with embedded `meta` and picks a workflow (see `agentic-orchestration-tool/README.md`).

## Notes

- Root `.gitignore` centrally ignores local env and virtualenv files.
- If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
