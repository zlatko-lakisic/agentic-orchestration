---
title: "Configuration"
layout: single
sidebar:
  nav: "docs"
toc: true
toc_sticky: true
---

Environment variables for `agentic-orchestration-tool`. The canonical reference is [`.env.example`](https://github.com/zlatko-lakisic/agentic-orchestration/blob/main/agentic-orchestration-tool/.env.example) in the repository.

## Model providers

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key (also used by default planner when model is `openai/*`) |
| `OPENAI_MODEL_NAME` | Default OpenAI model name |
| `OPENAI_BASE_URL` | OpenAI-compatible endpoint (LM Studio, vLLM `/v1`, Azure proxy) |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `ANTHROPIC_BASE_URL` | Optional custom Anthropic API base |
| `HF_TOKEN` / `HUGGINGFACE_API_KEY` | Hugging Face Hub token |
| `HUGGINGFACE_API_BASE` | Custom HF inference endpoint |
| `OLLAMA_HOST` | Ollama base URL (router + Ollama providers) |
| `VLLM_BASE_URL` | vLLM OpenAI-compatible endpoint |
| `JETSTREAM_BASE_URL` | JetStream TPU serving endpoint |

## Dynamic planner

| Variable | Default | Description |
|---|---|---|
| `AGENTIC_PLANNER_MODEL` | `openai/gpt-4o-mini` | LiteLLM model id for planning |
| `AGENTIC_PLANNER_MAX_STEPS` | `8` | Max steps in a plan |
| `AGENTIC_PLANNER_JSON_MODE` | `1` | Use `response_format` JSON object |
| `AGENTIC_PLANNER_USE_LITELLM` | `1` | Use LiteLLM (set `0` for legacy HTTP) |
| `AGENTIC_PLANNER_REPAIR_RETRY` | `1` | Retry once on invalid JSON |
| `AGENTIC_PLANNER_CONTEXT_TURNS` | `6` | Max planner context turns on 429 shrink |
| `AGENTIC_PLANNER_MESSAGE_CHARS` | `8000` | Truncate long planner messages |

## Sessions

| Variable | Description |
|---|---|
| `AGENTIC_ORCHESTRATOR_SESSION` | Named session slug (same as `--orchestrator-session`) |
| `AGENTIC_ORCHESTRATOR_DEFAULT_SESSION` | Default slug when none specified |
| `AGENTIC_ORCHESTRATOR_MAX_PLANNER_TURNS` | Cap stored planner pairs (default `12`) |
| `AGENTIC_ORCHESTRATOR_EXCERPT_CHARS` | Crew output excerpt length |
| `AGENTIC_ORCHESTRATOR_CONTEXT` | Free-text domain rules appended to planner prompts |
| `AGENTIC_ORCHESTRATOR_CONTEXT_FILE` | Path to orchestrator context file |

## Hardware

| Variable | Description |
|---|---|
| `AGENTIC_AVAILABLE_ARCHITECTURES` | Manual override: `cpu,gpu,tpu` |
| `AGENTIC_ASSUME_GPU` | Force GPU available |
| `AGENTIC_ASSUME_TPU` | Force TPU available |
| `AGENTIC_ASSUME_VRAM_GB` | Override detected VRAM |
| `AGENTIC_MAX_VRAM_FRACTION` | Use fraction of detected VRAM |
| `AGENTIC_DISABLE_HARDWARE_FILTER` | Never drop providers by VRAM |

## MCP catalog

| Variable | Description |
|---|---|
| `AGENTIC_EXTRA_MCP_PROVIDERS_PATH` | Extra MCP YAML directories |
| `HOME_ASSISTANT_URL` | Home Assistant instance URL |
| `HOME_ASSISTANT_TOKEN` | Long-lived HA access token |
| `TAVILY_API_KEY` | Tavily search API key |
| `BRAVE_SEARCH_API_KEY` | Brave Search API key |
| `BRAVE_SEARCH_MCP_URL` | Brave MCP server URL |
| `EXA_API_KEY` | Exa API key |
| `AGENTIC_MCP_FETCH_ENABLED` | Opt in to `fetch_url` MCP |
| `FILESYSTEM_MCP_ALLOWED_DIRECTORY` | Allowed root for filesystem MCP |
| `AGENTIC_MCP_MEMORY_MCP_ENABLED` | Opt in to memory knowledge graph |

## Execution backends

| Variable | Description |
|---|---|
| `AGENTIC_EXECUTION_BACKEND` | `inprocess` \| `subprocess` \| `kubernetes` |
| `AGENTIC_SUBPROCESS_WORKERS` | `1` to spawn per-step workers |
| `AGENTIC_RUN_STORE_PATH` | Shared run store mount path |
| `AGENTIC_K8S_NAMESPACE` | K8s namespace |
| `AGENTIC_K8S_WORKER_IMAGE` | Worker container image |
| `AGENTIC_K8S_RUN_STORE_PVC` | PVC name for run store |
| `AGENTIC_K8S_RUN_STORE_MOUNT` | Mount path inside pods (default `/run/store`) |
| `AGENTIC_K8S_RUN_STORE_VOLUME` | `hostpath` \| `nfs` \| `filestore` |

## Learning and knowledge base

| Variable | Description |
|---|---|
| `AGENTIC_LEARNING` | Enable learning loop |
| `AGENTIC_LEARNING_EVAL` | Run evaluator model on outputs |
| `AGENTIC_KB` | Enable SQLite knowledge base |
| `AGENTIC_KB_MAX_HITS` | Max KB snippets in planner prompt |
| `AGENTIC_ANSWER_CACHE` | Cache finalized answers per session |
| `AGENTIC_FINAL_QA` | Faithfulness QA pass after dynamic runs |
| `AGENTIC_QA_MODEL` | Model for QA (defaults to planner/eval) |

## Web server

| Variable | Description |
|---|---|
| `AGENTIC_WEB_HOST` | Bind host (web package) |
| `AGENTIC_WEB_PORT` | Bind port (default `3847`) |
| `AGENTIC_EXAMPLE` | Vertical overlay id for web (`healthcare`, `logistics`) |

## Iterative mode

| Variable | Description |
|---|---|
| `AGENTIC_DYNAMIC_ITERATIVE_ROUNDS` | Default max rounds |
| `AGENTIC_DYNAMIC_ITERATIVE_MAX_ROUNDS` | Hard cap for auto mode |
| `AGENTIC_DYNAMIC_ITERATIVE_MIN_ROUNDS` | Min rounds before auto may stop |
| `AGENTIC_ITERATIVE_CONTROLLER_MODEL` | Controller model for auto mode |

## Agent catalog

| Variable | Description |
|---|---|
| `AGENTIC_AGENT_PROVIDERS_CATALOG` | Override agent catalog directory |
| `AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS` | Merge extra YAML dirs |
| `AGENTIC_EXTRA_AGENT_PROVIDERS_PATH` | Python `AgentProvider` scan path |
