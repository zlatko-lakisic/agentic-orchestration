# Cloud-only agent provider catalog

This directory contains **only** OpenAI- and Anthropic-backed agent templates for deployments
where the orchestrator on a gateway host (e.g. ARM edge) should call **cloud APIs** and omit
local Ollama, Hugging Face, vLLM, JetStream, etc.

## Enable

In `agentic-orchestration-tool/.env` (or the environment of the process that runs `main.py`):

```bash
AGENTIC_AGENT_PROVIDERS_CATALOG=config/agent_providers_cloud
```

Use an **absolute** path if the process `cwd` is not the tool root.

Unset or empty `AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS` so vertical overlays do not merge
extra local providers back in.

## Credentials

- OpenAI: `OPENAI_API_KEY` and optional `OPENAI_BASE_URL` / `OPENAI_API_BASE`
- Anthropic: `ANTHROPIC_API_KEY`

## Planner

Point the planner at the same cloud stack, for example:

```bash
AGENTIC_PLANNER_MODEL=openai/gpt-4o-mini
# or
AGENTIC_PLANNER_MODEL=anthropic/claude-3-5-haiku-20241022
```
