# Workflows and router

## Static workflows

Default path: **`agentic-orchestration-tool/config/workflows/workflow.yaml`**.

CLI:

```bash
python main.py --config config/workflows/workflow.yaml
```

Top-level structure (high level):

- `workflow.name`, `workflow.process` (`sequential` | `hierarchical`)
- `workflow.topic` — substituted into task templates (`{topic}`)
- `workflow.agent_providers` — inline provider defs (legacy key `workflow.providers` still accepted)
- `workflow.tasks` — tasks referencing `agent_provider_id`
- `workflow.task_sequence` — ordered task ids

See **`agentic-orchestration-tool/README.md`** for schema details and Ollama provider options.

## Routable workflows (`meta`)

Router mode scans **`config-dir/workflows/*.yaml`** (default `config-dir` = `config`). A file is eligible if it has **both**:

- Top-level **`meta`** — routing metadata
- Top-level **`workflow`** — the workflow body

### `meta` fields

| Field | Purpose |
|-------|---------|
| `id` | Unique workflow id returned by the router model |
| `summary` | Short line for the routing prompt |
| `description` | Longer text (optional; may default to `summary`) |
| `good_for` | Non-empty list of strings — capabilities |
| `router_include` | Optional; `false` excludes file from router while keeping it runnable via `--config` |

### Router run

Requires **Ollama** reachable at `OLLAMA_HOST` and a model at `ROUTER_OLLAMA_MODEL` (CLI `--router-model`).

```bash
python main.py "Your natural language task"
```

The task becomes the workflow **`topic`**.

Flags: `--config-dir`, `--router-model`, `--router-host`.

## Example workflow files (repo)

| File | Notes |
|------|------|
| `workflow.yaml` | Research-style brief (with `meta` if routable) |
| `workflow_brainstorm.yaml` | Brainstorming-oriented `meta` |
| `workflow_web_dev.yaml` | Web-dev oriented; Ollama-centric analyst → architect → implementer pattern |

## Related

- [CLI-reference](CLI-reference) — `--batch`, `-i` / `--interactive`
- [Dynamic-planning](Dynamic-planning) — alternative: no fixed YAML; planner builds ephemeral workflow
