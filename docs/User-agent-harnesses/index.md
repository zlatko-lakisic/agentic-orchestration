---
layout: single
title: "User agent harnesses"
permalink: /User-agent-harnesses/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---

# User agent harnesses (per-catalog-agent eval packs)

**Shipped in v1.5.0** — domain scenario libraries you maintain **outside** the core repo (or under vertical examples) to verify catalog agents meet **your** bar: prompts, fixtures, rubrics, optional MCP pairings.

**Distinct from:** [Platform agent harness]({{ '/Agent-harness-roadmap/' | relative_url }}) (generic L0–L3 catalog health in CI).

## Why

| Platform harness | User harness |
|------------------|--------------|
| Is `gpt_research` configured and reachable? | Does `gpt_research` produce an RPM brief without inventing trial IDs? |
| Shared profiles in `config/agent_harnesses/` | Your YAML scenarios + fixtures under `harnesses/<agent_id>/` |
| Runs on every PR (L0/L1) | Runs in **your** CI before deploy or model swaps |

## Directory layout

```
my-deployment/harnesses/
  gpt_research/
    harness.yaml              # manifest — links to catalog id
    scenarios/
      rpm_council_brief.yaml
    fixtures/
      sample_context.txt
    rubrics/
      healthcare_claims.yaml  # optional LLM judge
```

Healthcare vertical ships a reference pack at `examples/verticals/healthcare/harnesses/gpt_research/` (three scenarios from the healthcare README).

## Quick commands

```bash
cd agentic-orchestration-tool

# Healthcare vertical (overlay adds harnesses/ to discovery)
python main.py --example healthcare --harness-agent gpt_research

# Your own pack directory
python main.py --harness-dir /path/to/harnesses --harness-agent gpt_research

# All packs under merged harness dirs
python main.py --harness-dir ./harnesses --user-harness-run-all

# JSON report + fail fast
python main.py --example healthcare --harness-agent gpt_research --harness-json --harness-fail-fast

# Helpers
powershell -File scripts/run-user-harness.ps1 -Example healthcare -Agent gpt_research
bash scripts/run-user-harness.sh --example healthcare --harness-agent gpt_research
```

## Discovery

| Mechanism | Purpose |
|-----------|---------|
| `AGENTIC_EXTRA_AGENT_HARNESS_DIRS` | `os.pathsep`-separated harness root directories |
| `--harness-dir PATH` | CLI override (repeatable) |
| `--example healthcare` | Prepends `examples/verticals/healthcare/harnesses/` when present |

One pack per `agent_provider_id` (folder name under each root). Duplicate ids across merged dirs → error.

## Scenario YAML (summary)

Each `scenarios/*.yaml` runs a **single-task** workflow via the same `build_workflow` / kickoff path as production.

Deterministic assertions (Phase 1): `min_chars`, `max_chars`, `bullet_count`, `contains_any`, `forbids_regex`, `json_parse`.

Optional `optional_eval` with `rubric_file` reuses `evaluate_run_quality` (disable with `AGENTIC_HARNESS_EVAL=0`).

Reports: `harness_runs/user_batch_*.json` (gitignored).

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGENTIC_EXTRA_AGENT_HARNESS_DIRS` | — | Extra harness roots |
| `AGENTIC_USER_HARNESS_RECORD_STATS` | `1` | Rolling pass/fail in `user_harness_stats` |
| `AGENTIC_HARNESS_EVAL` | `1` | LLM rubric per scenario when `optional_eval` set |
| `AGENTIC_EXECUTION_BACKEND` | `inprocess` | Override via manifest `defaults.execution_backend` |

## CI and tests

Unit tests: `pytest -m user_harness` (mocked kickoff; included in the harness CI job alongside `@pytest.mark.agent_harness`).

Adopters can copy the healthcare pack or author packs in their own repos and point `AGENTIC_EXTRA_AGENT_HARNESS_DIRS` at them.

## Related

- [Agent harness roadmap]({{ '/Agent-harness-roadmap/' | relative_url }}) — platform tiers
- [Testing and CI]({{ '/testing-and-ci/' | relative_url }})
- [Configuration]({{ '/configuration/' | relative_url }})
- [Healthcare vertical README](https://github.com/zlatko-lakisic/agentic-orchestration/blob/main/examples/verticals/healthcare/README.md)
