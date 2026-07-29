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
| **RAG sources** | `AGENTIC_EXTRA_RAG_SOURCES_PATH`, `AGENTIC_RAG_INJECT_MAX_TOKENS` — see [RAG sources]({{ '/rag-catalog/' | relative_url }}) |
| **Execution backend** | `AGENTIC_EXECUTION_BACKEND`, `AGENTIC_SUBPROCESS_WORKERS`, `AGENTIC_RUN_STORE_PATH` | See [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}), [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) |
| **Progress / step context** | `AGENTIC_PROGRESS`, `AGENTIC_STEP_CONTEXT_*` |
| **Learning & KB** | `AGENTIC_LEARNING*`, `AGENTIC_KB*` (attachment fingerprints: `attachment_fingerprint`; legacy `mcp_fingerprint` alias); user harness: `AGENTIC_USER_HARNESS_RECORD_STATS`, `AGENTIC_USER_HARNESS_FEED_PLANNER` |
| **Cloud anonymization** | `AGENTIC_ANONYMIZE_CLOUD` (default `1`), `AGENTIC_CLOUD_PROVIDER_TYPES` (default `openai,anthropic,huggingface`), `AGENTIC_ANONYMIZE_PATTERNS_PATH` / `AGENTIC_EXTRA_ANONYMIZE_PATTERNS_PATH` — scrub PII/secrets before cloud LLM egress; YAML custom regexes; privacy/offline goals force local providers. **Tier 3**: `AGENTIC_ANONYMIZE_REVERSIBLE` (default `1`, unique recoverable `[EMAIL:1]`-style tokens), `AGENTIC_ANONYMIZE_NER` (default `0`, optional Presidio PERSON/LOCATION/NRP pass — soft dep, see `requirements-anonymize.txt`), `AGENTIC_ANONYMIZE_TOOL_RESULTS` (default `1`, scrub fetched pages / prior-step handoff), `AGENTIC_ANONYMIZE_VISION_LOCAL` / `AGENTIC_ANONYMIZE_VISION_MODEL` (default `1` / `ollama/llava`, prefer local vision model for video synopsis) |
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
- `AGENTIC_ANONYMIZE_CLOUD=1` (default): redact emails, phones, SSN-like patterns, API keys, and card-like digit runs before cloud planner/agent calls; also scrub attachment excerpts and session/KB writes. Set `0` to disable. Cloud types: `AGENTIC_CLOUD_PROVIDER_TYPES` (comma list). Goals that ask for offline/private/ollama-only drop those cloud types from the planner catalog and require a non-cloud `AGENTIC_PLANNER_MODEL`.
- Custom regex scrubbers: `config/anonymize_patterns.yaml` (or `AGENTIC_ANONYMIZE_PATTERNS_PATH`) plus optional `AGENTIC_EXTRA_ANONYMIZE_PATTERNS_PATH`. Each entry has `id`, `pattern`, optional `replacement` / `flags` / `enabled`. Applied after built-ins. See `config/anonymize_patterns_examples.yaml`.
- **Tier 3** (`orchestration/cloud_anonymize_tier3.py`, re-exported from `cloud_anonymize.py`): `AGENTIC_ANONYMIZE_REVERSIBLE=1` (default) mints unique per-value placeholders (`[EMAIL:1]`, `[PERSON:2]`) instead of static ones, tracked in a session `TokenMap` (ContextVar; optionally persisted to `__orchestrator_sessions__/anon_maps/<slug>.json` via `set_token_map_session(slug)`); `restore_tokens(text)` recovers originals for a final answer. `AGENTIC_ANONYMIZE_NER=0` (default off) runs an optional Presidio pass (PERSON/LOCATION/NRP, `AGENTIC_ANONYMIZE_NER_ENTITIES`) after the regex scrub — soft dependency, install `pip install -r requirements-anonymize.txt` and a spaCy model (`python -m spacy download en_core_web_lg`); skipped with a one-time stderr warning if missing. `AGENTIC_ANONYMIZE_TOOL_RESULTS=1` (default) scrubs tool-call output — fetched page text (`fetch_url_tool.py`) and prior-step handoff (`step_context.py`) — before it flows into later steps. `AGENTIC_ANONYMIZE_VISION_LOCAL=1` (default) prefers a local Ollama vision model (`AGENTIC_ANONYMIZE_VISION_MODEL`, default `ollama/llava`) over cloud for video-frame synopsis when anonymization is active; if the local model fails, the synopsis is skipped (stderr note) rather than falling back to cloud.

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
- [RAG sources]({{ '/rag-catalog/' | relative_url }}) — retrieval corpora (`sqlite-fts`, `embedding`, `hybrid` shipped; known gaps on that page)
- [Agent skills roadmap]({{ '/agent-skills-roadmap/' | relative_url }}) — procedural skill catalog env vars and attachment semantics
- [Agent skills]({{ '/agent-skills/' | relative_url }}) — shipped skill inventory
- [CLI reference]({{ '/cli-reference/' | relative_url }})
- Root `README.md` — summary table
