---
layout: default
title: Releases
permalink: /Releases/
---

# Releases

**agentic-orchestration** uses [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

| Artifact | Location |
|----------|----------|
| Current published version | `VERSION` (repo root) |
| Release notes | `CHANGELOG.md` |
| How to release | `RELEASING.md` |
| GitHub Release automation | `.github/workflows/release.yml` (on push tag `v*.*.*`) |

## Version policy

| Bump | Use when |
|------|----------|
| **Major** | Breaking changes (config, CLI, workflow YAML incompatibility) |
| **Minor** | New backward-compatible features |
| **Patch** | Bug fixes, dependency updates, docs-only |

**First release:** from `0.0.0`, minor → `0.1.0`, major → `1.0.0`.

## Creating a release

1. Accumulate changes under `## [Unreleased]` in `CHANGELOG.md`.
2. Run from repo root:

   ```bash
   python scripts/release.py minor --dry-run   # preview
   python scripts/release.py minor             # bump VERSION + finalize changelog
   ```

3. Commit, tag, push:

   ```bash
   git add VERSION CHANGELOG.md
   git commit -m "Release v0.1.0"
   git tag -a v0.1.0 -m "Release v0.1.0"
   git push github main
   git push github v0.1.0
   ```

4. GitHub Actions creates the Release with notes from the matching `CHANGELOG` section.

## Agent-assisted releases

In Cursor, say **“create a new release”** — the agent will ask **major or minor** (or patch for hotfixes), run the checklist in `RELEASING.md`, and ask before pushing.

See also: [Testing and CI](Testing-and-CI/), [Home](Home/)
