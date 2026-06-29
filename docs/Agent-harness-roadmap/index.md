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

**Status:** **Shipped** in v1.4.0 (2026-06-29).

Platform-owned harness probes on every entry in the [Agent catalog]({{ '/agent-catalog/' | relative_url }}) — turning the catalog from a static registry into a **verified inventory** of agents that are configured, reachable, and minimally competent in the current environment.

**Distinct from:** [User agent harnesses]({{ '/User-agent-harnesses/' | relative_url }}) — domain scenario packs teams develop separately.

## Tiers

| Tier | Name | What it checks | CI |
|------|------|----------------|-----|
| **L0** | `static` | YAML valid, credentials present | Every PR (`agent-harness-static`) |
| **L1** | `connectivity` | `validate_config` → `initialize` → `health_check` | Every PR (`agent-harness-connectivity`) |
| **L2** | `smoke` | Single-task kickoff + assertions | Nightly (optional secrets) |
| **L3** | `capability` | L2 + LLM rubric eval | Manual |

## CLI

```bash
python main.py --harness-agent gpt_research --harness-tier smoke
python main.py --harness-batch --harness-tier static
python main.py --harness-batch --harness-tier connectivity --harness-filter "gpt_*"
powershell -File scripts/run-agent-harness.ps1 -Tier static -Filter "gpt_*"
python scripts/harness-report.py
```

Profiles live in `config/agent_harnesses/`. Optional per-agent fields: `harness_profile`, `harness.skip_live`, `harness.smoke_override`.

## Implementation

| Component | Path |
|-----------|------|
| Runner | `orchestration/agent_harness.py` |
| Profiles | `config/agent_harnesses/*.yaml` |
| Reports | `harness_runs/` (gitignored) |
| Tests | `tests/test_agent_harness.py` (`@pytest.mark.agent_harness`) |
| CI | `.github/workflows/ci.yml`, `agent-harness-smoke-nightly.yml` |

Harness stats feed the planner via `harness_performance_summary` in `learning_store.py` when `AGENTIC_HARNESS_FEED_PLANNER=1`.

See [Testing and CI]({{ '/testing-and-ci/' | relative_url }}) and [CLI reference]({{ '/cli-reference/' | relative_url }}) for flags and env vars.
