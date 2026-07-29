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
| `--society CHARTER.yaml` | Run an agent society from a charter (round-robin turns on a shared blackboard). Mutually exclusive with `--dynamic*`. |
| `--example healthcare|logistics|society_research_panel` | Apply built-in vertical overlay (context + extra catalogs) without manual `.env` path wiring. |

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
| `--execute-step SPEC.JSON` | Worker mode: run one step from a `StepSpec` JSON file and exit. Used by subprocess/K8s backends; not for normal CLI runs. |

## Dynamic catalog paths

| Flag | Default | Meaning |
|------|---------|--------|
| `--agent-providers-catalog` (`--providers-catalog`) | `config/agent_providers` | Agent YAML dir or bundle. |
| `--mcp-providers-catalog` | `config/mcp_providers` | MCP YAML dir or bundle. |
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

## Agent societies (K6.1)

| Flag | Meaning |
|------|---------|
| `--society CHARTER.yaml` | Charter path (relative paths resolve against the tool dir, then the current directory). |
| `--goal TEXT` | Goal for the society; falls back to `TASK`, then `society.goal` in the charter. |
| `--society-session NAME` | Session dir under `__orchestrator_sessions__/societies/` (default: charter `society.id`). |
| `--society-max-turns N` | Lower the charter's `max_turns` for this run (never raises it). |
| `--society-no-controller` | Stop only on `stop_when` phrases and the turn budget (no controller LLM). |

Charter schema: `config/schemas/society_charter.schema.json`. Env vars: see [Configuration]({{ '/configuration/' | relative_url }}#agent-societies-k61). Design: [ADR 0001]({{ '/adr/0001-agent-societies-v1/' | relative_url }}).

## Session

| Flag | Meaning |
|------|---------|
| `--orchestrator-session NAME` | Session slug for `__orchestrator_sessions__/`. |
| `--orchestrator-session-reset` | Delete session JSON before run. |

## Platform agent harness (v1.4.0)

| Flag | Meaning |
|------|---------|
| `--harness-agent ID` | Run harness for one catalog agent and exit. |
| `--harness-batch` | Run harness for all (or filtered) catalog agents. |
| `--harness-tier TIER` | `static`, `connectivity`, `smoke`, `capability` (aliases `l0`–`l3`). |
| `--harness-filter GLOB` | fnmatch on provider ids (e.g. `gpt_*`). |
| `--harness-max-agents N` | Cap batch size. |
| `--harness-profile PROFILE` | Force profile. |
| `--harness-backend NAME` | `inprocess` or `subprocess`. |
| `--harness-json` | JSON report on stdout. |
| `--harness-fail-fast` | Stop on first failure. |

Env: `AGENTIC_HARNESS_TIER`, `AGENTIC_HARNESS_EVAL`, `AGENTIC_HARNESS_SKIP_SELFCONTAINED_INIT`, `AGENTIC_HARNESS_FEED_PLANNER`. See [Agent harness roadmap]({{ '/Agent-harness-roadmap/' | relative_url }}).

## User agent harness (v1.5.0)

| Flag | Meaning |
|------|---------|
| `--harness-dir PATH` | User harness root(s); subdirs with `harness.yaml` are packs. Repeatable. |
| `--harness-agent ID` | Run all scenarios for one catalog agent (platform or user pack). |
| `--user-harness-run-all` | Run every user harness pack under merged harness dirs. |
| `--harness-json` | JSON report on stdout. |
| `--harness-fail-fast` | Stop on first scenario failure. |
| `--harness-backend NAME` | `inprocess` or `subprocess` (manifest `defaults.execution_backend` overrides). |

With `--example healthcare`, vertical `harnesses/` is merged into discovery (no separate `--harness-dir` required).

Env: `AGENTIC_EXTRA_AGENT_HARNESS_DIRS`, `AGENTIC_USER_HARNESS_RECORD_STATS`, `AGENTIC_USER_HARNESS_FEED_PLANNER`. See [User agent harnesses]({{ '/User-agent-harnesses/' | relative_url }}).

## Related

- [Workflows and router]({{ '/workflows/' | relative_url }})
- [Dynamic planning]({{ '/dynamic-planning/' | relative_url }})
- [Configuration]({{ '/configuration/' | relative_url }})
