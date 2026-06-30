---
layout: single
title: "User agent harnesses"
permalink: /User-agent-harnesses/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
mermaid: true
---
# User agent harnesses (per-catalog-agent eval packs)

Living document for **user-developed harness packs**: scenario libraries teams maintain **separately** from the core repo to verify that specific [Agent provider catalog]({{ '/agent-catalog/' | relative_url }}) entries behave correctly **in their deployment** — domain prompts, fixtures, rubrics, and optional MCP pairings.

**Status:** **Shipped in v1.5.0** (2026-06-29).

**Distinct from:** [Agent harness roadmap]({{ '/Agent-harness-roadmap/' | relative_url }}) (platform-owned catalog health checks and CI tiers). User harnesses answer *“does our use of this agent meet our bar?”*; the platform harness answers *“is this catalog entry alive in this environment?”*

**Related:** [Agent provider catalog]({{ '/agent-catalog/' | relative_url }}), [Agent harness roadmap]({{ '/Agent-harness-roadmap/' | relative_url }}), [Workflows and router]({{ '/workflows/' | relative_url }}), [Dynamic planning]({{ '/dynamic-planning/' | relative_url }}), [MCP providers]({{ '/mcp-catalog/' | relative_url }}), [Configuration]({{ '/configuration/' | relative_url }}), [Testing and CI]({{ '/testing-and-ci/' | relative_url }})

---

## Who this is for

Teams that:

- Maintain an **allowlist** of catalog agents (`--dynamic-agent-provider-ids`, vertical overlays).
- **Swap models or customize** provider YAML via `AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS`.
- Need **domain-specific regression** (healthcare guardrails, logistics KPIs) without forking orchestration.
- Want harness packs **versioned in their own repo**, reviewed by compliance or domain owners, and run before promoting agent changes.

Casual adopters who only run occasional dynamic chats may skip user harnesses entirely.

---

## Problem statement

The catalog defines **what agents exist**. Vertical overlays (`--example healthcare`) add **orchestrator context** and extra YAML. Neither gives a **repeatable, runnable contract** for “this `agent_provider_id`, with our MCPs and prompts, still produces acceptable output.”

| What exists today | Gap |
|-------------------|-----|
| `config/agent_providers/*.yaml` | Declares role/goal/model — not your domain scenarios |
| `examples/verticals/*/README.md` | Informal “expected output” per prompt — not executable |
| `evaluate_run_quality` | Judges whole dynamic runs — not per-agent scenario libraries |
| Static workflow YAML | Can approximate harnesses manually — no convention, discovery, or batch report |
| [Agent harness roadmap]({{ '/Agent-harness-roadmap/' | relative_url }}) | Generic platform smoke — not your rubrics or fixtures |

User harnesses **formalize** the “expected output” pattern into discoverable, batch-runnable packs tied to catalog ids.

---

## Two harness layers (complementary)

```mermaid
flowchart TB
  subgraph platform["Platform — [Agent harness roadmap]({{ '/Agent-harness-roadmap/' | relative_url }})"]
    P0[L0 static / L1 connectivity]
    P1[L2 generic smoke profiles]
  end

  subgraph user["User — this page"]
    U1[Domain scenarios per agent_provider_id]
    U2[Fixtures + rubrics + MCP pairings]
    U3[Your CI / release gates]
  end

  CAT[Agent provider catalog]({{ '/agent-catalog/' | relative_url }})
  CAT --> platform
  CAT --> user
  platform -->|"baseline health"| RUN[build_workflow / execute_step]
  user -->|"domain regression"| RUN
```

| Layer | Owner | Typical question |
|-------|-------|------------------|
| **Platform harness** | Project maintainers | Is `gpt_research` configured and reachable here? |
| **User harness** | Your team | Does `gpt_research` produce an RPM brief without inventing FDA trial IDs? |

Platform profiles can serve as **fallback** when you have not authored scenarios for an agent. User packs **override or extend** per `agent_provider_id`.

---

## Directory layout (develop separately)

Same extension model as extra agent/MCP catalogs: **directories outside core**, merged at run time.

```
my-deployment/
  harnesses/
    gpt_research/
      harness.yaml              # manifest — links to catalog id
      scenarios/
        rpm_council_brief.yaml
        regulatory_outline.yaml
      fixtures/
        sample_context.txt
      rubrics/
        healthcare_claims.yaml  # optional LLM-judge instructions
    claude_write/
      harness.yaml
      scenarios/
        ...
```

Vertical example (planned):

```
examples/verticals/healthcare/
  harnesses/
    gpt_research/
      harness.yaml
      scenarios/   # derived from healthcare README “expected output” sections
```

### `harness.yaml` (manifest)

Ties the pack to the catalog — **not** a duplicate agent definition (that stays in `agent_providers/`).

```yaml
agent_provider_id: gpt_research
mcp_providers: []                    # or [search_brave] for grounded scenarios
defaults:
  topic: "Harness"
  timeout_s: 120
  execution_backend: inprocess       # optional; respects AGENTIC_EXECUTION_BACKEND
```

### `scenarios/*.yaml` (one isolated probe)

Each scenario maps to a **single-task** run (same execution path as production).

```yaml
id: rpm_council_brief
description: |
  Brief a hospital innovation council on RPM for heart failure: compare two
  positioning stories, list adoption prerequisites, and where public FDA or
  trial evidence would strengthen or weaken each story. No patient-specific advice.
expected_output: >
  Structured brief with evidence checklist; no invented trial or submission IDs.
fixtures:
  - ../fixtures/sample_context.txt   # optional; injected into task context
mcp_providers: []                    # optional override of manifest
assertions:
  - type: forbids_regex
    pattern: 'NCT\\d{8}'
  - type: contains_any
    values: ["not legal advice", "verify", "counsel"]
  - type: min_chars
    value: 400
optional_eval:
  rubric_file: ../rubrics/healthcare_claims.yaml
  min_score: 0.7
```

### Deterministic assertions (Phase 1)

Start small — cheap checks before any LLM judge:

| Type | Purpose |
|------|---------|
| `min_chars` / `max_chars` | Non-empty, not truncated |
| `bullet_count` | Structure (research/write scenarios) |
| `contains_any` / `forbids_regex` | Guardrails (disclaimers, no fabricated IDs) |
| `json_parse` | Structured outputs (coding/reason scenarios) |

Optional **LLM rubric** per scenario reuses `evaluate_run_quality`-style judging with **your** rubric file, not the generic learning-loop prompt.

---

## Discovery and configuration

Mirror extra catalog env vars:

| Mechanism | Purpose |
|-----------|---------|
| `AGENTIC_EXTRA_AGENT_HARNESS_DIRS` | `os.pathsep`-separated list of harness root directories |
| `--harness-dir PATH` | CLI override (one or more paths) |
| `--example healthcare` | Loads `examples/verticals/healthcare/harnesses/` when present |

**Merge rule:** one harness directory per `agent_provider_id` basename (`harnesses/gpt_research/`). Duplicate ids across merged dirs → error (same as agent catalog).

**Agent resolution:** scenarios always reference ids from the **merged agent catalog** (core + `AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS` + `--example` overlay). Harness does not redefine the agent — only tests it.

---

## CLI

```bash
# All scenarios for one catalog agent
python main.py --harness-dir ./my-deployment/harnesses \
  --harness-agent gpt_research

# Every pack under the harness dir(s)
python main.py --harness-dir ./harnesses --user-harness-run-all

# JSON report for your CI
python main.py --harness-dir ./harnesses --harness-agent gpt_research --harness-json

# Fail fast on first scenario failure
python main.py --harness-dir ./harnesses --harness-agent gpt_research --harness-fail-fast
```

With vertical overlay:

```bash
python main.py --example healthcare \
  --harness-dir ./my-extra-harnesses \
  --harness-agent gpt_research
```

---

## Execution model

**No second runner.** User harness:

1. Loads manifest + scenario YAML from user directory.
2. Resolves `agent_provider_id` (and optional MCPs) from merged catalogs.
3. Builds a one-task `WorkflowConfig` → `build_workflow` → kickoff (same as [Architecture]({{ '/architecture/' | relative_url }}) `execute_step` / in-process path).
4. Runs deterministic assertions on output text.
5. Optionally runs scenario rubric via LLM judge (`AGENTIC_HARNESS_EVAL_MODEL` or per-scenario override).
6. Writes report to `harness_runs/` (gitignored) or stdout (`--harness-json`).

Distributed backends (`subprocess`, `kubernetes`) should be supported later using the same `StepSpec` materialization as production — valuable for “does this agent work in our worker image?”

---

## Results report

```json
{
  "harness_pack": "gpt_research",
  "agent_provider_id": "gpt_research",
  "scenario_id": "rpm_council_brief",
  "status": "pass",
  "duration_ms": 8420,
  "assertions": [
    {"name": "forbids_regex", "pass": true},
    {"name": "min_chars", "pass": true}
  ],
  "eval": {"score": 0.81, "verdict": "..."},
  "output_excerpt": "..."
}
```

Batch summary: pass/fail/skip counts per agent, per scenario, exit code non-zero on any failure (for CI).

---

## Typical use cases

| Use case | How user harness helps |
|----------|------------------------|
| **Model swap** | Re-run `ollama_llama3` pack after switching to `ollama_qwen3` |
| **Custom provider YAML** | Extra catalog dir overrides `backstory`; scenarios prove behavior unchanged |
| **Agent + MCP combo** | Manifest sets `mcp_providers: [search_brave]`; scenarios require grounded citations |
| **Release gate** | CI job runs `--user-harness-run-all` on credentialed agents before deploy |
| **Compliance audit** | Scenario pack + reports show what was tested and when |
| **Vertical onboarding** | Ship `examples/verticals/<id>/harnesses/` as a template users fork |

---

## What user harnesses do not replace

- **Full workflow E2E** — multi-step static workflows, dynamic planning, kind cluster tests ([Testing and CI]({{ '/testing-and-ci/' | relative_url }})).
- **Platform catalog CI** — [Agent harness roadmap]({{ '/Agent-harness-roadmap/' | relative_url }}) L0/L1 across the full shipped catalog.
- **Live chat QA** — exploratory conversations without fixed scenarios.
- **Proof of “best agent for task”** — only “meets our defined scenarios.”

---

## Phased implementation

### Phase 1 — Contract + runner

- [x] Documented YAML schema (`harness.yaml`, `scenarios/*.yaml`)
- [x] `orchestration/user_agent_harness.py` — load, resolve agent, single-task run, assertions
- [x] CLI `--harness-dir`, `--harness-agent`, `--user-harness-run-all`, `--harness-json`
- [x] Env `AGENTIC_EXTRA_AGENT_HARNESS_DIRS`
- [x] Unit tests with mocked kickoff
- [x] `examples/verticals/healthcare/harnesses/gpt_research/` with 2–3 scenarios from existing README expected outputs

**Exit criteria:** `python main.py --example healthcare --harness-agent gpt_research` runs healthcare scenarios locally (with API keys).

### Phase 2 — Vertical integration + docs

- [x] `example_overlays.py` loads `harnesses/` under vertical root
- [x] [CLI reference]({{ '/cli-reference/' | relative_url }}) flags; [Configuration]({{ '/configuration/' | relative_url }}) env table
- [x] `scripts/run-user-harness.ps1` / `.sh` helper

### Phase 3 — CI and reporting

- [x] `@pytest.mark.user_harness` for adopters’ packs in their repos
- [x] Batch report aggregation; `--harness-fail-fast`
- [x] Optional fixture injection (attachments / file context)

### Phase 4 — Advanced

- [x] Subprocess/K8s backend parity for worker-image regression
- [x] Scenario parameterization (`inputs:` block for matrix runs)
- [x] Optional feed of scenario pass rates into [Sessions learning and knowledge base]({{ '/sessions-learning-kb/' | relative_url }}) (separate from platform harness stats)

---

## Anti-patterns

- **Redefining agents inside harness YAML** — keep agents in `agent_providers/`; harness only references `agent_provider_id`.
- **One giant scenario file** — one yaml per scenario for clear pass/fail and CI parallelism.
- **Forking orchestration to run tests** — always `build_workflow` / `execute_step`.
- **Duplicating platform L0/L1 checks** — rely on [Agent harness roadmap]({{ '/Agent-harness-roadmap/' | relative_url }}) for connectivity; user harness focuses on domain scenarios.

---

## Wiki maintenance

When implementation lands, update:

- This page — phase checkboxes and status
- [Agent harness roadmap]({{ '/Agent-harness-roadmap/' | relative_url }}) — cross-link only; keep platform scope separate
- [Agent provider catalog]({{ '/agent-catalog/' | relative_url }}) — pointer to user harness extension
- [CLI reference]({{ '/cli-reference/' | relative_url }}), [Configuration]({{ '/configuration/' | relative_url }})
- `examples/verticals/README.md` in the main repo
