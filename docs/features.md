---
layout: default
title: Features
permalink: /features/
---

# Features

Agentic Orchestration focuses on **wiring** models, agents, and tools—not replacing them. Below is what the product layer adds on top of CrewAI and your existing infrastructure.

## Orchestration modes

| Mode | What you get |
|------|----------------|
| **Static workflows** | YAML-defined agent sequences under `config/workflows/` |
| **Router** | Natural-language pick among routable workflows (files with `meta` blocks) |
| **Dynamic** | Planner builds a fresh multi-step plan from the goal and catalogs |
| **Dynamic iterative** | Re-plan between rounds with optional streaming and auto-adjusted round counts |

## Model and provider agnosticism

- **Agent provider catalog** — One YAML template per agent; mix Ollama, OpenAI-compatible APIs, Anthropic, Hugging Face, vLLM, JetStream, and more.
- **Hardware awareness** — Filter providers by declared `cpu` / `gpu` / `tpu` and optional VRAM heuristics.
- **LiteLLM-backed planner** — Planning can use the same breadth of backends as execution.

## MCP tool integration

- Shipped catalog for search, Home Assistant, fetch, memory, filesystem, Exa, and other servers.
- **Streamable HTTP** and **stdio** MCP configs resolved into CrewAI tool attachments.
- Credential gating via `required_env` so only configured tools appear to the planner.

## Execution backends

- **In-process CrewAI** (default) for local development and single-machine runs.
- **Subprocess** workers for isolated step execution.
- **Kubernetes** roadmap for pod-per-step distributed runs (see [Kubernetes execution upgrade]({{ '/Kubernetes-execution-upgrade/' | relative_url }})).

## Memory, learning, and UI

- **Sessions** — Persist planner context and run history as JSON under configurable paths.
- **Knowledge base** — Optional SQLite + FTS store for reusable snippets in later plans.
- **Learning loop** — Optional scoring traces to nudge provider selection over time.
- **Web UI** — Node WebSocket server that launches the Python tool for chat-style dynamic runs.

## What you configure

| Area | Where it lives |
|------|----------------|
| Agent templates | `config/agent_providers/` |
| MCP servers | `config/mcp_providers/` |
| Workflows | `config/workflows/` |
| Runtime policy | `.env` / environment variables |

For exhaustive reference material, see [Documentation]({{ '/documentation/' | relative_url }}).
