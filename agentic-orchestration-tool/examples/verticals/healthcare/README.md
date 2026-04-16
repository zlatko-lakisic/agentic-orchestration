# Healthcare vertical example

This folder is an **overlay** on top of the stock `agentic-orchestration-tool` and `agentic-orchestration-web` projects. It does not fork the code: it adds **orchestrator context**, **extra agent-provider YAMLs**, and **extra MCP YAML** discovered via environment variables.

## What was generalized in the tool

1. **`AGENTIC_ORCHESTRATOR_CONTEXT` / `AGENTIC_ORCHESTRATOR_CONTEXT_FILE`** — appended to the system prompts for the dynamic planner, iterative auto-controller, learning evaluator, and faithfulness QA (see `orchestration/dynamic_planner.py`).
2. **`AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS`** — merges additional directories of agent-provider fragments into the **dynamic** planner catalog (`orchestration/agent_providers_catalog.py`).
3. **`AGENTIC_EXTRA_MCP_PROVIDERS_PATH`** — already existed for MCP; point it at `mcp_providers/` here to register `hc_healthcare_mcp`.

## Bundled assets

| Path | Purpose |
|------|---------|
| `orchestrator-context.md` | Domain guardrails (no patient-specific care; evidence discipline). |
| `agent_providers/*.yaml` | Three OpenAI `gpt-4o-mini` personas: informatics, regulatory research, health economics. |
| `mcp_providers/hc_healthcare_mcp.yaml` | Opt-in MCP wrapping the public npm package [**healthcare-mcp**](https://www.npmjs.com/package/healthcare-mcp) (PubMed, FDA OpenFDA, ClinicalTrials.gov, ICD-10 clinical tables, etc.). |

### Other MCPs you can add yourself

- **Flexpa FHIR MCP** ([`flexpa/mcp-fhir`](https://github.com/flexpa/mcp-fhir)) — read/search FHIR when you have `FHIR_BASE_URL` and `FHIR_ACCESS_TOKEN` (SMART on FHIR). Add another YAML under `mcp_providers/` with `stdio` pointing at their built `index.js` once you follow their README.
- **Hosted search MCPs** already in the base repo (`config/mcp_providers/search_tavily.yaml`, `search_brave.yaml`, …) pair well with literature-heavy tasks.

## Apply the overlay

1. Copy **absolute** paths from `tool.env.append` into `agentic-orchestration-tool/.env`, replacing `REPO_ROOT`.
2. For the Web UI, merge `web.env.append` into `agentic-orchestration-web/.env` the same way.
3. Ensure **Node** is on `PATH` if you enable `AGENTIC_MCP_HEALTHCARE_TOOLS_ENABLED=1` (the MCP runs `npx -y healthcare-mcp`).
4. On Windows, separate **multiple** extra catalog paths with `;` in `AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS` and `AGENTIC_EXTRA_MCP_PROVIDERS_PATH` (Unix uses `:`).
5. Run dynamic mode as usual, e.g.  
   `python main.py --dynamic "Compare two RPM vendors for a CHF program; cite FDA and trial data where possible"`

## Routable workflow (optional)

The repository also ships `config/workflows/workflow_healthcare_commercial_brief.yaml` for **router** mode (`python main.py "…natural language…"`) without dynamic planning.
