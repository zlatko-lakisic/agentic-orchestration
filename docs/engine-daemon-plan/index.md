---
layout: single
title: "Engine API daemon plan"
permalink: /engine-daemon-plan/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# Engine API Daemon Plan (Reach client enablement)

Status: **Slices A–D implemented** (unreleased; on `main` after v1.22.0) · Last updated: 2026-07-29  
Baseline: **v1.22.0+** (AO tip). Original gap review was vs v1.20.0; societies K6.2 / impartial QA deepen have landed since.  
Prior baseline: v1.11.0 — daemon track did not land between 1.11 and 1.20

## Shipped status (A–D)

Everything below landed additively: `python main.py` and `agentic-orchestration-web/server.mjs`
still work unchanged as the defaults, and the existing pytest + Node suites stay green.

| Slice | Items | Status | Primary paths |
|-------|-------|--------|---------------|
| **A** — desktop sidecar | 1–3 | **Shipped** | `orchestration/serve/` (`__main__`, `app`, `ws`), `orchestration/user_context.py`, `orchestration/dynamic_run.py`, `requirements-serve.txt` |
| **B** — meeting fan-out | 4–7 | **Shipped** | `orchestration/direct_agent.py`, `orchestration/host_metrics.py`, question-tagged WS runs, `tests/test_direct_agent_latency.py` |
| **C** — prep + company/deal KB | 8–12 | **Shipped** | `orchestration/knowledge_base.py` (additive migration), `orchestration/deal_auth.py`, session / learning / run-store user dimension, `/api/v1/kb/*` |
| **D** — VRAM multi-model polish | 13 | **Shipped** | `orchestration/hardware_profile.py` (`plan_resident_models`, `detect_vram_gb_available`) |

### Quick start

```bash
cd agentic-orchestration-tool
.venv/bin/pip install -r requirements-serve.txt   # optional extras
.venv/bin/python -m orchestration.serve           # 127.0.0.1:8765
curl -s http://127.0.0.1:8765/health
./scripts/smoke_serve.sh                          # offline; skips FastAPI checks when absent
```

Config reference: [Configuration → Engine API daemon]({{ '/configuration/#engine-api-daemon-optional' | relative_url }}).

### Endpoints as built

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | `{ok, version, instance, bind, catalogs}` — catalogs are warmed at startup |
| `GET` | `/api/ping` | Node-parity liveness (`pid`, `instance`) |
| `GET` | `/api/session` | Resolved identity; `401` under `AGENTIC_REQUIRE_IDENTITY=1` without a header |
| `GET` | `/api/host-metrics` | CPU / memory / load, plus the Jetson jtop overlay |
| `POST` | `/api/v1/direct-agent` | `{agentProviderId, text, context, questionId}` — planner bypassed |
| `POST` | `/api/v1/kb/ingest` | Fast-ingest by default (`fast: false` for a plain insert) |
| `POST` | `/api/v1/kb/upsert` | Upsert by `sourceId`; returns `inserted` / `updated` / `unchanged` |
| `DELETE` | `/api/v1/kb/scope/{deal_id}` | Deal lifecycle; returns rows removed |
| `GET` | `/api/v1/kb/search?q=` | Optional `scope`, `dealId`; deal hits precede global hits |
| `WS` | `/ws` | Protocol table in §3.1; `question_id` opts into concurrent runs |

> **Safe enablement:** Implement additively — CLI and Node web stay fully functional. See non-breaking principles below and ship Slices A→D as separate minors.
> Everything here is **generic engine capability**. Presales agents, meeting perception,
> crawlers-as-product, Tauri, and installers belong in client products — not here.

This document specifies the changes to **agentic-orchestration** required to support
downstream products that embed the engine as a warm, long-lived service — the first
of which are **Reach clients**.

---

## 0. Gap check vs v1.20.0 (research summary)

| Plan item | Status at v1.20.0 | Now |
|-----------|-------------------|-----|
| `python -m orchestration.serve` (FastAPI + WS) | **Missing** — no FastAPI/uvicorn in tool deps | Shipped (`requirements-serve.txt`, optional) |
| Python identity middleware + `AGENTIC_REQUIRE_IDENTITY` | **Missing** — Node only (`agentic-orchestration-web/lib/user-context.mjs`) | Shipped (`orchestration/user_context.py`) |
| Direct-agent fast path (caller agent id + context, no planner) | **Missing** — only single-agent trivial plan / simple-chat heuristics | Shipped (`orchestration/direct_agent.py`) |
| Question-tagged concurrent streaming | **Missing** — Node WS is one-run-busy per connection | Shipped (`question_id`; untagged keeps the lock) |
| Host metrics in Python daemon | **Missing** — Node only (`host-metrics.mjs`, WS push) | Shipped (`orchestration/host_metrics.py`) |
| KB two-tier / ingest API / upsert-by-source / delete-by-scope / fast-ingest | **Missing** — `knowledge_base.py` is append + FTS only | Shipped (additive migration; deal precedence) |
| User dimension on session / KB / learning / run_store | **Missing** | Shipped (opt-in, dual-read) |
| Deal membership authorization | **Missing** | Shipped (`orchestration/deal_auth.py`) |
| Latency budgets as CI | **Missing** — harnesses exist for quality, not TTFT/complete | Shipped (`latency` marker, `AGENTIC_LATENCY_CI=1`) |
| Concurrent resident model planning | **Missing** — still `min_vram_gb` filter only | Shipped (`plan_resident_models`) |

**Landed since v1.11 that helps, but does not replace the daemon:**

- Node bridges: `POST /api/v1/orchestrate`, `POST /v1/chat/completions` (still spawn `main.py`)
- RAG embedding + hybrid backends (1.15) — separate from deal/global KB master-of-record
- Agent societies (1.18), impartial QA (1.19), run-store S3/Redis (1.20)
- Rich `AGENTIC_EXTRA_*` catalog overlay envs (downstream can inject YAML without forking)

**Do not extend `agentic-orchestration-web/server.mjs` as the product API.** Treat its WS
message shapes, identity headers, host-metrics push, and attachment caps as the **spec**
to port into Python.

---


## Safe enablement principles (AO)

1. **Additive only** — `python -m orchestration.serve` is opt-in; CLI `main.py` and Node `server.mjs` remain the default.
2. **Optional deps** — FastAPI/uvicorn in `requirements-serve.txt`; not required for Jetson CLI-only installs.
3. **Implicit local user** when identity headers are absent; `AGENTIC_REQUIRE_IDENTITY=1` is opt-in for server mode.
4. **Dual-read migrations** for sessions/KB — never orphan legacy `__orchestrator_sessions__/<slug>.json` or append-only KB rows.
5. **One writer for SQLite** — avoid Node-spawn CLI and the daemon both writing KB in the same deployment; document "pick one writer."
6. **Parity tests** — existing pytest + Node tests stay green; daemon tests are additive.
7. **Do not extend** `agentic-orchestration-web/server.mjs` as the product API.

## 1. Context and motivation

Today the engine is CLI-shaped (`agentic-orchestration-tool/main.py`) and the web UI
(`agentic-orchestration-web/server.mjs`) spawns `main.py --dynamic` **per chat
message**. That model imposes a cold start (Python imports, catalog load, KB
connections, Ollama warm-up) on every request, offers no clean streaming or
concurrency, and forces a second backend language (Node) whose main job is
subprocess wrangling.

Downstream requirements that break this model:

- **Latency-critical interactive use** (sub-seconds from question to first token).
- **Concurrency**: multiple in-flight questions, parallel fan-out of one question
  to several agents, out-of-order streamed results.
- **Two deployment styles from one codebase**:
  - **Local all-in-one** — engine bundled as a sidecar of a desktop app, bound to
    `127.0.0.1`, zero identity setup.
  - **Server** — engine behind an identity-terminating proxy (Warpgate), multiple
    clients, shared knowledge and deals.

---

## 2. Architecture decisions (settled)

1. **The API moves from web into tool.** The tool grows a first-class daemon;
   serving becomes an engine capability. `agentic-orchestration-web` is untouched
   and keeps working; long-term it reduces to a frontend that may connect to the
   daemon. The Node server's spawn-per-message architecture is not extended.
2. **One backend language.** The daemon is Python (FastAPI + WebSocket), in-process
   with the engine. JavaScript remains only in frontends.
3. **Contract over code reuse from web.** The Node server's WS message shapes,
   header conventions, and attachment byte-cap conventions are treated as a spec to
   preserve. `lib/user-context.mjs` is **ported** to Python (precedent:
   `text_normalize` and `ollama_keepalive` already exist in both languages).
4. **The engine never does identity.** Authentication is the deployment context's
   job (proxy in server mode; the OS login in local mode). The engine consumes
   forwarded identity headers behind a trust boundary. No user store, no
   credentials, no OAuth — ever.
5. **The engine KB is the master of record.** Downstream apps feed and query
   knowledge exclusively through the daemon API; nothing touches the SQLite files
   directly.

---

## 3. Changes to the core product

### 3.1 API daemon (the substantial piece)

New entry point `python -m orchestration.serve` in `agentic-orchestration-tool/`:

- FastAPI + WebSocket, warm and long-lived: catalogs, KB connections, sessions,
  and Ollama keepalive stay resident.
- Streaming responses (first token fast), **question-tagged** replies so concurrent
  answers interleave safely, file-ingest events client→server.
- Preserve the existing Node WS protocol shapes (chat chunks, crew-log sequence,
  host-metrics push subscription, keepalive/reconnect semantics) so existing
  frontends can migrate later at no cost to downstream apps.
- CLI (`main.py`) and the Node web server remain fully functional alongside.

**Protocol reference (port from Node):**

| Direction | Types (non-exhaustive) |
|-----------|------------------------|
| Client → server | `ping`, `client_hello`, `host_metrics_subscribe`, `chat`, `rate` |
| Server → client | `hello`, `pong`, `host_metrics`, `welcome_*`, `preflight`, `run_start`, `chunk`, `run_end`, `error`, `rated` |

Every answer stream must carry a **question tag** so clients can demux concurrent runs.
Drop the single-connection “busy” lock once tags exist.

Suggested location: `orchestration/serve.py` (+ package `__main__`), FastAPI/uvicorn
added to tool requirements behind a clear optional or daemon extras set if needed.

### 3.2 Direct-agent fast path

A lightweight invocation route that **bypasses** the planner → JSON plan →
sequential crew cycle: *"ask agent X, with this provided context, now."*

- Callers supply the agent id and pre-retrieved context; no plan decomposition.
- Multiple direct calls may run concurrently (caller-managed fan-out).
- The full dynamic-planner path remains the default for deep/multi-step goals.

Suggested location: `orchestration/direct_agent.py` + WS/HTTP handlers on the daemon.
Reuse catalog load / provider factory / step execution primitives; do not invent a
second agent runtime.

### 3.3 Identity middleware (port of `lib/user-context.mjs`)

- Extract identity from proxy-forwarded headers — same conventions:
  `x-agentic-user-name` / `x-user-name`, `x-agentic-session-id` /
  `x-warpgate-session-id`, configurable via the existing env vars
  (`AGENTIC_WEB_USER_NAME_HEADER`, `AGENTIC_WEB_SESSION_ID_HEADER`).
- Same sanitization rules (length caps, control-char and charset checks) and
  `web-*` fallback session generation; mirror the Node tests in pytest
  (`agentic-orchestration-web/test/user-context.test.mjs` → new pytest module).
- **Local mode** (no headers): resolve to an implicit local user.
- **Server mode** (`AGENTIC_REQUIRE_IDENTITY=1`): reject unauthenticated requests
  loudly. A misconfigured deployment must fail, not silently merge users.
- Downstream code only ever sees a resolved user on the request context.

Suggested location: `orchestration/user_context.py`.

### 3.4 User dimension through existing state

Mechanical, careful pass — add a user key/attribution to:

- `orchestration/orchestrator_session.py` (session files keyed by user + slug)
- `orchestration/knowledge_base.py` (scoping becomes user/deal aware; see 3.5)
- `orchestration/learning_store.py` (ratings/traces attributed to a user)
- `orchestration/run_store.py`

No algorithmic changes. Single-user CLI behavior must be preserved (implicit user).
Write migration logic for existing on-disk state; never corrupt or orphan sessions/KB rows.

### 3.5 Knowledge base promotion (master of record)

- **Ingestion API**: bulk ingest, upsert-by-source, and a **sub-second fast-ingest
  path** for ad-hoc drops (index now, enrich later).
- **Two-tier scoping**: persistent **global/company tier** (shared, all users can
  read) + **deal/session tier**; cross-scope queries with precedence — deal-scoped
  facts override global-tier documents on conflict.
- **Source metadata**: origin, vintage/last-synced, re-sync policy per source —
  enables incremental re-sync (upsert/prune by source) and freshness-cited answers.
- **Lifecycle**: delete-by-scope (remove a deal completely), retention policies;
  encryption at rest may follow later.
- **Structured facts**: decide between a facts table in the KB vs. the
  `memory_knowledge_graph` MCP for entity/relation facts — one owner, not both.

Note: RAG embedding upsert (`orchestration/rag_*.py`, 1.15+) is **not** a substitute
for this KB API. RAG remains document retrieval for steps; the deal/global KB is the
product master of record.

Tests required: two-tier precedence, upsert-by-source incremental re-sync,
delete-by-scope completeness, fast-ingest timing.

### 3.6 Deal-membership authorization

- Thin map: deal → members/roles, checked at the API layer for deal-scoped
  requests. This is the **only** authorization the engine owns.
- Local mode: trivially permissive.
- Deals are durable objects keyed by user identity + deal id — **not** by proxy
  session (proxy sessions are transport, not scope).

### 3.7 Deployment/config discipline

- Bind address config: default `127.0.0.1`; network binding is an explicit opt-in.
- Documented requirement: in server mode protect the engine port with **network
  policy and/or mTLS**. As of **v1.29.0**, in-process TLS/mTLS is supported
  (`AGENTIC_SERVE_TLS_*`, `python -m orchestration.serve.mtls`, Reach enroll).
  Identity-by-header alone remains unsafe on a shared LAN without a trust
  boundary. See [AO Reach and mTLS]({{ '/reach-and-mtls/' | relative_url }}).
- Hardware profile evolution: from per-model *filtering* (`min_vram_gb` in
  `orchestration/hardware_profile.py`) toward planning a **concurrently resident
  model set** (multiple small models loaded simultaneously without VRAM thrash),
  with graceful degradation tiers.

### 3.8 Host metrics (Python port)

Port `agentic-orchestration-web/host-metrics.mjs` sample + push into the daemon:

- `host_metrics_subscribe` → ~2s push (`AGENTIC_WEB_HOST_METRICS_PUSH_MS` or daemon equiv)
- Optional REST `GET /api/host-metrics` for parity

Suggested location: `orchestration/host_metrics.py`.

### 3.9 Latency budgets as CI

For the direct-agent path (speech-agnostic): request→first-token and
request→complete on reference hardware profiles. A latency regression is a
**failing test**, not a note. Follow existing harness CI culture
(`.github/workflows/ci.yml`, `orchestration/agent_harness.py`).

---

## 4. Explicitly out of scope for agentic-orchestration

Perception (audio capture, STT, diarization, threading), meeting-mode dispatch
logic and UX, website/DB ingestion pipelines (crawler, ETL) as product features,
desktop shell (Tauri), packaging/installers, consent UX, and any presales vertical
content. These live in the downstream product.

Also permanently out of scope: identity management of any kind.

Downstream injects agents/tools via existing overlay envs (no fork required):

| Env | Purpose |
|-----|---------|
| `AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS` | Extra agent YAML trees |
| `AGENTIC_EXTRA_MCP_PROVIDERS_PATH` | Extra MCP catalog |
| `AGENTIC_EXTRA_AGENT_SKILLS_PATH` | Extra skills |
| `AGENTIC_EXTRA_RAG_SOURCES_PATH` | Extra RAG sources |
| `AGENTIC_EXTRA_AGENT_HARNESS_DIRS` | User harness packs |
| `AGENTIC_ORCHESTRATOR_CONTEXT_FILE` | Orchestrator context overlay |

Pattern reference: `examples/verticals/` (healthcare, logistics) — demos only;
Clients keep overlays in their own repos.

---

## 5. Ordered backlog (implement in AO)

Sizes are rough. Each step is additive and non-breaking: CLI + Node web keep
passing existing tests. Prefer config flags for new surfaces.

| # | Item | Status | Primary paths |
|---|------|--------|---------------|
| 1 | Daemon skeleton + WS protocol port (`python -m orchestration.serve`) | **Shipped** | `orchestration/serve/` (package `__main__`), `requirements-serve.txt` |
| 2 | Python identity middleware + `AGENTIC_REQUIRE_IDENTITY` | **Shipped** | `orchestration/user_context.py`, `tests/test_user_context.py` |
| 3 | Serve existing planner/dynamic path over WS (warm in-process) | **Shipped** | `orchestration/dynamic_run.py` → `dynamic_planner` / `execution_dispatch` |
| 4 | Direct-agent fast path | **Shipped** | `orchestration/direct_agent.py`, `POST /api/v1/direct-agent`, WS `direct_agent` |
| 5 | Latency budget CI (TTFT / complete) | **Shipped** | `tests/test_direct_agent_latency.py` (`latency` marker) |
| 6 | Question tags + concurrent in-flight runs | **Shipped** | `orchestration/serve/ws.py` |
| 7 | Host metrics Python port | **Shipped** | `orchestration/host_metrics.py`, `GET /api/host-metrics` |
| 8 | KB ingest API + two-tier scope + source metadata | **Shipped** | `knowledge_base.py` additive migration + `/api/v1/kb/*` |
| 9 | Fast-ingest path (index now, enrich later) | **Shipped** | `fast_ingest()`; `enqueue_enrich()` is a v1 no-op |
| 10 | Upsert-by-source + delete-by-scope | **Shipped** | `upsert_by_source()`, `delete_by_scope()`, `delete_by_source()` |
| 11 | User dimension on session / KB / learning / run_store | **Shipped** | opt-in namespaces, dual-read of legacy paths |
| 12 | Deal membership authorization | **Shipped** | `orchestration/deal_auth.py` + route checks |
| 13 | Concurrent-resident hardware planning | **Shipped** | `hardware_profile.plan_resident_models()` |
| 14 | Session overlay + MCP tunnel (Reach) | **Shipped** (v1.27+) | `session_overlay.py`, `mcp_tunnel.py` |
| 15 | Engine TLS / mTLS + enroll API | **Shipped** (v1.29.0) | `serve/mtls_*.py`, `/api/v1/mtls/*` |

**Deliberately deferred to a later slice** (not blockers for the slices above):

- Enrichment queue behind `fast_ingest()` — the hook exists (`enqueue_enrich()`), the worker does not.
- Token-level streaming. `chunk` frames currently carry progress lines and then the finished answer;
  the frame shape will not change when true token streaming lands.
- Structured-facts ownership (KB facts table vs. `memory_knowledge_graph` MCP) — still one decision to make.
- KB retention policies and encryption at rest.
- Attachment/file-ingest WS events (`chat` accepts text today; the Node server still owns uploads).

**Recommended ship slices for Reach client unblocking:**

1. **Slice A (desktop sidecar works):** items 1–3  
2. **Slice B (meeting fan-out works):** items 4–7  
3. **Slice C (prep + company/deal KB product):** items 8–12  
4. **Slice D (VRAM multi-model polish):** item 13  

Update AO `CHANGELOG.md` `[Unreleased]` per feature. Releases follow existing
`RELEASING.md` / `releases.mdc` rules.

---

## 6. Acceptance criteria (engine)

| Criterion | Met by |
|-----------|--------|
| Local bind default `127.0.0.1`; network bind is opt-in | `AGENTIC_SERVE_HOST` defaults to loopback; a non-loopback bind prints a trust-boundary warning |
| `AGENTIC_REQUIRE_IDENTITY=1` rejects missing identity with a clear error, no silent fallback | HTTP `401` / WS close `1008`; `tests/test_serve_app.py`, `tests/test_user_context.py` |
| Warm start: a request must not reload catalogs | catalogs load in the lifespan startup and are reported by `/health` |
| Concurrent direct-agent calls stream with question tags; client can demux | `question_id` echoed on `chunk` / `run_end`; untagged keeps the busy lock |
| KB: deal facts override global docs; upsert-by-source re-sync; delete-by-scope leaves no residual rows | `tests/test_knowledge_base_scopes.py` |
| CLI `main.py` and Node web UI tests still pass | 650 pytest passed / 3 skipped; 37 Node tests passed |
| Latency budgets for the fast path are enforced as a test | `tests/test_direct_agent_latency.py` with `AGENTIC_LATENCY_CI=1` |

Fast-ingest timing is covered functionally (index-now behavior) rather than as a wall-clock
assertion; the wall-clock budget belongs with the latency job on a reference profile.

## 7. Verification

```bash
cd agentic-orchestration-tool
.venv/bin/python -m pytest -q                              # full suite
./scripts/smoke_serve.sh                                   # offline daemon smoke
AGENTIC_SMOKE_SERVE_LIVE=1 ./scripts/smoke_serve.sh        # real uvicorn bind + /health
AGENTIC_LATENCY_CI=1 .venv/bin/python -m pytest tests/test_direct_agent_latency.py -m latency
cd ../agentic-orchestration-web && node --test test/*.test.mjs
```

The daemon smoke is green on a CLI-only install: identity, KB, host-metrics, direct-agent, and
resident-planning checks always run, and the FastAPI-dependent checks skip with the install hint.
