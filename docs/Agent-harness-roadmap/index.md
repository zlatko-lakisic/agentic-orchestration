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

# Platform agent harness

**Shipped in v1.4.0** — tiered probes that turn the [Agent catalog]({{ '/agent-catalog/' | relative_url }}) from a static registry into a **verified inventory** for your environment.

**Distinct from:** [User agent harnesses]({{ '/User-agent-harnesses/' | relative_url }}) (domain scenario packs you maintain separately).

## Why

| Without harness | With harness |
|-----------------|--------------|
| Broken model names fail at run time | L0/L1 catch config and connectivity in CI |
| Manual smoke per agent | Shared profiles (`research`, `coding`, …) scale to 182 agents |
| Hard to debug “which agent is broken?” | `python main.py --harness-agent ID --harness-tier smoke` isolates one id |

## Tiers

| Tier | CLI value | Checks | When to run |
|------|-----------|--------|-------------|
| **L0** | `static` | YAML valid, credentials present | Every PR (CI); locally before adding YAML |
| **L1** | `connectivity` | `validate_config` → `initialize` → `health_check` | After env/credential changes |
| **L2** | `smoke` | One-task kickoff + deterministic assertions | Before promoting model swaps |
| **L3** | `capability` | L2 + LLM rubric (`evaluate_run_quality`) | Release gate / manual QA |

## Quick commands

```bash
cd agentic-orchestration-tool

# Full catalog — no API keys
python main.py --harness-batch --harness-tier static

# Cloud subset
python main.py --harness-batch --harness-tier connectivity --harness-filter "gpt_*"

# Single agent smoke (needs credentials)
python main.py --harness-agent gpt_research --harness-tier smoke

# JSON report for automation
python main.py --harness-batch --harness-tier static --harness-json

# Helpers
powershell -File scripts/run-agent-harness.ps1 -Tier static -Filter "gpt_*"
python scripts/harness-report.py
```

## Profiles and per-agent YAML

Shared templates live in `config/agent_harnesses/`:

| Profile | Typical agents |
|---------|----------------|
| `general` | Default, `general_purpose: true` |
| `research` | Research Analyst roles |
| `write` | Technical Writer roles |
| `reason` | Staff Engineer roles |
| `coding` | `*_coder_*` ids |
| `vision` | VLM / vision entries |

Optional fields on agent provider YAML:

```yaml
harness_profile: research
harness:
  skip_live: true              # skip L2/L3 in batch (e.g. huge local models)
  smoke_override:
    description: "..."         # rare per-agent prompt override
```

The **Harness** column in the [Agent catalog]({{ '/agent-catalog/' | relative_url }}) shows inferred or explicit profiles.

## Execution and reports

- Uses the same `build_workflow` / `execute_step` paths as production (no second runner).
- L2/L3 support `--harness-backend subprocess` for worker-image regression.
- Reports written to `harness_runs/` (gitignored); aggregate with `scripts/harness-report.py`.
- Pass/fail stats optionally recorded in `__orchestrator_learning__/stats.json` and fed to the planner when `AGENTIC_HARNESS_FEED_PLANNER=1`.

## CI

| Job | Tier |
|-----|------|
| `agent-harness-static` | L0 — full catalog every PR |
| `agent-harness-connectivity` | L1 — `gpt_*` + unit tests |
| `agent-harness-smoke-nightly` | L2 — weekly (optional secrets) |

Details: [Testing and CI]({{ '/testing-and-ci/' | relative_url }}).

## Related

- [CLI reference]({{ '/cli-reference/' | relative_url }}) — all `--harness-*` flags
- [Configuration]({{ '/configuration/' | relative_url }}) — `AGENTIC_HARNESS_*` env vars
- [Features]({{ '/features/' | relative_url }}) — product overview
