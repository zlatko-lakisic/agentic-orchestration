# Agentic Orchestration

**A model-agnostic, agent-based orchestration engine** built on **[CrewAI](https://github.com/crewAIInc/crewAI)**. It turns natural-language goals and YAML configuration into coordinated multi-agent workflows: planners choose steps and backends, agents execute with clear roles, and optional **Model Context Protocol (MCP)** servers extend each agent with tools (Home Assistant, docs, search, and custom servers you add to the catalog).

You are not locked to one vendor or one model. The same orchestrator can mix **Ollama** (local), **OpenAI-compatible** APIs, **Anthropic Claude**, and **Hugging Face** models—picked per task from a catalog, filtered by credentials and (optionally) GPU memory, with a LiteLLM-backed planner so planning can use the same breadth of backends as execution.

---

## What this repository is for

| You want… | Start here |
|-----------|------------|
| **Hands-on CrewAI** (minimal two-agent demo) | [`crew-ai-demo/`](crew-ai-demo/) |
| **Production-style orchestration** (YAML workflows, dynamic planning, MCP, sessions, learning, KB) | [`agentic-orchestration-tool/`](agentic-orchestration-tool/) |
| **Browser chat** over local WebSockets (dynamic & iterative modes) | [`agentic-orchestration-web/`](agentic-orchestration-web/) |

**Deeper documentation (per package):**

- **[`agentic-orchestration-tool/README.md`](agentic-orchestration-tool/README.md)** — workflows, router, dynamic mode, agent provider lifecycle, extra providers, VRAM, MCP catalog, learning loop, knowledge base.
- **[`agentic-orchestration-web/README.md`](agentic-orchestration-web/README.md)** — Web UI setup, `AGENTIC_*` server env, security notes.

---

## Vision: orchestration, not a single chatbot

This stack is an **orchestration layer**, not a replacement for any one LLM:

1. **Planner** — Interprets the user goal (and session history) and emits a structured plan: steps, agent provider IDs, optional MCP IDs.
2. **Runner** — Builds a CrewAI `Crew` with agents and tasks, resolves MCP configs per task, and executes sequentially (or as configured).
3. **Tools (MCP)** — When relevant, agents get MCP servers attached so they can call real APIs instead of inventing facts.
4. **Adaptation** — Iterative dynamic mode re-plans between steps; a small controller can stop early or suggest refined goals; step output can flow into the next task for continuity.
5. **Memory & aggregation** — Sessions persist planner turns and excerpts; an optional local **knowledge base** (SQLite + FTS) stores finalized outputs for reuse in future plans; an optional **learning** loop scores runs and nudges provider choice over time.

The design goal is **swap models and providers without rewriting orchestration logic**—only YAML catalogs and environment variables change.

---

## Repository layout

```
agentic-orchestration/
├── crew-ai-demo/                 # Minimal CrewAI tutorial-style demo
├── agentic-orchestration-tool/  # Python orchestration engine (main entry: main.py)
│   ├── config/
│   │   ├── workflows/           # Static workflow YAML
│   │   ├── agent_providers/    # One YAML per agent “template” (dynamic catalog)
│   │   └── mcp_providers/      # MCP server catalog (refs, streamable_http, env substitution)
│   ├── orchestration/          # Runner, dynamic planner, sessions, learning, KB, …
│   └── main.py
├── agentic-orchestration-web/  # Node WebSocket UI (spawns Python tool)
│   ├── server.mjs
│   ├── public/
│   ├── start-web.ps1 / .sh      # Foreground + auto-restart
│   └── start-web-bg.ps1 / .sh   # Background (detached) starters
├── publish-github.ps1           # Create GitHub repo + push (Windows)
└── publish-github.sh            # Same for bash
```

**Gitignored runtime data** (local only):

- `__orchestrator_sessions__/` — planner history + crew excerpts per session
- `__orchestrator_learning__/` — traces, stats, pending web ratings
- `__orchestrator_kb__/` — knowledge base SQLite
- `__output__/` — extracted artifacts from runs
- `.env` files — never commit secrets

---

## Prerequisites

- **Python 3.12** recommended for the tool.
- **Node.js 18+** and **npm** for the web UI.
- At least one configured backend: **OpenAI API key**, **Anthropic** key, **HF token**, and/or **Ollama** running locally—depending on which agent providers you enable in YAML.

---

## Quick start

### 1) Orchestration tool (CLI)

```powershell
cd agentic-orchestration-tool
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
# Edit .env with your keys and optional AGENTIC_* toggles

$env:PYTHONUTF8 = 1
python main.py --dynamic "Your goal in natural language"
```

See **[`agentic-orchestration-tool/README.md`](agentic-orchestration-tool/README.md)** for `--dynamic-iterative`, `--orchestrator-session`, router mode, and workflow YAML.

### 2) Web UI

```powershell
cd agentic-orchestration-web
npm install
npm start
```

Open **http://127.0.0.1:3847/** by default. For LAN access, set `AGENTIC_WEB_HOST=0.0.0.0` in **`agentic-orchestration-web/.env`**.  

**Background run (no terminal left open):**

- Windows: `.\start-web-bg.ps1` — stop with `.\stop-web-bg.ps1`
- Linux/macOS: `./start-web-bg.sh` — stop with `./stop-web-bg.sh`  

Host/port are read from `AGENTIC_WEB_HOST` / `AGENTIC_WEB_PORT` in that folder’s `.env` unless you override on the command line.

**Security:** the web server runs local Python with user-supplied text. Do not expose it to the internet without authentication and hardening. Details: **[`agentic-orchestration-web/README.md`](agentic-orchestration-web/README.md)**.

### 3) Minimal demo

```powershell
cd crew-ai-demo
# Follow the same venv + pip + .env pattern as in the root README’s original quick start
```

---

## Environment variables

Configuration is **environment-first**: copy **`agentic-orchestration-tool/.env.example`** to **`agentic-orchestration-tool/.env`** and adjust. The example file is the **authoritative checklist** of variables (with comments).

### Summary by category

| Area | Examples (see `.env.example` for full list) |
|------|-----------------------------------------------|
| **OpenAI / compatible** | `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL_NAME` |
| **Anthropic** | `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL` |
| **Hugging Face** | `HF_TOKEN`, `HUGGINGFACE_API_BASE` |
| **Ollama** | `OLLAMA_HOST`, `ROUTER_OLLAMA_MODEL` |
| **Dynamic planner** | `AGENTIC_PLANNER_MODEL` (e.g. `openai/...`, `anthropic/...`, `ollama/...`), `AGENTIC_PLANNER_USE_LITELLM`, `AGENTIC_PLANNER_MAX_STEPS`, `AGENTIC_PLANNER_JSON_MODE`, `AGENTIC_PLANNER_REPAIR_RETRY`, `AGENTIC_PLANNER_429_RETRIES`, `AGENTIC_PLANNER_CONTEXT_TURNS`, `AGENTIC_PLANNER_MESSAGE_CHARS` |
| **Sessions** | `AGENTIC_ORCHESTRATOR_SESSION`, `AGENTIC_ORCHESTRATOR_DEFAULT_SESSION`, `AGENTIC_ORCHESTRATOR_MAX_PLANNER_TURNS`, `AGENTIC_ORCHESTRATOR_EXCERPT_CHARS`, … |
| **Hardware** | `AGENTIC_ASSUME_VRAM_GB`, `AGENTIC_MAX_VRAM_FRACTION`, `AGENTIC_MAX_VRAM_GB`, `AGENTIC_DISABLE_HARDWARE_FILTER`, … |
| **MCP / catalog** | `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`, `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_TOKEN`, search keys as documented in example |
| **Progress / UX** | `AGENTIC_PROGRESS`, `AGENTIC_STEP_CONTEXT_INJECT`, `AGENTIC_STEP_CONTEXT_CHARS` |
| **Learning & KB** | `AGENTIC_LEARNING`, `AGENTIC_LEARNING_EVAL`, `AGENTIC_EVAL_MODEL`, `AGENTIC_KB`, `AGENTIC_KB_MAX_HITS`, … |
| **Answer cache** | `AGENTIC_ANSWER_CACHE` |
| **Iterative mode** | `AGENTIC_DYNAMIC_ITERATIVE_*`, `AGENTIC_ITERATIVE_CONTROLLER_*` (and CLI flags) |
| **Web server** | `AGENTIC_WEB_HOST`, `AGENTIC_WEB_PORT`, `AGENTIC_TOOL_ROOT`, `AGENTIC_PYTHON` — in **`agentic-orchestration-web/.env`** |

### Publish-to-GitHub script env (optional root `.env`)

The **`publish-github.ps1`** / **`publish-github.sh`** scripts can read a **repo root** `.env` (gitignored) for defaults only—**they do not change** how `main.py` or the web server load env:

| Variable | Purpose |
|----------|---------|
| `GITHUB_REPO_NAME` or `AGENTIC_GITHUB_REPO_NAME` | New repo name |
| `GITHUB_VISIBILITY` | `public` or `private` |
| `GITHUB_AUTO_COMMIT` | `1` to auto-commit before publish |
| `GITHUB_ALLOW_DIRTY` | `1` to allow dirty tree without auto-commit |
| `GITHUB_COMMIT_MESSAGE` | Commit message when auto-committing |
| `GITHUB_SKIP_PUSH` | `1` to create repo but not push |

Requires **`git`** and **`gh`** (`gh auth login`).

---

## Key features (orchestration tool)

- **CrewAI-native** — Agents, tasks, crews, sequential/hierarchical process.
- **Model-agnostic catalogs** — `config/agent_providers/*.yaml` with `type: ollama | openai | anthropic | huggingface`.
- **Dynamic planning** — Natural-language goals → JSON plan → ephemeral workflow.
- **Per-task MCP** — MCP sets per step; agent instances deduplicated by provider + MCP fingerprint.
- **MCP catalog** — YAML entries with credential gating and goal-based suggestions/pruning.
- **Sessions** — Multi-turn planner memory + excerpts on disk.
- **Iterative dynamic** — One step per round, optional auto-controller and synthesis.
- **Learning loop** — Structured eval + optional user ratings → stats fed back into planner context.
- **Knowledge base** — SQLite FTS of past outputs for planner retrieval.
- **Answer cache** — Repeat exact question in-session → instant replay + “reply no to re-run”.

---

## Scripts reference (root & web)

| Script | Purpose |
|--------|---------|
| [`publish-github.ps1`](publish-github.ps1) | Windows: create GitHub repo, set `origin`, push |
| [`publish-github.sh`](publish-github.sh) | Linux/macOS: same |
| [`agentic-orchestration-web/start-web.ps1`](agentic-orchestration-web/start-web.ps1) | Foreground npm with auto-restart |
| [`agentic-orchestration-web/start-web-bg.ps1`](agentic-orchestration-web/start-web-bg.ps1) | Windows: detached server |
| [`agentic-orchestration-web/stop-web-bg.ps1`](agentic-orchestration-web/stop-web-bg.ps1) | Windows: stop detached server |
| [`agentic-orchestration-web/start-web.sh`](agentic-orchestration-web/start-web.sh) | Linux: foreground + auto-restart |
| [`agentic-orchestration-web/start-web-bg.sh`](agentic-orchestration-web/start-web-bg.sh) | Linux: detached (`nohup`) |
| [`agentic-orchestration-web/stop-web-bg.sh`](agentic-orchestration-web/stop-web-bg.sh) | Linux: stop detached server |

---

## Contributing & license

Treat this repo as a **personal / team experimentation** codebase unless you add an explicit license file. When publishing, ensure **no secrets** in Git (`.env`, API keys, session JSON, KB DB).

---

## Further reading

- **[CrewAI documentation](https://docs.crewai.com/)** — core concepts for crews, agents, and tasks.
- **[Model Context Protocol](https://modelcontextprotocol.io/)** — how MCP tools integrate with agents.

For everything specific to YAML shape, CLI flags, and internal modules, start with **[`agentic-orchestration-tool/README.md`](agentic-orchestration-tool/README.md)**.
