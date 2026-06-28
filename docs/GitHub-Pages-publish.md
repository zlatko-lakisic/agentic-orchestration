---
layout: default
title: GitHub Pages publish
permalink: /GitHub-Pages-publish/
---

# Publishing docs on GitHub Pages

The documentation site is built with [Jekyll](https://jekyllrb.com/) and the [Slate theme](https://github.com/pages-themes/slate), then deployed by GitHub Actions.

**Live site:** [https://zlatko-lakisic.github.io/agentic-orchestration/](https://zlatko-lakisic.github.io/agentic-orchestration/)

## Source and workflow

- **Content:** [`docs/`](https://github.com/zlatko-lakisic/agentic-orchestration/tree/main/docs) in [agentic-orchestration](https://github.com/zlatko-lakisic/agentic-orchestration)
- **Workflow:** [`.github/workflows/pages.yml`](https://github.com/zlatko-lakisic/agentic-orchestration/blob/main/.github/workflows/pages.yml)
- **Theme:** Slate via `remote_theme: pages-themes/slate@v0.2.0` in `docs/_config.yml`

## One-time setup (repo maintainer)

1. Open [agentic-orchestration](https://github.com/zlatko-lakisic/agentic-orchestration) on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions** (required before the first workflow run; otherwise `configure-pages` fails with "Get Pages site failed").
4. Push to `main` (or run **Deploy docs to GitHub Pages** manually).

## Editing content

1. Keep the GitHub wiki (`agentic-orchestration.wiki`) as the primary editing surface, then sync into `docs/`:

   ```bash
   cd docs
   python scripts/sync_from_wiki.py
   ```

   The sync converts `[[Page]]` wiki links, applies Jekyll front matter, maps `Home.md` → `index.md`, and copies `assets/`.

2. Or edit markdown directly under `docs/` using Jekyll pretty-permalink links, e.g. `[Architecture](Architecture/)`.

3. Commit and push to `main`.

## Local preview

```bash
cd docs
bundle install
bundle exec jekyll serve
```

Open [http://127.0.0.1:4000/agentic-orchestration/](http://127.0.0.1:4000/agentic-orchestration/).

## Updating

When you add agent YAMLs or MCP entries, update [Agent provider catalog](Agent-provider-catalog/) and [MCP providers](MCP-providers/). When dependencies change, update [Third-party projects](Third-party-projects/) and root `THIRD_PARTY_NOTICES.md`.
