---
layout: single
title: "Testing and CI"
permalink: /testing-and-ci/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# Testing and CI

How to run automated checks locally and on **GitHub** or **GitLab** for **agentic-orchestration**. Designed to grow with [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}) and [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) without requiring API keys or a cluster for the default tier.

**Related:** [Configuration]({{ '/configuration/' | relative_url }}), [Architecture]({{ '/architecture/' | relative_url }}), [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}), [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}), [Agent harness roadmap]({{ '/Agent-harness-roadmap/' | relative_url }}), [User agent harnesses]({{ '/User-agent-harnesses/' | relative_url }})

---

## Quick

| Tier | When | Needs API keys? | Runs in CI? |
|------|------|-----------------|-------------|
| **Unit** | Every commit / MR | No | ✅ Yes (default) |
| **Import smoke** | Every commit / MR | No | ✅ Yes |
| **Docker worker smoke** | Every commit / MR | No | ✅ Yes (K8s Phase 2.3) |
| **kind Kubernetes e2e** | Every commit / MR | No | ✅ Yes (stub worker, no LLM) |
| **Integration** | Manual / with `AGENTIC_KIND_E2E=1` locally | Sometimes | ❌ Excluded from default pytest |
| **Live LLM** | Local only unless secrets configured | Yes | ❌ Never by default |
| **Agent harness L0** (static catalog) | Every commit / MR | No | ✅ Yes |
| **Agent harness L1** (connectivity) | Every commit / MR (credentialed subset) | Sometimes | ✅ Yes |
| **Agent harness L2+** (smoke / capability) | Nightly / manual | Yes | ❌ By default |
| **Backend parity** (F2.7 / dual framework) | After refactor lands | No for resolution tests | ✅ Planned |

Default CI command excludes `integration` and `live_llm` markers (see `pytest.ini`).

---

## Local — before you commit

From **`agentic-orchestration-tool/`**:

```bash
# One-time (or after dependency changes)
pip install -r requirements.txt -r requirements-dev.txt

# Same as CI
pytest
```

Helpers:

| Script | Platform |
|--------|----------|
| `scripts/run-tests.sh` | Linux / macOS / Git Bash |
| `scripts/run-tests.ps1` | Windows PowerShell |

Examples:

```bash
pytest -m unit                    # explicit unit tier
pytest tests/test_config_loader.py # one file
pytest -m integration           # include integration (when added)
pytest -m "live_llm"            # real LLM calls — local only
```

---

## GitHub Actions

Workflow: **`.github/workflows/ci.yml`** (on push to `main`/`master` and on pull requests).

| Job | What it does |
|------|----------------|
| **python-unit** | `pip install` + `pytest` (unit tier) |
| **python-smoke-import** | Install runtime deps; import `orchestration.*` and `main` |
| **docker-worker-smoke** | Build `docker/Dockerfile.worker`; invalid spec → exit 2 (`scripts/docker-worker-smoke.sh`) |
| **kind-kubernetes-e2e** | kind cluster + hostPath PVC + stub worker Jobs (`scripts/k8s-kind-e2e.sh`; `tests/test_kind_kubernetes_e2e.py`) |

No repository secrets required for default CI.

**Local Docker smoke** (Windows / Linux):

```powershell
# Windows
powershell -File scripts/docker-worker-smoke.ps1
```

```bash
# Linux / macOS / Git Bash
bash scripts/docker-worker-smoke.sh
```

**kind Kubernetes e2e** (Linux / Git Bash — same as CI):

```bash
cd agentic-orchestration-tool
bash scripts/k8s-kind-e2e.sh
```

Windows local cluster (real LLM, manual):

```powershell
.\scripts\k8s-kind-up.ps1
$env:AGENTIC_K8S_RUN_STORE_VOLUME = "hostpath"
.\scripts\k8s-apply-run-store.ps1
.\scripts\docker-worker-smoke.ps1   # builds agentic-orchestrator-worker:local
# load into kind: .\.tools\kind.exe load docker-image agentic-orchestrator-worker:local --name agentic
python main.py config/workflows/workflow_brainstorm.yaml --quiet
```

---

## GitLab CI

Pipeline: **`.gitlab-ci.yml`** at the monorepo root (runs on merge requests and on pushes to the default branch, `main`, or `master`).

| Job | What it does |
|------|----------------|
| **unit-tests** | `pip install -r requirements-test.txt` + `pytest` |
| **import-smoke** | Install full `requirements.txt`; import `orchestration.*` and `main` |
| **docker-worker-smoke** | DinD: build worker image + smoke script (same as GitHub job) |
| **kind-kubernetes-e2e** | kind + hostPath PVC + stub worker (`scripts/k8s-kind-e2e.sh`) |

**Enable:** push `.gitlab-ci.yml` to your GitLab project — GitLab picks it up automatically when CI/CD is enabled (**Settings → General → Visibility** and **Build → Pipelines**).

**Runners:** uses shared GitLab.com runners (`python:3.12-slim`) by default. For self-hosted GitLab, ensure a runner with Docker executor is available.

**Merge requests:** pipelines run on MR open/update; enable **Pipelines must succeed** under **Settings → Merge requests** if you want tests to block merges.

No CI variables or secrets required for the default jobs.

---

## Layout

```
agentic-orchestration-tool/
├── pytest.ini              # markers, default -m filter
├── requirements-dev.txt    # pytest
├── tests/
│   ├── conftest.py         # tool_root, config_dir fixtures
│   ├── test_config_loader.py
│   ├── test_catalog_loader.py
│   ├── test_catalog_credentials.py
│   ├── test_mcp_catalog.py
│   ├── test_goal_format_hints.py
│   └── test_provider_goal_match.py
└── scripts/
    ├── run-tests.sh
    ├── run-tests.ps1
    ├── docker-worker-smoke.sh   # CI + Linux local
    ├── docker-worker-smoke.ps1  # Windows local
    ├── k8s-kind-up.sh           # kind cluster + host bind mount
    ├── k8s-kind-up.ps1          # Windows
    ├── k8s-apply-run-store.sh   # PVC backend (hostpath | nfs | filestore)
    └── k8s-kind-e2e.sh          # CI kind e2e (stub worker)
```

Add new tests under `tests/`; keep fast pure logic in `@pytest.mark.unit`.

---

## Pytest markers (convention)

| Marker | Use |
|--------|-----|
| `unit` | Pure functions, YAML load, catalog filter — **no network** |
| `integration` | Subprocess worker, mini end-to-end without real LLM |
| `live_llm` | Real OpenAI/Ollama/HF calls |
| `backend_inprocess` | Full crew kickoff regression (future) |
| `backend_subprocess` | Subprocess execution backend (framework F4) |
| `backend_kubernetes` | kind/cluster integration |
| `kind_e2e` | Live kind Jobs via stub worker (`AGENTIC_KIND_E2E=1`) |

Register new markers in `pytest.ini` when adding tiers.

---

## Roadmap — tests for dual execution framework

Align with [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}) guardrails and phases.

### Now (shipped)

- [x] pytest + CI scaffold
- [x] Unit tests: config load, catalog credentials, MCP env substitution, planner guardrails
- [x] Import smoke job

### Framework F1 — CrewAI backend extract

- [x] **T-F1** `run_built_workflow` / backend factory smoke with mocked kickoff
- [x] **T-F1** Regression: `AGENTIC_EXECUTION_BACKEND=inprocess` golden path (mocked LLM; `tests/test_backend_inprocess_regression.py`)

### Framework F2 — Step spec + coordinator

- [x] **T-F2** `build_step_specs()` from fixture `WorkflowConfig`
- [x] **T-F2** `prepare_step_description()` inject / cap chars
- [x] **T-F2** Run store round-trip
- [x] **T-F2.7 / G4** Same workflow YAML → identical step spec resolution (materializer parity; `step_specs_resolution_fingerprint`)
- [x] **T-F2** `StepCoordinator` sequential loop, failure stop, run store writes (`tests/test_step_coordinator.py`)

### Framework F4 — Subprocess backend

- [x] **T-F4** `@pytest.mark.backend_subprocess` two-step subprocess run (mock worker; `tests/test_backend_subprocess.py`)
- [x] **T-F4-docker** Docker worker image smoke in CI (`scripts/docker-worker-smoke.sh`, job `docker-worker-smoke`)

### K8s plan K3+

- [x] **T-K3** `@pytest.mark.backend_kubernetes` — mocked Job integration (`tests/test_backend_kubernetes.py`)
- [x] **T-K3-kind** `@pytest.mark.kind_e2e` — live kind cluster in CI (`scripts/k8s-kind-e2e.sh`, stub worker)

### Platform agent harness (shipped v1.4.0)

See [Agent harness roadmap]({{ '/Agent-harness-roadmap/' | relative_url }}).

- [x] **T-H0** `@pytest.mark.agent_harness` — L0 static validation for full [Agent provider catalog]({{ '/agent-catalog/' | relative_url }})
- [x] **T-H1** L1 connectivity for credentialed catalog subset in CI
- [x] **T-H2** L2 smoke — nightly workflow
- [x] `main.py --harness-agent` / `--harness-batch` CLI
- [x] `scripts/run-agent-harness.ps1` / `harness-report.py`

### User agent harness packs (planned)

See [User agent harnesses]({{ '/User-agent-harnesses/' | relative_url }}) — adopters maintain scenario libraries outside core; not part of default repo CI.

- [ ] **T-UH1** `--harness-dir` / `AGENTIC_EXTRA_AGENT_HARNESS_DIRS` discovery
- [ ] Scenario YAML + deterministic assertions + optional rubric
- [ ] Healthcare vertical example pack under `examples/verticals/healthcare/harnesses/`

---

## Optional: pre-commit (local)

Not required for GitHub CI. To run unit tests before every local commit:

```bash
pip install pre-commit
# .pre-commit-config.yaml (future): pytest -m unit from agentic-orchestration-tool
```

Defer until the team wants local hooks; **GitHub Actions is the shared gate**.

---

## Optional: live LLM CI job

Separate workflow: **`.github/workflows/live-llm.yml`**. Not required for PR merges.

### One-time GitHub setup

1. Open **https://github.com/zlatko-lakisic/agentic-orchestration/settings/secrets/actions**
2. **New repository secret** → name `OPENAI_API_KEY`, value = your OpenAI key
3. (Optional) add `OPENAI_MODEL_NAME` as a secret or rely on workflow env defaults

### Run the job

| Method | Command / action |
|--------|------------------|
| **GitHub UI** | **Actions** → **Live LLM** → **Run workflow** |
| **CLI** | `gh workflow run live-llm.yml` |

Weekly schedule: Mondays 06:00 UTC (disable by removing the `schedule` block in the workflow file).

### What it runs

`tests/test_live_llm_smoke.py` (`@pytest.mark.live_llm`):

- Static `workflow.yaml` through in-process backend
- Short `--dynamic` goal with `AGENTIC_PLANNER_MAX_STEPS=2`

### Local (same tests)

```bash
cd agentic-orchestration-tool
pip install pytest-timeout   # optional but used in CI
pytest -m live_llm -o addopts="-ra"
```

Requires `OPENAI_API_KEY` in `.env` or the shell environment. Forks and PRs from contributors do not receive your secrets; the job skips cleanly when the key is missing.

---

## Adding a new unit test (checklist)

1. Prefer testing **pure orchestration** code (no `crew.kickoff()`).
2. Mark with `@pytest.mark.unit`.
3. Use `tool_root` / `config_dir` fixtures from `conftest.py`.
4. Avoid real network; use `monkeypatch` for env vars.
5. Run `pytest` locally before push.

---

## Wiki maintenance

When adding backend tests, update:

- This page — marker table and roadmap checkboxes
- [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}) — guardrail **G4** / **F2.7**
- [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) — testing strategy table
