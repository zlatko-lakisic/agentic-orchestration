---
layout: single
title: "MCP providers"
permalink: /mcp-catalog/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# MCP providers (shipped catalog)

The tool loads MCP **templates** from `agentic-orchestration-tool/config/mcp_providers/` (one `*.yaml` per integration unless using a legacy bundle file). Merge additional directories via `AGENTIC_EXTRA_MCP_PROVIDERS_PATH` (`;` on Windows, `:` on Unix).

![MCP integration model](assets/3.png)

## Design

Each file is a **single** mapping (not a list) with at least:

- **`id`** — Stable identifier referenced by the planner / plan JSON.
- **`description`** — What the server does in context (human + planner).
- **`planner_hint`** — When the planner should attach this MCP.
- **`capabilities`** — Tool surface / behavior at a glance (optional but recommended for shipped entries).
- **`good_for`** — Task patterns and pairing hints (optional).
- **`user_goal_keywords`** (optional) — Keyword hints for relevance / pruning.
- **`required_env`** / **`required_env_any`** (optional) — Credential or opt-in gating; entries are dropped if env is missing/empty.

Connection shapes:

- **`streamable_http`** — `url` and optional `headers`; `${VAR}` placeholders expand from the environment.
- **`stdio`** — `command`, `args`, optional `env` — local subprocess (e.g. `npx`, `python -m …`). Same expansion rules for args/env values.

Upstream protocol: [Model Context Protocol](https://modelcontextprotocol.io/).

## Curated MCP directory (community)

The **[awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)** list groups thousands of third-party MCP implementations by category. It is a **discovery index**, not an endorsement list. Use it to find servers to run yourself, then wire them into this project via new YAML under `config/mcp_providers/` or `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`.

### Mapping: this repo’s YAML ↔ awesome-mcp-servers

Related listings are **alternatives or complements** for the same *kind* of capability; they are **not** necessarily what this repo invokes by default.

| Catalog `id` | What we wire by default | Example related entries on [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) |
|--------------|-------------------------|---------------------------------------------------------------------------------------------------|
| `home_assistant` | Official [Home Assistant MCP](https://www.home-assistant.io/integrations/mcp_server/) — Streamable HTTP `/api/mcp`, bearer token. | [allenporter/mcp-server-home-assistant](https://github.com/allenporter/mcp-server-home-assistant), [tevonsb/homeassistant-mcp](https://github.com/tevonsb/homeassistant-mcp) |
| `search_brave` | Your Brave Search MCP **Streamable HTTP** URL (`BRAVE_SEARCH_MCP_URL`) + API key. | [brave/brave-search-mcp-server](https://github.com/brave/brave-search-mcp-server), [mikechao/brave-search-mcp](https://github.com/mikechao/brave-search-mcp) |
| `search_tavily` | Tavily **hosted** MCP URL (API key; default pattern in YAML). | [tavily-ai/tavily-mcp](https://github.com/tavily-ai/tavily-mcp), [Tomatio13/mcp-server-tavily](https://github.com/Tomatio13/mcp-server-tavily), [kshern/mcp-tavily](https://github.com/kshern/mcp-tavily) |
| `search_exa` | **Exa** via official npm server (`exa-mcp-server`) and `EXA_API_KEY`. | [exa-labs/exa-mcp-server](https://github.com/exa-labs/exa-mcp-server) (see also hosted `https://mcp.exa.ai/mcp` in their docs) |
| `fetch_url` | Official **fetch** server (`python -m mcp_server_fetch`); PyPI `mcp-server-fetch`. | [modelcontextprotocol/server-fetch](https://github.com/modelcontextprotocol/servers) — **Search & data extraction** |
| `memory_knowledge_graph` | Official **memory** server (`@modelcontextprotocol/server-memory`). | [modelcontextprotocol/server-memory](https://github.com/modelcontextprotocol/servers) — **Knowledge & Memory** |
| `filesystem_local` | Official **filesystem** server (`@modelcontextprotocol/server-filesystem`) + one allowed path. | [modelcontextprotocol/server-filesystem](https://github.com/modelcontextprotocol/servers) — **File Systems** |
| `media_understand` | First-party **media** server (`python -m mcp_servers.media_understand`): image describe, audio transcribe, video frames. | Community vision/audio servers on [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) (Multimedia) |
| `media_audio_transcribe` | Same server; keywords biased to speech-to-text. | (alias of `media_understand`) |
| `media_video_analyze` | Same server; keywords biased to video synopsis. | (alias of `media_understand`) |
| `xquik` | Hosted **Xquik** Streamable HTTP MCP (`https://xquik.com/mcp`) for X/Twitter data search, monitoring, and posting. | [Xquik MCP docs](https://docs.xquik.com/mcp/overview) |

## Inventory (repository)

| `id` | Transport | Purpose | Required environment / opt-in |
|------|-----------|---------|--------------------------------|
| `home_assistant` | `streamable_http` | HA entities/actions via official MCP integration. | `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_TOKEN` |
| `search_brave` | `streamable_http` | Web search via your Brave-compatible MCP host. | `BRAVE_SEARCH_API_KEY` (+ `BRAVE_SEARCH_MCP_URL` per YAML) |
| `search_tavily` | `streamable_http` | Web search via Tavily-hosted MCP. | `TAVILY_API_KEY` |
| `search_exa` | `stdio` | Exa web + code-context search. | `EXA_API_KEY` |
| `fetch_url` | `stdio` | Fetch and normalize a **known** URL for the model. | `AGENTIC_MCP_FETCH_ENABLED` + `pip install mcp-server-fetch` |
| `memory_knowledge_graph` | `stdio` | In-process knowledge graph memory tools. | `AGENTIC_MCP_MEMORY_MCP_ENABLED` (+ `npx` / Node) |
| `filesystem_local` | `stdio` | Read/write under one allowed directory root. | `FILESYSTEM_MCP_ALLOWED_DIRECTORY` (absolute path) |
| `media_understand` | `stdio` | Describe images, transcribe audio, analyze videos (local paths). | `AGENTIC_MCP_MEDIA_ENABLED` (+ `mcp` / optional `faster-whisper`, ffmpeg) |
| `media_audio_transcribe` | `stdio` | Audio-biased alias of `media_understand`. | `AGENTIC_MCP_MEDIA_ENABLED` |
| `media_video_analyze` | `stdio` | Video-biased alias of `media_understand`. | `AGENTIC_MCP_MEDIA_ENABLED` |
| `xquik` | `streamable_http` | X data search, extraction, monitoring, webhooks, posting via Xquik. | `XQUIK_API_KEY` |

## Kubernetes compatibility (K0.6)

When `AGENTIC_EXECUTION_BACKEND=kubernetes`, stdio MCPs need an explicit K8s path (worker stdio, cluster gateway, or in-pod sidecar). Policy: [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}#mcp-compatibility-matrix-k8s-mode); code: `orchestration/k8s_mcp_compat.py`.

| `id` | K3 MVP (default) | Notes |
|------|------------------|-------|
| `search_brave` | ✅ | streamable_http |
| `search_tavily` | ✅ | streamable_http |
| `xquik` | ✅ | streamable_http |
| `home_assistant` | ✅ | streamable_http |
| `search_exa` | ❌ | stdio — K4 sidecar or gateway |
| `fetch_url` | ✅ (with worker stdio) | Default: `AGENTIC_K8S_WORKER_STDIO_MCPS=fetch_url` + `mcp-server-fetch` in worker image |
| `filesystem_local` | ✅ (with worker stdio + PVC) | `AGENTIC_K8S_WORKER_STDIO_MCPS=filesystem_local` + `FILESYSTEM_MCP_ALLOWED_DIRECTORY=/run/store/mcp-fs-workspace`; seed `mcp-fs-workspace/` on PVC |
| `memory_knowledge_graph` | ❌ | stdio — K4 sidecar |
| `media_understand` / `media_audio_transcribe` / `media_video_analyze` | ✅ (with worker stdio) | Set `AGENTIC_MCP_MEDIA_ENABLED=1` and include ids in `AGENTIC_K8S_WORKER_STDIO_MCPS`; mount `mcp_servers/` into the image or hostPath |

Planner catalog filtering for K8s mode is **K4.3**; until then, avoid stdio MCPs in dynamic plans when targeting the kubernetes backend.

### Notes per id

#### `home_assistant`

- **Docs:** [Home Assistant MCP Server](https://www.home-assistant.io/integrations/mcp_server/)
- **Auth:** `Authorization: Bearer ${HOME_ASSISTANT_TOKEN}`

#### `search_brave`

- Point `BRAVE_SEARCH_MCP_URL` at **your** Streamable HTTP endpoint (self-hosted or vendor).
- **Awesome:** [brave/brave-search-mcp-server](https://github.com/brave/brave-search-mcp-server), [mikechao/brave-search-mcp](https://github.com/mikechao/brave-search-mcp).

#### `search_tavily`

- Default URL pattern: [Tavily MCP guide](https://docs.tavily.com/guides/mcp)
- **Awesome:** [tavily-ai/tavily-mcp](https://github.com/tavily-ai/tavily-mcp), [Tomatio13/mcp-server-tavily](https://github.com/Tomatio13/mcp-server-tavily), [kshern/mcp-tavily](https://github.com/kshern/mcp-tavily).

#### `search_exa`

- **Docs / keys:** [Exa MCP](https://docs.exa.ai/reference/exa-mcp)
- Runs `npx -y exa-mcp-server` with `EXA_API_KEY` in the subprocess environment.

#### `fetch_url`

- Install: `pip install mcp-server-fetch` into the **same** Python environment as `main.py` (included in the K8s worker image).
- Set `AGENTIC_MCP_FETCH_ENABLED=1` so the catalog entry is not hidden by credential filtering.
- **Kubernetes:** default path is worker-native stdio (`AGENTIC_K8S_WORKER_STDIO_MCPS=fetch_url`). Cluster gateway (`AGENTIC_K8S_MCP_FETCH_URL`) or supergateway sidecar remain optional alternatives; see `deploy/k8s/mcp-sidecars/README.md`.

#### `memory_knowledge_graph`

- Runs `npx -y @modelcontextprotocol/server-memory`. Set `AGENTIC_MCP_MEMORY_MCP_ENABLED=1` for opt-in.

#### `filesystem_local`

- Set `FILESYSTEM_MCP_ALLOWED_DIRECTORY` to an **absolute** path. The model's file tools are scoped to that root only.
- **Kubernetes:** use `/run/store/mcp-fs-workspace` on the run-store PVC (`AGENTIC_K8S_MCP_FILESYSTEM_DIR`). Worker image includes Node.js for `npx @modelcontextprotocol/server-filesystem`. Set `AGENTIC_K8S_WORKER_STDIO_MCPS=filesystem_local`. Smoke: `config/workflows/workflow_filesystem_smoke.yaml`.

#### `media_understand` (and audio/video aliases)

- Opt-in: `AGENTIC_MCP_MEDIA_ENABLED=1`.
- Run: `python -m mcp_servers.media_understand` (FastMCP stdio). Tools: `describe_image_file`, `transcribe_audio_file`, `analyze_video_file`.
- Audio: install `faster-whisper` (or configure OpenAI transcription). Video: `ffmpeg` on PATH.
- Aliases `media_audio_transcribe` / `media_video_analyze` share the same process; they exist so planners match speech vs clip goals more cleanly.

#### `xquik`

- **Docs:** [Xquik MCP overview](https://docs.xquik.com/mcp/overview)
- **Auth:** `Authorization: Bearer ${XQUIK_API_KEY}` against `https://xquik.com/mcp`
- Opt-in by setting `XQUIK_API_KEY` in the tool `.env` (catalog entry is credential-gated).

## Adding a new MCP

1. Create `config/mcp_providers/<id>.yaml` with a unique `id`.
2. Add `description`, `capabilities`, `good_for`, and `planner_hint` so planners and humans understand scope.
3. Set `required_env` / `required_env_any` so only runnable integrations appear when credentials are present.
4. Use **`streamable_http`** or **`stdio`** (not both in one file).
5. Find related community servers in [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) and document them here if the integration is non-obvious.

## Related pages

- [Dynamic planning]({{ '/dynamic-planning/' | relative_url }}) — when MCP sets appear in plans.
- [Agent skills]({{ '/agent-skills/' | relative_url }}) — procedural playbooks (complementary; skills may reference MCP tools in prose).
- [Configuration]({{ '/configuration/' | relative_url }}) — env vars summary.
- [Third party projects]({{ '/third-party-projects/' | relative_url }}) — upstream products and licenses.
- [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) — full community index.
