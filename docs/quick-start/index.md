---
title: "Quick Start"
layout: single
sidebar:
  nav: "docs"
toc: true
toc_sticky: true
---

Get from zero to your first multi-agent run in under five minutes.

## Prerequisites

- Python 3.12+
- Node.js 18+ (web UI only)
- At least one of: OpenAI API key, Anthropic API key, or Ollama running locally

## Step 1 — Clone

```bash
git clone https://github.com/zlatko-lakisic/agentic-orchestration.git
cd agentic-orchestration/agentic-orchestration-tool
```

## Step 2 — Setup (automated)

**Windows:**

```powershell
.\setup.ps1
```

**macOS / Linux:**

```bash
chmod +x setup.sh && ./setup.sh
```

**Or manually:**

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

## Step 3 — Configure

Edit `.env`. Minimum required: set at least one of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or configure Ollama (`OLLAMA_HOST`). Everything else is optional — see the [Configuration reference](/configuration/).

{: .notice--info}
**Tip:** For local-only runs, start Ollama and set `OLLAMA_HOST=http://127.0.0.1:11434`. The planner can use `AGENTIC_PLANNER_MODEL=ollama/llama3.2` once the model is pulled.

## Step 4 — First run

**Dynamic mode** (LLM plans the steps):

```bash
python main.py --dynamic "Summarize the top use cases for multi-agent AI systems"
```

**Static workflow** (predefined YAML):

```bash
python main.py --batch
```

**Router mode** (Ollama picks the best workflow):

```bash
python main.py "Generate taglines for a developer CLI tool"
```

## Step 5 — (Optional) Web UI

```bash
cd ../agentic-orchestration-web
npm install
npm start
# Open http://127.0.0.1:3847
```

## Next steps

| Topic | Link |
|---|---|
| Browse agent templates | [Agent Catalog](/agent-catalog/) |
| Browse MCP integrations | [MCP Catalog](/mcp-catalog/) |
| Environment variables | [Configuration](/configuration/) |
| How components fit together | [Architecture](/architecture/) |
