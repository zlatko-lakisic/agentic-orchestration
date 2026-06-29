---
layout: splash
title: "Agentic Orchestration"
excerpt: "YAML-driven multi-agent workflows on your models, your tools, your infrastructure."
header:
  overlay_color: "#0d1117"
  overlay_filter: 0.7
  overlay_image: /assets/images/hero-bg.png
  actions:
    - label: "Quick Start"
      url: /quick-start/
    - label: "View on GitHub"
      url: https://github.com/zlatko-lakisic/agentic-orchestration
      btn_class: "btn--inverse"
feature_row:
  - image_path: /assets/logo.png
    alt: "Model agnostic"
    title: "Any model, any backend"
    excerpt: "Mix Ollama, OpenAI, Anthropic, Hugging Face, vLLM, and JetStream per step. Swap providers without touching orchestration code."
  - title: "YAML catalogs, not custom glue"
    excerpt: "Agent templates, MCP tool integrations, and workflows live in YAML. Credentials and hardware filters come from environment variables."
  - title: "Dynamic or deterministic"
    excerpt: "Run static YAML workflows, let a router pick the right one, or use `--dynamic` for LLM-planned multi-step execution with optional iterative re-planning."
feature_row2:
  - title: "MCP tools out of the box"
    excerpt: "Shipped integrations for Home Assistant, Brave Search, Tavily, Exa, URL fetch, local filesystem, and memory knowledge graph. Add your own via YAML."
  - title: "Memory & learning"
    excerpt: "Sessions persist planner history across runs. A local SQLite knowledge base caches finalized answers. A lightweight learning loop nudges provider selection over time."
  - title: "Execution backends"
    excerpt: "In-process CrewAI for development. Subprocess workers for step isolation. Kubernetes pod-per-step for production scale."
---

{% include feature_row %}

## How it works

Give it a goal. The planner reads your agent catalog and MCP catalog, picks the right specialists, and builds a sequential multi-agent workflow — all from a single command:

```bash
python main.py --dynamic "Research the top 5 open-source LLM inference frameworks and produce a comparison"
```

Each step runs the right model with the right tools attached. Sessions, knowledge base, and quality assurance run automatically.

{% include feature_row id="feature_row2" %}

## Shipped verticals

Domain overlays bundle orchestrator context, extra agents, and MCP fragments for focused demos. Run them with a single flag:

| Vertical | What it demonstrates |
|---|---|
| `--example healthcare` | Evidence-oriented multi-agent briefs with medtech orchestrator context |
| `--example logistics` | Warehousing flows with WMS/ERP MCP hooks and labor framing |

[Browse all features](/features/){: .btn .btn--primary .btn--large} [Agent catalog](/agent-catalog/){: .btn .btn--inverse .btn--large}
