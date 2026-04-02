# MCP providers (shipped catalog)

The tool loads MCP **templates** from `agentic-orchestration-tool/config/mcp_providers/` (one `*.yaml` per integration unless using a legacy bundle file). Merge additional directories via `AGENTIC_EXTRA_MCP_PROVIDERS_PATH` (`;` on Windows, `:` on Unix).

## Design

Each file is a **single** mapping (not a list) with at least:

- **`id`** — Stable identifier referenced by the planner / plan JSON.
- **`description`** — Human-readable summary for docs and debugging.
- **`planner_hint`** — Short text injected into planner context so the model knows when to attach this MCP.
- **`user_goal_keywords`** (optional) — Keyword hints for relevance / pruning.
- **`required_env`** / **`required_env_any`** (optional) — Credential gating; entries are dropped if env is missing.

Connection shapes used in this repo:

- **`streamable_http`** — `url` and optional `headers`; `${VAR}` placeholders are expanded from the environment.

Upstream protocol reference: [Model Context Protocol](https://modelcontextprotocol.io/).

## Inventory (repository)

| `id` | Purpose | Required environment |
|------|---------|----------------------|
| `home_assistant` | Home Assistant entities/tools via Assist MCP (Streamable HTTP). | `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_TOKEN` |
| `search_brave` | Web search via Brave Search MCP. | One of: `BRAVE_SEARCH_API_KEY`; URL may use `BRAVE_SEARCH_MCP_URL` |
| `search_tavily` | Web search via Tavily-hosted MCP. | One of: `TAVILY_API_KEY` (key embedded in default URL pattern) |

### `home_assistant`

- **Docs:** [Home Assistant MCP Server](https://www.home-assistant.io/integrations/mcp_server/)
- **URL pattern:** `${HOME_ASSISTANT_URL}/api/mcp` (no trailing slash on the base URL env value).
- **Auth:** `Authorization: Bearer ${HOME_ASSISTANT_TOKEN}` (long-lived access token).

### `search_brave`

- **Streamable HTTP** endpoint from `BRAVE_SEARCH_MCP_URL` (configure per your Brave MCP deployment).
- **API key:** `BRAVE_SEARCH_API_KEY` (or satisfy `required_env_any` as defined in YAML).

### `search_tavily`

- **Default URL:** Tavily remote MCP with query parameter `tavilyApiKey=${TAVILY_API_KEY}`.
- **Docs:** [Tavily MCP guide](https://docs.tavily.com/guides/mcp)

## Adding a new MCP

1. Create `config/mcp_providers/<id>.yaml` with unique `id`.
2. Set `required_env` / `required_env_any` so the planner only sees integrations you can actually call.
3. Implement `streamable_http` and/or CrewAI-compatible `ref`/`refs` blocks as supported by your runner (see tool README and existing YAML).
4. Restart runs after changing env vars.

## Related pages

- [Dynamic-planning](Dynamic-planning) — when MCP sets appear in plans.
- [Configuration](Configuration) — env vars for HA and search.
- [Third-party-projects](Third-party-projects) — upstream products and licenses.
