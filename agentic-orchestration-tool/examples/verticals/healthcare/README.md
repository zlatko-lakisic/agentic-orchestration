# Healthcare vertical example

![Infographic: simplified agentic orchestration for healthcare—dynamic clinical orchestrator, specialized agents, MCP tool servers, QA gate, and re-plan loop](./banner.png)

*Concept diagram.* The flow is: **unstructured clinical and operational input** (cases, symptoms, EHR-style questions, strategy prompts) → a **dynamic orchestrator** that plans and revises work → **specialized agents** (e.g. diagnostic or strategic framing, deep literature and regulatory research, execution-focused synthesis) → **tool-backed steps via MCP** (public evidence APIs, optional FHIR/search MCPs you add) → an **unbiased QA and verification** layer with **re-plan or pivot** when gaps appear, converging on an **evidence-aware, optimized result**. This example repo wires that pattern with env-driven overlays—not a fork of the core tool.

## Who this is for

Teams pitching **agentic orchestration for healthcare and medtech**: hospital innovation, connected care, health IT procurement, regulatory affairs, and market access—where answers must be **traceable**, **safe in scope** (no bedside diagnosis from the model), and **grounded** when public data exists (FDA, trials, PubMed, ICD-10 tables, etc.). The bundled `orchestrator-context.md` encodes those guardrails for the planner, iterative controller, learning evaluator, and faithfulness QA.

## What this folder adds (overlay)

This directory is an **overlay** on the stock `agentic-orchestration-tool` and `agentic-orchestration-web` projects. It adds **orchestrator context**, **extra agent-provider YAMLs**, and **extra MCP YAML** discovered via environment variables—no duplicate application code.

What was generalized in the tool:

1. **`AGENTIC_ORCHESTRATOR_CONTEXT` / `AGENTIC_ORCHESTRATOR_CONTEXT_FILE`** — appended to the system prompts for the dynamic planner, iterative auto-controller, learning evaluator, and faithfulness QA (see `orchestration/dynamic_planner.py`).
2. **`AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS`** — merges additional directories of agent-provider fragments into the **dynamic** planner catalog (`orchestration/agent_providers_catalog.py`).
3. **`AGENTIC_EXTRA_MCP_PROVIDERS_PATH`** — merges extra MCP provider YAML directories; point it at `mcp_providers/` here to register `hc_healthcare_mcp`.

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

## Apply the overlay and run

1. Copy **absolute** paths from `tool.env.append` into `agentic-orchestration-tool/.env`, replacing `REPO_ROOT`.
2. For the Web UI, merge `web.env.append` into `agentic-orchestration-web/.env` the same way.
3. Ensure **Node** is on `PATH` if you enable `AGENTIC_MCP_HEALTHCARE_TOOLS_ENABLED=1` (the MCP runs `npx -y healthcare-mcp`). If `npx` fails on missing Node modules, use a local checkout of `healthcare-mcp` with `npm install` and point `stdio` at `node` plus the server entry (see comments in `mcp_providers/hc_healthcare_mcp.yaml`).
4. On Windows, separate **multiple** extra catalog paths with `;` in `AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS` and `AGENTIC_EXTRA_MCP_PROVIDERS_PATH` (Unix uses `:`).
5. Run **dynamic** mode so the orchestrator and iterative loop match the diagram, for example:  
   `python main.py --dynamic "Compare two RPM vendors for a CHF program; cite FDA and trial data where possible"`

## Routable workflow (optional)

The repository also ships `config/workflows/workflow_healthcare_commercial_brief.yaml` for **router** mode (`python main.py "…natural language…"`) without dynamic planning—useful when you want a fixed crew instead of the full recursive loop.
