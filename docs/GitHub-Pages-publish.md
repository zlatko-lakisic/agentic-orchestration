---
layout: default
title: GitHub Pages publish
permalink: /GitHub-Pages-publish/
---

# Publishing docs on GitHub Pages

Documentation is built and published from the **main repository** (`agentic-orchestration`), not this wiki repo.

**Live site:** [https://zlatko-lakisic.github.io/agentic-orchestration/](https://zlatko-lakisic.github.io/agentic-orchestration/)

## Where to edit

- **Source:** [`docs/`](https://github.com/zlatko-lakisic/agentic-orchestration/tree/main/docs) in [agentic-orchestration](https://github.com/zlatko-lakisic/agentic-orchestration)
- **Workflow:** [`.github/workflows/pages.yml`](https://github.com/zlatko-lakisic/agentic-orchestration/blob/main/.github/workflows/pages.yml)
- **Theme:** [Slate](https://github.com/pages-themes/slate) via Jekyll (`docs/_config.yml`)

## One-time setup (repo maintainer)

1. Open the **main** repo: [agentic-orchestration](https://github.com/zlatko-lakisic/agentic-orchestration).
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions** (required before the first workflow run; otherwise `configure-pages` fails with "Get Pages site failed").
4. Push to `main` (or run **Deploy docs to GitHub Pages** manually).

Disable Pages on this `.wiki` repo if it still publishes the old `/agentic-orchestration.wiki/` URL.

## Editing content

1. Edit markdown under `docs/` in the main repo.
2. Use Jekyll pretty-permalink links, e.g. `[Architecture](Architecture/)`.
3. For legacy `[[Architecture]]` wiki links, run from `docs/`:

   ```bash
   python scripts/convert_wiki_links.py
   python scripts/add_jekyll_front_matter.py
   ```

4. Commit and push to `main`.

## Local preview

```bash
cd docs
bundle install
bundle exec jekyll serve
```

Open [http://127.0.0.1:4000/agentic-orchestration/](http://127.0.0.1:4000/agentic-orchestration/).

## Updating

When you add agent YAMLs or MCP entries, update [Agent provider catalog](Agent-provider-catalog/) and [MCP providers](MCP-providers/). When dependencies change, update [Third-party projects](Third-party-projects/) and root `THIRD_PARTY_NOTICES.md`.
