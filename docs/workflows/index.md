---
title: "Workflows"
layout: single
sidebar:
  nav: "docs"
toc: true
toc_sticky: true
---

Static workflows are YAML files under `agentic-orchestration-tool/config/workflows/`. Each defines agents, tasks, and execution order without LLM planning.

## Shipped workflows

| File | Purpose |
|---|---|
| `workflow.yaml` | Default interactive/batch workflow |
| `workflow_brainstorm.yaml` | Diverge → converge brainstorming crew |
| `workflow_web_dev.yaml` | Web development multi-agent flow |
| `workflow_healthcare_commercial_brief.yaml` | Routable healthcare commercial brief (router mode) |
| `workflow_fetch_sidecar_smoke.yaml` | MCP fetch smoke test |
| `workflow_filesystem_smoke.yaml` | MCP filesystem smoke test |

## Run a workflow

**Batch (one shot):**

```bash
python main.py --batch --config config/workflows/workflow_brainstorm.yaml
```

**Interactive loop on a fixed file:**

```bash
python main.py -i --config config/workflows/workflow_brainstorm.yaml
```

**Router picks workflow from catalog:**

```bash
python main.py "Brainstorm product names for a developer tool"
```

Routable workflows need top-level `meta` + `workflow` sections in `config/workflows/*.yaml`.

## Workflow YAML shape

```yaml
meta:
  name: brainstorm
  description: Diverge on ideas then converge to top picks
workflow:
  name: Brainstorm
  agents: [...]
  tasks: [...]
```

## vs dynamic mode

| | Static workflow | `--dynamic` |
|---|---|---|
| Plan source | YAML file | LLM planner |
| Best for | Repeatable crews | Ad-hoc goals |
| MCP selection | Fixed in YAML | Planner per step |

See [Dynamic Planning](/dynamic-planning/) for planner-driven runs.
