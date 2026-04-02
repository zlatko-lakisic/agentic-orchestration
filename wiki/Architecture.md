# Architecture

## High-level flow

1. **Planner** (dynamic modes) — Reads the user goal, session history, optional KB snippets, and learning summary; outputs a JSON plan: ordered steps with `agent_provider_id` and optional MCP ids.
2. **Catalog resolution** — Agent templates load from `config/agent_providers/` (or extra paths). MCP templates load from `config/mcp_providers/` plus `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`. Entries without required credentials are filtered out before planning.
3. **Runner** — Builds CrewAI `Agent` / `Task` / `Crew` instances, attaches MCP tool configs per task, runs sequential (or hierarchical) process.
4. **Post-run** — Optional artifact extraction, verification, session JSON updates, learning traces, KB append, web UI progress.

## Packages

| Package | Role |
|---------|------|
| `agentic-orchestration-tool` | Python: YAML workflows, dynamic planner, MCP catalog, sessions, learning, KB, CLI (`main.py`). |
| `agentic-orchestration-web` | Node: HTTP + WebSocket server; spawns the tool for chat messages. |

## Configuration directories (tool)

```
agentic-orchestration-tool/config/
├── workflows/           # Static workflow YAML; routable files add top-level `meta`
├── agent_providers/    # One YAML per agent template (dynamic catalog)
└── mcp_providers/      # One YAML per MCP template (streamable HTTP, refs, env gates)
```

## Orchestration modules (selected)

Under `agentic-orchestration-tool/orchestration/`:

- `runner.py` — Build workflow, crew lifecycle.
- `dynamic_planner.py` — Planning, iterative rounds, controller, synthesis, eval hooks.
- `mcp_providers_catalog.py` — Load/merge MCP YAML, env substitution, credential filtering, planner hints.
- `orchestrator_session.py` — Session JSON under `__orchestrator_sessions__/`.
- `learning_store.py` — Traces, stats, pending ratings under `__orchestrator_learning__/`.
- `knowledge_base.py` — SQLite FTS under `__orchestrator_kb__/`.
- `catalog_loader.py` / `config_loader.py` — Workflow and provider discovery.

## Gitignored runtime paths

| Path | Content |
|------|---------|
| `__orchestrator_sessions__/` | Planner turns + excerpts per session slug. |
| `__orchestrator_learning__/` | `stats.json`, `traces.jsonl`, `pending_ratings.jsonl`. |
| `__orchestrator_kb__/` | `kb.sqlite3` (FTS index). |
| `__output__/` | Extracted artifacts from runs. |
| `.env` | Secrets — never commit. |

## Extension points

- **More agents:** add YAML under `config/agent_providers/` or `AGENTIC_EXTRA_AGENT_PROVIDERS_PATH` (Python provider classes).
- **More MCPs:** add YAML under `config/mcp_providers/` or `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`.
- **Custom workflows:** add files under `config/workflows/`; optional `meta` for router inclusion.

See also: [Agent-provider-catalog](Agent-provider-catalog), [MCP-providers](MCP-providers), [Configuration](Configuration).
