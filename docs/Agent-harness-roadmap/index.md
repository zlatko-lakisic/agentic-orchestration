---
layout: single
title: "Agent harness roadmap"
permalink: /Agent-harness-roadmap/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# Agent harness roadmap (platform / catalog verification)

Living document for **platform-owned harness probes** on every entry in the [Agent provider catalog]({{ '/agent-catalog/' | relative_url }}) — turning the catalog from a static registry into a **verified inventory** of agents that are configured, reachable, and minimally competent in the current environment.

**Status:** **Shipped** in repo v1.4.0 (2026-06-29).

**Distinct from:** [User agent harnesses]({{ '/User-agent-harnesses/' | relative_url }}) — domain scenario packs teams develop separately for the agents *they* deploy. This page covers generic tiers (L0–L3), shared profiles, and CI for the shipped catalog.

**Related:** [User agent harnesses]({{ '/User-agent-harnesses/' | relative_url }}), [Agent provider catalog]({{ '/agent-catalog/' | relative_url }}), [Testing and CI]({{ '/testing-and-ci/' | relative_url }}), [Architecture]({{ '/architecture/' | relative_url }}), [CLI reference]({{ '/cli-reference/' | relative_url }})

---

## Quick start

```bash
cd agentic-orchestration-tool
python main.py --harness-batch --harness-tier static
python main.py --harness-agent gpt_research --harness-tier smoke
powershell -File scripts/run-agent-harness.ps1 -Tier connectivity -Filter "gpt_*"
python scripts/harness-report.py
```

---

## Design principle: tiered harness

| Tier | Name | What it checks | CI default |
|------|------|----------------|------------|
| **L0** | Static | YAML schema, required fields, credential presence | Every PR |
| **L1** | Connectivity | `validate_config` → `initialize` → `health_check` | Every PR (credentialed subset) |
| **L2** | Smoke | Single-task kickoff + deterministic assertions | Nightly / manual |
| **L3** | Capability | L2 + profile rubric / LLM judge | Manual |

---

## Phased implementation

### Phase 1 — Foundation

- [x] `config/agent_harnesses/{general,research,write,reason,coding,vision}.yaml`
- [x] `orchestration/agent_harness.py` (L0–L2)
- [x] CLI `--harness-agent` / `--harness-batch`
- [x] Unit tests with mocked kickoff
- [x] L0 in CI for entire catalog

### Phase 2 — Catalog metadata

- [x] Optional `harness_profile` / `harness.skip_live` on reference agents (`gpt_*`, `claude_*`, `ollama_llama3`)
- [x] Profile inference helper
- [x] Agent catalog generator **Harness** column

### Phase 3 — L3 capability + reporting

- [x] Rubric-aware eval per profile (`capability` block + `evaluate_run_quality`)
- [x] `scripts/harness-report.py` aggregation
- [x] Nightly GitHub Actions workflow (`agent-harness-smoke-nightly.yml`)

### Phase 4 — Operational polish

- [x] Subprocess backend for smoke/capability (`--harness-backend subprocess`)
- [x] Harness stats in planner / learning context (`harness_performance_summary`)
- [x] Optional `AgentProvider.run_harness_probe()` hook

---

## CI integration

| Job | Scope | Tier |
|-----|-------|------|
| `agent-harness-static` | Full catalog | L0 |
| `agent-harness-connectivity` | `gpt_*` + harness unit tests | L1 |
| `agent-harness-smoke-nightly` | Cloud subset (weekly) | L2 |

See [Testing and CI]({{ '/testing-and-ci/' | relative_url }}) for local commands and markers.

---

## Wiki maintenance

- [CLI reference]({{ '/cli-reference/' | relative_url }}) — harness flags
- [Configuration]({{ '/configuration/' | relative_url }}) — `AGENTIC_HARNESS_*` env vars in `.env.example`
- [Agent provider catalog]({{ '/agent-catalog/' | relative_url }}) — `harness_profile` field

For full design history (problem statement, mermaid diagram, anti-patterns), see git history of this page or the v1.4.0 docs on GitHub Pages.
