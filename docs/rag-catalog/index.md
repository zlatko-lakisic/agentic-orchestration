---
layout: single
title: "RAG sources"
permalink: /rag-catalog/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# RAG sources (catalog)

YAML-declared retrieval corpora, symmetric with [MCP providers]({{ '/mcp-catalog/' | relative_url }}) and [agent skills]({{ '/agent-skills/' | relative_url }}).

**Path:** `agentic-orchestration-tool/config/rag_sources/` (one `*.yaml` per source, or a bundle with top-level `rag_sources: [...]`). Merge extras via `AGENTIC_EXTRA_RAG_SOURCES_PATH`.

## Honesty labels (backends)

| Backend | Status | Behavior |
|---------|--------|----------|
| `sqlite-fts` | **shipped** | Wraps `orchestration.knowledge_base` FTS search (no second FTS layer). |
| `embedding` | **planned** | Hard-fails at catalog load. Never silently falls back to FTS. |
| `hybrid` | **planned** | Hard-fails at catalog load (`NotImplementedError`). |

## Entry fields

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Referenced by planner as `rag_ids` / workflow `rag_sources`. |
| `backend` | yes | `sqlite-fts` \| `embedding` \| `hybrid` |
| `mode` | yes | `inject` (harness prepends context) or `tool` (agent calls `rag_query`) |
| `path` | no* | DB/index path. Empty for `sqlite-fts` → default `__orchestrator_kb__/kb.sqlite3`. Explicit path must exist or its parent must. |
| `top_k` | no | Default `5` |
| `max_tokens` | no | Per-source inject cap (default `2000`) |
| `filters` | no | Reserved for backend-specific metadata filters (**accepted, not applied yet** — see [Known gaps](#known-gaps-shipped-path)) |
| `description` / `planner_hint` | recommended | Listed in the planner prompt |

\* `embedding`/`hybrid` will also require `index` / `provider` when shipped; today they fail at load.

## Planner / runner

- Planner JSON may include top-level and per-step `rag_ids`, plus optional per-step `rag_query`.
- **Unknown `rag_ids` hard-fail** at plan validation (no soft-drop).
- Inject mode: harness retrieves before the step; chunks tagged `[rag:{source_id}#{chunk_id}]`; zero hits emit `[rag:{source_id}] no results`.
- Token budgets: per-source `max_tokens` plus global `AGENTIC_RAG_INJECT_MAX_TOKENS` (default `6000`). Truncation order is deterministic (grant order × score order).
- Tool mode: `rag_query` CrewAI tool; non-granted sources blocked at dispatch.
- Grounding: harness verifies every `[rag:…]` citation against chunks actually retrieved this step; fabricated IDs fail the step.

## Env

| Variable | Default | Meaning |
|----------|---------|---------|
| `AGENTIC_EXTRA_RAG_SOURCES_PATH` | _(unset)_ | Extra catalog dirs (`:` / `;` on Windows) |
| `AGENTIC_RAG_INJECT_MAX_TOKENS` | `6000` | Global inject budget |

CLI: `--rag-sources-catalog` (default `config/rag_sources`).

## Planned (not shipped)

These are deliberate deferrals. Catalog entries or product surfaces that depend on them must not be described as working.

| Item | Status | Notes |
|------|--------|-------|
| **`embedding` backend** | **planned** | LiteLLM embeddings + a local index (no new vector DB dependency). Load-time hard-fail today; never silent FTS fallback when a provider is missing. |
| **`hybrid` backend** | **planned** | Combined FTS + embedding retrieval. Load-time `NotImplementedError`. |
| **Web UI provenance** | **planned** | Step records already carry `rag_audit`; surfacing citations / chunk lists / truncation in the Node/WebSocket UI is a separate task. |
| **New vector database deps** | **out of scope / planned only if needed** | No FAISS, Chroma, pgvector, etc. unless one already exists in-repo. Prefer a simple local index when `embedding` ships. |
| **Re-ranking / query rewriting / multi-hop** | **planned** | Single-shot retrieval only today. |
| **Knowledge-transfer redesign** | **planned / separate** | RAG exposes the existing orchestrator KB as a named source; it does not change how answers are written into the KB or cross-task memory semantics. |
| **README product positioning** | **planned / separate** | Config reference lives here; root README marketing copy is handled elsewhere. |

## Known gaps (shipped path)

Open polish items on the **shipped** `sqlite-fts` / inject / tool / grounding path. Not the same as planned backends.

| Gap | Impact |
|-----|--------|
| **`filters` unused** | YAML may set `filters: {}` (e.g. session / provider metadata); `sqlite-fts` retrieval ignores them today. |
| **No shipped `mode: tool` example** | Tool mode is implemented and unit-tested; the default catalog only ships `orchestrator_kb` (`mode: inject`). Add a second YAML when you want a ready-to-attach tool-mode source. |
| **Mixed inject+tool e2e audit test** | Unit tests cover inject budgets, tool ACL, grounding, and audit dict shape. There is not yet one integration test that runs a step with both modes and asserts full provenance on `StepResult` / `result.json`. |

## Related

- [Sessions, learning, and KB]({{ '/sessions-learning-kb/' | relative_url }}) — underlying SQLite FTS store
- [Dynamic planning]({{ '/dynamic-planning/' | relative_url }}) — `rag_ids` in plans
- [Configuration]({{ '/configuration/' | relative_url }})
