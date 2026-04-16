# Healthcare vertical example

![Infographic: simplified agentic orchestration for healthcare—dynamic clinical orchestrator, specialized agents, MCP tool servers, QA gate, and re-plan loop](./banner.png)

*Concept diagram.* The flow is: **unstructured clinical and operational input** (cases, symptoms, EHR-style questions, strategy prompts) → a **dynamic orchestrator** that plans and revises work → **specialized agents** (e.g. diagnostic or strategic framing, deep literature and regulatory research, execution-focused synthesis) → **tool-backed steps via MCP** (public evidence APIs, optional FHIR/search MCPs you add) → an **unbiased QA and verification** layer with **re-plan or pivot** when gaps appear, converging on an **evidence-aware, optimized result**. This example repo wires that pattern with env-driven overlays—not a fork of the core tool.

## Who this is for

Teams pitching **agentic orchestration for healthcare and medtech**: hospital innovation, connected care, health IT procurement, regulatory affairs, and market access—where answers must be **traceable**, **safe in scope** (no bedside diagnosis from the model), and **grounded** when public data exists (FDA, trials, PubMed, ICD-10 tables, etc.). The bundled `orchestrator-context.md` encodes those guardrails for the planner, iterative controller, learning evaluator, and faithfulness QA.

## Run it (no .env path editing)

From `agentic-orchestration-tool/` (with your usual `OPENAI_*` / venv already set for the rest of the repo):

```bash
python main.py --example healthcare --dynamic "Outline evidence needs for a hospital RPM program; cite public FDA and trial sources where relevant"
```

Iterative mode:

```bash
python main.py --example healthcare --dynamic-iterative "Compare two connected-care platform positioning stories for payer audiences"
```

**Web UI:** from `agentic-orchestration-web/`:

```bash
npm run start:healthcare
```

That is equivalent to `node server.mjs --example healthcare` and passes `--example healthcare` into each `main.py` run so the overlay matches the server process.

### Web scripts (this folder)

Scripts resolve `agentic-orchestration-web/` next to the tool repo, set **`AGENTIC_EXAMPLE=healthcare`**, and default **`AGENTIC_WEB_PORT` to `3850`** so you can run the stock web on `3847` and this example in parallel. Override with `AGENTIC_WEB_PORT` or `PORT` / `-Port` where noted. They load `agentic-orchestration-web/.env` when present (same rule as the main web: existing shell env wins).

| Script | Role |
|--------|------|
| `start-web.sh` / `start-web.ps1` | Foreground server with auto-restart (stop with Ctrl+C). |
| `start-web-bg.sh` / `start-web-bg.ps1` | Detached server; PID in **this directory’s** `.web-server.pid`, log in `.web-server.log`. |
| `stop-web.sh` / `stop-web.ps1` | Shut down the detached instance. On Linux, `AGENTIC_WEB_KILL_PORT=1 ./stop-web.sh` can free the TCP port if needed (`fuser`). |

From **this directory** (`examples/verticals/healthcare/`):

```bash
chmod +x start-web.sh start-web-bg.sh stop-web.sh   # once, on Unix
./start-web.sh          # foreground
./start-web-bg.sh       # background
./stop-web.sh           # shutdown background
```

PowerShell:

```powershell
.\start-web.ps1
.\start-web-bg.ps1
.\stop-web.ps1
```

Background restart: `RESTART=1 ./start-web-bg.sh` (bash). Foreground restart delay: `RESTART_DELAY_SECONDS` (bash) or `-RestartDelaySeconds` (foreground PS).

`--example healthcare` sets, for that process only:

- `AGENTIC_ORCHESTRATOR_CONTEXT_FILE` → this folder’s `orchestrator-context.md`
- `AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS` → `agent_providers/` (merged ahead of any paths you already had in `.env`)
- `AGENTIC_EXTRA_MCP_PROVIDERS_PATH` → `mcp_providers/` (same merge rule)

It does **not** turn on optional npm MCPs (no Node requirement for the default demo). The `hc_healthcare_mcp` entry stays in the catalog but remains inactive until you set `AGENTIC_MCP_HEALTHCARE_TOOLS_ENABLED=1` (see `mcp_providers/hc_healthcare_mcp.yaml`).

## What this folder adds (overlay)

This directory is an **overlay** on the stock `agentic-orchestration-tool` and `agentic-orchestration-web` projects. It adds **orchestrator context**, **extra agent-provider YAMLs**, and **extra MCP YAML** discovered via environment variables—no duplicate application code.

What was generalized in the tool:

1. **`AGENTIC_ORCHESTRATOR_CONTEXT` / `AGENTIC_ORCHESTRATOR_CONTEXT_FILE`** — appended to the system prompts for the dynamic planner, iterative auto-controller, learning evaluator, and faithfulness QA (see `orchestration/dynamic_planner.py`).
2. **`AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS`** — merges additional directories of agent-provider fragments into the **dynamic** planner catalog (`orchestration/agent_providers_catalog.py`).
3. **`AGENTIC_EXTRA_MCP_PROVIDERS_PATH`** — merges extra MCP provider YAML directories; this folder’s `mcp_providers/` registers `hc_healthcare_mcp` when merged.

## Bundled assets

| Path | Purpose |
|------|---------|
| `banner.png` | Scenario diagram for decks and docs (same narrative as above). |
| `orchestrator-context.md` | Domain guardrails (no patient-specific care; evidence discipline). |
| `agent_providers/*.yaml` | Three OpenAI `gpt-4o-mini` personas aligned to the pitch: informatics / connected care, regulatory research, health economics—you can swap models or add Anthropic entries to mirror a “research-class” agent from the diagram. |
| `mcp_providers/hc_healthcare_mcp.yaml` | Opt-in MCP wrapping the public npm package [**healthcare-mcp**](https://www.npmjs.com/package/healthcare-mcp) (PubMed, FDA OpenFDA, ClinicalTrials.gov, ICD-10 clinical tables, etc.). |

### Other MCPs you can add yourself

- **Flexpa FHIR MCP** ([`flexpa/mcp-fhir`](https://github.com/flexpa/mcp-fhir)) — read/search FHIR when you have `FHIR_BASE_URL` and `FHIR_ACCESS_TOKEN` (SMART on FHIR). Add another YAML under `mcp_providers/` with `stdio` pointing at their built `index.js` once you follow their README.
- **Hosted search MCPs** already in the base repo (`config/mcp_providers/search_tavily.yaml`, `search_brave.yaml`, …) pair well with literature-heavy tasks.

### Advanced: `.env` instead of `--example`

If you prefer fixed paths in `.env`, see commented templates in `tool.env.append` and `web.env.append` (replace `REPO_ROOT`). On Windows, use `;` between multiple extra catalog paths; on Unix, use `:`.

## Routable workflow (optional)

The repository also ships `config/workflows/workflow_healthcare_commercial_brief.yaml` for **router** mode, e.g.  
`python main.py --example healthcare "…natural language…"`  
without dynamic planning—useful when you want a fixed crew instead of the full recursive loop.
