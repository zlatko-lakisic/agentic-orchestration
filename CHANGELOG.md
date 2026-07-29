# Changelog

All notable changes to **agentic-orchestration** are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (`VERSION` at repo root).

## [Unreleased]

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
