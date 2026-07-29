# Releasing agentic-orchestration

This repo uses **Semantic Versioning** and **Keep a Changelog**.

| File | Purpose |
|------|---------|
| `VERSION` | Latest **published** version (`X.Y.Z`). `0.0.0` = no GitHub Release yet. |
| `CHANGELOG.md` | Human-readable notes; `[Unreleased]` accumulates until a release. |
| `.github/workflows/release.yml` | Creates a GitHub Release when tag `v*` is pushed. |
| `.github/workflows/publish-images.yml` | Pushes coordinator/worker images to GHCR (`amd64` + `arm64`) on tag `v*`. |

## Version bumps

| Kind | When | Example |
|------|------|---------|
| **Major** | Breaking changes (config schema, CLI flags removed, incompatible workflow YAML) | `0.1.0` -> `1.0.0` |
| **Minor** | New features, backward-compatible | `0.1.0` -> `0.2.0` or `0.0.0` -> `0.1.0` |
| **Patch** | Bug fixes, dependency-only updates, docs | `0.1.0` -> `0.1.1` |

**First release:** from `0.0.0`, a **minor** release is usually `0.1.0`; a **major** first stable release is `1.0.0`.

## Release checklist (human or agent)

1. **Confirm bump type** — major, minor, or patch.
2. **Ensure `main` is green** — CI passing; run `agentic-orchestration-tool/scripts/run-tests.ps1` locally.
3. **Update `CHANGELOG.md`** — move `[Unreleased]` into `## [X.Y.Z] - YYYY-MM-DD` (or run `scripts/release.py`).
4. **Bump `VERSION`** to `X.Y.Z` (script does this).
5. **Commit** on `main`: `Release vX.Y.Z`
6. **Tag**: `vX.Y.Z` (annotated tag recommended).
7. **Push** `main` and tag to GitHub: `git push github main && git push github vX.Y.Z`
8. **GitHub Release** — created automatically by workflow from tag + changelog section.
9. **GHCR images** — `.github/workflows/publish-images.yml` builds `linux/amd64` + `linux/arm64` and pushes:
   - `ghcr.io/zlatko-lakisic/agentic-orchestrator-coordinator:vX.Y.Z`
   - `ghcr.io/zlatko-lakisic/agentic-orchestrator-worker:vX.Y.Z`
10. **Wiki** (optional) — note release under wiki Home if user-facing docs changed.

### Jetson: pull GHCR instead of on-device build

After packages are public (or you `docker login ghcr.io`):

```bash
export AGENTIC_USE_GHCR=1
export AGENTIC_IMAGE_TAG=v1.16.0   # or omit to use VERSION file / latest
sudo -E bash agentic-orchestration-tool/scripts/jetson-k3s-deploy.sh
```

Private packages: set `GITHUB_TOKEN` (or `GHCR_TOKEN`) and optional `GITHUB_USER` before deploy.

Manual publish without cutting a release:

```text
GitHub → Actions → Publish container images → Run workflow
```

## Commands

### Automated (recommended)

```powershell
# From repo root — dry run
python scripts/release.py minor --dry-run

# Apply bump + changelog section (no git)
python scripts/release.py minor

# Then commit, tag, push (or use --commit --tag --push when ready)
git add VERSION CHANGELOG.md
git commit -m "Release v0.1.0"
git tag -a v0.1.0 -m "Release v0.1.0"
git push github main
git push github v0.1.0
```

```bash
python scripts/release.py minor --dry-run
python scripts/release.py minor
# same git steps
```

### Manual tag only (if VERSION/CHANGELOG already updated)

```powershell
git tag -a v0.1.0 -m "Release v0.1.0"
git push github v0.1.0
```

## GitHub vs GitLab

- **GitHub Releases** — triggered by pushing `v*` tags (see workflow).
- **GitLab** — mirror tags to GitLab if needed; create GitLab Release manually or add a tag pipeline later.

## Agent workflow

When the user asks to **create a new release**:

1. Ask: **major or minor?** (offer **patch** if the change set is fixes/deps only).
2. Run the checklist above; do not push or commit unless the user confirms.
3. After push, verify: `gh release view vX.Y.Z`.

See `.cursor/rules/releases.mdc` for Cursor agent instructions.
