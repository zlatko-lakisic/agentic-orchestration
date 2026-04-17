# Healthcare vertical example

This folder lives at the **monorepo root**: `examples/verticals/healthcare/` (sibling of `agentic-orchestration-tool/` and `agentic-orchestration-web/`), so one overlay can target both projects.

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

## Example prompts and expected outputs

Exact wording of answers will vary by model, planner, and whether **PubMed/FDA-style MCP tools** are enabled (`AGENTIC_MCP_HEALTHCARE_TOOLS_ENABLED=1`). The **expected outputs** below describe shape, guardrails, and evidence behavior—not a fixed transcript.

### 1. Commercial / market (RPM, evidence-aware)

**Prompt (copy-paste):**

```text
You are briefing a hospital innovation council on remote patient monitoring (RPM) for heart failure:
compare two plausible vendor positioning stories (hardware + analytics + service), list what must be true
clinically and operationally for adoption, and where public FDA or trial registry evidence would strengthen or weaken
each story. No patient-specific advice; flag what legal/regulatory counsel should verify.
```

**Expected output:**

- **Structure:** Short exec summary, then side-by-side or table-style comparison of the two “stories,” then a **evidence checklist** (what to verify with FDA labels, MAUDE-style narratives, trials, payer policies).
- **Tone:** Strategy and operations, not bedside care; **no invented** recall numbers, approval statuses, or trial outcomes.
- **Evidence:** If MCP/search tools are available, **citations or “per tool output” paraphrases** where claims are factual; otherwise explicit **“to verify via …”** placeholders.
- **Close:** Clear **non-legal** disclaimer and **open questions** (connectivity, SLA, security, economic model).

### 2. Regulatory / evidence framing (FDA surveillance narrative)

**Prompt:**

```text
Draft an outline only for a medtech product manager explaining how FDA’s public device and adverse event data
sources are typically used in post-market surveillance narratives (not legal advice). Include 5–7 bullet
“claims we would only make with citations” and suggest PubMed / ClinicalTrials.gov angles to search next.
```

**Expected output:**

- **Structure:** Numbered outline (not a full white paper); dedicated bullets for **claims requiring citations** vs **interpretive framing**.
- **Tone:** Educational; repeatedly labels **regulatory fact vs interpretation vs hypothesis**.
- **Evidence:** Named **data families** (e.g. device registration / classification patterns, FAERS-style themes as *categories*, trial registries) without fabricating statistics.
- **Close:** **“Not legal advice”** and what counsel or RA should review before external use.

### 3. Health economics / payer (connected care, neutral criteria)

**Prompt:**

```text
For a US payer strategy memo (outline + assumptions): describe how hospitals might evaluate connected-care
platforms (devices, connectivity, integration) using neutral criteria (coverage, SLA, security certifications,
device onboarding, cost structure). Cite public sources where possible; say explicitly when you are inferring.
```

**Expected output:**

- **Structure:** Memo skeleton (**context → evaluation criteria → comparison framework → risks/gaps → next steps**); explicit **assumptions** block.
- **Tone:** **Neutral vendor language**; no endorsements; connectivity/telecom discussion stays criteria-based (per orchestrator context).
- **Evidence:** Public where tools exist; **“inferred”** or **“illustrative”** labels on weakly sourced bullets.
- **Close:** **Assumptions to validate** with hospital finance / IT / compliance.

### 4. Short smoke test (RPM evidence needs)

**Prompt:**

```text
Give a one-page structured outline on evidence needs for a hospital RPM program in CHF: what to prove with
trials / FDA / payer literature, and what stays organizational judgment. No bedside recommendations.
```

**Expected output:**

- **Structure:** Tight **one-page** outline (headings + bullets), **evidence vs judgment** clearly separated.
- **Tone:** Planning-oriented; **refuses individualized treatment** instructions; may redirect true patient questions to licensed care.
- **Evidence:** Lists **categories of evidence** (efficacy, safety monitoring, economic outcomes, operational feasibility) and **where** to look—not fake citation lists.
- **Close:** **Next research steps** and stakeholders (clinical ops, finance, legal).

### Web scripts (this folder)

Scripts resolve the repo’s `agentic-orchestration-tool/` and `agentic-orchestration-web/` directories, set **`AGENTIC_EXAMPLE=healthcare`**, and default **`AGENTIC_WEB_PORT` to `3850`** so you can run the stock web on `3847` and this example in parallel. Override with `AGENTIC_WEB_PORT` or `PORT` / `-Port` where noted. They load `agentic-orchestration-web/.env` when present (same rule as the main web: existing shell env wins).

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
- **Hosted search MCPs** already in the tool repo (`agentic-orchestration-tool/config/mcp_providers/search_tavily.yaml`, `search_brave.yaml`, …) pair well with literature-heavy tasks.

### Advanced: `.env` instead of `--example`

If you prefer fixed paths in `.env`, see commented templates in `tool.env.append` and `web.env.append` (replace `REPO_ROOT`). On Windows, use `;` between multiple extra catalog paths; on Unix, use `:`.

## Routable workflow (optional)

The repository also ships `config/workflows/workflow_healthcare_commercial_brief.yaml` for **router** mode, e.g.  
`python main.py --example healthcare "…natural language…"`  
without dynamic planning—useful when you want a fixed crew instead of the full recursive loop.
