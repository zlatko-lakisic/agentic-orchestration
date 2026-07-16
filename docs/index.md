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
  Most AI systems do one task well; this one is built around a coordinator that replans as it goes,
  carries forward what it learned, and checks its own work — model-agnostically, so the loop does not
  depend on one vendor's LLM.
  Dynamic planning, 182 agent templates, MCP integrations,
  agent skills playbooks, platform agent harness, and three execution backends — from local Ollama to Kubernetes.
  Latest release: v1.13.0.
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
  - title: "MCP Integrations"
    excerpt: "Brave Search, Tavily, Exa, Home Assistant, Xquik, URL fetch, filesystem, media understand, and memory — credential-gated and Kubernetes-ready."
    url: /mcp-catalog/
    btn_label: "Browse integrations"
    btn_class: "btn--primary"
  - title: "External Integrations"
    excerpt: "Host connectors start with OpenClaw (ClawHub plugin + shared /api/v1/orchestrate bridge). More platforms will plug into the same inventory."
    url: /external-integrations/
    btn_label: "View connectors"
    btn_class: "btn--primary"
  - title: "Agent Skills"
    excerpt: "YAML procedural playbooks — release checklists, PR review, domain how-tos — injected into tasks or backstory; composes with MCP tools."
    url: /agent-skills/
    btn_label: "Browse skills"
    btn_class: "btn--primary"
  - title: "Platform Agent Harness"
    excerpt: "Tiered per-catalog verification (L0–L3): static YAML checks, connectivity probes, smoke tasks, and capability rubrics. L0/L1 run in CI on every PR."
    url: /Agent-harness-roadmap/
    btn_label: "Harness guide"
    btn_class: "btn--primary"
feature_row2:
  - title: "Three Execution Backends"
    excerpt: "In-process CrewAI (default), subprocess workers, or Kubernetes Jobs with a shared PVC run store. Same YAML catalogs across all three."
    url: /execution-backends/
    btn_label: "Learn more"
    btn_class: "btn--primary"
  - title: "Sessions, Learning & KB"
    excerpt: "Planner history persists across runs. SQLite full-text knowledge base injects relevant snippets into future plans. Learning loop tracks per-provider success rates. This is the current cross-task knowledge layer — session persistence and retrieval today, not deep transfer between tasks yet."
    url: /architecture/
    btn_label: "Learn more"
    btn_class: "btn--primary"
  - title: "Outcome scoring (QA)"
    excerpt: "An impartial step that scores run quality before a deliverable is done — fragmented today across learning-loop eval, platform harness L3 capability scoring, and user-harness rubrics, not yet one unified gate."
    url: /Agent-harness-roadmap/
    btn_label: "Learn more"
    btn_class: "btn--primary"
  - title: "Domain Verticals"
    excerpt: "Healthcare and Logistics overlays ship out of the box. Each adds domain context, specialist agent YAML, and a one-command web UI entry point."
    url: /verticals/
    btn_label: "Learn more"
    btn_class: "btn--primary"
---

## The idea

This project tests a **process loop**, not a smarter single model: a coordinator that **reevaluates** after each step (`--dynamic-iterative` and the auto-controller), execution that keeps **phases and steps as a working record** (sessions, step context injection), **knowledge that should carry** from one task to the next, and an **impartial QA step** that scores outcomes before they are considered done.

**What is solid today:** iterative replanning, step records, and model-agnostic YAML catalogs across backends. **What is still maturing:** cross-task knowledge transfer is partial — sessions, KB retrieval, and learning stats are closer to caching and weighted hints than genuine "task A changed how I approach task B." Outcome scoring exists but is **fragmented** across three mechanisms (learning-loop eval, platform harness capability tiers, user-harness rubrics), not one unified QA gate yet.

{% include feature_row %}

{% include feature_row id="feature_row2" %}

## Who this is for

**Well-suited for** teams that want to test a process-driven approach to multi-step work without being locked to one LLM vendor — bring fine-tuned, self-hosted, or proprietary models alongside commodity APIs; the coordinator loop and catalogs stay the same.

Also a strong fit for **regulated or audit-heavy environments** (government, defense, financial services) where procurement-friendly model agnosticism, sovereign deployment via Kubernetes (`AGENTIC_EXECUTION_BACKEND=kubernetes`), and execution audit trails matter as much as raw capability. Not a claim of existing production case studies — an honest starting point for technical evaluation.
