---
layout: single
title: "Features"
permalink: /features/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---

Agentic Orchestration is a YAML-driven multi-agent engine on CrewAI. This page summarizes what the tool can do end to end — from dynamic planning through catalogs, execution backends, memory, and the web UI.

## Dynamic Planning

State a goal in plain language and let the LLM planner (LiteLLM, configurable via `AGENTIC_PLANNER_MODEL`) build a multi-step JSON execution plan automatically.

### Single-pass `--dynamic`

The planner reads the agent catalog, MCP catalog, session history, and knowledge-base snippets, then emits a JSON plan: workflow name, steps, agent provider IDs, MCP IDs, and per-step task descriptions. The coordinator runs each step in order via the active execution backend.

```bash
python main.py --dynamic "Compare three observability stacks for Kubernetes"
```

### Iterative `--dynamic-iterative`

One step per round. After each step completes, the planner sees prior outputs and may change agents, MCPs, or task wording before the next round.

```bash
python main.py --dynamic-iterative --dynamic-iterative-auto \
  "Investigate market entry options for a medtech device"
```

Use `--dynamic-iterative-auto` for controller-driven early stop or continuation (up to `--dynamic-iterative-max-rounds`).

### Domain-aware provider suppression

When goal text lexically matches specialist `planner_hint` or `good_for` fields, general-purpose agents (`general_purpose: true`) are suppressed so domain specialists win. Tune with `AGENTIC_DOMAIN_PROVIDER_MATCH_MIN` or disable via `AGENTIC_DISABLE_DOMAIN_PROVIDER_SUPPRESSION`.

See [Dynamic Planning]({{ '/dynamic-planning/' | relative_url }}) for sessions, attachments, and answer cache.

## 182-Provider Agent Catalog

Agent templates live as one YAML file per provider under `config/agent_providers/`. The dynamic planner selects from this catalog; constrain choices with `--dynamic-agent-provider-ids ID1,ID2`.

**182 shipped templates** across six provider types: `openai`, `anthropic`, `ollama`, `huggingface`, `vllm`, and `jetstream`.

Each YAML declares:

- `id` — used in plans and CLI filters
- `type` and `model`
- `role`, `goal`, `backstory`
- `planner_hint` / `good_for` — steering text for the planner
- `hardware.architecture` and optional `min_vram_gb`

Extend the catalog without forking via `AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS` (YAML directories) or `AGENTIC_EXTRA_AGENT_PROVIDERS_PATH` (Python provider classes).

| Provider | Example IDs | Notes |
|---|---|---|
| openai | `gpt_research`, `gpt_write`, `gpt_reason` | Requires `OPENAI_API_KEY` |
| anthropic | `claude_research`, `claude_write`, `claude_reason` | Requires `ANTHROPIC_API_KEY` |
| ollama | `ollama_llama3`, `ollama_qwen2_5`, `ollama_llama3_2_vision` | Local via `OLLAMA_HOST` |
| huggingface | `hf_meta_llama_3_1_8b`, `hf_meta_llama_3_1_70b` | Requires `HF_TOKEN` |
| vllm | `vllm_tpu_meta_llama_llama_3_1_8b_instruct` | Requires `VLLM_BASE_URL` |
| jetstream | `jetstream_tpu_meta_llama_meta_llama_3_70b_instruct` | Requires `JETSTREAM_BASE_URL` |

Full listing: [Agent Catalog]({{ '/agent-catalog/' | relative_url }}).

## Platform Agent Harness (v1.4.0)

Verify catalog agents in isolation with tiered probes:

| Tier | CLI `--harness-tier` | Checks |
|------|----------------------|--------|
| L0 | `static` | YAML + credentials |
| L1 | `connectivity` | Backend reachability |
| L2 | `smoke` | Single-task kickoff + assertions |
| L3 | `capability` | L2 + LLM rubric |

```bash
python main.py --harness-batch --harness-tier static
python main.py --harness-agent gpt_research --harness-tier smoke
```

Shared profiles in `config/agent_harnesses/`. CI runs L0 on every PR. Details: [Agent harness roadmap]({{ '/Agent-harness-roadmap/' | relative_url }}).

### User agent harnesses (v1.5.0)

Domain scenario packs per `agent_provider_id` — your prompts, fixtures, and rubrics under `harnesses/<id>/`.

```bash
python main.py --example healthcare --harness-agent gpt_research
python main.py --harness-dir ./my-harnesses --user-harness-run-all
```

Healthcare ships a reference pack. Details: [User agent harnesses]({{ '/User-agent-harnesses/' | relative_url }}).

**v1.6.0 (Phase 4):** subprocess and Kubernetes backend parity, `inputs.matrix` variant runs, and optional planner feedback via `AGENTIC_USER_HARNESS_FEED_PLANNER`.

## 7 MCP Integrations

MCP tool definitions live under `config/mcp_providers/`. The planner attaches MCPs per step based on goal text, available credentials, and (for Kubernetes) transport compatibility.

| MCP | Transport | Good for |
|---|---|---|
| `search_brave` | streamable_http | Web search, timely facts |
| `search_tavily` | streamable_http | RAG-optimized research excerpts |
| `search_exa` | stdio (npx) | Semantic search, code examples |
| `home_assistant` | streamable_http | Smart home control |
| `fetch_url` | stdio (python) | Fetch and parse any URL |
| `filesystem_local` | stdio (npx) | Scoped file read/write |
| `memory_knowledge_graph` | stdio (npx) | Persistent entity memory |

Credential-gated entries stay hidden until required env vars are set. Merge custom YAML via `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`.

Details: [MCP Catalog]({{ '/mcp-catalog/' | relative_url }}).

## Agent Skills (v1.3.0)

Procedural **playbooks** live as YAML under `config/agent_skills/`. Unlike MCP integrations, skills do not add callable tools — they inject curated markdown instructions into **task descriptions** (default) or **agent backstory**, composable with MCP and any agent provider.

```bash
python main.py --dynamic "Cut a patch release following our semver process"
# Planner may attach release_process when goal text matches

python main.py --config config/workflows/workflow_agent_skills_smoke.yaml "skills smoke test"
```

| Skill `id` | Injection | Purpose |
|---|---|---|
| `echo_skill` | task | Smoke test — injects `SKILL_ECHO_OK` marker |
| `echo_backstory_skill` | backstory | Backstory injection smoke test |
| `release_process` | task | Semver release checklist (`RELEASING.md`, `scripts/release.py`) |
| `pr_review` | task | Structured pull-request review checklist |

Attachment semantics mirror MCP: `workflow.skills`, per-task `task.skills`, planner `skill_ids`, and `[]` to force none. Workers on subprocess/Kubernetes backends re-resolve skill content from `StepSpec.skills` + catalog path.

CLI: **`--agent-skills-catalog`** (default `config/agent_skills`). Extend via `AGENTIC_EXTRA_AGENT_SKILLS_PATH`.

Details: [Agent Skills]({{ '/agent-skills/' | relative_url }}) · [Agent Skills Roadmap]({{ '/agent-skills-roadmap/' | relative_url }}).

## Hardware-Aware Routing

Before planning, the runtime filters the agent catalog by detected hardware. Each provider YAML may declare `architecture` (`cpu`, `gpu`, `tpu`) and optional `min_vram_gb`. Detection uses `nvidia-smi` when available; Ollama models can use built-in VRAM heuristics.

```yaml
hardware:
  architecture: [cpu, gpu]
min_vram_gb: 8
```

| Variable | Purpose |
|---|---|
| `AGENTIC_ASSUME_GPU` | Force GPU as available |
| `AGENTIC_ASSUME_TPU` | Force TPU as available |
| `AGENTIC_ASSUME_VRAM_GB` | Override detected VRAM |
| `AGENTIC_AVAILABLE_ARCHITECTURES` | Manual `cpu,gpu,tpu` override |
| `AGENTIC_DISABLE_HARDWARE_FILTER` | Never drop providers by VRAM |

## Three Execution Backends

The pluggable `ExecutionBackend` protocol runs the same planner output and step contracts three ways:

| Backend | Env value | How steps run | Best for |
|---|---|---|---|
| CrewAI in-process | `inprocess` (default) | Whole crew in one Python process | Local dev |
| Subprocess | `subprocess` | One worker per step via `--execute-step` | Step isolation |
| Kubernetes | `kubernetes` | K8s Job per step, PVC run store | Production |

Planner JSON, YAML catalogs, session/KB/learning hooks, and post-run QA are identical across backends — only step isolation changes.

Details: [Execution Backends]({{ '/execution-backends/' | relative_url }}).

## Sessions, Learning, and Knowledge Base

### Sessions

Planner turn history is persisted as JSON under `__orchestrator_sessions__/<slug>.json`. Name a session with `--orchestrator-session` or `AGENTIC_ORCHESTRATOR_SESSION`. Reset with `--orchestrator-session-reset`.

### Knowledge base

When `AGENTIC_KB=1`, finalized outputs are indexed in SQLite FTS (`__orchestrator_kb__/kb.sqlite3`) and injected into future planner prompts as snippets.

### Learning loop

`AGENTIC_LEARNING=1` records per-provider success/failure stats and decision traces under `__orchestrator_learning__/`. Optional evaluator model via `AGENTIC_LEARNING_EVAL=1`. A learning summary feeds the planner on each run; web UI ratings are consumed on the next planner call. Ratings and KB rows use a combined **attachment fingerprint** (MCP + skill ids).

### Answer cache

With `AGENTIC_ANSWER_CACHE=1`, asking the same goal in the same session returns the last finalized answer immediately and prompts to confirm a re-run.

## Domain Verticals

Vertical overlays bundle domain orchestrator context, optional extra agent YAML, optional MCP YAML, and web start scripts — without forking core code. Load with `--example <id>`.

| Vertical | CLI | Web UI port |
|---|---|---|
| **Healthcare** | `--example healthcare` | `npm run start:healthcare` → **3850** |
| **Logistics** | `--example logistics` | `npm run start:logistics` → **3851** |

- **Healthcare** — medtech evidence research, commercial brief generation, specialist agent templates.
- **Logistics** — warehousing, WMS/ERP integration, labor planning, simulated WMS/ERP MCP fixtures.

Custom verticals: create `examples/verticals/<id>/` with optional `orchestrator-context.md`, `agent_providers/`, and `mcp_providers/`. See [Verticals]({{ '/verticals/' | relative_url }}).

## WebSocket Web UI

The `agentic-orchestration-web` Node.js package streams run output over WebSocket, supports file uploads with drag-and-drop preview chips (images, audio, video, and documents via attachment manifests for `--dynamic-attachments`), optional media-understanding MCP tools, exposes ratings that feed the learning loop, and shows a live **host CPU/memory** sparkline in the top bar (click for a detail graph via `GET /api/host-metrics`).

```bash
cd agentic-orchestration-web
npm install
npm start
# http://127.0.0.1:3847
```

Vertical entry points: `npm run start:healthcare`, `npm run start:logistics`.

## Static Workflows

For repeatable crews without LLM planning, define workflows under `config/workflows/*.yaml`.

```bash
# One-shot fixed workflow
python main.py --batch --config config/workflows/workflow_brainstorm.yaml

# Interactive loop on a fixed file
python main.py -i --config config/workflows/workflow_brainstorm.yaml

# Router: natural-language task → matching workflow
python main.py "Brainstorm taglines for a developer CLI"
```

**Shipped workflows:** default (`workflow.yaml`), brainstorm, web dev, healthcare commercial brief (router), MCP fetch/filesystem smoke tests, agent skills smoke (`workflow_agent_skills_smoke.yaml`).

Details: [Workflows]({{ '/workflows/' | relative_url }}).
