# Sessions, learning, knowledge base, answer cache

## Orchestrator sessions

**Path:** `__orchestrator_sessions__/<slug>.json` (gitignored).

**Purpose:** Persist **planner conversation** (user/assistant turns with plan JSON snapshots) and a **truncated last crew output** so the next `--dynamic` or `--dynamic-iterative` run can continue in context.

**Controls:**

- CLI: `--orchestrator-session NAME`, `--orchestrator-session-reset`
- Env: `AGENTIC_ORCHESTRATOR_SESSION`, `AGENTIC_ORCHESTRATOR_DEFAULT_SESSION`, `AGENTIC_ORCHESTRATOR_MAX_PLANNER_TURNS`, `AGENTIC_ORCHESTRATOR_EXCERPT_CHARS`, task description/output char limits (see `.env.example`)

## Learning loop

**Path:** `__orchestrator_learning__/` (gitignored)

| File | Role |
|------|------|
| `stats.json` | Aggregated per-provider stats (eval + user votes). |
| `traces.jsonl` | Append-only events for debugging / analytics. |
| `pending_ratings.jsonl` | Web UI ratings consumed on the next planner run. |

**Purpose:** Nudge **future provider selection** by injecting a short performance summary into the planner prompt for similar task types. This is **not** model training.

**Toggles:** `AGENTIC_LEARNING`, `AGENTIC_LEARNING_EVAL`, `AGENTIC_EVAL_MODEL`, and related vars in `.env.example`.

## Knowledge base (KB)

**Path:** `__orchestrator_kb__/kb.sqlite3` (gitignored; SQLite + FTS).

**Purpose:** Store **finalized answers** from runs; on new goals, **query FTS** and inject concise snippets into the planner context so repeat or related questions reuse prior work.

**Toggles:** `AGENTIC_KB`, `AGENTIC_KB_MAX_HITS`, `AGENTIC_KB_SNIPPET_CHARS`, etc.

## Answer cache (session-scoped)

Repeat of the **exact same goal** within a session can short-circuit to a cached final answer (with UX to decline and re-run). Controlled via `AGENTIC_ANSWER_CACHE` (see `.env.example`).

## Agent provider lifecycle

For custom providers, hooks run in order: `validate_config` → `initialize` → `health_check` → `build_agent` → `on_workflow_start` → `before_task` / `after_task` → `on_workflow_end` → `cleanup`. Full detail: `agentic-orchestration-tool/README.md`.

## Related

- [Dynamic-planning](Dynamic-planning)
- [Configuration](Configuration)
- [Web-UI](Web-UI) — ratings and chat flows
