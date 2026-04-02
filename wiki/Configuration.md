# Configuration (environment variables)

**Authoritative reference:** `agentic-orchestration-tool/.env.example` — every variable is documented inline with defaults and behavior.

**Load order:** `python-dotenv` loads `.env` from the tool directory when you start `main.py` (see `main.py`).

## Categories (summary)

| Category examples | Notes |
|-------------------|------|
| **OpenAI** | `OPENAI_API_KEY`, `OPENAI_MODEL_NAME`, `OPENAI_BASE_URL` (compatible servers) |
| **Anthropic** | `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL` |
| **Hugging Face** | `HF_TOKEN`, `HUGGINGFACE_API_BASE` |
| **Ollama** | `OLLAMA_HOST`, router model envs |
| **Dynamic planner** | `AGENTIC_PLANNER_MODEL`, `AGENTIC_PLANNER_USE_LITELLM`, `AGENTIC_PLANNER_MAX_STEPS`, JSON mode, repair retry, 429 retries, context window truncation |
| **Sessions** | `AGENTIC_ORCHESTRATOR_*` |
| **VRAM / hardware** | `AGENTIC_ASSUME_VRAM_GB`, `AGENTIC_MAX_VRAM_FRACTION`, `AGENTIC_MAX_VRAM_GB`, disable filters |
| **MCP** | `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`, `HOME_ASSISTANT_*`, `BRAVE_SEARCH_*`, `TAVILY_API_KEY`, goal-match toggles |
| **Progress / step context** | `AGENTIC_PROGRESS`, `AGENTIC_STEP_CONTEXT_*` |
| **Learning & KB** | `AGENTIC_LEARNING*`, `AGENTIC_KB*` |
| **Answer cache** | `AGENTIC_ANSWER_CACHE` |
| **Iterative mode** | `AGENTIC_DYNAMIC_ITERATIVE_*`, controller-related vars |
| **Extra catalogs** | `AGENTIC_EXTRA_AGENT_PROVIDERS_PATH`, `AGENTIC_EXTRA_MCP_PROVIDERS_PATH` |
| **Artifacts** | `AGENTIC_VERIFY`, output dirs |

## Web server (`agentic-orchestration-web/.env`)

| Variable | Role |
|----------|------|
| `AGENTIC_TOOL_ROOT` | Path to folder containing `main.py` |
| `AGENTIC_PYTHON` | Python executable (defaults to tool `.venv` when present) |
| `AGENTIC_WEB_HOST` | Bind address (`0.0.0.0` for LAN) |
| `AGENTIC_WEB_PORT` | Default `3847` |

See `agentic-orchestration-web/README.md`.

## Security

Never commit `.env` or tokens. `.env` files are gitignored by convention.

## Related

- [MCP-providers](MCP-providers) — required env per integration
- [CLI-reference](CLI-reference)
- Root `README.md` — summary table
