---
layout: splash
title: "Agentic Orchestration"
permalink: /
header:
  overlay_color: "#1a1a2e"
  overlay_filter: 0.6
  overlay_image: /assets/images/hero-bg.png
  actions:
    - label: "Quick Start"
      url: /quick-start/
    - label: "View on GitHub"
      url: https://github.com/zlatko-lakisic/agentic-orchestration
excerpt: >
  Model-agnostic multi-agent orchestration built on CrewAI.
  Dynamic planning, 182 agent templates, 7 MCP integrations,
  and three execution backends — from local Ollama to Kubernetes.
feature_row:
  - title: "Dynamic Planning"
    excerpt: "State a goal in plain language. The LLM planner selects agents, attaches MCP tools, and builds a multi-step execution plan automatically."
    url: /dynamic-planning/
    btn_label: "Learn more"
    btn_class: "btn--primary"
  - title: "182 Agent Templates"
    excerpt: "YAML catalog spanning OpenAI, Anthropic, Ollama, Hugging Face, vLLM, and JetStream. Hardware-aware routing filters by CPU/GPU/TPU and VRAM."
    url: /agent-catalog/
    btn_label: "Browse catalog"
    btn_class: "btn--primary"
  - title: "7 MCP Integrations"
    excerpt: "Brave Search, Tavily, Exa, Home Assistant, URL fetch, filesystem, and memory knowledge graph — credential-gated and Kubernetes-ready."
    url: /mcp-catalog/
    btn_label: "Browse integrations"
    btn_class: "btn--primary"
feature_row2:
  - title: "Three Execution Backends"
    excerpt: "In-process CrewAI (default), subprocess workers, or Kubernetes Jobs with a shared PVC run store. Same YAML catalogs across all three."
    url: /execution-backends/
    btn_label: "Learn more"
    btn_class: "btn--primary"
  - title: "Sessions, Learning & KB"
    excerpt: "Planner history persists across runs. SQLite full-text knowledge base injects relevant snippets into future plans. Learning loop tracks per-provider success rates."
    url: /architecture/
    btn_label: "Learn more"
    btn_class: "btn--primary"
  - title: "Domain Verticals"
    excerpt: "Healthcare and Logistics overlays ship out of the box. Each adds domain context, specialist agent YAML, and a one-command web UI entry point."
    url: /verticals/
    btn_label: "Learn more"
    btn_class: "btn--primary"
---

{% include feature_row %}

{% include feature_row id="feature_row2" %}
