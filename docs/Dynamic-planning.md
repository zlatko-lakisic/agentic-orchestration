---
layout: default
title: Dynamic planning
permalink: /Dynamic-planning/
---

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

## Domain-aware provider choice

The planner is steered toward **specialist** YAMLs when they fit the topic. Additionally, **`general_purpose: true`** in an agent-provider YAML marks broad research defaults ( **`gpt_research`**, **`claude_research`** ). Before planning (when you do **not** pin providers with **`--dynamic-agent-provider-ids`**), orchestration computes a simple **lexical overlap** between your goal text and each provider’s combined `planner_hint`/`role`/`goal`/`id`. If specialists score strictly higher than general-purpose rows and specialists meet **`AGENTIC_DOMAIN_PROVIDER_MATCH_MIN`** (default 4), those general-purpose ids are **omitted from the planner catalog** so broad OpenAI-style research assistants cannot steal the assignment. The planner LLM may still **name** a stripped id (for example `gpt_research`); the tool then **remaps** that choice to the strongest lexical specialist among the remaining catalog (override with **`AGENTIC_PLANNER_STRICT_PROVIDER_IDS`**). Tune with **`AGENTIC_GENERAL_PURPOSE_AGENT_IDS`** (extra comma-separated ids) or disable suppression with **`AGENTIC_DISABLE_DOMAIN_PROVIDER_SUPPRESSION`**. Override any time via **`--dynamic-agent-provider-ids`** (see *Restricting planner provider choices*).

## Strict JSON / machine-readable-only goals

If the goal clearly asks for **only** a structured artefact (e.g. exactly one JSON object, no markdown, no prose—typical HA / automation payloads), orchestration skips **MCP auto-match** augmentation (so pasted forecast JSON doesn’t accidentally trigger web search), and **`--dynamic-iterative` omits final prose synthesis** so stdout stays the last crew’s structured output (e.g. `{"minutes":0}`) instead of an expanded narrative.

## Iterative options

| Flag / env | Purpose |
|------------|---------|
| `--dynamic-iterative-rounds` / `AGENTIC_DYNAMIC_ITERATIVE_ROUNDS` | Max step rounds before synthesis (default 4). |
| `--dynamic-iterative-auto` | After each round a small **controller** decides continue vs stop. |
| `--dynamic-iterative-max-rounds` / `AGENTIC_DYNAMIC_ITERATIVE_MAX_ROUNDS` | Hard cap with auto (default 8). |
| `--dynamic-iterative-min-rounds` / `AGENTIC_DYNAMIC_ITERATIVE_MIN_ROUNDS` | Minimum rounds before auto may stop. |
| `--dynamic-iterative-no-synthesize` | Skip final synthesis. |
| `AGENTIC_DYNAMIC_ITER_STREAM_STEPS` | When truthy, prints each iterative round output to stdout; otherwise stdout stays focused on final synthesis. |

## Attachments-aware dynamic runs

Dynamic modes can include uploaded files via **`--dynamic-attachments MANIFEST.JSON`**.

- The manifest lists file path/name/mime/size entries.
- The planner receives an attachment context block so it can route work based on file type and contents.
- Relative/absolute manifest paths are validated; file paths must stay under `<tool>/_web_uploads/` unless `AGENTIC_ATTACHMENTS_ALLOW_ABSOLUTE=1`.
- `TASK` may be omitted when attachments are present (the tool applies a default goal to analyze attached files).

## Restricting planner provider choices

Use **`--dynamic-agent-provider-ids ID1,ID2,...`** to constrain planner selection to specific provider IDs from the catalog.

- Works for both `--dynamic` and `--dynamic-iterative`.
- Empty value keeps normal auto-selection from the full filtered catalog.

## MCP in plans

The planner can attach MCP provider **ids** per step when the MCP catalog (see [MCP providers](MCP-providers/)) exposes `planner_hint` and credentials are present. Per-task MCP sets are resolved at runtime.

## Sessions

Use **`--orchestrator-session NAME`** (or env `AGENTIC_ORCHESTRATOR_SESSION`) so planner history and crew excerpts persist under `__orchestrator_sessions__/`. **`--orchestrator-session-reset`** clears the session file for that run.

Dynamic and iterative runs also support **same-goal answer cache** (`AGENTIC_ANSWER_CACHE=1`): if the same goal repeats in the same session, the last final answer is returned immediately with a confirmation prompt.

See [Sessions learning and knowledge base](Sessions-learning-and-knowledge-base/).

## Catalogs

- Agent templates: `--agent-providers-catalog` (default `config/agent_providers`).
- MCP templates: `--mcp-providers-catalog` (default `config/mcp_providers`).

## Learning and KB

When enabled, post-run **eval** and **learning stats** feed the next planner; **KB** snippets may be injected for similar goals. See [Sessions learning and knowledge base](Sessions-learning-and-knowledge-base/).

## Related

- [CLI reference](CLI-reference/)
- [Configuration](Configuration/)
- [Agent provider catalog](Agent-provider-catalog/)
