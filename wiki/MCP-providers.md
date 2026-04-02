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

## Curated MCP directory (community)

The **[awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)** list (maintained on GitHub) groups thousands of third-party MCP server implementations by category (search, home automation, databases, and so on). It is a **discovery index**, not an endorsement list. Use it to find servers to run yourself, then wire them into this project via new YAML under `config/mcp_providers/` or `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`.

### Mapping: this repo’s YAML ↔ awesome-mcp-servers

The table below links **each shipped `config/mcp_providers/*.yaml` `id`** to **related entries** in awesome-mcp-servers. Those GitHub projects are **alternative or complementary** MCP hosts for the same *kind* of capability; they are **not** what this repo calls by default.

| Catalog `id` | What we connect to by default | Related listings on [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) (examples) |
|--------------|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `home_assistant` | **Official** [Home Assistant MCP integration](https://www.home-assistant.io/integrations/mcp_server/) — Streamable HTTP at `/api/mcp` with a long-lived token (see YAML). | Same problem space as community servers indexed under **Home automation** / **Other tools**, e.g. [allenporter/mcp-server-home-assistant](https://github.com/allenporter/mcp-server-home-assistant), [tevonsb/homeassistant-mcp](https://github.com/tevonsb/homeassistant-mcp). Those typically target HA over different transports or scopes; prefer the official integration when you control the HA instance. |
| `search_brave` | **Brave Search** via a **Streamable HTTP** MCP URL you set in `BRAVE_SEARCH_MCP_URL`, with `BRAVE_SEARCH_API_KEY` (see YAML). | **Search & data extraction** section lists Brave-oriented MCP servers, e.g. [brave/brave-search-mcp-server](https://github.com/brave/brave-search-mcp-server), [mikechao/brave-search-mcp](https://github.com/mikechao/brave-search-mcp). Useful if you self-host or need a reference implementation; point your env at whichever server matches your deployment. |
| `search_tavily` | **Tavily**’s hosted MCP endpoint with API key in the URL (default pattern in YAML). | **Search & data extraction** section lists Tavily-related MCP servers, e.g. [tavily-ai/tavily-mcp](https://github.com/tavily-ai/tavily-mcp), [Tomatio13/mcp-server-tavily](https://github.com/Tomatio13/mcp-server-tavily), [kshern/mcp-tavily](https://github.com/kshern/mcp-tavily). Our default uses Tavily’s documented remote MCP URL; community repos may help for self-hosted or stdio transports. |

When awesome-mcp-servers reorganizes sections, search that README for “Brave”, “Tavily”, or “Home Assistant” to find the current bullet list.

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
- **Awesome list (community equivalents):** [allenporter/mcp-server-home-assistant](https://github.com/allenporter/mcp-server-home-assistant), [tevonsb/homeassistant-mcp](https://github.com/tevonsb/homeassistant-mcp).

### `search_brave`

- **Streamable HTTP** endpoint from `BRAVE_SEARCH_MCP_URL` (configure per your Brave MCP deployment).
- **API key:** `BRAVE_SEARCH_API_KEY` (or satisfy `required_env_any` as defined in YAML).
- **Awesome list (Brave search MCP examples):** [brave/brave-search-mcp-server](https://github.com/brave/brave-search-mcp-server), [mikechao/brave-search-mcp](https://github.com/mikechao/brave-search-mcp).

### `search_tavily`

- **Default URL:** Tavily remote MCP with query parameter `tavilyApiKey=${TAVILY_API_KEY}`.
- **Docs:** [Tavily MCP guide](https://docs.tavily.com/guides/mcp)
- **Awesome list (Tavily MCP examples):** [tavily-ai/tavily-mcp](https://github.com/tavily-ai/tavily-mcp), [Tomatio13/mcp-server-tavily](https://github.com/Tomatio13/mcp-server-tavily), [kshern/mcp-tavily](https://github.com/kshern/mcp-tavily).

## Adding a new MCP

1. Create `config/mcp_providers/<id>.yaml` with unique `id`.
2. Set `required_env` / `required_env_any` so the planner only sees integrations you can actually call.
3. Implement `streamable_http` and/or CrewAI-compatible `ref`/`refs` blocks as supported by your runner (see tool README and existing YAML).
4. Restart runs after changing env vars.

## Related pages

- [Dynamic-planning](Dynamic-planning) — when MCP sets appear in plans.
- [Configuration](Configuration) — env vars for HA and search.
- [Third-party-projects](Third-party-projects) — upstream products and licenses.
- [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) — broader MCP server catalog (community-maintained).
