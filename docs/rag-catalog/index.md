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

YAML-declared retrieval corpora, symmetric with [MCP providers]({{ '/mcp-catalog/' | relative_url }}) and [Agent skills]({{ '/agent-skills/' | relative_url }}).

**Path:** `agentic-orchestration-tool/config/rag_sources/` (one `*.yaml` per source, or a bundle with top-level `rag_sources: [...]`). Merge extras via `AGENTIC_EXTRA_RAG_SOURCES_PATH`.

## Honesty labels (backends)

| Backend | Status | Behavior |
|---------|--------|----------|
| `sqlite-fts` | **shipped** | Wraps `orchestration.knowledge_base` FTS search (no second FTS layer). |
| `embedding` | **shipped** | LiteLLM embeddings + local SQLite vector index. Provider failures **hard-fail** (never silent FTS fallback). |
| `hybrid` | **shipped** | FTS + embedding fused with reciprocal rank fusion (RRF). Missing provider/index hard-fails at catalog load. |

Default catalog ships `orchestrator_kb` (`sqlite-fts`). Copy examples from `config/rag_sources/_examples/` when you want embedding/hybrid (that folder is skipped by the loader).

## Entry fields

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Referenced by planner as `rag_ids` / workflow `rag_sources`. |
| `backend` | yes | `sqlite-fts` \| `embedding` \| `hybrid` |
| `mode` | yes | `inject` (harness prepends context) or `tool` (agent calls `rag_query`) |
| `path` | no | Corpus DB (knowledge_base-compatible). Empty → default `__orchestrator_kb__/kb.sqlite3`. Explicit path must exist or its parent must. |
| `provider` | embedding/hybrid | LiteLLM embedding model id (optional `litellm:` prefix), e.g. `text-embedding-3-small` or `ollama/nomic-embed-text`. |
| `index` | embedding/hybrid | Local SQLite vector index path (created on first retrieve). Directory paths use `vectors.sqlite3` inside. |
| `top_k` | no | Default `5` |
| `max_tokens` | no | Per-source inject cap (default `2000`) |
| `filters` | no | Reserved (accepted, not applied yet). |
| `description` / `planner_hint` | recommended | Listed in the planner prompt |

Embedding/hybrid still read documents from `path` (or the default KB); `index` stores vectors only.

## Planner / runner

- Planner JSON may include top-level and per-step `rag_ids`, plus optional per-step `rag_query`.
- **Unknown `rag_ids` hard-fail** at plan validation (no soft-drop).
- Inject mode: harness retrieves before the step; chunks tagged `[rag:{source_id}#{chunk_id}]`; zero hits emit `[rag:{source_id}] no results`.
- Token budgets: per-source `max_tokens` plus global `AGENTIC_RAG_INJECT_MAX_TOKENS` (default `6000`).
- Tool mode: `rag_query` CrewAI tool; non-granted sources blocked at dispatch.
- Grounding: harness verifies every `[rag:…]` citation against chunks actually retrieved this step.
- Embedding sync: on retrieve, missing/changed docs are embedded into `index` (batch size `AGENTIC_RAG_EMBED_BATCH`).

## Env

| Variable | Default | Meaning |
|----------|---------|---------|
| `AGENTIC_EXTRA_RAG_SOURCES_PATH` | _(unset)_ | Extra catalog dirs (`:` / `;` on Windows) |
| `AGENTIC_RAG_INJECT_MAX_TOKENS` | `6000` | Global inject budget |
| `AGENTIC_RAG_EMBED_BATCH` | `16` | Docs embedded per LiteLLM call when syncing the index |
| `AGENTIC_RAG_EMBED_MAX_DOCS` | `2000` | Max corpus docs loaded into the vector index per retrieve |

CLI: `--rag-sources-catalog` (default `config/rag_sources`).

## Related

- [Sessions learning and knowledge base]({{ '/sessions-learning-kb/' | relative_url }}) — underlying SQLite FTS store
- [Dynamic planning]({{ '/dynamic-planning/' | relative_url }}) — `rag_ids` in plans
- [Configuration]({{ '/configuration/' | relative_url }})
- [System architecture]({{ '/system-architecture/' | relative_url }}) — RAG is harness code, not a separate pod
