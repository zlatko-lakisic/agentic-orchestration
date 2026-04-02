# Dynamic planning

Dynamic modes turn a **natural-language goal** into a **JSON plan** (steps with agent provider ids and optional MCP ids), build an ephemeral CrewAI workflow, and execute it.

## Modes

| Flag | Behavior |
|------|----------|
| `--dynamic` | Single planning pass → full multi-step run (sequential execution of planned steps). |
| `--dynamic-iterative` | One step per round; replan between steps using session context; optional synthesis at end. |

Both require a **TASK** string on the CLI (or equivalent from the web UI).

## Planner backend

The planner uses **LiteLLM** when enabled so you can point **`AGENTIC_PLANNER_MODEL`** at OpenAI-, Anthropic-, Ollama-, HF-style ids (see `.env.example`). JSON repair / retry and rate-limit behavior are controlled via `AGENTIC_PLANNER_*` variables.

## Iterative options

| Flag / env | Purpose |
|------------|---------|
| `--dynamic-iterative-rounds` / `AGENTIC_DYNAMIC_ITERATIVE_ROUNDS` | Max step rounds before synthesis (default 4). |
| `--dynamic-iterative-auto` | After each round a small **controller** decides continue vs stop. |
| `--dynamic-iterative-max-rounds` / `AGENTIC_DYNAMIC_ITERATIVE_MAX_ROUNDS` | Hard cap with auto (default 8). |
| `--dynamic-iterative-min-rounds` / `AGENTIC_DYNAMIC_ITERATIVE_MIN_ROUNDS` | Minimum rounds before auto may stop. |
| `--dynamic-iterative-no-synthesize` | Skip final synthesis. |

## MCP in plans

The planner can attach MCP provider **ids** per step when the MCP catalog (see [MCP-providers](MCP-providers)) exposes `planner_hint` and credentials are present. Per-task MCP sets are resolved at runtime.

## Sessions

Use **`--orchestrator-session NAME`** (or env `AGENTIC_ORCHESTRATOR_SESSION`) so planner history and crew excerpts persist under `__orchestrator_sessions__/`. **`--orchestrator-session-reset`** clears the session file for that run.

See [Sessions-learning-and-knowledge-base](Sessions-learning-and-knowledge-base).

## Catalogs

- Agent templates: `--agent-providers-catalog` (default `config/agent_providers`).
- MCP templates: `--mcp-providers-catalog` (default `config/mcp_providers`).

## Learning and KB

When enabled, post-run **eval** and **learning stats** feed the next planner; **KB** snippets may be injected for similar goals. See [Sessions-learning-and-knowledge-base](Sessions-learning-and-knowledge-base).

## Related

- [CLI-reference](CLI-reference)
- [Configuration](Configuration)
- [Agent-provider-catalog](Agent-provider-catalog)
