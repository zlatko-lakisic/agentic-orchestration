# Changelog

All notable changes to **agentic-orchestration** are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (`VERSION` at repo root).

## [Unreleased]

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
