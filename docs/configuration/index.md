---
layout: single
title: "Configuration"
permalink: /configuration/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
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
| **MCP** | `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`, `HOME_ASSISTANT_*`, `BRAVE_SEARCH_*`, `TAVILY_API_KEY`, `EXA_API_KEY`, `AGENTIC_MCP_FETCH_ENABLED`, `AGENTIC_MCP_MEMORY_MCP_ENABLED`, `FILESYSTEM_MCP_ALLOWED_DIRECTORY`, goal-match toggles |
| **Agent skills** | `AGENTIC_AGENT_SKILLS_CATALOG`, `AGENTIC_EXTRA_AGENT_SKILLS_PATH`, `AGENTIC_SKILLS_MAX_CHARS_PER_TASK`, `AGENTIC_DISABLE_SKILL_GOAL_MATCH`, `AGENTIC_STRICT_SKILL_IDS` |
| **Execution backend** | `AGENTIC_EXECUTION_BACKEND`, `AGENTIC_SUBPROCESS_WORKERS`, `AGENTIC_RUN_STORE_PATH` | See [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}), [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) |
| **Progress / step context** | `AGENTIC_PROGRESS`, `AGENTIC_STEP_CONTEXT_*` |
| **Learning & KB** | `AGENTIC_LEARNING*`, `AGENTIC_KB*` (attachment fingerprints: `attachment_fingerprint`; legacy `mcp_fingerprint` alias); user harness: `AGENTIC_USER_HARNESS_RECORD_STATS`, `AGENTIC_USER_HARNESS_FEED_PLANNER` |
| **Answer cache** | `AGENTIC_ANSWER_CACHE` |
| **Iterative mode** | `AGENTIC_DYNAMIC_ITERATIVE_*`, controller-related vars |
| **Iterative stdout behavior** | `AGENTIC_DYNAMIC_ITER_STREAM_STEPS` |
| **Attachments / uploads** | `AGENTIC_ATTACHMENTS_ALLOW_ABSOLUTE` (advanced escape hatch; defaults keep paths under tool upload directory) |
| **Extra catalogs** | `AGENTIC_EXTRA_AGENT_PROVIDERS_PATH`, `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`, `AGENTIC_EXTRA_AGENT_SKILLS_PATH`, `AGENTIC_EXTRA_AGENT_HARNESS_DIRS` |
| **Artifacts** | `AGENTIC_VERIFY`, output dirs |

## Execution backend

| Variable | Default | Meaning |
|----------|---------|---------|
| `AGENTIC_EXECUTION_BACKEND` | `inprocess` | `inprocess` (CrewAI in-process), `subprocess`, or `kubernetes` (stub). Aliases: `crewai`, `k8s`. |
| `AGENTIC_SUBPROCESS_WORKERS` | `0` | When `1` and backend is `subprocess`, run each step via `python main.py --execute-step`. Otherwise subprocess backend falls back to in-process CrewAI. |
| `AGENTIC_RUN_STORE_PATH` | _(unset)_ | Mounted directory for distributed step handoffs: `{path}/{run_id}/{step_id}/result.json`. Used by subprocess workers today; same path on a PVC for K8s Jobs. When unset, each run uses a temp directory. |
| `AGENTIC_K8S_ALLOW_STDIO_MCPS` | `0` | K8s mode only: when `1`, allow stdio MCP ids if sidecars exist (K4). K3 MVP keeps `0`. See [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}#mcp-compatibility-matrix-k8s-mode). |

See [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}) for architecture and phased rollout. See [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) for PVC layout on cluster.

## Notable runtime toggles

- `AGENTIC_ANSWER_CACHE=1` (default): same-goal replay in the same orchestrator session, with explicit "reply no to re-run" flow.
- `AGENTIC_DYNAMIC_ITER_STREAM_STEPS=1`: emit each iterative round output to stdout instead of only the final synthesis.
- `AGENTIC_OLLAMA_PULL_PROGRESS_STDERR=1` (default): keep normalized Ollama pull progress lines visible on stderr for web activity/progress UI.
- `AGENTIC_AUTO_ENSURE_RUNTIME=1` (default): ensure Python `.venv` + `requirements.txt`, and for Ollama agents install/serve/pull models (not only `selfcontained: true`). Set `0` for legacy behaviour.
- `AGENTIC_AUTO_ENSURE_OLLAMA_IN_K8S=1`: allow Ollama auto-ensure inside kubernetes workers (off by default; host Ollama + `host.k3s.internal` is the Jetson path).

## Web server (`agentic-orchestration-web/.env`)

| Variable | Role |
|----------|------|
| `AGENTIC_TOOL_ROOT` | Path to folder containing `main.py` |
| `AGENTIC_PYTHON` | Python executable (defaults to tool `.venv` when present) |
| `AGENTIC_WEB_HOST` | Bind address (`0.0.0.0` for LAN) |
| `AGENTIC_WEB_PORT` | Default `3847` |
| `AGENTIC_ORCHESTRATE_API_KEY` | Bearer/API key for `POST /api/v1/orchestrate` (OpenClaw). Falls back to `AGENTIC_CHAT_COMPLETIONS_API_KEY` when unset. |
| `AGENTIC_CHAT_COMPLETIONS_API_KEY` | Shared key for chat-completions-compatible proxies and orchestrate fallback. |

See `agentic-orchestration-web/README.md` and [Web UI]({{ '/web-ui/' | relative_url }}).

## Security

Never commit `.env` or tokens. `.env` files are gitignored by convention.

## Related

- [MCP providers]({{ '/mcp-catalog/' | relative_url }}) — required env per integration; [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) cross-reference
- [Agent skills roadmap]({{ '/agent-skills-roadmap/' | relative_url }}) — procedural skill catalog env vars and attachment semantics
- [Agent skills]({{ '/agent-skills/' | relative_url }}) — shipped skill inventory
- [CLI reference]({{ '/cli-reference/' | relative_url }})
- Root `README.md` — summary table
