---
title: "MCP Catalog"
layout: single
sidebar:
  nav: "docs"
toc: true
toc_sticky: true
---

Model Context Protocol (MCP) integrations ship as one YAML file per provider in `config/mcp_providers/`. The planner attaches MCPs per step based on goal text, hints, and credential availability.

## Shipped integrations

| ID | Description | Transport | Required env | K8s |
|---|---|---|---|---|
| `search_brave` | Web search via Brave Search API | streamable_http | `BRAVE_SEARCH_API_KEY`, `BRAVE_SEARCH_MCP_URL` | ✅ native |
| `search_tavily` | Web search via Tavily (research-optimized) | streamable_http | `TAVILY_API_KEY` | ✅ native |
| `search_exa` | Semantic web search via Exa | stdio (npx) | `EXA_API_KEY` | ⚠️ sidecar |
| `home_assistant` | Control and query Home Assistant | streamable_http | `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_TOKEN` | ✅ native |
| `fetch_url` | Fetch and parse any URL | stdio (python) | `AGENTIC_MCP_FETCH_ENABLED=1` | ✅ worker stdio |
| `filesystem_local` | Read/write local files | stdio (npx) | `FILESYSTEM_MCP_ALLOWED_DIRECTORY` | ✅ worker stdio + PVC |
| `memory_knowledge_graph` | Persistent entity memory graph | stdio (npx) | `AGENTIC_MCP_MEMORY_MCP_ENABLED=1` | ⚠️ sidecar |

## Provider details

### search_brave

General-purpose web search backed by Brave’s index. You host or subscribe to a Brave Search–compatible MCP server and set `BRAVE_SEARCH_MCP_URL`.

**Good for:** Timely facts, competitor/news scans, finding primary sources.

### search_tavily

Tavily returns concise, citation-oriented excerpts optimized for RAG. Uses Tavily’s hosted MCP endpoint — minimal ops.

**Good for:** Current events, regulatory docs, product comparisons, market snapshots.

### search_exa

Neural/semantic search plus code-context tools from the public web (GitHub, technical docs).

**Good for:** Library usage examples, company research, authoritative page discovery before deeper fetch.

### home_assistant

First-party Home Assistant MCP at `${HOME_ASSISTANT_URL}/api/mcp` with a long-lived token.

**Good for:** Smart-home control scoped to entities you expose through Assist.

### fetch_url

Official MCP fetch server (`pip install mcp-server-fetch`). Converts HTML pages to agent-readable text.

**Good for:** “Open this link and summarize” after search surfaces URLs.

### filesystem_local

Official MCP filesystem server scoped to `FILESYSTEM_MCP_ALLOWED_DIRECTORY` (absolute path).

**Good for:** Repository exploration and controlled edits inside one workspace.

### memory_knowledge_graph

In-process knowledge graph memory (`@modelcontextprotocol/server-memory` via npx).

**Good for:** Multi-step projects needing explicit recall across turns.

## YAML structure

```yaml
id: search_brave
description: "General-purpose web search backed by Brave's index"
capabilities: "Web search, query refinement, news/local lookups (server-dependent)"
good_for: "Timely facts, competitor scans, grounding on search snippets"
planner_hint: "Use for web research when Brave is your configured engine"
required_env_any:
  - BRAVE_SEARCH_API_KEY
streamable_http:
  url: "${BRAVE_SEARCH_MCP_URL}"
  headers:
    Accept: "application/json, text/event-stream"
```

## Custom integrations

| Variable | Purpose |
|---|---|
| `AGENTIC_EXTRA_MCP_PROVIDERS_PATH` | Merge extra YAML directories (`os.pathsep`-separated) |
| `--mcp-providers-catalog PATH` | Override default catalog directory |

Discover third-party MCP servers on [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers).
