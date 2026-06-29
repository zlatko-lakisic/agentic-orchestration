---
title: "Changelog"
layout: single
sidebar:
  nav: "docs"
toc: true
toc_sticky: true
---

Version history for **agentic-orchestration**. Format follows [Keep a Changelog](https://keepachangelog.com/). Version source: [`VERSION`](https://github.com/zlatko-lakisic/agentic-orchestration/blob/main/VERSION) at repo root.

## [Unreleased]

_No changes yet._

## [1.1.1] — 2026-06-28

[GitHub Release v1.1.1](https://github.com/zlatko-lakisic/agentic-orchestration/releases/tag/v1.1.1)

### Added

- Mocked `@pytest.mark.backend_inprocess` regression tests for F1.4 (static, dynamic, and `CrewAIExecutionBackend` kickoff path) in default CI.

### Changed

- `pytest.ini` marker docs for `backend_inprocess` and `timeout`.

## [1.1.0] — 2026-06-28

[GitHub Release v1.1.0](https://github.com/zlatko-lakisic/agentic-orchestration/releases/tag/v1.1.0)

### Added

- **Dual execution framework (F0–F3):** pluggable execution backends with `AGENTIC_EXECUTION_BACKEND` (`inprocess` default, `subprocess`, `kubernetes` stub).
- `orchestration/backends/` — `CrewAIExecutionBackend`, factory, step contracts (`StepSpec`, `StepResult`).
- `workflow_materializer`, `step_coordinator`, `run_store`, and `--execute-step` worker entrypoint for distributed step execution.
- Subprocess backend (`AGENTIC_SUBPROCESS_WORKERS=1`) spawns per-step workers via `python main.py --execute-step`.
- Unit tests for step context, workflow materializer, run store, and execution backend factory.
- Opt-in **Live LLM** GitHub Actions workflow and `tests/test_live_llm_smoke.py`.

### Changed

- `main.py` delegates kickoff to `CrewAIExecutionBackend` via factory; lifecycle hooks moved to `orchestration/backends/crewai.py`.
- `.env.example` documents `AGENTIC_EXECUTION_BACKEND` and `AGENTIC_SUBPROCESS_WORKERS`.

## [1.0.0] — 2026-06-27

[GitHub Release v1.0.0](https://github.com/zlatko-lakisic/agentic-orchestration/releases/tag/v1.0.0)

### Added

- Unit test suite (`agentic-orchestration-tool/tests/`) and pytest configuration.
- GitHub Actions CI (`.github/workflows/ci.yml`) and GitLab CI (`.gitlab-ci.yml`).
- Release process: `VERSION`, `CHANGELOG.md`, `RELEASING.md`, tag-triggered GitHub Release workflow.
- Wiki roadmaps: dual execution framework and Kubernetes execution upgrade.

### Changed

- Web dependency: `marked` 18.0.0 → 18.0.2 (#2).

### Fixed

- Test runner scripts (`run-tests.ps1` / `run-tests.sh`) use correct tool root and unit-only deps.
