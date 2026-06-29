---
layout: single
title: "CLI reference"
permalink: /cli-reference/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# CLI reference (`main.py`)

All flags below are defined in `agentic-orchestration-tool/main.py` (`parse_args`). Paths are relative to the tool root unless absolute.

## Positional

| Argument | Meaning |
|----------|---------|
| `TASK` | Optional. If present without `--dynamic*`: **router** task string. If with `--dynamic*`: user **goal**. If omitted: interactive router loop (or batch with `--batch`). |

## Modes

| Flag | Meaning |
|------|---------|
| `--batch` | Run once and exit when `TASK` omitted (uses `--config`). |
| `--interactive` (`-i`) | Interactive loop on a **fixed** `--config` workflow. |
| `--dynamic` | Plan + run ephemeral multi-step workflow from `TASK`. |
| `--dynamic-iterative` | Stepwise dynamic runs with replanning. |
| `--example healthcare|logistics` | Apply built-in vertical overlay (context + extra catalogs) without manual `.env` path wiring. |

## Workflow / router

| Flag | Default | Meaning |
|------|---------|--------|
| `--config` | `config/workflows/workflow.yaml` | Static workflow YAML. |
| `--config-dir` | `config` | Root for `workflows/*.yaml` scan. |
| `--router-model` | `ROUTER_OLLAMA_MODEL` or `llama3.2` | Ollama model for routing. |
| `--router-host` | `OLLAMA_HOST` | Ollama base URL. |

## Output / artifacts

| Flag | Meaning |
|------|---------|
| `--output-dir DIR` | Save extracted files here without prompting. |
| `--no-save` | Do not save extracted files. |
| `--prompt-save` | Prompt for save location. |
| `--no-verify` | Skip post-save npm verify (`AGENTIC_VERIFY` also applies). |
| `--quiet` | Less console noise; with `--dynamic`, skip plan/step progress on stderr. |

## Worker (distributed backends)

| Flag | Meaning |
|------|---------|
| `--execute-step SPEC.JSON` | Worker mode: run one step from a `StepSpec` JSON file and exit. Used by subprocess/K8s backends; not for normal CLI runs. Re-resolves `skills` ids from `paths.agent_skills_catalog` (or env default) when present. |

## Dynamic catalog paths

| Flag | Default | Meaning |
|------|---------|--------|
| `--agent-providers-catalog` (`--providers-catalog`) | `config/agent_providers` | Agent YAML dir or bundle. |
| `--mcp-providers-catalog` | `config/mcp_providers` | MCP YAML dir or bundle. |
| `--agent-skills-catalog` | `config/agent_skills` | Agent skill YAML dir or bundle (procedural instructions injected into tasks). Merges `AGENTIC_EXTRA_AGENT_SKILLS_PATH`. |
| `--dynamic-agent-provider-ids` | _empty_ | Restrict planner choices to comma-separated provider IDs. |
| `--dynamic-attachments` | _none_ | Attachment manifest for file-aware dynamic planning/execution. |

## Iterative dynamic

| Flag | Meaning |
|------|---------|
| `--dynamic-iterative-rounds N` | Max rounds before synthesis. |
| `--dynamic-iterative-auto` | Enable controller between rounds. |
| `--dynamic-iterative-max-rounds N` | Cap with auto. |
| `--dynamic-iterative-min-rounds N` | Minimum rounds before stop allowed. |
| `--dynamic-iterative-no-synthesize` | Skip final synthesis. |

## Session

| Flag | Meaning |
|------|---------|
| `--orchestrator-session NAME` | Session slug for `__orchestrator_sessions__/`. |
| `--orchestrator-session-reset` | Delete session JSON before run. |

## Related

- [Workflows and router]({{ '/workflows/' | relative_url }})
- [Dynamic planning]({{ '/dynamic-planning/' | relative_url }})
- [Configuration]({{ '/configuration/' | relative_url }})
