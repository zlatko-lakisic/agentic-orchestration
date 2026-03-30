# Agentic Orchestration

Repository for experimenting with CrewAI orchestration in two ways:

- a simple hands-on demo
- a YAML-driven orchestration tool that builds providers, tasks, and execution flow dynamically

## Project Structure

- `crew-ai-demo/`  
  Minimal CrewAI example with two agents and sequential tasks.

- `agentic-orchestration-tool/`  
  YAML-first orchestration project. `main.py` reads `config/workflow.yaml`, creates providers (agents), builds tasks, applies `task_sequence`, and runs CrewAI.

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
python main.py --config config/workflow.yaml
```

## YAML-Driven Tool Overview

`agentic-orchestration-tool/config/workflow.yaml` controls:

- `workflow.providers[]`: provider definitions (mapped to CrewAI agents)
- `workflow.tasks[]`: task definitions, each linked by `provider_id`
- `workflow.task_sequence[]`: ordered task execution
- `workflow.process`: Crew process (`sequential` or `hierarchical`)

No hardcoded provider/task chain is required in `main.py`; the workflow is assembled from YAML at runtime.

The orchestration tool also supports **extra provider modules** via the environment variable `AGENTIC_EXTRA_PROVIDERS_PATH` (see `agentic-orchestration-tool/README.md` for details). Put provider folders in `.env` and run `python main.py` from that project so `.env` is loaded before provider discovery.

## Notes

- Root `.gitignore` centrally ignores local env and virtualenv files.
- If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
