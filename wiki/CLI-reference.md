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

## Dynamic catalog paths

| Flag | Default | Meaning |
|------|---------|--------|
| `--agent-providers-catalog` (`--providers-catalog`) | `config/agent_providers` | Agent YAML dir or bundle. |
| `--mcp-providers-catalog` | `config/mcp_providers` | MCP YAML dir or bundle. |

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

- [Workflows-and-router](Workflows-and-router)
- [Dynamic-planning](Dynamic-planning)
- [Configuration](Configuration)
