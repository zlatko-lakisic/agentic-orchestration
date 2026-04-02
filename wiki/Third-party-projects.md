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
