# Agentic Orchestration

**A model-agnostic, agent-based orchestration engine** built on **[CrewAI](https://github.com/crewAIInc/crewAI)**. It turns natural-language goals and YAML configuration into coordinated multi-agent workflows: planners choose steps and backends, agents execute with clear roles, and optional **Model Context Protocol (MCP)** servers extend each agent with tools (Home Assistant, docs, search, and custom servers you add to the catalog).

You are not locked to one vendor or one model. The same orchestrator can mix **Ollama** (local), **OpenAI-compatible** APIs, **Anthropic Claude**, **Hugging Face**, plus TPU endpoint providers (**vLLM** and **JetStream**)—picked per task from a catalog, filtered by credentials and hardware capability (`cpu`/`gpu`/`tpu`, plus optional VRAM heuristics), with a LiteLLM-backed planner so planning can use the same breadth of backends as execution.

**Why YAML and agnostic wiring?** So teams can **adopt this on top of what they already have**: fine-tuned or self-hosted models, **MCP** servers and in-house tools, and existing credentials—then **blend** those with generic, off-the-shelf agents from Ollama, OpenAI, Anthropic, and Hugging Face when that is faster or good enough. The aim is a **short path to a proof of concept** driven by catalogs and environment variables, without building planners, crews, or tool glue from scratch.

---

## What this repository is for

| You want… | Start here |
|-----------|------------|
| **Production-style orchestration** (YAML workflows, dynamic planning, MCP, sessions, learning, KB) | [`agentic-orchestration-tool/`](agentic-orchestration-tool/) |
| **Browser chat** over local WebSockets (dynamic & iterative modes) | [`agentic-orchestration-web/`](agentic-orchestration-web/) |
| **Industry / scenario overlays** (extra orchestrator context, agent YAML, MCP catalog fragments; spans tool + web) | [`examples/verticals/`](examples/verticals/) |

**Deeper documentation (per package):**

- **[`agentic-orchestration-tool/README.md`](agentic-orchestration-tool/README.md)** — workflows, router, dynamic mode, agent provider lifecycle, extra providers, VRAM, MCP catalog, learning loop, knowledge base.
- **[`agentic-orchestration-web/README.md`](agentic-orchestration-web/README.md)** — Web UI setup, `AGENTIC_*` server env, security notes.
- **[`examples/verticals/README.md`](examples/verticals/README.md)** — how vertical overlays relate to the tool and web packages.

---

## Example verticals (domain overlays)

Verticals live under **[`examples/verticals/`](examples/verticals/)** at the **monorepo root** (sibling of `agentic-orchestration-tool/` and `agentic-orchestration-web/`). Each one bundles orchestrator context, optional extra agent-provider YAML, optional MCP YAML, and sometimes **web start/stop scripts** tuned for that scenario (separate default port so they can run next to the stock UI).

| Vertical | `main.py` flag | Web shortcut | README |
|----------|----------------|--------------|--------|
| **Healthcare** (medtech / evidence / commercial brief pitch) | `--example healthcare` | `npm run start:healthcare` (from [`agentic-orchestration-web/`](agentic-orchestration-web/)) | [`examples/verticals/healthcare/README.md`](examples/verticals/healthcare/README.md) |

**CLI (from `agentic-orchestration-tool/`):** `python main.py --example healthcare --dynamic "…"` — no manual path merging into `.env` for the overlay paths.

**Maintainers — keep this table in sync:** when you add `examples/verticals/<id>/`, extend the table above with the stable `--example <id>` name, any `npm run start:<id>` or per-vertical script names, and a link to that folder’s `README.md`. Wire the example id in [`agentic-orchestration-tool/orchestration/example_overlays.py`](agentic-orchestration-tool/orchestration/example_overlays.py) and [`agentic-orchestration-tool/main.py`](agentic-orchestration-tool/main.py) (`--example` choices), and in the web server if you add a matching npm script or argv hook in [`agentic-orchestration-web/server.mjs`](agentic-orchestration-web/server.mjs) / [`agentic-orchestration-web/package.json`](agentic-orchestration-web/package.json).

---

## Vision: orchestration, not a single chatbot

![Vision — agentic orchestration overview](vision.png)

This stack is an **orchestration layer**, not a replacement for any one LLM:

1. **Planner** — Interprets the user goal (and session history) and emits a structured plan: steps, agent provider IDs, optional MCP IDs.
2. **Runner** — Builds a CrewAI `Crew` with agents and tasks, resolves MCP configs per task, and executes sequentially (or as configured).
3. **Tools (MCP)** — When relevant, agents get MCP servers attached so they can call real APIs instead of inventing facts.
4. **Adaptation** — Iterative dynamic mode re-plans between steps; a small controller can stop early or suggest refined goals; step output can flow into the next task for continuity.
5. **Memory & aggregation** — Sessions persist planner turns and excerpts; an optional local **knowledge base** (SQLite + FTS) stores finalized outputs for reuse in future plans; an optional **learning** loop scores runs and nudges provider choice over time.

The design goal is **swap models and providers without rewriting orchestration logic**—only YAML catalogs and environment variables change. Practically, that means **your stack + this orchestration layer**: plug in trained models and MCPs you trust, use commodity cloud APIs where they help, and still get multi-step planning, execution, and optional web UI **as configuration**, not a new greenfield build.

---

## Repository layout

```
agentic-orchestration/
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
├── examples/
│   └── verticals/               # Domain overlays (tool + web); see README in that folder
│       └── healthcare/        # e.g. orchestrator context + extra catalogs + optional web scripts
└── (optional helper scripts at root)
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
| **Hardware** | `AGENTIC_AVAILABLE_ARCHITECTURES`, `AGENTIC_ASSUME_GPU`, `AGENTIC_ASSUME_TPU`, `AGENTIC_ASSUME_VRAM_GB`, `AGENTIC_MAX_VRAM_FRACTION`, `AGENTIC_MAX_VRAM_GB`, `AGENTIC_DISABLE_HARDWARE_FILTER`, … |
| **MCP / catalog** | `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`, `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_TOKEN`, search keys as documented in example |
| **Progress / UX** | `AGENTIC_PROGRESS`, `AGENTIC_STEP_CONTEXT_INJECT`, `AGENTIC_STEP_CONTEXT_CHARS` |
| **Learning & KB** | `AGENTIC_LEARNING`, `AGENTIC_LEARNING_EVAL`, `AGENTIC_EVAL_MODEL`, `AGENTIC_KB`, `AGENTIC_KB_MAX_HITS`, … |
| **Answer cache** | `AGENTIC_ANSWER_CACHE` |
| **Iterative mode** | `AGENTIC_DYNAMIC_ITERATIVE_*`, `AGENTIC_ITERATIVE_CONTROLLER_*` (and CLI flags) |
| **Web server** | `AGENTIC_WEB_HOST`, `AGENTIC_WEB_PORT`, `AGENTIC_TOOL_ROOT`, `AGENTIC_PYTHON` — in **`agentic-orchestration-web/.env`** |

## Key features (orchestration tool)

- **CrewAI-native** — Agents, tasks, crews, sequential/hierarchical process.
- **Model-agnostic catalogs** — `config/agent_providers/*.yaml` with `type: ollama | openai | anthropic | huggingface | vllm | jetstream`.
- **Hardware-aware routing** — catalog entries can declare `hardware.architecture` (`cpu`/`gpu`/`tpu`) and incompatible providers are filtered out before planning.
- **Dynamic planning** — Natural-language goals → JSON plan → ephemeral workflow.
- **Per-task MCP** — MCP sets per step; agent instances deduplicated by provider + MCP fingerprint.
- **MCP catalog** — YAML entries with credential gating and goal-based suggestions/pruning.
- **Sessions** — Multi-turn planner memory + excerpts on disk.
- **Iterative dynamic** — One step per round, optional auto-controller and synthesis.
- **Learning loop** — Structured eval + optional user ratings → stats fed back into planner context.
- **Knowledge base** — SQLite FTS of past outputs for planner retrieval.
- **Answer cache** — Repeat exact question in-session → instant replay + “reply no to re-run”.

## TPU capabilities

- **TPU architecture support** — providers can declare `hardware.architecture: [tpu]` (or mixed sets like `[cpu, gpu]`).
- **Automatic detection** — runtime capability detection includes `cpu` by default, `gpu` via NVIDIA tooling, and `tpu` via TPU runtime markers.
- **Manual overrides** — set `AGENTIC_AVAILABLE_ARCHITECTURES`, `AGENTIC_ASSUME_GPU`, and `AGENTIC_ASSUME_TPU` when auto-detection is not enough.
- **TPU frameworks in catalog** — built-in provider types include `vllm` and `jetstream` for OpenAI-compatible TPU-serving endpoints.

---

## Scripts reference (web)

| Script | Purpose |
|--------|---------|
| [`agentic-orchestration-web/start-web.ps1`](agentic-orchestration-web/start-web.ps1) | Foreground npm with auto-restart |
| [`agentic-orchestration-web/start-web-bg.ps1`](agentic-orchestration-web/start-web-bg.ps1) | Windows: detached server |
| [`agentic-orchestration-web/stop-web-bg.ps1`](agentic-orchestration-web/stop-web-bg.ps1) | Windows: stop detached server |
| [`agentic-orchestration-web/start-web.sh`](agentic-orchestration-web/start-web.sh) | Linux: foreground + auto-restart |
| [`agentic-orchestration-web/start-web-bg.sh`](agentic-orchestration-web/start-web-bg.sh) | Linux: detached (`nohup`) |
| [`agentic-orchestration-web/stop-web-bg.sh`](agentic-orchestration-web/stop-web-bg.sh) | Linux: stop detached server |

**Per-vertical web scripts** (alternate port, PID beside the example, not under `agentic-orchestration-web/`): see each folder under [`examples/verticals/`](examples/verticals/) — e.g. [`examples/verticals/healthcare/start-web.sh`](examples/verticals/healthcare/start-web.sh) and matching `start-web-bg.*` / `stop-web.*`.

---

## Contributing & license

Treat this repo as a **personal / team experimentation** codebase unless you add an explicit license file. When publishing, ensure **no secrets** in Git (`.env`, API keys, session JSON, KB DB).

---

## Further reading

- **Wiki docs** — extended documentation (agent and MCP catalogs, architecture, CLI, configuration) in the linked [GitLab Wiki](https://docs.gitlab.com/user/project/wiki/) Git repo (e.g. sibling `agentic-orchestration.wiki`); start at **`MCP-providers.md`** / **`Home.md`**.
- **[awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)** — community directory of MCP servers; **`MCP-providers.md`** maps shipped catalog `id`s (search, HA, memory, filesystem, fetch, Exa, …) to related listings and notes official vs community hosts.
- **[CrewAI documentation](https://docs.crewai.com/)** — core concepts for crews, agents, and tasks.
- **[Model Context Protocol](https://modelcontextprotocol.io/)** — how MCP tools integrate with agents.

For everything specific to YAML shape, CLI flags, and internal modules, start with **[`agentic-orchestration-tool/README.md`](agentic-orchestration-tool/README.md)**. For packaged **scenario overlays**, see **[`examples/verticals/README.md`](examples/verticals/README.md)** and the **Example verticals** section earlier in this file.
