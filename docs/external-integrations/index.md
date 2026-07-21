---
layout: single
title: "External integrations"
permalink: /external-integrations/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# External integrations

**Agentic Orchestration** can sit behind other agent platforms, chat gateways, and automation hosts. Those hosts keep their own UX and tool loops; this project supplies the **multi-agent planner + catalogs + execution backends** over a small HTTP (or future) bridge.

This page is the inventory of **first-party connectors**. MCP servers and LLM providers are catalogued separately ([MCP providers]({{ '/mcp-catalog/' | relative_url }}), [Agent provider catalog]({{ '/agent-catalog/' | relative_url }})).

## How connectors work

| Layer | Role |
|-------|------|
| **Host product** | OpenClaw, Discord bot, IDE agent, … — owns the conversation UI and session identity |
| **Connector** | Thin adapter (plugin, webhook, SDK client) that forwards a user turn into orchestration |
| **Bridge API** | Today: `POST /api/v1/orchestrate` on `agentic-orchestration-web` (see [Web UI]({{ '/web-ui/' | relative_url }})) |
| **Engine** | Dynamic / iterative planner, agent + MCP catalogs, CrewAI / Kubernetes backends |

Connectors should stay thin: map host credentials → engine env, pass prompt + session key, return one reply string (or structured payload). Prefer the shared orchestrate endpoint over re-implementing planner logic in each host.

## Inventory

| Integration | Status | Package / repo | Bridge |
|-------------|--------|----------------|--------|
| **[OpenClaw](#openclaw)** | Shipped | [agentic-orchestration-openclaw](https://github.com/zlatko-lakisic/agentic-orchestration-openclaw) · ClawHub `@zlatko-lakisic/openclaw-agentic-orchestration` | `POST /api/v1/orchestrate` via `before_agent_reply` hook |
| *(more coming)* | Planned | — | Same HTTP bridge or a documented successor |

When you add a connector, add a row here and a dedicated section (or linked subpage) below.

## OpenClaw

[OpenClaw](https://github.com/openclaw) is a local agent gateway (chat channels, tools, plugins). The **Agentic Orchestration** plugin turns a single OpenClaw turn into a multi-agent plan: specialist agents, MCP tools per step, optional local Ollama — then one clean reply back into the channel.

| | |
|--|--|
| **Plugin repo** | [zlatko-lakisic/agentic-orchestration-openclaw](https://github.com/zlatko-lakisic/agentic-orchestration-openclaw) |
| **Install** | `openclaw plugins install clawhub:@zlatko-lakisic/openclaw-agentic-orchestration` |
| **Hook** | `before_agent_reply` (requires `hooks.allowConversationAccess: true`) |
| **Engine API** | `POST /api/v1/orchestrate` → `{ ok: true, output }` |
| **Auth** | `AGENTIC_ORCHESTRATE_API_KEY` or `AGENTIC_CHAT_COMPLETIONS_API_KEY` on the web server; optional matching `apiKey` in plugin config |

### What you get

- Planner + specialist agents instead of one model for every request
- Local Ollama by default when no cloud keys are mapped; OpenAI / Anthropic via OpenClaw or env
- Session continuity across turns (`sessionPassthrough`)
- **Managed backend** (default): plugin clones or reuses a local checkout, creates a venv, starts the web server, and injects `/api/v1/orchestrate` if missing

### Minimal OpenClaw config

```json
{
  "plugins": {
    "entries": {
      "agentic-orchestration": {
        "config": {
          "managedBackend": true,
          "timeoutMs": 120000,
          "runMode": "dynamic",
          "sessionPassthrough": true,
          "fallbackOnError": false
        },
        "hooks": {
          "allowConversationAccess": true
        }
      }
    }
  }
}
```

Then:

```bash
openclaw gateway restart
openclaw plugins inspect agentic-orchestration --runtime --json
```

Full options, troubleshooting, and managed-backend layout: plugin [README](https://github.com/zlatko-lakisic/agentic-orchestration-openclaw#readme).

### Engine side (this monorepo)

- Web route implemented in `agentic-orchestration-web/server.mjs`
- Env: see [Configuration]({{ '/configuration/' | relative_url }}) (`AGENTIC_ORCHESTRATE_API_KEY`, runtime auto-ensure)
- Jetson / k8s stacks already expose the web UI on NodePort **30487**; point the plugin at that base URL when not using managed local spawn

### OpenClaw MCP sync (Jetson / external AO)

When `managedBackend: false` and AO runs in Kubernetes, the plugin still writes OpenClaw `mcp.servers` as YAML under `~/.openclaw/agentic-orchestration/openclaw-mcp-providers`. The engine must mount that catalog and the OpenClaw workspace:

- HostPath mounts + `AGENTIC_EXTRA_MCP_PROVIDERS_PATH=/openclaw/mcp-providers` (see `env.jetson` / coordinator rollout patches)
- Allow `openclaw_*` ids in `AGENTIC_K8S_WORKER_STDIO_MCPS` so synced servers (e.g. `openclaw_filesystem`) are not stripped
- Smoke: `agentic-orchestration-tool/scripts/smoke_openclaw_mcp.sh` (list/read via NodePort **30487**)

Plugin **1.2.0** prefers the orchestrate endpoint for OpenAI `/v1` base URL, defaults display model to `llama3.2:3b`, and sanitizes bridge error stacks.

## Adding another integration

1. **Prefer the existing bridge** — call `POST /api/v1/orchestrate` with the same auth and JSON body the OpenClaw plugin uses (prompt + session fields). Extend the API only when the host needs capabilities the bridge cannot express.
2. **Keep the adapter out of this monorepo** when possible (separate plugin/repo), same pattern as OpenClaw.
3. **Document here** — new inventory row + section (status, install, config, link to upstream docs).
4. **Sync to GitHub Pages** — update this wiki page, then `cd docs && python scripts/sync_from_wiki.py` and push `main` (see [GitHub Pages publish]({{ '/GitHub-Pages-publish/' | relative_url }})).

### Suggested section template

```markdown
## <Product name>

Short description of the host and how turns map into orchestration.

| | |
|--|--|
| **Repo / package** | … |
| **Status** | Shipped / Beta / Planned |
| **Bridge** | `POST /api/v1/orchestrate` (or …) |

Install / config / notes …
```

## Related

- [Web UI]({{ '/web-ui/' | relative_url }}) — HTTP endpoints including orchestrate
- [Configuration]({{ '/configuration/' | relative_url }}) — API keys and runtime auto-ensure
- Security policies: [engine SECURITY.md](https://github.com/zlatko-lakisic/agentic-orchestration/blob/main/SECURITY.md) · [OpenClaw plugin SECURITY.md](https://github.com/zlatko-lakisic/agentic-orchestration-openclaw/blob/main/SECURITY.md)
- [Dynamic planning]({{ '/dynamic-planning/' | relative_url }}) — what the engine does with each turn
- [Infrastructure]({{ '/infrastructure/' | relative_url }}) — deploying the engine (Compose, Jetson, GHCR)
- [MCP providers]({{ '/mcp-catalog/' | relative_url }}) — tools the planner can attach (not host connectors)
