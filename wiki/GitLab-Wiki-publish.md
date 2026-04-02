# Publishing this wiki on GitLab

GitLab stores the wiki in a **separate Git repository** from the main project.

## Option A — Enable GitLab Wiki and clone

1. In your GitLab project: **Deploy** → **Wiki** → **Enable** (if not already).
2. Clone the wiki repo (GitLab shows the clone URL), for example:
   - `git clone https://gitlab.com/<group>/<project>.wiki.git`
3. Copy the contents of the **`wiki/`** folder from the main repository into the wiki clone (the `.md` files at the root of the wiki repo).
4. GitLab uses the **file name** (without `.md`) as the page title. Keep names like `Home.md` (GitLab often treats `home` as the default landing page — you can set the default page in wiki settings).
5. Commit and push.

## Option B — Keep wiki in main repo only

You can leave `wiki/` in the **main** repository as documentation and link it from the project README. Readers browse files on GitLab/GitHub without using the separate Wiki feature. This avoids maintaining two repos.

## Naming and links

- Internal wiki links in Markdown: `[Architecture](Architecture)` — GitLab resolves slugs from page titles.
- If a page does not link, use the **Wiki** sidebar to create pages matching the filenames in this folder.

## Updating

When you add agent YAMLs or MCP entries, update **[Agent-provider-catalog](Agent-provider-catalog)** and **[MCP-providers](MCP-providers)** (or regenerate lists from `config/`). When dependencies change, update **[Third-party-projects](Third-party-projects)** and root `THIRD_PARTY_NOTICES.md`.
