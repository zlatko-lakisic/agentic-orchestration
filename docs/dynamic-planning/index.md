---
title: "Dynamic Planning"
layout: single
sidebar:
  nav: "docs"
toc: true
toc_sticky: true
---

Dynamic mode turns a natural-language goal into a multi-step agent workflow without writing YAML first.

## `--dynamic` (single pass)

1. User provides a goal via `TASK` or web UI.
2. Planner reads agent catalog, MCP catalog, session history, KB snippets, and learning summary.
3. Planner emits JSON: workflow name, steps, agent IDs, MCP IDs, task descriptions.
4. `StepCoordinator` executes each step sequentially via the active execution backend.
5. Post-run: session update, optional KB/learning/QA.

```bash
python main.py --dynamic "Compare observability tools for Kubernetes"
```

### Constrain providers

```bash
python main.py --dynamic --dynamic-agent-provider-ids gpt_research,claude_research \
  "Summarize FDA guidance changes for SaMD"
```

## `--dynamic-iterative`

One step per round. After each step, the planner sees prior outputs and may change agents, MCPs, or task wording.

```bash
python main.py --dynamic-iterative --dynamic-iterative-auto \
  "Build a competitive landscape for warehouse robotics vendors"
```

| Flag | Role |
|---|---|
| `--dynamic-iterative-rounds N` | Max rounds before synthesis |
| `--dynamic-iterative-auto` | Controller decides early stop vs continue |
| `--dynamic-iterative-max-rounds N` | Hard cap in auto mode |
| `--dynamic-iterative-min-rounds N` | Minimum rounds before auto may stop |
| `--dynamic-iterative-no-synthesize` | Return last round output only |

## Domain-aware provider selection

When user text lexically matches specialist `planner_hint` / `good_for` fields, general-purpose providers (`general_purpose: true`) are suppressed so domain agents win.

| Variable | Purpose |
|---|---|
| `AGENTIC_DOMAIN_PROVIDER_MATCH_MIN` | Minimum lexical score to trigger suppression |
| `AGENTIC_DISABLE_DOMAIN_PROVIDER_SUPPRESSION` | Disable suppression |
| `AGENTIC_GENERAL_PURPOSE_AGENT_IDS` | Extra comma-separated general-purpose IDs |

## Strict JSON mode

Set `AGENTIC_PLANNER_JSON_MODE=0` when your model does not support `response_format: json_object`. Some structured-output flows skip MCP augmentation and prose synthesis.

## File attachments

```bash
python main.py --dynamic --dynamic-attachments manifest.json "Analyze the attached spreadsheet"
```

Manifest JSON lists files under `_web_uploads/` (paths, names, mime types). The orchestrator infers kinds and adds routing context for the planner. Video attachments can extract frames via ffmpeg when enabled.

## Answer cache

When `AGENTIC_ANSWER_CACHE=1`, asking the same goal in the same orchestrator session returns the last finalized answer immediately and prompts for confirmation to re-run.

## Sessions

Planner history persists under `__orchestrator_sessions__/<slug>.json`. Name sessions with `--orchestrator-session` or `AGENTIC_ORCHESTRATOR_SESSION`.

```bash
python main.py --dynamic --orchestrator-session my-project "Continue the competitive analysis"
```

Reset with `--orchestrator-session-reset`.
