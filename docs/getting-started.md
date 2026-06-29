---
layout: default
title: Getting started
permalink: /getting-started/
---

# Getting started

This page is a **quick path to a first run**. For architecture, catalogs, and CLI detail, use [Documentation]({{ '/documentation/' | relative_url }}).

## Prerequisites

- **Python 3.12+** for the orchestration tool
- **Node.js 18+** if you want the browser UI
- API keys or local inference (e.g. **Ollama**) for the agent providers you enable

## 1. Clone and configure

```bash
git clone https://github.com/zlatko-lakisic/agentic-orchestration.git
cd agentic-orchestration/agentic-orchestration-tool
cp .env.example .env
```

Edit `.env` with the credentials for the agent and MCP providers you plan to use. The shipped catalogs skip entries that lack required environment variables.

## 2. Run a dynamic goal (CLI)

From `agentic-orchestration-tool/`:

```bash
python main.py --dynamic "Summarize what this project does and list the main packages"
```

Add `--dynamic-iterative` for multi-round planning, or `--example healthcare` / `--example logistics` to layer a vertical overlay.

## 3. Optional: start the web UI

From `agentic-orchestration-web/`:

```bash
npm install
npm start
```

Open the local URL printed by the server. Each chat message spawns a dynamic or iterative CLI run against your configured tool.

## Next steps

| Goal | Read |
|------|------|
| Understand components and data flow | [Architecture]({{ '/Architecture/' | relative_url }}) |
| Browse agent YAML templates | [Agent provider catalog]({{ '/Agent-provider-catalog/' | relative_url }}) |
| Browse MCP templates | [MCP providers]({{ '/MCP-providers/' | relative_url }}) |
| All environment variables | [Configuration]({{ '/Configuration/' | relative_url }}) |
| Full CLI surface | [CLI reference]({{ '/CLI-reference/' | relative_url }}) |

Source of truth for behavior and file paths remains the [GitHub repository](https://github.com/zlatko-lakisic/agentic-orchestration).
