# Agentic Orchestration Tool

YAML-driven CrewAI runner that dynamically creates **agent providers** (LLM-backed agents), tasks, and task sequence from configuration—distinct from future MCP integrations.

## Features

- Abstract `AgentProvider` class for agent-provider definitions.
- Workflow YAML under `config/workflows/` (default `config/workflows/workflow.yaml`).
- Dynamic mode agent-provider templates: one YAML file per entry under `config/agent_providers/`.
- Task execution order declared in `workflow.task_sequence`.
- `main.py` loads YAML and starts CrewAI dynamically.
- Rich agent-provider lifecycle hooks (see below).
- Optional **Ollama workflow router**: pass a natural-language task and the app scans a config directory for workflow files that include **`meta`**, picks one, and runs it with your task as the workflow `topic`.

### Workflow router & per-file metadata

Router mode builds the catalog from `--config-dir` (default `config`): it scans **`config/workflows/`** (i.e. `<config-dir>/workflows/*.yaml`) and every file that defines **both** top-level `meta` and `workflow` is offered to the model.

**`meta` fields** (for routing):

- **`id`** — stable id the router must return (unique across scanned files).
- **`summary`** — short line for the model.
- **`description`** — longer text (optional; defaults to `summary`).
- **`good_for`** — non-empty list of strings (what the workflow is good at).
- **`router_include`** — optional; default true. Set `false` to keep a file in the folder but **exclude** it from the router (still usable via `--config`).

**Direct run** (no router): `python main.py` uses `--config` (default `config/workflows/workflow.yaml`). Those files do not need `meta` unless you also want them routable.

Example routable workflows under `config/workflows/`: `workflow.yaml` (research brief), `workflow_brainstorm.yaml`, and **`workflow_web_dev.yaml`** (Ollama-only analysts → architect → implementer for web tasks).

**Router run**: pass a task as the first argument. Ollama must be reachable (`OLLAMA_HOST`); set `ROUTER_OLLAMA_MODEL` to a pulled model (e.g. `llama3.2`).

```powershell
$env:PYTHONUTF8=1
# Ensure Ollama is running and the router model is available: ollama pull llama3.2
python main.py "Name 10 taglines for a CLI that deploys preview environments"
```

Optional flags: `--config-dir`, `--router-model`, `--router-host`.

**Web UI**: optional chat interface with WebSockets in `../agentic-orchestration-web/` (`npm install && npm start`).

**Dynamic + long-running planner context**: `python main.py --dynamic "…" --orchestrator-session myproject` stores planner chat and a truncated last crew output under `__orchestrator_sessions__/myproject.json` (gitignored). Reuse the same session name on the next run so the orchestrator LLM sees prior turns and last results. `--orchestrator-session-reset` clears that file. Env: `AGENTIC_ORCHESTRATOR_SESSION`, `AGENTIC_ORCHESTRATOR_MAX_PLANNER_TURNS`, `AGENTIC_ORCHESTRATOR_EXCERPT_CHARS`.

**Local learning loop (no model training)**: when enabled (default), runs record lightweight traces and quality evaluations under `__orchestrator_learning__/` (gitignored):

- `stats.json`: aggregated per-provider stats (eval averages + user votes)
- `traces.jsonl`: append-only decision/outcome events
- `pending_ratings.jsonl`: web UI ratings (consumed on next planner run)

This “learning” improves *future provider/tool selection* by feeding a short **historical performance summary** back into the planner prompt for similar task types. Toggle via env: `AGENTIC_LEARNING`, `AGENTIC_LEARNING_EVAL`, `AGENTIC_EVAL_MODEL`.

**Local knowledge base (output aggregation)**: finalized answers are stored under `__orchestrator_kb__/kb.sqlite3` (gitignored) and **queried on new runs**. When relevant, the planner receives a short “Local knowledge base” snippet block it can reuse, so you don’t have to re-process the same information every time. Toggle via env: `AGENTIC_KB`, tune with `AGENTIC_KB_MAX_HITS` / `AGENTIC_KB_SNIPPET_CHARS`.

### Agent provider lifecycle

Called by the runner / `main.py` in this order:

1. **`validate_config()`** — before `initialize()`; fail fast on invalid YAML-derived config.
2. **`initialize()`** — side effects (e.g. start local services).
3. **`health_check()`** — after `initialize()`; `OllamaProvider` pings the Ollama API.
4. **`build_agent()`** — create the CrewAI agent (and tasks / crew are assembled).
5. **`on_workflow_start(context)`** — once before `crew.kickoff`; `context` includes `workflow_name`, `process`, `topic`, and `inputs`.
6. **`before_task(task_id, task, inputs)`** — before each task (first task: via crew `before_kickoff_callbacks`; later tasks: chained after the previous task’s successful completion).
7. **`after_task(task_id, task, output, error)`** — after each task **succeeds** (CrewAI does not call task callbacks on task failure; `error` is always `None` today).
8. **`on_workflow_end(context, result, error)`** — once after kickoff returns or raises (`error` is set on failure).
9. **`cleanup()`** — after `on_workflow_end`.

Not invoked automatically (available for your own code / future runner features):

- **`reset()`**, **`suspend()`**, **`resume()`**

## Setup

**One-time script (recommended)** — from `agentic-orchestration-tool/`:

- **Windows (PowerShell):** `.\setup.ps1`  
  If execution policy blocks it: `powershell -ExecutionPolicy Bypass -File .\setup.ps1`
- **macOS / Linux / WSL:** `chmod +x setup.sh && ./setup.sh`

Then activate the venv and edit `.env` as below.

**Manual setup:**

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
```

Then set your real `OPENAI_API_KEY` in `.env`.

Environment variables are loaded from `.env` **before** agent-provider discovery runs (see `main.py`), so values such as `AGENTIC_EXTRA_AGENT_PROVIDERS_PATH` / `AGENTIC_EXTRA_PROVIDERS_PATH` take effect when you start the app via `python main.py`.

## Run

```powershell
$env:PYTHONUTF8=1
python main.py
```

Use a custom config path:

```powershell
python main.py --config config/workflows/workflow.yaml
```

## YAML Schema (high level)

- `workflow.name`: workflow name.
- `workflow.process`: `sequential` or `hierarchical`.
- `workflow.topic`: input used by task templates (`{topic}`).
- `workflow.agent_providers[]`: agent-provider definitions (legacy key `workflow.providers` still accepted).
- `workflow.tasks[]`: tasks referencing `agent_provider_id` (legacy `provider_id` still accepted).
- `workflow.task_sequence[]`: ordered list of task IDs to execute.

### Ollama provider options

For a provider with `type: ollama`:

- `model`: Ollama model name (for example `llama3.1`).
- `selfcontained`:
  - `true`: bootstrap mode (install Ollama if missing, start server, pull model).
  - `false` (default): use existing Ollama server as-is.
- `ollama_host`: optional host (default `http://127.0.0.1:11434`).

### External agent-provider directories (`AGENTIC_EXTRA_AGENT_PROVIDERS_PATH`)

Set `AGENTIC_EXTRA_AGENT_PROVIDERS_PATH` (preferred) or legacy `AGENTIC_EXTRA_PROVIDERS_PATH` to one or more directories, separated by your OS path separator (`;` on Windows, `:` on Linux/macOS). Each directory is scanned for top-level `*.py` files (not subfolders; files whose names start with `_` are skipped).

For every concrete subclass of `AgentProvider` defined in those files:

- The class is registered for YAML `type: ...` if you set a class attribute `PROVIDER_TYPE = "myalias"` (recommended).
- Otherwise the `type` string is derived from the class name (for example `MyCoolProvider` becomes `mycool`).

Duplicate `type` values across the built-in `providers` package and extra folders are not allowed and raise an error at import time.

Example `.env`:

```env
AGENTIC_EXTRA_AGENT_PROVIDERS_PATH=D:\Projects\my-custom-agent-providers
```

Example external module `D:\Projects\my-custom-agent-providers\echo_provider.py`:

```python
from agent_providers.base import AgentProvider, AgentProviderConfig
from crewai import Agent

class EchoProvider(AgentProvider):
    PROVIDER_TYPE = "echo"

    def validate_config(self) -> None:
        return None

    def initialize(self) -> None:
        return None

    def health_check(self) -> None:
        return None

    def on_workflow_start(self, context: dict) -> None:
        return None

    def before_task(
        self, task_id: str, task: object, inputs: dict
    ) -> None:
        return None

    def after_task(
        self,
        task_id: str,
        task: object,
        output: object,
        error: BaseException | None,
    ) -> None:
        return None

    def on_workflow_end(
        self,
        context: dict,
        result: object,
        error: BaseException | None,
    ) -> None:
        return None

    def cleanup(self) -> None:
        return None

    def build_agent(self) -> Agent:
        return Agent(
            role=self.config.role,
            goal=self.config.goal,
            backstory=self.config.backstory,
            llm=self.config.model,
            verbose=self.config.verbose,
            allow_delegation=self.config.allow_delegation,
        )
```

Then in YAML you can use `type: echo` for that agent provider.

### Explicit agent-provider class (`provider_class`)

You can also point at any importable class without putting it in an extra folder:

```yaml
provider_class: "my_package.agent_providers.CustomAgentProvider"
```

Unknown keys on the agent-provider entry are passed through as `AgentProviderConfig.provider_options` for your class to use.
