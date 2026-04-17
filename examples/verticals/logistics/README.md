# Logistics vertical example (warehousing)

This folder lives at the **monorepo root**: `examples/verticals/logistics/` (sibling of `agentic-orchestration-tool/` and `agentic-orchestration-web/`). It targets **warehouse operations**: WMS execution, ERP supply-chain context, and **labor planning**—with three integration styles:

1. **Simulated MCP** — local Python tools backed by JSON **fixtures** (no ERP/WMS install).
2. **Optional ERP MCP** — **streamable HTTP** to an MCP server **you** run that fronts SAP / Dynamics / NetSuite / ERPNext / etc.
3. **Optional WMS MCP** — **streamable HTTP** to an MCP server **you** run that fronts your WMS (REST/OData bridges, vendor adapters, or community projects such as SAP EWM–oriented MCP experiments—verify licensing and security).

Orchestrator rules live in `orchestrator-context.md` (simulation vs production, integration discipline, labor boundaries).

## Run it (no manual path merging)

From `agentic-orchestration-tool/`:

```bash
python main.py --example logistics --dynamic "Compare two wave-release strategies for same-day carrier cuts; call out WMS vs ERP checks and labor risks."
```

Iterative:

```bash
python main.py --example logistics --dynamic-iterative "Design a day-1 cutover checklist for a new WMS pick module in one building—assume ERP stays system of record for POs."
```

**Web UI** (from `agentic-orchestration-web/`):

```bash
npm run start:logistics
```

`--example logistics` wires `AGENTIC_ORCHESTRATOR_CONTEXT_FILE` plus extra **agent** and **MCP** catalog dirs. It also sets **`AGENTIC_LOGISTICS_SIM_MCP_PY`** to the absolute path of `mcp_stubs/wms_erp_sim_mcp.py` so the simulated MCP YAML can resolve.

## MCP catalog in this vertical

| Catalog `id` | Transport | When it is active | Purpose |
|----------------|------------|-------------------|---------|
| `logistics_sim_wms_erp` | stdio → `python` + sim script | Set **`AGENTIC_MCP_LOGISTICS_SIM_ENABLED=1`** and install **`pip install mcp`** (see `requirements-mcp-stub.txt`) | Fixture-backed **simulated** PO lines, bin inventory, labor zone summary, wave stub |
| `logistics_erp_mcp_http` | streamable HTTP | **`AGENTIC_MCP_LOGISTICS_ERP_HTTP_ENABLED=1`** and **`LOGISTICS_ERP_MCP_URL`** set to your MCP base URL | Real / sandbox **ERP** tools as exposed by **your** MCP server |
| `logistics_wms_mcp_http` | streamable HTTP | **`AGENTIC_MCP_LOGISTICS_WMS_HTTP_ENABLED=1`** and **`LOGISTICS_WMS_MCP_URL`** set | Real / sandbox **WMS** tools as exposed by **your** MCP server |

Community / vendor **starting points** (not endorsed; validate for your stack):

- **ERPNext** ecosystem: search for **“ERPNext MCP server”** (e.g. community bridges that expose inventory / stock operations).
- **SAP warehouse**: projects such as **SAP EWM MCP** (OData-oriented) appear in community listings—confirm SAP licensing and transport (HTTP vs stdio) before production.

If you have **no** external MCP yet, use **`logistics_sim_wms_erp`** only—it keeps demos self-contained.

### Enable the simulated MCP

```bash
# In the same venv you use for main.py
pip install -r ../examples/verticals/logistics/requirements-mcp-stub.txt
export AGENTIC_MCP_LOGISTICS_SIM_ENABLED=1
python main.py --example logistics --dynamic "Using tools, summarize open PO lines and WH-East-01 inventory from simulation."
```

(`AGENTIC_LOGISTICS_SIM_MCP_PY` is set for you when `--example logistics` is used.)

### Enable HTTP ERP / WMS MCPs

1. Run or obtain a **streamable-HTTP MCP** server that speaks the MCP your CrewAI client expects.
2. Set the URL env vars and flip the `AGENTIC_MCP_LOGISTICS_*_ENABLED` gates (see `tool.env.append`).
3. Add the MCP ids to your dynamic plan / workflow `mcp_providers` when the planner should attach them.

## Bundled agents

| YAML | Role |
|------|------|
| `lg_wms_integration` | WMS flows, movements, waves, dock, integration messaging |
| `lg_erp_supply_chain` | PO / receipt / inventory policy framing on the ERP side |
| `lg_labor_planning` | Capacity, standards, indirect—**not** legal wage advice |

All default to **`gpt-4o-mini`** like other examples; swap models in YAML as needed.

## Example scenarios (prompts)

**Wave release + labor**

> Same-day carrier cut is 16:30 local. **WAVE-2044** is released to doors D7–D8. Outline a **WMS execution checklist** (pick cluster, replen, QC holds) and a **labor staffing risk brief** (not individual names). If tools return **simulated** data, say so explicitly.

**ERP vs WMS reconciliation**

> We suspect **ERP on-order** disagrees with **WMS available** for **SKU-90012** this week. Propose a **reconciliation sequence** (which report, which movement types, who owns master data changes) and what evidence would close the gap. Use simulation tools if present; otherwise stay prescriptive.

**Cutover / integration**

> Draft a **cutover runbook outline** for turning on a new **cartonization** step after pack verify: host interfaces, idempotent retries, rollback signals. No vendor FUD—neutral criteria only.

**Labor planning (high level)**

> For **zone PICK-01**, compare two **indirect-time budgeting** approaches for peak season (conceptual only). Cite **simulated** labor summary if the tool is enabled; otherwise list metrics you would need from a real WMS/labor system.

## Web scripts (this folder)

Default **`AGENTIC_WEB_PORT=3851`** so **`3850`** can stay the healthcare example and **`3847`** the stock UI.

| Script | Role |
|--------|------|
| `start-web.sh` / `start-web.ps1` | Foreground auto-restart |
| `start-web-bg.sh` / `start-web-bg.ps1` | Detached; `.web-server.pid` / `.web-server.log` **here** |
| `stop-web.sh` / `stop-web.ps1` | Stop detached instance |

## Advanced: `.env` instead of `--example`

See commented templates in `tool.env.append` and `web.env.append` (`REPO_ROOT` = monorepo root).
