---
layout: default
title: GitHub Pages publish
permalink: /GitHub-Pages-publish/
---

# Publishing docs on GitHub Pages

GitHub Pages serves two builds from one workflow: the landing page, a Vite + React app in [`site/`](https://github.com/zlatko-lakisic/agentic-orchestration/tree/main/site) published at `/`, and the documentation, a [Jekyll](https://jekyllrb.com/) site in `docs/` published at `/docs`. Both are built and deployed by GitHub Actions.

**Live site:** [https://zlatko-lakisic.github.io/agentic-orchestration/](https://zlatko-lakisic.github.io/agentic-orchestration/)

## Source and workflow

- **Landing page:** [`site/`](https://github.com/zlatko-lakisic/agentic-orchestration/tree/main/site) (`npm ci && npm run build` → `site/dist/`)
- **Docs content:** [`docs/`](https://github.com/zlatko-lakisic/agentic-orchestration/tree/main/docs) in [agentic-orchestration](https://github.com/zlatko-lakisic/agentic-orchestration)
- **Workflow:** [`.github/workflows/pages.yml`](https://github.com/zlatko-lakisic/agentic-orchestration/blob/main/.github/workflows/pages.yml)
- **Docs theme:** the repo's own layouts and styles (`docs/_layouts/`, `docs/_includes/`, `docs/_sass/`); no remote theme
- **CI:** pull requests lint and build `site/` in `.github/workflows/ci.yml` (`site-build` job); the Pages workflow itself runs only on pushes to `main`

## One-time setup (repo maintainer)

1. Open [agentic-orchestration](https://github.com/zlatko-lakisic/agentic-orchestration) on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions** (required before the first workflow run; otherwise `configure-pages` fails with "Get Pages site failed").
4. Push to `main` (or run **Deploy site and docs to GitHub Pages** manually).

## Editing content

**The docs home page** (`docs/index.md`) is edited directly and is **not** overwritten by wiki sync. The landing page is edited in `site/src/`.

**Technical reference pages** are synced from the GitHub wiki:

```bash
cd docs
python scripts/sync_from_wiki.py
```

The sync converts `[[Page]]` wiki links, applies Jekyll front matter, and copies `assets/`. It skips `Home.md` so the product homepage stays separate from the wiki.

Commit and push to `main`.

## Local preview

```bash
cd docs
bundle install
bundle exec jekyll serve
```

Open [http://127.0.0.1:4000/agentic-orchestration/docs/](http://127.0.0.1:4000/agentic-orchestration/docs/).

Landing page:

```bash
cd site
npm ci
npm run dev
```

## Updating

When you add agent YAMLs or MCP entries, update [Agent provider catalog](Agent-provider-catalog/) and [MCP providers](MCP-providers/). When dependencies change, update [Third-party projects](Third-party-projects/) and root `THIRD_PARTY_NOTICES.md`.
