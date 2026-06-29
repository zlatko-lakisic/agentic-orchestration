# Release process (agentic-orchestration)

Follow this checklist when the user asks to cut, publish, or prepare a release. **Do not run destructive git commands** (`push --force`, `reset --hard`, amend pushed commits) unless the user explicitly requests them.

## Before any version bump

1. Read `RELEASING.md` at the repository root (parent of `agentic-orchestration-tool/`).
2. Confirm the bump type with the user if unclear: **major** (breaking), **minor** (features), or **patch** (fixes/docs/deps only).
3. Confirm `main` is up to date and tests pass: `agentic-orchestration-tool/scripts/run-tests.ps1` (or equivalent `pytest` in the tool venv).

## Changelog and version

4. Ensure `CHANGELOG.md` `[Unreleased]` reflects this release; edit manually if needed.
5. From the **repository root**, run (dry-run first for large releases):
   - `python scripts/release.py <major|minor|patch> --dry-run`
   - then `python scripts/release.py <major|minor|patch>` when the diff looks correct.
6. The script updates `VERSION` and `CHANGELOG.md`. Source of truth: `VERSION` file; tag must be `v` + contents.

## Git and GitHub

7. Commit only `VERSION` + `CHANGELOG.md` with message: `Release vX.Y.Z` (ask before committing unless the user requested the full release).
8. Create an **annotated** tag `vX.Y.Z` matching `VERSION`.
9. Push `main` and the tag to the `github` remote (ask before push unless explicitly requested).
10. Verify: `gh release view vX.Y.Z` — `.github/workflows/release.yml` publishes release notes from the changelog section.

## Optional

11. Update the wiki (`agentic-orchestration.wiki`) if user-facing behavior or setup changed.

## Output format

Produce a short **action plan** listing completed vs remaining steps, the target version, and any blockers (failing tests, empty `[Unreleased]`, dirty working tree). Do not claim a release is published until push and `gh release view` succeed.
