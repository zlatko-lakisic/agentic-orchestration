# Changelog

All notable changes to **agentic-orchestration** are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (`VERSION` at repo root).

## [Unreleased]

### Fixed

- **Jetson web hotfix mounts `admin-k8s.mjs`** — expandable Kubernetes Topology imports this module; without the ConfigMap + volume mount the coordinator CrashLoopBackOff'd after hotfix.
- **Topology Reach / Application bands** — when the engine is up, Reach components (SessionBridge, OverlayPacker, …) always appear; Application shows a waiting placeholder until a Reach client registers a session overlay (mTLS enroll alone is not enough).

### Changed

- **Topology “Owned by app”** — badge only on Application injection children (Client UI, Domain overlays, Local tools). Shared Reach / AO core (session bridge, mTLS enroller, planner, catalogs, speech endpoints, …) no longer claim app ownership; catalogs still list live `client.*` overlays by `appId`.
- **Topology live probes** — Ollama, speech STT/TTS, catalogs, planner, execution, storage/GPU, and engine endpoints are instrumented (Remote LLMs intentionally stay `unknown` — no paid-API health pings). Declared in `capabilities.nodeProbes`. Speech probes prefer `AGENTIC_SPEECH_ADVERTISE_*` (and in-cluster `host.k3s.internal`) over pod-local `127.0.0.1`.
- **Expandable Topology panels** — Application and Kubernetes accordion headers use the wider panel width; Kubernetes expands with a group frame (same pattern as app folders). Wiki anchors: `#expandable-panels`, `#app-accordion`, `#platform-expand`, plus per-workload `#k8s-*`.
- **Topology band labels** — band 2 uses the AO mark + “Reach” (no text “AO”); band 3 shows the AO mark left of “Agentic Orchestration”.
- **Topology Live stamp** — locale-friendly medium date + short time instead of raw ISO.

### Added

- **Admin API access tokens** — mint/revoke Bearer tokens on Access (`GET/POST/DELETE /api/v1/admin/tokens`) with hashed store under `__orchestrator_api_tokens__/` (hostPath `var/agentic-api-tokens` on edge). Orchestrate / chat / responses accept minted tokens or the env shared-secret fallback; usage ledger records appId, IP, path, status, latency.
- **mTLS per-client revoke** — deny one enrolled Reach client by cert serial or CN (`revoked.json`) without rotating the CA. Enforced on engine HTTP + WebSocket; Admin Access → mTLS clients; CLI `revoke-client` / `unrevoke-client`.
- **Admin mTLS enroll-token mint** — Access → mTLS clients → **Mint enroll token** (one-time Reach clients cert enroll; not an `ao_…` API token).
- **Topology Application band by appId** — each connected Reach client (stable client `appId`s) is a group with instance count plus Client UI / Domain overlays / Local tools. **Owned by app** on those injection children only; catalogs list live Reach overlay ids by `appId`.
- **Topology Application accordion panels** — apps start as minimized panels left-to-right; expand one to reveal its components while other apps grey out and stay collapsed.
- **Topology catalog app members** — Agents / MCP servers / Skills (and MCP sidecars) modals list live Reach overlay ids grouped by `appId` (which `client.*` agents/MCPs/skills each connected app registered).

## [2.0.0] - 2026-08-08

### Breaking

- **Reach `appId` required** — `session_overlay_register` must include `appId` / `app_id` (stable client id such as `myapp` or `field-client`). Missing or invalid values receive `session_overlay_denied` (`app_id_required` / `app_id_invalid`). Active session snapshots expose `appId`. Requires AO Reach ≥ 0.5.0.

### Added

- **Host CPU/GPU temperature (°C)** — `cpu.tempC` / `gpu.tempC` in host metrics (nvidia-smi, Jetson jtop/tegrastats, AMD hwmon, thermal zones). Admin Overview charts plot Temp on a right-hand Celsius axis beside utilization %.
- **Thermal operating-range library** — curated CSV at `assets/thermal-operating-ranges.csv` (raw GitHub URL) matching CPU/GPU names to min/max °C for chart axes; Overview Temp Y-axis stays stable (no 0–4 °C collapse) with continuous series (no gaps).
- **AO brand mark** — letter-A / orchestration-arrow lockup under `assets/brand/` (SVGs, favicons, BRAND.md). Wired into Admin, chat UI, GitHub Pages docs/landing, READMEs, and wiki.

### Fixed

- **Web UI Chrome slowdown on long-lived tabs** — pause host-metrics subscribe/paint while the tab is hidden; throttle chart redraws; shrink metrics history; cap crew-log text/SVG and in-memory chat transcript/DOM growth.
- **Per-platform GPU host metrics** — shared `var/agentic-metrics/` for Jetson (`jtop-metrics.json`), discrete CUDA (`nvidia-metrics.json`), and AMD (`amd-metrics.json`). Deploy auto-selects the writer via `install-host-gpu-metrics.sh`. Restores Ada/CUDA GPU util after the Jetson path remount.
- **Jetson GPU metrics** — writer falls back to `tegrastats` when jtop group/socket is unavailable; metrics JSON lives under `var/agentic-metrics` (user-writable) and is mounted into coordinator/engine instead of empty `/var/run/agentic`.
- **Admin topology engine probe** — check in-cluster `agentic-engine` / `host.k3s.internal` (not coordinator loopback); TLS health probes allow the cluster self-signed cert.
- **Admin toolbar notifications** — replaced Fuse demo notices with live topology attention items.
- **Admin effective values** — unset keys show code defaults instead of bare `UNSET`; TLS path keys are not masked as secrets; Kubernetes injected `*_SERVICE_*` / `*_PORT_*_TCP*` vars filtered from All settings by default.

### Changed

- **AO Admin Fuse-only UI** — Fuse theme defaults (`#1565C0`, system scheme), Orders status pills, Material cards/tables/settings shells only; removed custom AO tokens/colors and non-Fuse chrome.
- **Admin Overview** — attention-first triage, collapsed live logs, named healthy components, support-bundle export.

## [1.30.1] - 2026-08-08

### Fixed

- **Coordinator crash on `/api/session`** — `generateWebSessionId` now uses `node:crypto` so Node 18 images no longer throw `ReferenceError: crypto is not defined` (CrashLoopBackOff).
- **Admin fonts** — Geist `@font-face` URLs point at `/admin/fonts/...` so they load under the Admin base href.

## [1.30.0] - 2026-08-07

### Added

- **AO Admin Phase 0** — Fuse Angular Control Plane at `/admin/` (read-only). Web Admin API: `/api/v1/admin/config/effective`, `/catalogs/*`, `/health/topology`, `/storage`. Secrets never returned. Chat header links to Admin; Jetson/NVR mounts built SPA via hostPath.

### Fixed

- **Server cert IP SANs** — `issue-server --san 10.0.10.16` encodes an **IP Address** SAN (not `DNS:10.0.10.16`) so Dart/Reach clients can dial the engine by IP.

## [1.29.0] - 2026-08-07

### Added

- **Engine mTLS + Reach enrollment** — optional TLS on `python -m orchestration.serve` via `AGENTIC_SERVE_TLS_CERTFILE` / `KEYFILE` / `CA_FILE`. When a client CA is set, protected routes and `/ws` require a verified client certificate (enroll/CA/health stay server-TLS-only). Embedded CA + CLI: `python -m orchestration.serve.mtls init-ca|issue-server|mint-token`. `POST /api/v1/mtls/enroll` (token + CSR) and `GET /api/v1/mtls/ca`. Verified peer cert CN/SAN becomes user identity (wins over headers).

## [1.28.1] - 2026-08-04

### Fixed

- **`direct_agent` empty replies** — attaches agent-entry `skills` (and defaults `mcp_providers` when the caller omits `mcpProviderIds`), strips Reach-baked backstory skill text before catalog re-inject, recovers MCP tool-call leaks like `execute_step`, and raises `DirectAgentEmptyAnswerError` so WebSocket `run_end` / REST `ok: false` instead of silent success with no stdout.
- **Unusable CrewAI tool-stall prose** — answers that ask the user to “share the tool result” are treated as unusable and enter MCP recovery (same path as tool-call leaks).
- **K8s session-overlay MCPs** — `apply_kubernetes_mcp_catalog_policy` keeps all `client.*` catalog entries (HTTP and tunnel), not only `tunnel://session-mcp/` URLs.

### Added

- **`voice` agent harness profile** — `config/agent_harnesses/voice.yaml` for Reach clients agents with `harness_profile: voice`.

## [1.28.0] - 2026-08-03

### Added

- **Speech sidecars + hello advertisement** — optional OpenAI-compatible STT/TTS processes under `agentic-orchestration-tool/speech/` (faster-whisper + sherpa Piper). When `AGENTIC_SPEECH_ENABLED=1`, engine WebSocket `hello` includes a `speech` block with client-facing base URLs for AO Reach `SpeechClient`. Default off; existing overlays/tunnels unchanged.

## [1.27.4] - 2026-07-31

### Fixed

- **GPU monitor on k8s NVIDIA hosts** — engine pods without `/dev/nvidia*` now read live util + VRAM from a host `nvidia-smi` writer (`agentic-nvidia-metrics.service` → `/var/run/agentic/nvidia-metrics.json`, env `AGENTIC_NVIDIA_HOST_METRICS_PATH`). Client system monitors can show GPU % and used/total VRAM instead of assume-only totals.
- **Session-tunnel MCPs under k8s catalog policy** — `apply_kubernetes_mcp_catalog_policy` no longer strips `client.*` entries whose `streamable_http.url` starts with `tunnel://session-mcp/`, so `direct_agent` `mcpProviderIds` resolve after `session_overlay_ack`. Stock stdio allowlists unchanged; non-tunnel `client.*` HTTPS entries still require `AGENTIC_K8S_EXTRA_HTTP_MCPS`.

## [1.27.3] - 2026-07-30

### Fixed

- **REST direct-agent sees session overlays** — `POST /api/v1/direct-agent` binds overlay catalog context from identity headers so `client.*` agents registered over WS resolve on REST too.
- **Per-host env template** — `jetson-apply-env.sh` prefers `config/env.host` (gitignored) over `env.jetson` so non-Jetson k8s hosts are not forced onto Jetson catalogs.

## [1.27.2] - 2026-07-30

### Fixed

- **Jetson Ollama k8s fix on fresh hosts** — `jetson-fix-ollama-k8s.sh` no longer fails when `agentic-orchestration` namespace is not created yet.



## [1.27.1] - 2026-07-30

### Added

- **Session-overlay Ollama ensure** — on `session_overlay_register`, AO resolves each `client.*` ollama agent's API base from `OLLAMA_API_BASE` / `OLLAMA_HOST` when `ollama_host` is omitted or `workflow`, checks `/api/tags`, and HTTP-pulls missing models (no install/spawn in the engine pod). Bypasses the k8s `selfcontained` gate that previously skipped pulls. Also runs on first use for `client.*` agents. Disable with `AGENTIC_SERVE_SESSION_OVERLAY_ENSURE_OLLAMA=0`.

## [1.27.0] - 2026-07-30

### Added

- **Session overlay + MCP tunnel (opt-in)** — WebSocket clients can register ephemeral `client.*` agent/MCP/skill dicts (`session_overlay_register` / `clear`) when `AGENTIC_SERVE_SESSION_OVERLAY=1`. Session MCP entries use `tunnel://session-mcp/<alias>`; with `AGENTIC_SERVE_MCP_TUNNEL=1` the daemon proxies HTTP via `mcp_tunnel_request` / `mcp_tunnel_response` on the owning socket (loopback only — never dials the client LAN; stdio rejected in overlays). Evict on disconnect, clear, and TTL. Optional `mcpProviderIds` on REST + WS `direct_agent` forwards to `run_direct_agent`. Flags default off; Node `server.mjs` unchanged.

## [1.26.1] - 2026-07-30

### Fixed

- **Catalog VRAM filtering uses AMD/Intel too** — `filter_catalog_by_vram` only consulted `nvidia-smi`, so on a Mac with a Radeon (or Linux amdgpu) AO treated VRAM as unknown and kept oversized Ollama providers. It now uses `detect_vram_gb_available()` (NVIDIA → macOS AMD/Intel → Linux amdgpu → assume/env). Engine `/health` exposes a `hardware` snapshot (`architectures`, `vramGbAvailable`, `gpu.name` / vendor / VRAM) so AO and clients can see what the host actually is.

## [1.26.0] - 2026-07-30

### Added

- **AMD / Intel GPU metrics (alongside NVIDIA)** — `host_metrics.sample_gpu()` now also samples macOS AMD/Intel via `system_profiler` + IORegistry (`IOAccelerator`), Linux AMD via amdgpu sysfs (`mem_info_vram_*`, `gpu_busy_percent`), and a Linux Intel i915 identity stub. Prefers dedicated `VRAM (Total)` over dynamic Intel pools; never treats GART aperture as board VRAM. nvidia-smi stays first. Resident VRAM planning / architecture detection also see non-NVIDIA GPUs. Apple Silicon may report util only; unified-memory VRAM stays null/`assume`.

## [1.25.1] - 2026-07-30

### Fixed

- **macOS host metrics (Intel + Apple Silicon)** — Darwin no longer returns permanent `cpu.percent: null` or `memory.usedPercent: 100` with `availableBytes: 0`. CPU uses Mach `host_statistics` / `HOST_CPU_LOAD_INFO` (same idle/total delta as Linux/Windows; arch-agnostic, including Rosetta). Memory uses `sysctl hw.memsize` + `vm_stat` (page size from the header — 4096 or 16384). Apple Silicon `gpu.*` stays null/`assume` (no fake VRAM from unified memory). Linux `/proc`, Windows ctypes, and Jetson jtop paths unchanged.
- **Linux meminfo without MemAvailable** — when `MemTotal` is present but `MemAvailable` is missing, `usedPercent` is `null` instead of lying at 100% (same “don’t invent” policy as Darwin).

## [1.25.0] - 2026-07-30

### Added

- **Direct-agent JSON mode** — optional `responseFormat: { type: "json_object" }` and `jsonSchema` on `POST /api/v1/direct-agent` (and WS). Ollama uses `/api/chat` `format`; other providers use LiteLLM `response_format`. Success `text` is strict `json.loads` (no fence stripping); parse/schema failures return HTTP 200 with `ok: false` so clients can fall back. Documented that `AGENTIC_OLLAMA_KEEPALIVE_MODELS` may include the meeting-router model tag (same tag as meeting agents → VRAM once).

## [1.24.5] - 2026-07-30

### Fixed

- **Windows Ollama teardown verification** — stop path only force-kills the AO-registered spawn PID if it is still listening (never massacres foreign listeners on `:11434`). `register_serve` records the listen port for that check.

### Added

- **Ollama shutdown e2e** (`tests/test_ollama_serve_shutdown_e2e.py`, opt-in `AGENTIC_OLLAMA_SHUTDOWN_E2E=1`) — start AO-owned `ollama serve` on a dedicated port → query → `taskkill /T /F` the AO process → assert the dedicated Ollama is dead (Job Object path). Optional `AGENTIC_OLLAMA_SHUTDOWN_E2E_SERVE=1` covers start → query → force-stop.

## [1.24.4] - 2026-07-30

### Fixed

- **Windows: AO-started Ollama actually dies with AO** — `ollama serve` is no longer started with a detached session that orphans runners under `taskkill /F` of the sidecar. Children go in a Job Object with `KILL_ON_JOB_CLOSE` (ctypes, no pywin32); stop paths also `taskkill /T /F` the recorded PID. Console Ctrl handler + existing atexit/lifespan/SIGTERM still call `stop_all_serves`.

## [1.24.3] - 2026-07-30

### Added

- **Meeting-style concurrent residency** — `plan_resident_models(..., required_ids=)` packs a required provider set first and returns `fit: false` + `reason` when VRAM cannot hold it. Providers that share the same Ollama model tag only charge VRAM once (SE+BizDev on one 3b). Keepalive accepts `AGENTIC_OLLAMA_KEEPALIVE_MODELS` (comma-separated); engine lifespan starts/stops the loop; `/health` exposes `resident.keepaliveModels` / `keepaliveOk` / `vramGbAvailable` / `ollamaNumParallel`.
- **`OLLAMA_NUM_PARALLEL` when AO starts Ollama** — embedded `ollama serve` gets `AGENTIC_OLLAMA_NUM_PARALLEL` or `OLLAMA_NUM_PARALLEL` or default `2` so tagged parallel `direct_agent` runs are not serialized to one slot. Documented in `.env.example`.

### Fixed

- **AO-spawned Ollama shuts down with AO** — `ollama serve` processes started by this process are tracked in `orchestration.ollama_serve_lifecycle` and terminated on exit via `atexit`, Unix `SIGTERM` chaining, and the engine FastAPI lifespan shutdown. Pre-existing user/systemd Ollama is never touched (only PIDs we `Popen`'d are registered).

## [1.24.2] - 2026-07-30

### Fixed

- **Windows host metrics CPU/RAM** — `sample_cpu_percent()` uses `GetSystemTimes` instead of process-relative `os.times()` (which stuck at ~100%). `sample_memory()` uses `GlobalMemoryStatusEx` so `totalBytes` / `usedPercent` are real; unknown totals report `usedPercent: null` rather than fake `0.0`. `scope: "host"` only when a mounted proc root is actually readable (Windows default is `runtime`).

### Added

- **Portable GPU util + VRAM used/free** — top-level `gpu` now includes `percent`, `vramUsedGb`, `vramFreeGb`, and `name` from `nvidia-smi` (largest GPU), alongside existing `vramTotalGb` / `vramSource`. Jetson `jetson.gpu` unchanged. `AGENTIC_ASSUME_VRAM_GB` still overrides total (util/used may remain from smi or null).

## [1.24.1] - 2026-07-29

### Added

- **Direct-agent progress for daemon clients** — `run_direct_agent(on_progress=…)` emits ensure / start / generating lines; `build_workflow(on_progress=…)` forwards Ollama ensure messages; Ollama pull lines also fan out through `orchestration.progress_sink`. WebSocket `direct_agent` streams them as `chunk` frames with `stream: "stderr"` and `question_id` (same demux as dynamic `chat`), so clients can distinguish model download from generation. REST `POST /api/v1/direct-agent` remains final-answer JSON (no SSE in this slice).

## [1.24.0] - 2026-07-29

### Added

- **Host metrics portable GPU VRAM** — `sample_host_metrics()` / `GET /api/host-metrics` now include a top-level `gpu` block `{vramTotalGb, vramSource}` from `detect_max_nvidia_vram_gb()` (`nvidia-smi`, or `assume` when `AGENTIC_ASSUME_VRAM_GB` is set). Missing GPU → both fields `null`. Distinct from Jetson `jetson.gpu` (jtop utilization). Enables clients (e.g. client researcher tier pick) to size models without calling the dynamic planner's hardware filter.

- **Jetson Engine API daemon publish** — additive `agentic-engine` Deployment (`deploy/k8s/engine/`) runs `python -m orchestration.serve` beside the Node web UI. hostPort **8765** (Reach client Remote URL `http://<jetson>:8765`) plus NodePort **30765**; web UI stays on **30487**. `scripts/jetson-enable-engine.sh` (called from `jetson-deploy.sh` unless `AGENTIC_JETSON_ENABLE_ENGINE=0`) reuses the coordinator image, hostPath-mounts the git tool tree, and installs `requirements-serve.txt` on first start. Do not point Reach clients at `:30487` — `/api/v1/direct-agent` and `/api/v1/kb/*` exist only on the engine.

### Fixed

- **KB FTS5 search no longer 500s on commas / punctuation** — `sanitize_fts5_query()` strips FTS5 syntax characters (`,`, quotes, `:`, etc.) and boolean keywords before `MATCH`. `search()` and RAG sqlite-fts retrieve share the helper; residual `OperationalError` returns empty hits instead of an unhandled FastAPI Internal Server Error (client "Non-JSON response from AO").

## [1.23.0] - 2026-07-29

### Added

Engine API daemon (Reach client enablement), shipped as slices A–D. Everything here is **additive and
opt-in**: `python main.py` and `agentic-orchestration-web/server.mjs` are untouched defaults, FastAPI
and uvicorn live only in the new `requirements-serve.txt`, and every new on-disk layout dual-reads
the legacy one. See [Engine API daemon plan](docs/engine-daemon-plan/index.md).

**Slice A — daemon skeleton, identity, warm dynamic path**

- **`python -m orchestration.serve` — optional FastAPI + WebSocket daemon** (`orchestration/serve/`: `__main__.py`, `app.py`, `ws.py`). Warm and long-lived: the agent-provider catalog loads once at startup and is reported by `GET /health` (`{ok, version, catalogs}`), so a chat turn no longer pays for Python imports and catalog parsing. REST parity with the Node server (`GET /api/ping`, `GET /api/session`) plus `GET /api/host-metrics`. Binds `127.0.0.1:8765` by default (`AGENTIC_SERVE_HOST` / `AGENTIC_SERVE_PORT`); network binding is an explicit opt-in and prints a trust-boundary warning. `python -m orchestration.serve --check` verifies the extras and exits. Importing `orchestration.serve` is dependency-free — FastAPI is imported only when the app is actually built, and a missing extra raises an `ImportError` naming `requirements-serve.txt` instead of a bare module error.
- **WebSocket protocol port** (`ws://…/ws`) — client `ping`, `client_hello`, `host_metrics_subscribe`, `host_metrics_unsubscribe`, `chat`, `direct_agent`, `rate`; server `hello`, `pong`, `host_metrics`, `preflight`, `run_start`, `chunk`, `run_end`, `error`, `rated`. Message shapes follow `server.mjs` so existing frontends can migrate at no cost.
- **`orchestration/user_context.py` — identity from proxy-forwarded headers**, a port of `agentic-orchestration-web/lib/user-context.mjs` with the same sanitization rules (120-char display names, 128-char `[A-Za-z0-9._-]` session ids, control-char rejection) and the same `web-<12 hex>` fallback session id. `resolve_identity(headers)` returns a frozen `Identity` (`user_name`, `session_id`, `user_id`, `local`); with no headers it is the implicit local user (`user_id="local"`), and `AGENTIC_REQUIRE_IDENTITY=1` raises `IdentityRequiredError` instead — HTTP `401`, WebSocket close `1008` — so a misconfigured server deployment fails loudly rather than merging users. Header names stay configurable through the existing `AGENTIC_WEB_USER_NAME_HEADER` / `AGENTIC_WEB_SESSION_ID_HEADER`. `tests/test_user_context.py` mirrors the Node test module.
- **`orchestration/dynamic_run.py` — the dynamic path in-process.** `run_dynamic_goal()` runs plan → execute → persist through the existing `build_dynamic_workflow_config` and `execute_workflow_config_resolved`, without argparse, interactive prompts, or artifact saving, and streams planner/executor progress to the caller through an `on_progress` callback. `warm_catalogs()` backs the health payload.
- **Per-connection busy lock** for untagged `chat` (Node parity) and `requirements-serve.txt` (`fastapi`, `uvicorn[standard]`, `websockets`).

**Slice B — direct-agent fast path, concurrency, host metrics**

- **`orchestration/direct_agent.py` — "ask agent X, with this context, now."** `run_direct_agent()` bypasses the planner → JSON plan → sequential crew cycle entirely: the caller names the catalog agent and supplies pre-retrieved context, and a one-task `WorkflowConfig` is kicked off through the existing `build_workflow` (the same primitive a society turn uses — no second agent runtime). Reachable as `POST /api/v1/direct-agent` and as a WebSocket `direct_agent` message. The full dynamic planner remains the default for deep multi-step goals.
- **Question-tagged concurrent streaming** — a `question_id` on `chat` / `direct_agent` opts into concurrent runs and is echoed on every `chunk` / `run_end` so clients can demux interleaved answers. Untagged messages keep the one-run-per-connection lock, so nothing about the existing behavior changes. Bounded by `AGENTIC_SERVE_MAX_CONCURRENT_RUNS` (default `8`).
- **`orchestration/host_metrics.py`** — Python port of `agentic-orchestration-web/host-metrics.mjs` with identical payload keys: `/proc` sampling when available (`AGENTIC_HOST_METRICS_PROC_ROOT=/host/proc` for a mounted node `/proc`), memory, load average, and the optional Jetson jtop overlay (`AGENTIC_JETSON_JTOP_METRICS_PATH` → GPU percent/frequency, temperatures, power, `scope: "jetson"`). Served by `GET /api/host-metrics` and pushed every `AGENTIC_WEB_HOST_METRICS_PUSH_MS` (default `2000`) after `host_metrics_subscribe`.
- **Latency budgets as a test** (`tests/test_direct_agent_latency.py`, marker `latency`) — request→first-token and request→complete for the direct path, excluded from the default pytest run and skipped unless `AGENTIC_LATENCY_CI=1`. Budgets come from `AGENTIC_LATENCY_TTFT_MS` / `AGENTIC_LATENCY_COMPLETE_MS`, defaulting tight against a stubbed agent (measuring the fast path's own overhead) and generous under `AGENTIC_LATENCY_LIVE=1` on unknown hardware.

**Slice C — knowledge base as master of record, user dimension, deal scope**

- **Additive KB schema with an in-place migration** (`orchestration/knowledge_base.py`) — `ensure_schema()` now `ALTER`s `user_id`, `deal_id`, `scope`, `source_id`, `vintage`, and `content_hash` onto an existing `docs` table and backfills legacy rows to `scope='global'`, so a v1 `kb.sqlite3` keeps working untouched. FTS5 gains the delete/update triggers the append-only v1 schema did not need.
- **Two-tier scoping with deal precedence** — `search()` takes optional `scope` / `deal_id` / `user_id`; with none of them the behavior is exactly today's (all documents, bm25 order). Given a `deal_id`, deal hits are returned first and global-tier hits fill the remainder, so deal facts override company-tier documents on conflict; `scope="deal"` excludes the global tier. A `user_id` filter still shows unattributed (shared) rows.
- **Ingestion APIs** — `upsert_by_source()` for incremental re-sync (`inserted` / `updated` / `unchanged` by `content_hash`, replacing the row in place so stale text leaves the FTS index), `delete_by_scope(deal_id=…)` for deal lifecycle, `delete_by_source()` for source prune, and `fast_ingest()` for sub-second ad-hoc drops (index now, enrich later — `enqueue_enrich()` is a deliberate v1 no-op). `add_document()` gained the same optional kwargs and its default call is byte-for-byte the legacy insert.
- **Daemon KB routes** — `POST /api/v1/kb/ingest`, `POST /api/v1/kb/upsert`, `DELETE /api/v1/kb/scope/{deal_id}`, `GET /api/v1/kb/search?q=`.
- **User dimension across existing state, all opt-in and dual-read** — `session_file_path(tool_root, slug, user_id=…)` uses `__orchestrator_sessions__/users/<user_id>/<slug>.json` under `AGENTIC_SESSION_USER_NAMESPACE=1`, an existing legacy `<slug>.json` still wins, and `load_session()` falls back to the legacy file when the namespaced one was never written. `append_trace_event()` / `enqueue_user_rating()` accept an optional `user_id` and omit the field entirely when it is absent. `allocate_run_store_root()` accepts `user_id` and prefixes shared roots with `users/<user_id>/` under `AGENTIC_RUN_STORE_USER_NAMESPACE=1`.
- **`orchestration/deal_auth.py` — deal membership, the only authorization the engine owns.** A JSON store at `__orchestrator_deals__/members.json` maps deal → members → role (`viewer` < `editor` < `owner`); `check_deal_access()` gates the deal-scoped KB routes. Local mode is trivially permissive, requests without a deal id are never gated, and in server mode (`AGENTIC_REQUIRE_IDENTITY=1`, or `AGENTIC_DEAL_AUTH=1` on its own) an empty membership file denies everything — the safe default for a fresh deployment. Deals are keyed by user identity plus deal id, never by proxy session.

**Slice D — concurrent resident model planning**

- **`plan_resident_models()`** (`orchestration/hardware_profile.py`) moves hardware awareness from per-model *filtering* toward planning a **concurrently resident** set: providers are packed smallest-requirement-first up to `AGENTIC_VRAM_GB` (or the detected GPU) minus `AGENTIC_RESIDENT_HEADROOM_GB`, capped at `AGENTIC_MAX_RESIDENT_MODELS`, and every rejection comes back with a reason and its requirement. Providers with no VRAM requirement are always resident. Graceful degradation is explicit: an unknown budget keeps one resident local model and a too-small budget returns an empty selection rather than raising. `detect_vram_gb_available()` prefers the explicit `AGENTIC_VRAM_GB` budget (unified-memory boards where `nvidia-smi` lies or is absent) and otherwise reuses `nvidia-smi` detection with the existing `AGENTIC_MAX_VRAM_*` caps.

**Tests and smoke**

- New pytest modules: `test_user_context.py`, `test_serve_app.py` (REST + identity gating + the full WS protocol, skipped without FastAPI), `test_direct_agent.py`, `test_direct_agent_latency.py`, `test_host_metrics.py`, `test_knowledge_base_scopes.py`, `test_session_user_namespace.py`, `test_deal_auth.py`, `test_hardware_resident_models.py`.
- `scripts/smoke_serve.sh` / `smoke_serve.py` — offline by default and green on a CLI-only install: identity, KB two-tier, host metrics, direct-agent, and resident-planning checks always run, while the FastAPI checks skip with the install hint. `AGENTIC_SMOKE_SERVE_LIVE=1` binds a real uvicorn port and probes `/health`.

## [1.22.0] - 2026-07-29

### Added

- **Impartial QA gate now covers societies and routed static workflows** — the unified gate is no longer wired only into the dynamic paths. A finished `--society` run scores the panel's `final_recommendation_text` against the society goal (`orchestration/society_runtime.py`), with reports written as `society-<session>-<timestamp>.json`; a routed static workflow (`python main.py "goal"`) scores its final text against `TASK`. Both reuse the new shared `finalize_impartial_qa()` / `impartial_qa_gate_failed()` helpers in `orchestration/impartial_qa.py`, which `main.py`'s `_emit_final_qa` now also calls, so all four entry points produce the same `=== Impartial QA (unified gate) ===` block and the same report JSON. A society that produced no text is left alone, and the static path does **not** inherit the legacy standalone faithfulness block, so disabling the gate there restores the previous output exactly.

### Changed

- **Impartial QA gate is on by default, and advisory by default (`AGENTIC_IMPARTIAL_QA` `0` → `1`, `AGENTIC_IMPARTIAL_QA_FAIL` `1` → `0`)** — the gate now runs without being asked for, but it cannot break a run on its own: a failing report is printed and persisted while the exit code stays unchanged until you set `AGENTIC_IMPARTIAL_QA_FAIL=1` for a hard gate. `AGENTIC_IMPARTIAL_QA=0` disables it entirely. The two switches are independent so enabling reporting everywhere carries no rollout risk — in particular the Jetson deployment keeps its current exit codes.
- **Faithfulness now counts against the gate by default (`AGENTIC_IMPARTIAL_QA_FAITHFULNESS_FAIL` `0` → `1`)** — a `high` `hallucination_risk` from `faithfulness_qa_review` marks the report failed instead of being reported alongside a pass. `medium`, `low`, and `unknown` risk never fail, and `AGENTIC_IMPARTIAL_QA_FAITHFULNESS_FAIL=0` opts out. Combined with the advisory default this surfaces hallucination risk in the verdict without changing exit codes.
- **Gate soft-skips instead of claiming a pass when nothing could be checked** — if there are no assertions and no reviewer produced a result, the report is now marked `skipped` rather than `passed`. This is the edge profile in `config/env.jetson`, which turns the judge off (`AGENTIC_LEARNING_EVAL=0`) and faithfulness off (`AGENTIC_FINAL_QA=0`) for latency: the gate reports one skip line and never fails the run. A judge that errors or returns no score is still recorded in the report without failing it.

## [1.21.0] - 2026-07-29

### Added

- **Agent societies — K6.2 (message bus and turn protocols)** — panel members now talk over a threaded message bus instead of having the whole blackboard pasted into every prompt. Messages live under `__orchestrator_sessions__/societies/<slug>/messages/` (`{msg_id}.json` plus an `_index.jsonl` order file and `_cursors.json` read cursors) with `from_agent`, `to_agent` (an `agent_provider_id` or `broadcast`), `thread_id`, `content`, `refs[]`, and `ts` (`orchestration/society_messages.py`: `post_message`, `read_thread`, `list_messages`, `unread_for`, `mark_seen`). Three CrewAI tools are attached to every member turn (`orchestration/society_message_tools.py`): `society_post`, `society_read_thread`, `society_list_agents` — on by default, `AGENTIC_SOCIETY_MESSAGE_TOOLS=0` restores the K6.1 blackboard-excerpt behavior. Each turn description now carries a digest of the last N posts (`AGENTIC_SOCIETY_MESSAGE_SUMMARY_N`, default 8; `AGENTIC_SOCIETY_MESSAGE_SUMMARY_CHARS`, `AGENTIC_SOCIETY_MESSAGE_CHARS`) plus the mail addressed to that member, so prompt size no longer grows linearly with turn count; `blackboard.md` and `transcript.jsonl` stay as the audit trail and the controller's input, and every turn's output is broadcast to thread `main` automatically so the bus stays populated even when a model never calls the tools. New turn-protocol engine (`orchestration/society_protocols.py`) extends the charter `protocol` enum with `moderator_picks` (the facilitator hands the floor to the member it names, parsed from its last post) and `reactive` (whoever has unread directed mail speaks next, then unread broadcasts, oldest-silent first), keeping `round_robin` as the default and `hierarchical` as its alias; no protocol can hand the same member two consecutive turns. Both new protocols implement the phase exit criterion: once a member posts `ready_for_draft`, the seated `writer` (or `domain_expert`) takes the next turn. Charters may list the new tools and protocols (`config/schemas/society_charter.schema.json`, both research-panel example charters). Smoke: `scripts/smoke_society_lite.sh` gains offline message-bus, protocol-selection, and tool-attach checks.

## [1.20.0] - 2026-07-29

### Added

- **Run store backends: S3/MinIO and Redis (`AGENTIC_RUN_STORE_BACKEND`, default `filesystem`)** — the last deferred item from the Kubernetes execution upgrade run-store design. `orchestration/run_store_backends.py` adds `S3RunStore` (keys `{prefix}/{run_id}/{step_id}/result.json`; `AGENTIC_RUN_STORE_S3_BUCKET`, `AGENTIC_RUN_STORE_S3_PREFIX` default `agentic-runs`, `AGENTIC_RUN_STORE_S3_ENDPOINT` for MinIO / Ceph RGW, credentials from `AGENTIC_RUN_STORE_S3_*` or the standard `AWS_*` vars) and `RedisRunStore` (keys `{prefix}:run:{run_id}:step:{step_id}:result`; `AGENTIC_RUN_STORE_REDIS_URL`, `_PREFIX`, optional `_TTL_SECONDS`), selected through the new `run_store_from_env()` factory that `run_store_session()` now uses. Backends are **result** stores: step **specs** stay on the local/PVC workspace (`AGENTIC_RUN_STORE_PATH`) because subprocess workers and Kubernetes Jobs are handed a file path for `--execute-step`, so workers keep writing `result.json` on the shared volume and a worker-written result is promoted to the remote store on first read. `boto3` / `redis` are soft dependencies (`requirements-run-store.txt`) imported only when a remote backend is constructed — the default filesystem path is unchanged. `RunStore` gains `has_step_result()` and `local_root` so `StepCoordinator` and the runners no longer assume a filesystem path. Smoke: `scripts/smoke_run_store_backends.sh` (offline by default; `AGENTIC_SMOKE_RUN_STORE_S3_LIVE=1` / `AGENTIC_SMOKE_RUN_STORE_REDIS_LIVE=1` for live round-trips).

### Changed

- **Kubernetes execution upgrade docs** — S3/Redis run stores are no longer listed as deferred, and per-step Job retry (K3.4–3.5, `step_recovery.py` + `StepCoordinator` retry) is marked as shipped rather than "deferred post-MVP".

## [1.19.0] - 2026-07-29

### Added

- **Impartial QA gate v1 (`AGENTIC_IMPARTIAL_QA`, default off)** — first slice of a single pass/fail check over a *finished* deliverable, replacing the split between the learning-loop eval, harness assertions, and the faithfulness review. `orchestration/impartial_qa.py` scores the user goal plus the final output text by reusing what already exists: deterministic harness assertions (`agent_harness.run_assertions`), the LLM-as-judge score (`dynamic_planner.evaluate_run_quality`, with an optional rubric appended to the goal exactly like harness L3 capability scoring), and `faithfulness_qa_review` — which is reported but only fails the gate under `AGENTIC_IMPARTIAL_QA_FAITHFULNESS_FAIL=1` at high risk. Nothing is re-executed: no crews, no tools, no harness CLI change. When enabled, `--dynamic` and `--dynamic-iterative` finalization emit one `=== Impartial QA (unified gate) ===` block on stderr instead of the separate faithfulness block, persist the report to `__orchestrator_sessions__/impartial_qa/<slug>-<timestamp>.json`, and exit `1` on failure (`AGENTIC_IMPARTIAL_QA_FAIL=1`, after artifacts are saved). Configure with `AGENTIC_IMPARTIAL_QA_MIN_SCORE` (default `0.5`), `AGENTIC_IMPARTIAL_QA_EVAL=0` for assertions-only, `AGENTIC_IMPARTIAL_QA_RUBRIC` / `_RUBRIC_FILE`, `AGENTIC_IMPARTIAL_QA_ASSERTIONS_FILE`, and `AGENTIC_IMPARTIAL_QA_MODEL`. Smoke: `scripts/smoke_impartial_qa.sh` (offline by default; `AGENTIC_SMOKE_IMPARTIAL_LIVE=1` for a real judge pass).

## [1.18.0] - 2026-07-29

### Added

- **Agent societies — Phase 0 + K6.1 (society lite)** — multi-agent panels declared in YAML instead of re-planned every turn. A charter (`config/schemas/society_charter.schema.json`) names the roster (`agent_provider_id` + role), the turn protocol, hard budgets, and stop conditions; `python main.py --society CHARTER.yaml --goal "…"` runs it. Members take **round-robin** turns as single-agent crews (`orchestration/society_runtime.py`) with an append-only blackboard injected into each turn, and state persists under `__orchestrator_sessions__/societies/<slug>/` (`meta.json`, `blackboard.md`, `transcript.jsonl`; `orchestration/society_session.py`). The run stops on a charter `stop_when` phrase (e.g. `facilitator_posts: FINAL_RECOMMENDATION`), on the society controller (`orchestration/society_controller.py`, mirroring the iterative controller: `AGENTIC_SOCIETY_CONTROLLER_MODEL` → `AGENTIC_ITERATIVE_CONTROLLER_MODEL` → `AGENTIC_PLANNER_MODEL`), or on `max_turns` — whichever comes first. New in-process `delegate_task` tool (`orchestration/delegate_task_tool.py`) mirrors the `k8s_delegate_task` argument surface and runs the child inline, debited against `max_delegations` before it executes. Catalog entries opt in with `society_capable: true` (`allow_delegation` stays `false` except on the facilitator entry `ollama_hermes3`). Ships `docs/adr/0001-agent-societies-v1.md` (interaction-mode enum and v1 non-goals: no unbounded spend, no internet-facing societies without auth, no nested societies), the vertical example `examples/verticals/society_research_panel/` (local-Ollama panel plus a Jetson-sized variant, `--example society_research_panel`), a `process: hierarchical` reference workflow (`config/workflows/workflow_society_hierarchical_panel.yaml`), and smoke `scripts/smoke_society_lite.sh` (offline by default; `AGENTIC_SMOKE_SOCIETY_LIVE=1` for a real short run).

## [1.17.0] - 2026-07-29

### Added

- **Cloud anonymization Tier 3** — reversible token maps (`AGENTIC_ANONYMIZE_REVERSIBLE=1`, default) replace PII with unique, recoverable placeholders like `[EMAIL:1]` / `[PERSON:2]` instead of static `[EMAIL]`, backed by a session `TokenMap` (`orchestration/cloud_anonymize_tier3.py`; ContextVar + optional JSON under `__orchestrator_sessions__/anon_maps/<slug>.json`); `restore_tokens()` recovers originals. Optional Presidio NER pass (`AGENTIC_ANONYMIZE_NER=0` default) detects PERSON/LOCATION/NRP entities — soft dependency (`requirements-anonymize.txt`), never hard-fails when Presidio is missing. Tool-call output (fetched pages via `fetch_url_tool.py`, prior-step handoff via `step_context.py`) is now scrubbed before flowing into later steps (`AGENTIC_ANONYMIZE_TOOL_RESULTS=1`, default). Video-frame synopsis (`video_vision_synopsis.py`) prefers a local Ollama vision model (`AGENTIC_ANONYMIZE_VISION_LOCAL=1`, default; `AGENTIC_ANONYMIZE_VISION_MODEL=ollama/llava`) over cloud when anonymization is active, skipping the synopsis (rather than falling back to cloud) if the local model fails.

## [1.16.0] - 2026-07-29

### Added

- **Cloud anonymization (Tier 1+2)** — heuristic PII/secret scrubbing (`orchestration/cloud_anonymize.py`) before cloud planner/agent egress; attachment excerpts, session/KB persistence scrubbed when `AGENTIC_ANONYMIZE_CLOUD=1` (default). Privacy/offline/"use ollama" goals filter cloud catalog types (`AGENTIC_CLOUD_PROVIDER_TYPES`, default `openai,anthropic,huggingface`) and refuse a cloud planner model. Local providers skip redaction. Operators can add YAML regex scrubbers via `config/anonymize_patterns.yaml` / `AGENTIC_ANONYMIZE_PATTERNS_PATH` / `AGENTIC_EXTRA_ANONYMIZE_PATTERNS_PATH`. Heuristic only — not a HIPAA guarantee. Jetson smoke: `scripts/smoke_cloud_anonymize.sh`.

### Fixed

- **Jetson hotfix mounts** — include `cloud_anonymize.py` (and related session/KB modules) in coordinator/warm-pool ConfigMap mounts so orchestrate does not crash on import.
- **Dependabot** — bump docs `nokogiri` to 1.19.4 (Pages Ruby 3.3) and web `dompurify` to 3.4.12.

## [1.15.0] - 2026-07-22

### Added

- **RAG embedding + hybrid backends** — LiteLLM embeddings with a local SQLite vector index (`embedding`), and FTS+embedding reciprocal rank fusion (`hybrid`). Provider/index required at catalog load; embedding failures never silently fall back to FTS. Examples under `config/rag_sources/_examples/`.

## [1.14.0] - 2026-07-21

### Added

- **Bargo Congress Trades MCP** — opt-in Streamable HTTP catalog entry (`config/mcp_providers/bargo_congress.yaml`) gated on `BARGO_API_KEY` for read-only House/Senate STOCK Act trade disclosures.

### Fixed

- **OpenAI chat completions streaming** — orchestrated `POST /v1/chat/completions` accepts `stream: true`, opens SSE immediately (role chunk + keepalives), then emits the full answer as one content delta. Unblocks OpenClaw ≥ 2026.7, which always streams and aborts idle connections while waiting.
- **Jetson OpenClaw MCP bridge** — hostPath-mount OpenClaw-synced MCP YAML (`openclaw-mcp-providers`) and the OpenClaw workspace into coordinator/warm-pool; prepend `/openclaw/mcp-providers` on `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`; allow `openclaw_*` ids in `AGENTIC_K8S_WORKER_STDIO_MCPS` so `openclaw_filesystem` is not stripped by the k8s MCP allowlist.
- **MCP tool-call leak harness** — detect CrewAI/tool-stub Final Answers (`{"name","parameters"}`, `npx_y_…`) without treating legitimate deliverable JSON as a leak; on filesystem MCP steps, recover via deterministic workspace list (`mcp_tool_leak_recovery.py`). Also catches meta echoes like `(Don't use past results here.)` after max iterations, and uses a direct list path for Ollama + “list workspace” goals.
- **OpenClaw MCP API smoke** — `scripts/smoke_openclaw_mcp.sh` (+ `smoke_openclaw_mcp_api.py` / `smoke_openclaw_mcp_cases.json`) posts orchestrate prompts for synced `openclaw_filesystem` (list/read) on Jetson NodePort `30487`; supports `--until-pass` recursive runs.

## [1.13.1] - 2026-07-16

### Fixed

- **CodeQL** — crew log sequence diagram no longer assigns user-derived HTML via `innerHTML` (DOM APIs + `textContent`); fetch_url HTML stripping matches forgiving `</script …>` closing tags (`py/bad-tag-filter`).

## [1.13.0] - 2026-07-16

### Added

- **GHCR multi-arch images** — GitHub Actions publishes `linux/amd64` + `linux/arm64` coordinator/worker images to `ghcr.io/zlatko-lakisic/agentic-orchestrator-*` on `v*` tags; Jetson can pull with `AGENTIC_USE_GHCR=1` instead of on-device `docker build`.
- **Runtime auto-bootstrap** — `AGENTIC_AUTO_ENSURE_RUNTIME=1` (default) ensures Python `.venv` + requirements and, for Ollama agents, install/serve/pull models (not only `selfcontained: true`). Kubernetes Ollama ensure stays gated unless `AGENTIC_AUTO_ENSURE_OLLAMA_IN_K8S=1`.
- **OpenClaw HTTP bridge** — `POST /api/v1/orchestrate` on the web server (`AGENTIC_ORCHESTRATE_API_KEY` or `AGENTIC_CHAT_COMPLETIONS_API_KEY`) for the ClawHub plugin `@zlatko-lakisic/openclaw-agentic-orchestration`.

### Fixed

- **Jetson k3s secret sync** — `jetson-k3s-deploy.sh` env-file awk now dedupes keys correctly (duplicate `AGENTIC_K8S_DELEGATION_ENABLED` no longer breaks `kubectl create secret`).

## [1.12.0] - 2026-07-15

### Added

- **Xquik MCP provider** — opt-in Streamable HTTP catalog entry (`config/mcp_providers/xquik.yaml`) gated on `XQUIK_API_KEY` for X data search, extraction, monitoring, and posting workflows.
- **Media grounding harness** — deterministic ffprobe/ffmpeg facts (scene cuts, audio levels) injected before media Q&A; confabulated answers that contradict evidence are rejected; fixed gate when extraction is unavailable.
- **Skill echo stripping** — `SKILL_ECHO_*` verification tokens removed from user-facing deliverables (audit log only).

### Changed

- Dynamic planner auto-attaches `media_understand` when attachment block lists image/audio/video categories.

### Fixed

- **HA LLM Vision** — vision proxy returns plain `PEOPLE` / `NOPEOPLE` text for Home Assistant image classification.
- **Jetson hotfix ConfigMaps** — replace large ConfigMaps without apply annotations that blocked coordinator rollouts.

## [1.11.0] - 2026-07-08

### Added

- **Upload preview UI** — drag & drop or paperclip attach with pending preview chips (image/video/audio or icon fallback) and per-file cancel before send.
- **Audio uploads** — dedicated byte cap (`AGENTIC_OPENAI_PROXY_MAX_AUDIO_BYTES`) and `audio` attachment category for routing.
- **Media understanding MCPs** — `media_understand`, `media_audio_transcribe`, and `media_video_analyze` (stdio; `python -m mcp_servers.media_understand`) for image describe, audio transcribe, and video frame analysis. Opt-in via `AGENTIC_MCP_MEDIA_ENABLED=1`.

### Changed

- Attachment planner block and dynamic planner hints document media MCP tools for deeper image/audio/video work.
- Jetson deploy mounts MCP provider YAML + `mcp_servers/` via hostPath; env enables media MCPs for worker stdio.

## [1.10.0] - 2026-07-06

### Added

- **Warpgate session headers** — orchestrator session ID from `X-Agentic-Session-Id` or `X-Warpgate-Session-Id` (configurable via `AGENTIC_WEB_SESSION_ID_HEADER`); auto-generated `web-*` fallback. Session field removed from the settings UI.
- **Host metrics over WebSocket** — subscribe with `host_metrics_subscribe`; server pushes samples every 2s (override with `AGENTIC_WEB_HOST_METRICS_PUSH_MS`) instead of polling `GET /api/host-metrics`.
- **Welcome message persistence** — planner greeting is saved in the tab transcript (`extraClasses: welcome`) and restored on refresh.
- **`jetson_irrigation` agent skill** — Home Assistant zone runtime prompts for edge irrigation control.

### Changed

- **Tab-scoped web sessions** — chat transcript and session ID use `sessionStorage` (cleared when the tab closes); legacy `localStorage` keys purged.
- **Composer UX** — prompt textarea, send, and attach controls disabled while the welcome message loads or an orchestrator run is in progress.
- **Jetson networking** — coordinator exposes NodePort `30487` only (no `hostPort: 80`); `Recreate` rollout strategy for single-node k3s.
- **WebSocket singleton** — browser patches the `WebSocket` constructor to prevent duplicate connections through Warpgate/Traefik.

### Fixed

- **Warpgate edge compatibility** — WebSocket keepalive pings, reconnect UX, credentialed PWA manifest fetch (`pwa-manifest-link.js`).
- **Coordinator rollout deadlocks** on single-node k3s (`Recreate` vs `hostPort` + `RollingUpdate`).
- **Empty PWA manifest** behind Warpgate auth redirect (307 login page).

## [1.9.0] - 2026-07-05

### Added

- **Web session persistence** — stable `web-*` session IDs and chat transcript restore from `localStorage`; auto-reconnect on tab resume with `client_hello` so the planner greeting is skipped when resuming.
- **PWA install** — `manifest.webmanifest`, service worker, and install banner for Android home-screen install.
- **Planner greeting** — LLM-generated welcome on first connect (`AGENTIC_WEB_PLANNER_GREET`); proxy user display name via `X-Agentic-User-Name` / `X-User-Name`.
- **Simple chat path** — short prompts bypass delegation for faster k8s-native replies on Jetson.
- **Crew log sequence diagram** — visual timeline of crew stderr in the web UI.
- **Jetson GPU metrics** — jtop-based GPU stats in host metrics; warm-pool Ollama keep-alive tuning.
- **Edge performance options** — UI toggles for simple-chat latency on edge deployments.
- **Git-only Jetson deploy** — `jetson-deploy.sh` workflow rule; never SCP tracked files to the device.

### Changed

- **Cleaner web output** — strip `(progress)` noise, workflow headers, and exit-code footers; failed runs styled in red.
- **Ollama keep-alive** — coordinator sets keep-alive on connect for edge chat responsiveness.

### Fixed

- **jtop metrics JSON** — serialize non-JSON-native values with `default=str`.
- **Single-agent edge plans** — planner no longer invents hallucinated provider IDs when only one agent is selected.

## [1.8.0] - 2026-07-03

### Added

- **Host resource monitor** — header sparkline (CPU + memory) with click-through modal; `GET /api/host-metrics` samples `/proc` on Linux.
- **Crew log timestamps** — each stderr line in the crew log panel is prefixed with local `[HH:MM:SS]`.
- **Edge platform detection** — `AGENTIC_EDGE_PLATFORM` (`jetson` / `auto`) and startup logging of platform + Ollama runtime backend.
- **Ollama runtime detection** — native vs `dustynv/ollama` container; `jetson-verify-ollama.sh`, `jetson-install-ollama.sh`.
- **Jetson env template** — git-tracked `config/env.jetson` with UI defaults, iterative caps, and `jetson-apply-env.sh`.
- **K8s host `/proc` mount** — optional `host-metrics-hostproc-patch.yaml` for node-level metrics from the coordinator pod.

### Changed

- **Jetson web hotfix** — `jetson-hotfix-web.sh` updates the coordinator UI via ConfigMap mounts (no docker rebuild).

### Fixed

- Jetson k8s secret creation deduplicates env keys and strips CRLF from `.env` lines.

## [1.7.0] - 2026-07-03

### Added

- **Web UI app-shell redesign** — top bar, collapsible settings rail, mobile bottom sheet, composer auto-grow, and mode pill.
- **Crew log panel** — verbose stderr is always collected; **Show crew log** toggles a dedicated panel without affecting the final answer bubble.
- **Jetson local-LLM catalog** — `config/agent_providers_jetson/` with host Ollama agents for edge deployment.
- **Jetson deploy scripts** — `jetson-local-llm-deploy.sh`, `jetson-fix-ollama-k8s.sh`, `jetson-sync-k8s-secret.sh`, `jetson-switch-llama3-2-3b.sh`, `jetson-patch-ollama-api-base.sh`.
- **`litellm_api_base_for_ollama()`** — planner and vision paths honor `OLLAMA_API_BASE` (LiteLLM ignores `OLLAMA_HOST` alone).

### Changed

- Jetson agents use **host Ollama** (`selfcontained: false`, `http://host.k3s.internal:11434`) instead of in-container workflow Ollama.
- Jetson reference catalog trimmed to **`llama3.2:3b`** (removed AgriLlama and Qwen 2.5 entries).
- README and GitHub Pages reframed around the **process-loop** product thesis.

### Fixed

- Planner **Ollama connection refused** on k3s — bind Ollama on `0.0.0.0:11434`, CoreDNS `host.k3s.internal`, and k8s secret `OLLAMA_API_BASE`.
- **k3s coordinator rollout** — Traefik vs `hostPort` 80 conflicts and deploy script reliability.
- Warm pool treats non-zero **`exit_code`** in `result.json` as step failure.
- Web server **error responses** no longer expose stack traces to HTTP/WebSocket clients.
- **pytest** bumped to `>=9.0.3` (CVE-2025-71176).
- CI workflows: explicit **`permissions`** for `GITHUB_TOKEN` (CodeQL).

## [1.6.0] - 2026-06-29

### Added

- **User harness Phase 4** — subprocess/Kubernetes backend parity in shared `run_harness_kickoff`; scenario `inputs.matrix` variant expansion; planner context via `user_harness_performance_summary` (`AGENTIC_USER_HARNESS_FEED_PLANNER`).

## [1.5.0] - 2026-06-29

### Added

- **User agent harnesses** — domain scenario packs per catalog `agent_provider_id` via `orchestration/user_agent_harness.py`.
- CLI: `--harness-dir`, `--user-harness-run-all` (with shared `--harness-agent`, `--harness-json`, `--harness-fail-fast`).
- Env: `AGENTIC_EXTRA_AGENT_HARNESS_DIRS`, `AGENTIC_USER_HARNESS_RECORD_STATS`.
- Healthcare reference pack: `examples/verticals/healthcare/harnesses/gpt_research/` (three scenarios).
- Vertical `--example` overlay merges `harnesses/` into harness discovery.
- Scripts: `scripts/run-user-harness.ps1`, `scripts/run-user-harness.sh`.
- `@pytest.mark.user_harness` tests; included in harness CI job alongside platform harness tests.
- User harness stats in `learning_store` (`user_harness_stats`).
- Public `run_assertions()` and `forbids_regex` assertion type shared with platform harness.

## [1.4.0] - 2026-06-29

### Added

- **Platform agent harness** — tiered per-catalog-agent verification (`static`, `connectivity`, `smoke`, `capability`) via `orchestration/agent_harness.py`.
- Harness profile templates under `config/agent_harnesses/` (`general`, `research`, `write`, `reason`, `coding`, `vision`).
- CLI: `--harness-agent`, `--harness-batch`, `--harness-tier`, `--harness-filter`, `--harness-json`, and related flags.
- Scripts: `scripts/run-agent-harness.ps1`, `scripts/run-agent-harness.sh`, `scripts/harness-report.py`.
- CI jobs: `agent-harness-static` (L0 full catalog), `agent-harness-connectivity` (L1 + unit tests); nightly workflow `agent-harness-smoke-nightly.yml` (L2).
- `harness_profile` / `harness.skip_live` on reference cloud agents (`gpt_*`, `claude_*`, `ollama_llama3`).
- Harness stats in `learning_store` (`harness_stats`) and planner context via `harness_performance_summary`.
- Optional `AgentProvider.run_harness_probe()` hook for custom provider classes.
- Subprocess backend support for smoke/capability tiers (`--harness-backend subprocess`).

### Changed

- Agent catalog generator adds **Harness** column (`docs/scripts/generate_agent_catalog_md.py`).
- Default pytest excludes `@pytest.mark.agent_harness` (run explicitly or in harness CI job).

## [1.3.0] - 2026-06-29

### Added

- **Agent skills catalog** (`config/agent_skills/`, `--agent-skills-catalog`) — YAML procedural playbooks injected into task descriptions or agent backstory; composes with MCP attachments.
- Shipped skills: `echo_skill`, `echo_backstory_skill`, `release_process`, `pr_review`; smoke workflow `workflow_agent_skills_smoke.yaml`.
- Dynamic planner `skill_ids` (workflow default + per-step), keyword goal-match augmentation, and relevance pruning (workflow and per-task).
- **Worker skills re-resolve** — `--execute-step` and distributed backends reload skills from `StepSpec.skills` + `paths.agent_skills_catalog`.
- **Kind CI skills e2e** — stub worker verifies skills spec handoff (`k8s_stub_skills`, `test_agent_skills_smoke_kind_kubernetes_workflow`).
- Catalog features: `content.summary`, `required_files` gating, `SKILL.md` frontmatter strip, bundle YAML, `AGENTIC_EXTRA_AGENT_SKILLS_PATH`.
- Combined **attachment fingerprint** (MCP + skills) for learning stats, KB writes, web UI ratings, and planner traces (`attachment_fingerprint` with legacy `mcp_fingerprint` alias).
- Web UI parses `(agentic) run_rating_meta` stderr for thumbs up/down envelope.

### Changed

- `learning_store` / `knowledge_base` APIs accept `attachment_fingerprint`; KB dynamic runs store per-task fingerprint on the final task.
- Stub worker Docker image embeds `config/agent_skills` for skills verification in kind e2e.

### Fixed

- Web ratings now record combined MCP+skill attachment digest instead of always `none`.

## [1.2.0] - 2026-06-29

### Added

- **Kubernetes execution** (`AGENTIC_EXECUTION_BACKEND=kubernetes`) — coordinator dispatches each workflow step to workers via shared run-store PVC; one-shot Jobs or warm pool.
- **In-cluster coordinator** (K3.7) — Deployment + RBAC; serves web UI and creates worker workloads.
- **Warm pool** (K5.1) — long-running worker pods dequeue steps from the PVC (`AGENTIC_K8S_WARM_POOL_ENABLED=1`).
- **Delegation RPC** (K5.5) — `k8s_delegate_task` CrewAI tool + delegation broker for child Jobs.
- **Structured K8s logging** — `AGENTIC_LOG_FORMAT=json` with `run_id` / `step_id` / `component` (see `deploy/k8s/LOGGING.md`).
- **MCP on K8s** — sidecar/gateway manifests (fetch, filesystem); pod-sidecar compatibility layer.
- **Docker images** — `Dockerfile.coordinator`, `Dockerfile.worker`; kind full-stack and Jetson k3s deploy scripts.
- **Web UI prose mode** — `AGENTIC_WEB_PROSE_DELIVERABLE` for chat runs; client unwraps JSON-shaped stdout.
- **Step recovery**, kind/kubernetes CI e2e, load-test scripts, GitHub Pages product site + docs hub.

### Changed

- Dual execution framework completed through F3: `StepCoordinator`, run store, `--execute-step` worker entrypoint, subprocess and kubernetes runners.
- Dynamic planner and synthesis steer toward readable prose when the web UI sets prose delivery.

### Fixed

- Warm pool run-store paths on Windows host dispatch.
- Coordinator image: correct `public/` path for web UI static assets.
- Jetson deploy: Traefik vs `hostPort` 80 conflict; NodePort web exposure and rollout reliability.

## [1.1.1] - 2026-06-28

### Added

- Mocked `@pytest.mark.backend_inprocess` regression tests for F1.4 (static, dynamic, and `CrewAIExecutionBackend` kickoff path) in default CI.

### Changed

- `pytest.ini` marker docs for `backend_inprocess` and `timeout`.

## [1.1.0] - 2026-06-28

### Added

- **Dual execution framework (F0–F3):** pluggable execution backends with `AGENTIC_EXECUTION_BACKEND` (`inprocess` default, `subprocess`, `kubernetes` stub).
- `orchestration/backends/` — `CrewAIExecutionBackend`, factory, step contracts (`StepSpec`, `StepResult`).
- `workflow_materializer`, `step_coordinator`, `run_store`, and `--execute-step` worker entrypoint for distributed step execution.
- Subprocess backend (`AGENTIC_SUBPROCESS_WORKERS=1`) spawns per-step workers via `python main.py --execute-step`.
- Unit tests for step context, workflow materializer, run store, and execution backend factory.
- Opt-in **Live LLM** GitHub Actions workflow (`.github/workflows/live-llm.yml`) and `tests/test_live_llm_smoke.py`.

### Changed

- `main.py` delegates kickoff to `CrewAIExecutionBackend` via factory; lifecycle hooks moved to `orchestration/backends/crewai.py`.
- `.env.example` documents `AGENTIC_EXECUTION_BACKEND` and `AGENTIC_SUBPROCESS_WORKERS`.

## [1.0.0] - 2026-06-27

### Added

- Unit test suite (`agentic-orchestration-tool/tests/`) and pytest configuration.
- GitHub Actions CI (`.github/workflows/ci.yml`) and GitLab CI (`.gitlab-ci.yml`).
- Release process: `VERSION`, `CHANGELOG.md`, `RELEASING.md`, tag-triggered GitHub Release workflow.
- Wiki roadmaps: dual execution framework and Kubernetes execution upgrade.

### Changed

- Web dependency: `marked` 18.0.0 -> 18.0.2 (#2).

### Fixed

- Test runner scripts (`run-tests.ps1` / `run-tests.sh`) use correct tool root and unit-only deps.
