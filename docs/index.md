---
layout: default
title: Home
permalink: /
---

<div class="product-hero">

# Orchestrate multi-agent workflows on your stack

**Agentic Orchestration** is a model-agnostic layer on [CrewAI](https://github.com/crewAIInc/crewAI). Describe a goal in natural language—or wire YAML workflows—and run coordinated agents across **Ollama**, **OpenAI**, **Anthropic**, **Hugging Face**, and **MCP** tools you already operate.

<div class="product-cta">
  <a class="btn btn-primary" href="https://github.com/zlatko-lakisic/agentic-orchestration">View on GitHub</a>
  <a class="btn btn-secondary" href="{{ '/getting-started/' | relative_url }}">Get started</a>
  <a class="btn btn-secondary" href="{{ '/documentation/' | relative_url }}">Documentation</a>
</div>

</div>

![Agentic orchestration — from hardcoded workflows to dynamic agent crews](assets/1.png)

## Why teams use it

<div class="feature-grid">

<div class="feature-card">

### Your models, your tools

Mix local and cloud LLMs per task. Attach MCP servers for Home Assistant, search, docs, memory, filesystem access, and custom APIs—without rewriting orchestration code.

</div>

<div class="feature-card">

### Configuration, not custom glue

Agent templates, MCP catalogs, and workflows live in YAML. Credentials and hardware filters come from environment variables so you can reach a proof of concept quickly.

</div>

<div class="feature-card">

### Dynamic or deterministic

Run **static** workflow YAML, **router** mode over a workflow library, or **dynamic** planning that chooses agents and tools per step—with optional iterative re-planning.

</div>

<div class="feature-card">

### Browser UI included

A local WebSocket chat UI spawns the Python orchestrator for interactive dynamic and iterative runs—useful for demos and day-to-day experimentation.

</div>

</div>

## How it works

1. **Plan** — A planner interprets the goal (and optional session history) and emits ordered steps with agent and MCP selections.
2. **Execute** — CrewAI crews run each step with the right model backend and tool attachments.
3. **Adapt** — Iterative mode can re-plan between rounds; sessions, learning traces, and a local knowledge base optional carry context forward.

See [Features]({{ '/features/' | relative_url }}) for the full capability list.

## Example scenarios

Shipped **vertical overlays** package domain context, extra agent YAML, and MCP fragments for focused demos:

| Scenario | What it demonstrates |
|----------|----------------------|
| **Healthcare** | Evidence-oriented multi-agent briefs with medtech-style orchestrator context |
| **Logistics** | Warehousing flows with WMS/ERP MCP hooks and labor-oriented framing |

![Healthcare vertical](https://raw.githubusercontent.com/zlatko-lakisic/agentic-orchestration/main/examples/verticals/healthcare/banner.png)

![Logistics vertical](https://raw.githubusercontent.com/zlatko-lakisic/agentic-orchestration/main/examples/verticals/logistics/banner.png)

Run with `--example healthcare` or `--example logistics` from the tool CLI. Details live in the [repository](https://github.com/zlatko-lakisic/agentic-orchestration/tree/main/examples/verticals).

## Open source

The project is maintained on GitHub as an experimentation-friendly orchestration stack. Deep technical references—architecture, catalogs, CLI flags, and operations—live in the [documentation]({{ '/documentation/' | relative_url }}) section.
