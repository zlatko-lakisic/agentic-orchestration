# Third-party projects and references

This page summarizes **upstream products and libraries** used or integrated by the repository. **License and version detail** for direct Python/npm dependencies are maintained in the root file **`THIRD_PARTY_NOTICES.md`** — keep that file in sync when you change `requirements.txt` or `package.json`.

## Orchestration and agents

| Project | Use in this repo |
|---------|------------------|
| [CrewAI](https://github.com/crewAIInc/crewAI) | Agent, task, crew, process; core execution model. |
| [LiteLLM](https://github.com/BerriAI/litellm) | Planner backend breadth (OpenAI, Anthropic, Ollama, Hugging Face, etc.). |

## Protocols and integrations

| Project / spec | Use in this repo |
|----------------|------------------|
| [Model Context Protocol](https://modelcontextprotocol.io/) | MCP tool attachments; `streamable_http` and ref-style configs. |
| [Home Assistant](https://www.home-assistant.io/) | MCP server integration (`home_assistant` catalog entry). |
| [Brave Search](https://brave.com/search/api/) | Optional search MCP (`search_brave`). |
| [Tavily](https://tavily.com/) | Optional search MCP (`search_tavily`). |

## MCP server discovery (community catalog)

The **[awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)** repository is a large, category-organized index of MCP server implementations (search, automation, databases, and more). It is useful for **discovering** servers to add to your own `AGENTIC_EXTRA_MCP_PROVIDERS_PATH` or new YAML under `config/mcp_providers/`.

Shipped catalog entries in **this** repo and **example** related projects from that list:

| Our YAML `id` | Primary vendor / docs | Example related repos on awesome-mcp-servers |
|---------------|----------------------|-----------------------------------------------|
| `home_assistant` | [HA MCP integration](https://www.home-assistant.io/integrations/mcp_server/) | [allenporter/mcp-server-home-assistant](https://github.com/allenporter/mcp-server-home-assistant), [tevonsb/homeassistant-mcp](https://github.com/tevonsb/homeassistant-mcp) |
| `search_brave` | [Brave Search API](https://brave.com/search/api/) | [brave/brave-search-mcp-server](https://github.com/brave/brave-search-mcp-server), [mikechao/brave-search-mcp](https://github.com/mikechao/brave-search-mcp) |
| `search_tavily` | [Tavily MCP](https://docs.tavily.com/guides/mcp) | [tavily-ai/tavily-mcp](https://github.com/tavily-ai/tavily-mcp), [Tomatio13/mcp-server-tavily](https://github.com/Tomatio13/mcp-server-tavily), [kshern/mcp-tavily](https://github.com/kshern/mcp-tavily) |

Details and caveats (official HA endpoint vs community servers, env vars): **[MCP-providers](MCP-providers)**.

## Model providers (configuration targets)

Catalog YAMLs reference **vendor APIs** or runtimes; you configure keys in `.env`:

| Provider | Typical env / notes |
|----------|---------------------|
| [OpenAI](https://openai.com/) | `OPENAI_API_KEY`, optional `OPENAI_BASE_URL` for compatible gateways |
| [Anthropic](https://www.anthropic.com/) | `ANTHROPIC_API_KEY` |
| [Hugging Face](https://huggingface.co/) | `HF_TOKEN`, `HUGGINGFACE_API_BASE` for endpoints |
| [Ollama](https://ollama.com/) | `OLLAMA_HOST`, local model pull/run |

## Web UI runtime

| Package | Use |
|---------|-----|
| [ws](https://github.com/websockets/ws) | WebSocket server (see `agentic-orchestration-web/package.json`). |
| Node.js | HTTP server, spawns Python. |

## Python utilities (direct deps)

Listed in **`THIRD_PARTY_NOTICES.md`**: e.g. `python-dotenv`, `PyYAML`, `httpx` — plus **transitive** dependencies pulled in by CrewAI/LiteLLM (not fully enumerated in notices; see pip resolver / SBOM tools if you need compliance depth).

## This repository’s license

Apache-2.0 — see `LICENSE` and `NOTICE` in the project root.

## Related wiki pages

- [Architecture](Architecture)
- [MCP-providers](MCP-providers)
- [Agent-provider-catalog](Agent-provider-catalog)
