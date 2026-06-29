---
title: "CLI Reference"
layout: single
sidebar:
  nav: "docs"
toc: true
toc_sticky: true
---

All flags for `agentic-orchestration-tool/main.py`.

## Positional argument

| Argument | Description |
|---|---|
| `TASK` | Natural-language task for router mode (Ollama picks workflow). Also required for `--dynamic` / `--dynamic-iterative`. |

## Execution mode

| Flag | Description |
|---|---|
| `--batch` | Run once and exit when `TASK` is omitted (uses `--config`). |
| `--config PATH` | Workflow YAML (default `config/workflows/workflow.yaml`). |
| `--config-dir DIR` | Config root; routable workflows in `<dir>/workflows/*.yaml`. |
| `--dynamic` | LLM-planned one-off workflow. Requires `TASK`. |
| `--dynamic-iterative` | Plan and execute one step per round with re-planning. |
| `--example NAME` | Load vertical overlay: `healthcare` or `logistics`. |
| `-i`, `--interactive` | Interactive loop on a fixed `--config` workflow. |

## Dynamic mode

| Flag | Description |
|---|---|
| `--dynamic-agent-provider-ids ID1,ID2` | Restrict planner to specific provider IDs. |
| `--dynamic-attachments MANIFEST.JSON` | File manifest for planner context. |
| `--dynamic-iterative-rounds N` | Max stepwise rounds before synthesis. |
| `--dynamic-iterative-auto` | Auto stop/continue via controller model. |
| `--dynamic-iterative-max-rounds N` | Hard cap for auto mode. |
| `--dynamic-iterative-min-rounds N` | Min rounds before auto may stop. |
| `--dynamic-iterative-no-synthesize` | Skip final synthesis step. |

## Session

| Flag | Description |
|---|---|
| `--orchestrator-session NAME` | Named session for planner history. |
| `--orchestrator-session-reset` | Delete session JSON before this run. |

## Catalog

| Flag | Description |
|---|---|
| `--agent-providers-catalog PATH` | Agent provider YAML directory. |
| `--mcp-providers-catalog PATH` | MCP provider YAML directory. |

## Router

| Flag | Description |
|---|---|
| `--router-model MODEL` | Ollama model for routing (default `ROUTER_OLLAMA_MODEL`). |
| `--router-host HOST` | Ollama base URL (default `OLLAMA_HOST`). |

## Output and verbosity

| Flag | Description |
|---|---|
| `--output-dir DIR` | Save extracted files without prompting. |
| `--no-save` | Do not save extracted markdown files. |
| `--prompt-save` | Prompt for save location after each run. |
| `--no-verify` | Skip npm install/test/build after save. |
| `--quiet` | Less console noise; final output only on stdout. |

## Worker / K8s modes

| Flag | Description |
|---|---|
| `--execute-step SPEC.JSON` | Worker mode: run one step from StepSpec JSON. |
| `--warm-pool-worker` | K8s warm pool: poll run-store queue. |
| `--delegation-broker` | K8s delegation broker for child Jobs. |

Worker subprocess/K8s runs also use implicit context from env (`AGENTIC_RUN_STORE_PATH`, provider keys, etc.) — not separate CLI flags.
