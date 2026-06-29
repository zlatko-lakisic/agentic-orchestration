# Changelog

All notable changes to **agentic-orchestration** are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (`VERSION` at repo root).

## [Unreleased]

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
