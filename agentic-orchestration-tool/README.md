# Agentic Orchestration Tool

YAML-driven CrewAI runner that dynamically creates providers (agents), tasks, and task sequence from configuration.

## Features

- Abstract `Provider` class for provider definitions.
- Providers declared in `config/workflow.yaml`.
- Tasks declared in `config/workflow.yaml`.
- Task execution order declared in `workflow.task_sequence`.
- `main.py` loads YAML and starts CrewAI dynamically.

## Setup

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
```

Then set your real `OPENAI_API_KEY` in `.env`.

## Run

```powershell
$env:PYTHONUTF8=1
python main.py
```

Use a custom config path:

```powershell
python main.py --config config/workflow.yaml
```

## YAML Schema (high level)

- `workflow.name`: workflow name.
- `workflow.process`: `sequential` or `hierarchical`.
- `workflow.topic`: input used by task templates (`{topic}`).
- `workflow.providers[]`: provider definitions.
- `workflow.tasks[]`: tasks referencing `provider_id`.
- `workflow.task_sequence[]`: ordered list of task IDs to execute.

### Ollama provider options

For a provider with `type: ollama`:

- `model`: Ollama model name (for example `llama3.1`).
- `selfcontained`:
  - `true`: bootstrap mode (install Ollama if missing, start server, pull model).
  - `false` (default): use existing Ollama server as-is.
- `ollama_host`: optional host (default `http://127.0.0.1:11434`).
