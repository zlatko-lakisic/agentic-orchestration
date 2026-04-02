# Agentic Orchestration — Wiki home

This wiki mirrors the **agentic-orchestration** monorepo: a YAML-driven, model-agnostic **CrewAI** orchestration layer with optional **MCP** tools, dynamic planning, browser UI, sessions, learning, and a local knowledge base.

## Who this is for

- Teams who want to **wire existing models, MCP servers, and APIs** into multi-step agent workflows **without** writing a new orchestration framework.
- Developers evaluating **proof-of-concept** setups using **catalogs** (`config/agent_providers/`, `config/mcp_providers/`) and **environment variables**.

## Wiki map

| Topic | Page |
|--------|------|
| Repository layout, components, data directories | [Architecture](Architecture) |
| Full list of shipped **agent provider** YAML templates | [Agent-provider-catalog](Agent-provider-catalog) |
| Shipped **MCP** integrations (Home Assistant, search) | [MCP-providers](MCP-providers) |
| Static workflows, router mode, `meta` blocks | [Workflows-and-router](Workflows-and-router) |
| `--dynamic`, `--dynamic-iterative`, planner, controller | [Dynamic-planning](Dynamic-planning) |
| Sessions, learning loop, KB, answer cache | [Sessions-learning-and-knowledge-base](Sessions-learning-and-knowledge-base) |
| Environment variables (authoritative: `.env.example`) | [Configuration](Configuration) |
| WebSocket UI, `AGENTIC_*` web env, scripts | [Web-UI](Web-UI) |
| CLI flags and modes | [CLI-reference](CLI-reference) |
| Dependencies, upstream projects, licenses | [Third-party-projects](Third-party-projects) |
| How to publish these files to **GitLab Wiki** | [GitLab-Wiki-publish](GitLab-Wiki-publish) |

## Source of truth in Git

The canonical codebase paths are:

- **Tool:** `agentic-orchestration-tool/` (`main.py`, `orchestration/`, `config/`)
- **Web:** `agentic-orchestration-web/`
- **Root:** `README.md`, `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md`

When the wiki and repo diverge, prefer the **repository** for filenames, line-accurate behavior, and the latest YAML.

## Quick links (in the main repository)

- Root: `README.md`
- Tool: `agentic-orchestration-tool/README.md`
- Web: `agentic-orchestration-web/README.md`
- Environment template: `agentic-orchestration-tool/.env.example`
- Third-party list: `THIRD_PARTY_NOTICES.md`
