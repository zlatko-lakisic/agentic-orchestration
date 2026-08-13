---
layout: single
title: "Topology dashboard"
permalink: /topology-dashboard/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# Topology dashboard

Live Admin **Topology** view of the **current deployment** — not a static architecture diagram. It shows what is present right now across three bands (Application, <img src="{{ "/assets/ao-mark.svg" | relative_url }}" alt="AO" width="18" height="18" style="vertical-align:-3px" /> **Reach**, <img src="{{ "/assets/ao-mark.svg" | relative_url }}" alt="AO" width="18" height="18" style="vertical-align:-3px" /> Agentic Orchestration), component health, and the call paths between them. When a Reach client registers overlays, Application nodes appear; when the engine stops answering, its node degrades and paths through it dim.

**Honesty rule:** the diagram may only show what the system reports. Uninstrumented health stays `unknown` (not “healthy”). Edges without telemetry say **no data** (never `0 req/s`). A node the API stops mentioning goes `offline` for a short grace window, then disappears.

Open it from Admin → **Topology**. Help icons on nodes and edges deep-link here (`Topology-dashboard#…`). Related: [System architecture]({{ '/system-architecture/' | relative_url }}), [Reach and mTLS]({{ '/reach-and-mtls/' | relative_url }}), [Engine daemon plan]({{ '/engine-daemon-plan/' | relative_url }}), [Web UI]({{ '/web-ui/' | relative_url }}), [Dynamic planning]({{ '/dynamic-planning/' | relative_url }}), [Admin page design handoff]({{ '/Admin-page-design-handoff/' | relative_url }}), [External integrations]({{ '/external-integrations/' | relative_url }}), [Configuration]({{ '/configuration/' | relative_url }}), [Infrastructure]({{ '/infrastructure/' | relative_url }}).

---

## How to read the screen

| Question | What to look at |
|---|---|
| Is anything broken? | `failed` / `degraded` glyphs (only saturated status colours) |
| What does this affect? | Hover a node → full upstream/downstream path highlights |
| Is traffic flowing? | Instrumented edges animate; uninstrumented stay static (**no data**) |
| Why is this unhealthy? | Click → Health / Traffic / Config / Logs tabs |
| What’s actually deployed? | Optional sidecars, speech, workers only render when present (or via “Show not deployed”) |
| What’s inside an accordion? | Chevron on **app** / **Kubernetes** → wider panel + group frame ([[#expandable-panels]]) |

**Toolbar:** Live / Paused (pause freezes the canvas without dropping the socket), band/status filters, “only unhealthy”, show not-deployed, fit-to-width / zoom, legend.

**Layout:** three full-width horizontal bands; columns align vertically so you can follow a mechanism down without tracing sideways (e.g. Domain overlays → Overlay packer → `session_overlay`). Layout is deterministic — no force-directed shuffle on updates.

<a id="expandable-panels"></a>
**Expandable panels:** nodes with a chevron (Application `appId` groups and in-cluster **Kubernetes**) use a **wider header card** than ordinary nodes. Expanding draws labeled **group frames** around the header plus its children (apps: dashed teal; Kubernetes: cluster frame with nested **node** frames around each node’s pods, plus a **Services** frame). Collapse returns to the summary row. See [[#app-accordion]] and [[#platform-expand]].

**Two exception flows** (drawn specially so they stay obvious):

1. **Reverse tunnel** — engine `mcp_tunnel` calls *up* into Reach Local MCP host (distinct dash, upward).
2. **Web UI bypass** — **ao-web**, **ao-chat**, and **OpenClaw** → Web UI on the **right margin**, skipping Reach and the engine.

---

## Health and instrumentation

| State | Meaning |
|---|---|
| `healthy` | Probe passing |
| `degraded` | Passing with warnings / partial replicas |
| `failed` | Probe failing |
| `starting` | Present, not ready yet |
| `draining` | Shutting down, still serving |
| `unknown` | Present but **not instrumented** — not counted as unhealthy |
| `offline` | Was present; inside ~30s grace before removal |

Phase 1 probes typically cover **Engine** (`/health` on :8765) and **Web UI** (the process building the graph). Additional live probes (when configured / in-cluster) include **Ollama** (`/api/tags`), **speech STT/TTS** (`/health`), **catalog loads**, **planner** (via engine warm catalogs), **execution backend**, **storage/GPU** (engine hardware snapshot), **engine endpoints** (derived from the same engine probe + feature flags), and **Kubernetes** workloads. **Remote LLMs** stay `unknown` by design — API keys are not a health probe. If the engine is unreachable, the Reach band empties and a note explains why; first-party Web UIs (**ao-web** / **ao-chat**) still appear on the Application bypass lane. Engine up with no Reach sessions → the **Reach apps** family is hidden (note only); Web API family stays.

**Capabilities** on the snapshot (`nodeProbes`, `edgeMetrics`, `sources`) declare what is real telemetry versus structural presence.

---

## Bands

### Application

<a id="app-accordion"></a>

The Application band has **two labeled families**:

| Family | What it shows | Path |
|---|---|---|
| **Reach apps** | Connected Reach clients grouped by required `appId` (accordion panels). Hidden when none are connected. | Through Reach → engine :8765 |
| **Web API** | First-party **ao-web** / **ao-chat**, minted external tokens, and **OpenClaw**. Hidden when empty. | Bypass → Web UI :30487 |

Client-reported Reach presence is **grouped by required `appId`** (normalized lowercase — e.g. `myapp`, `field-client`). Missing `appId` collapses to `unknown`.

Reach apps appear as **wider minimized panels left-to-right** (accordion headers) with instance count (connected sessions) and **client IP count** when the engine reports peer addresses. Use the chevron to expand one panel: a group frame grows around that app; other Reach apps grey out; only that app’s Client UI / Domain overlays / Local tools are laid out under the header. Click the app header for **Connecting IPs** (Reach WebSocket peer). When no Reach client has registered a session overlay, the **Reach apps** family (frame + nodes) is hidden.

**Example — two Reach clients side by side**

| Panel | Instances | When expanded you see |
|---|---|---|
| `myapp` | 2 | UI + overlays (`client.domain_expert`, …) + local tools (tunnel MCPs) |
| `field-client` | 1 | That client’s UI / overlays / tools only |

The platform never sees the client’s internal screens — only what the session **advertised** (agents, MCPs, skills, tunnels, speech sidecars).

**Web API family (right):** first-party **ao-web** / **ao-chat**, minted external **appId** tokens (one node per appId), and **OpenClaw** when detected. Each node bypasses to Web UI. Click a Web API node to see **connecting client IPs** from the Access token usage ledger. See [[#ao-web]], [[#ao-chat]], [[#web-api-client]], [[#openclaw]].

### <img src="{{ "/assets/ao-mark.svg" | relative_url }}" alt="AO" width="18" height="18" style="vertical-align:-3px" /> Reach

`ao_reach` SDK surface ([`agentic-orchestration-reach`](https://github.com/zlatko-lakisic/agentic-orchestration-reach)): session bridge, overlay packing, local MCP host, speech client, mTLS enroller. These are **shared platform** Reach components — they are not labeled **Owned by app** (that badge is only on Application injection children: Client UI, Domain overlays, Local tools).

Reach talks to the **engine** (`https`/`wss` :8765), not via the security gateway / Web UI proxy (:30487). See [Reach and mTLS]({{ '/reach-and-mtls/' | relative_url }}).

### <img src="{{ "/assets/ao-mark.svg" | relative_url }}" alt="AO" width="18" height="18" style="vertical-align:-3px" /> Agentic Orchestration

Engine edge APIs, planner, catalogs, model backends, execution, and platform — ranked top-to-bottom:

| Rank | Layer | Typical nodes |
|---|---|---|
| 0 | Edge | Engine :8765, session_overlay, mcp_tunnel, direct_agent, hello.speech, mTLS enrol, speech STT/TTS, Web UI :30487 |
| 1 | Planning | Planner / Runner |
| 2 | Capability | Agents / MCP / Skills catalogs, model backends, Ollama / remote LLMs |
| 3 | Execution | Execution backend, workers, MCP sidecars |
| 4 | Platform | **Kubernetes** (expandable accordion — see [[#platform-expand]]), storage / GPU |
| 5 | K8s inventory | Nested only while Kubernetes is expanded: **nodes → pods**, Services, network paths ([[#platform-expand]]) |

**Owned by app** appears only on Application injection children (Client UI, Domain overlays, Local tools) under a connected `appId`. Shared Reach / AO core (bridge, mTLS enroller, planner, catalogs, speech endpoints, …) stay unlabeled. Agents / MCP / Skills cluster modals still list live `client.*` ids each connected `appId` registered.

---

## Worked examples

### Reach client path

1. Client enrolls mTLS (once) → **mTLS enroller** → engine **mTLS enrol**.
2. **Session bridge** opens `wss://<edge>:8765/ws` with client cert.
3. **Overlay packer** loads YAML under the client’s overlay root → registers `client.*` agents/MCPs/skills.
4. Topology Application band shows that `appId` with instance count; expand → Client UI, Overlay source, Local tools.
5. Planner later resolves catalog agents **plus** those session overlays; catalog modal lists `myapp → client.domain_expert, …`.
6. When a step needs a device-local MCP, engine **mcp_tunnel** fires a **reverse tunnel** up into **Local MCP host**.

### First-party Web UIs (bypass path)

**ao-web** (Admin SPA at `/admin`) and **ao-chat** (core chat at `/`) are served by the coordinator Web UI. They are **not** Reach clients — Topology draws each as an Application-band node with a **bypass** edge to Web UI (:30487). Health turns healthy when the matching Access token is assigned (`ao-web` / `ao-chat`). See [Web UI]({{ '/web-ui/' | relative_url }}#api-access-tokens).

### OpenClaw host (bypass path)

OpenClaw plugin posts to the coordinator Web UI (`POST /api/v1/orchestrate` on :30487) and never joins the Reach session registry as a normal app overlay path. Topology draws **OpenClaw → Web UI** as a **bypass** on the right margin. See [External integrations]({{ '/external-integrations/' | relative_url }}).

### Advertisement vs audio

- Dotted **advertisement**: `hello.speech` → Speech STT (engine told the client *where* STT lives).
- **Stream** edge: Speech client → Speech STT (actual transcription HTTP).

Do not read the advertisement edge as “the engine pipes mic audio.”

---

## Components

<a id="topology-node"></a>
### Generic node

A live topology component reported by the current deployment. Every node has an id (stable across snapshots), a kind (drives colour band and wiki help), a status, and optional sublabel (counts, ports, ownership). Click opens a modal; help links here by `wikiKey`.

Components that are never deployed for this install are hidden unless you enable **Show not deployed** (dashed placeholders).

---

<a id="app"></a>
### App (`appId`)

Header for one Reach product identity (wider accordion card — see [[#app-accordion]] / [[#expandable-panels]]). Sublabel is how many connected instances (sessions) advertise that `appId`, plus distinct client IP count when known.

**Example:** `myapp · 2 instances` means two concurrent Reach sessions registered overlays with `appId: "myapp"`. Expand the panel to see that client’s UI / overlays / local-tools column; other apps stay greyed.

Sessions are loaded from the engine admin API (`GET /api/v1/admin/reach-sessions`) and grouped by `appId`.

---

<a id="ui"></a>
### Client UI

Client UI that connected through <img src="{{ "/assets/ao-mark.svg" | relative_url }}" alt="AO" width="18" height="18" style="vertical-align:-3px" /> **Reach**. The platform sees only what the session advertised — not the client’s internal screens, routes, or widgets.

**Example:** two different client apps both appear as “Client UI” under their respective `appId` panels. Topology does not show product-specific screens — only that a Reach session exists for that client. Modal **Owned by app** names that `appId`.

---

<a id="overlay-source"></a>
### Overlay source

Domain overlays the client advertised for this session (plant knowledge, vertical packs, and similar). Sublabel often shows how many `client.*` agent (or related) ids are live.

**Example:** a client packs domain agents from `overlayRoot/agent_providers/*.yaml`. After register, the Overlay source node might read `2 client.*` while the Agents catalog modal lists:

```text
myapp
  · client.domain_expert
  · client.summarizer
```

Those ids are **session-scoped** overlays, not permanent entries in `config/agent_providers/`. See [Agent provider catalog]({{ '/agent-catalog/' | relative_url }}) and [Reach and mTLS]({{ '/reach-and-mtls/' | relative_url }}).

---

<a id="local-tools"></a>
### Local tools

MCP tools hosted on the client device and reverse-tunneled into the engine via Reach. Sublabel is typically the tunnel / local MCP count.

**Example:** a client advertises:

```json
{
  "id": "client.filesystem_local",
  "streamable_http": { "url": "tunnel://session-mcp/filesystem" }
}
```

The engine rewrites `tunnel://…` to call back through the session WebSocket into the device’s Local MCP host — so planners can use on-device tools without opening inbound ports on the client. See [[#local-mcp-host]] and [[#edge-reverse-tunnel]].

---

<a id="openclaw"></a>
### OpenClaw

OpenClaw host that talks to the Web UI and **bypasses** the Reach band and engine. Drawn on the right margin as a bypass edge.

**When it appears:** graph marks OpenClaw deployed/healthy when some session id contains `"openclaw"` (or equivalent presence signal); otherwise unknown / not deployed.

**Why it matters:** operators often expect “all clients go through Reach.” OpenClaw is the intentional exception — plugin base URL points at Web UI :30487 (`POST /api/v1/orchestrate`), not engine :8765. See [External integrations]({{ '/external-integrations/' | relative_url }}) and [System architecture]({{ '/system-architecture/' | relative_url }}).

---

<a id="ao-web"></a>
### ao-web (Admin SPA)

First-party Admin console at `/admin`. Always present in the Application band with a **bypass** edge to Web UI (not Reach). Status is healthy when the reserved **`ao-web`** API token is assigned on Access; otherwise unknown until mint.

**Why it matters:** same class of exception as OpenClaw — browsers talk to Web UI :30487 (security gateway / reverse proxy), never to engine :8765 as a Reach session. See [Web UI]({{ '/web-ui/' | relative_url }}#api-access-tokens).

---

<a id="ao-chat"></a>
### ao-chat (Chat UI)

First-party chat page at `/`. Always present in the Application band with a **bypass** edge to Web UI (not Reach). Status is healthy when the reserved **`ao-chat`** API token is assigned on Access; otherwise unknown until mint.

**Why it matters:** chat shares `/api/session` and orchestrate paths with the Web UI; it is not a Reach accordion app. See [Web UI]({{ '/web-ui/' | relative_url }}#api-access-tokens).

---

<a id="web-api-client"></a>
### Web API client (external appId)

One Application-band node per **active** minted Access token `appId` (for example `KnowBuddy`, `home-assistant`). Multiple tokens that share an `appId` collapse to a single node. Bypass edge to Web UI.

**Health:** healthy when the app called the API within ~24h; degraded if used earlier; unknown if minted but never used.

**Connecting IPs:** node modal Health tab lists distinct client IPs from the usage ledger (`lastUsedIp` + `usage.jsonl`), with last-seen time and call count.

See [Web UI]({{ '/web-ui/' | relative_url }}#api-access-tokens).

---

<a id="session-bridge"></a>
### Session bridge

Reach `SessionBridge` carrying the authenticated client session to the engine.

Responsibilities typically include:

- WebSocket lifecycle to `wss://<engine>:8765/ws` (mTLS client cert when required)
- Overlay register / clear (`session_overlay_register` / `session_overlay_clear`)
- Responding to `mcp_tunnel_request` frames
- Optional `direct_agent` turns and speech capability discovery from `hello`

Shared Reach core — not labeled **Owned by app** (app affiliation shows on Application injection children).

---

<a id="overlay-packer"></a>
### Overlay packer

Packs client overlays before they hit the engine session-overlay API. Reads YAML under the client’s `overlayRoot` (agent providers, skills, MCP descriptors), prefixes / shapes them as `client.*` entries, and sends them on the session WebSocket.

**Conceptual register payload:**

```json
{
  "type": "session_overlay_register",
  "appId": "myapp",
  "ttlSeconds": 3600,
  "agents": [{ "id": "client.domain_expert" }],
  "mcps": [{
    "id": "client.filesystem_local",
    "streamable_http": { "url": "tunnel://session-mcp/filesystem" }
  }],
  "skills": []
}
```

Ack returns accepted `agentIds` / `mcpIds` / `skillIds` and `expiresAt`. Requires `AGENTIC_SERVE_SESSION_OVERLAY=1` on the engine. See [Configuration]({{ '/configuration/' | relative_url }}).

---

<a id="local-mcp-host"></a>
### Local MCP host

Client-side MCP host. The engine’s `mcp_tunnel` calls **back up** into this host (reverse tunnel).

On the device this is often a loopback `mcp-proxy` (or equivalent) for stdio MCP servers. The engine never dials the client’s LAN address; it sends a tunnel request on the existing authenticated session and the host executes the tool locally.

**Example path:** Planner selects `client.filesystem_local` → worker/engine issues tool call → `mcp_tunnel` → Local MCP host → filesystem MCP on the client → response framed back on the session WS.

Shared Reach core — tunnel MCP affiliation shows under each app’s **Local tools** injection, not as ownership of this host.

---

<a id="speech-client"></a>
### Speech client

Reach speech client for STT/TTS against advertised speech sidecars. Audio does **not** ride the session WebSocket; after `hello.speech` advertises base URLs, the client calls those HTTP endpoints directly (stream edges on the canvas).

Gated by speech env on the engine (`AGENTIC_SPEECH_ENABLED` and advertise URLs). See [Configuration]({{ '/configuration/' | relative_url }}).

---

<a id="mtls-enroller"></a>
### mTLS enroller

Issues and renews client certificates for Reach↔engine mTLS. Reach generates a key+CSR, posts to `POST /api/v1/mtls/enroll` with an admin-minted token, and persists `cert.pem` / `key.pem` / `ca.pem` for steady-state WSS.

Enrollment is one-time (or renewal); session auth afterward is the client cert, not the enroll token. Full procedure: [Reach and mTLS]({{ '/reach-and-mtls/' | relative_url }}).

---

<a id="engine"></a>
### Engine

Engine daemon (`python -m orchestration.serve`) — session overlay, MCP tunnel, direct agent, speech hello, and mTLS enroll. Typically **hostPort 8765** (NodePort **30765** on k3s). Probed via `/health`.

Reach clients must target the engine, **never** Web UI :30487. If `AGENTIC_JETSON_ENABLE_ENGINE=0`, the engine node may show as not deployed / unknown rather than failed. See [Engine daemon plan]({{ '/engine-daemon-plan/' | relative_url }}), [Infrastructure]({{ '/infrastructure/' | relative_url }}).

---

<a id="endpoint"></a>
### Endpoint

A concrete engine or speech HTTP (or WS-adjacent) endpoint on the edge rank — overlay, tunnel, direct agent, speech hello, enroll, STT, TTS. Shared AO edge surface (not labeled **Owned by app**).

---

<a id="endpoint-session-overlay"></a>
### session_overlay

Engine API that applies Reach session overlays for a run. Registration is usually over the session WebSocket (`session_overlay_register` → ack/denied); HTTP admin listing is via reach-sessions.

Overlays are TTL-bound and scoped to the session/`appId`. When they expire or clear, Application overlay/local-tool counts drop and catalog “Reach overlays by app” lists shrink. Env: `AGENTIC_SERVE_SESSION_OVERLAY`.

---

<a id="endpoint-mcp-tunnel"></a>
### mcp_tunnel

Reverse tunnel endpoint that calls back into the client MCP host. Direction on the canvas is **upward** (engine → Local MCP host) with the reverse-tunnel dash pattern.

Env: `AGENTIC_SERVE_MCP_TUNNEL`. Without this, Local tools / Local MCP host nodes are not meaningfully deployed even if a client wants to advertise tunnels.

---

<a id="endpoint-direct-agent"></a>
### direct_agent

Direct-agent chat path that skips full dynamic planning for simple turns. Reach (or HTTP `POST /api/v1/direct-agent`) can ask a single agent without the full Planner → CrewAI plan loop — useful for low-latency client replies.

See [Dynamic planning]({{ '/dynamic-planning/' | relative_url }}) for the full planner path this bypasses.

---

<a id="endpoint-hello-speech"></a>
### hello.speech

Advertises speech (STT/TTS) capability to Reach clients — typically URLs/ports for the sidecars. This is an **advertisement**, not the audio path. Actual STT/TTS traffic is Speech client → Speech STT/TTS.

---

<a id="endpoint-mtls-enrol"></a>
### mTLS enrol

mTLS enrollment endpoint for Reach client certificates (`GET /api/v1/mtls/ca`, `POST /api/v1/mtls/enroll`). Public for enrollment; other engine APIs require a verified client cert when client certs are required. See [Reach and mTLS]({{ '/reach-and-mtls/' | relative_url }}).

---

<a id="speech-stt"></a>
### Speech STT

Speech-to-text sidecar serving transcription requests (commonly advertised on **:8090**). Appears when speech is enabled and advertised; otherwise hidden or “not deployed.”

---

<a id="speech-tts"></a>
### Speech TTS

Text-to-speech sidecar serving synthesis requests (commonly **:8091**). Same presence rules as STT.

---

<a id="web-ui"></a>
### Web UI

Coordinator Web UI and Admin console (NodePort **30487**; container often `AGENTIC_WEB_PORT` / 3847). Serves chat, Admin Topology, host metrics, and orchestrate APIs used by OpenClaw.

Topology graph is built in this process (`/api/v1/admin/topology/graph` + admin WS `topology_*` messages). The Web UI node is therefore “always here” when you can see the page. Reverse proxy / security gateway upstreams should target `:30487`, not host port 80. See [Web UI]({{ '/web-ui/' | relative_url }}), [Infrastructure]({{ '/infrastructure/' | relative_url }}).

---

<a id="planner"></a>
### Planner / Runner

Dynamic planner / runner that turns goals into CrewAI steps (plan → execute → optional replan). On Topology this is usually presence-only (`unknown` until planner probes exist).

When Reach overlays are active, the modal can list which `appId`s are feeding session-scoped agents into planning (overlay members — not an **Owned by app** badge). Details: [Dynamic planning]({{ '/dynamic-planning/' | relative_url }}), [Workflows and router]({{ '/workflows/' | relative_url }}).

---

<a id="catalog"></a>
### Catalog cluster

Resolved agent, MCP, or skills catalog cluster used by planning (**aggregated** — not one canvas node per YAML entry). A cluster shows totals and status breakdown; click opens a searchable member table.

The modal also lists **Reach session overlays by app** — which `client.*` ids each connected `appId` currently registered. That merge of static catalog + live overlays is what the planner actually sees for those sessions.

---

<a id="catalog-agents"></a>
### Agents catalog

Cluster of agent-provider catalog entries available to the planner (from `config/agent_providers/` plus live Reach overlays). Live overlays are grouped by `appId` in the modal.

**Example modal excerpt:**

```text
Catalog: 183 agents · …
Reach overlays by app
  myapp — client.domain_expert, client.summarizer
  field-client — client.local_tools
```

See [Agent provider catalog]({{ '/agent-catalog/' | relative_url }}).

---

<a id="catalog-mcp"></a>
### MCP catalog

Cluster of MCP provider catalog entries available to the planner (static `config/mcp_providers/` plus session tunnel/HTTP MCPs). Live Reach tunnel/MCP overlays are grouped by `appId` in the modal.

See [MCP providers]({{ '/mcp-catalog/' | relative_url }}).

---

<a id="catalog-skills"></a>
### Skills catalog

Cluster of agent-skill playbooks the planner may attach to tasks (catalog YAML + any session-registered skills). See [Agent skills]({{ '/agent-skills/' | relative_url }}).

---

<a id="model-backend"></a>
### Model backends

Model backend registry that selects local or remote LLM runtimes for planner and agents. Topology shows the registry node plus concrete runtimes discovered from env (Ollama host, API keys, etc.).

---

<a id="models-backends"></a>
### Models / backends

Resolved model-backend catalog used to pick LLM runtimes for a run. Distinct from the Agents catalog: this answers “which LLM endpoint,” not “which agent persona.”

---

<a id="model-runtime"></a>
### Model runtime

A concrete model runtime such as Ollama or a remote provider. Children on the canvas are typically Ollama and/or Remote LLMs when configured.

---

<a id="models-ollama"></a>
### Ollama

Local Ollama runtime for on-box model inference. Topology presence follows a healthy `OLLAMA_API_BASE` / `OLLAMA_HOST` probe (`/api/tags`). Common on ARM edge / NVR edge boxes.

**Ownership** (`AGENTIC_OLLAMA_MODE`):

| Mode | Topology meaning |
|---|---|
| `external` / `auto` → healthy URL | Bring-your-own Ollama (host systemd or remote). Node is healthy when `/api/tags` works; Admin Control does **not** restart it. |
| `managed_k8s` | In-cluster `agentic-ollama` Deployment ([[#k8s-ollama]]). Service `http://agentic-ollama:11434`. |
| `managed_process` | AO child `ollama serve` on standalone (not typical on edge k3s). |

See [Configuration]({{ '/configuration/' | relative_url }}#ollama-ownership), [Ollama]({{ '/ollama/' | relative_url }}), [Infrastructure]({{ '/infrastructure/' | relative_url }}).

---

<a id="models-remote"></a>
### Remote LLMs

Remote LLM providers (OpenAI, Anthropic, …) when credentials exist (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, …). If keys are absent, the node is not deployed / unknown rather than “failed empty.”

---

<a id="execution-backend"></a>
### Execution backend

Execution backend that runs steps — `inprocess` (default), `subprocess`, or `kubernetes` / warm pool (`AGENTIC_EXECUTION_BACKEND`). See [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}), [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}).

---

<a id="worker"></a>
### Workers

Worker pods currently available to run steps (warm pool + orchestrator Jobs). When the web process runs in-cluster, the sublabel shows live `ready/total` from the Kubernetes API. Often absent on pure in-process installs.

---

<a id="mcp-sidecar"></a>
### MCP sidecar

MCP gateway pods attached for tool execution (fetch / filesystem gateways, and similar). Live counts come from the same in-cluster probe as Workers.

---

<a id="platform"></a>
### Platform

**Kubernetes** node for the AO namespace (k3s on ARM edge / NVR, or any cluster the coordinator SA can list). When the Admin web pod is in-cluster, this node is **instrumented** and **expandable** (same wider accordion header + group frame as Application panels — see [[#expandable-panels]]).

<a id="platform-expand"></a>
#### Expand Kubernetes

1. Chevron on the **Kubernetes** card (wider header) → expand.
2. A steel-blue dashed **Kubernetes** group frame grows around the platform header plus nested inventory.
3. Inside that frame, logical groupings mirror the cluster:
   - **Node** frames (solid blue, labeled with the node name) each enclose that node’s card and the **pods scheduled on it**, stacked tightly underneath.
   - A **Services** frame (cyan) groups Service cards to the right; **Service → Pod** edges remain for endpoint paths.
4. Parent→child containment (platform→node, node→pod) is shown by the frames — those hierarchy links are not drawn as traffic arrows.
5. Sublabel on the platform shows live `ready/total` pods and node count; click a node/pod/service for Addresses and the pod table (phase, ready, podIP, hostIP, node, restarts).
6. Collapse the chevron to hide children and shrink back to the summary card.

Off-cluster (local `ng serve` without an SA) the node stays `unknown` with a note that expand is unavailable — same honesty rule as other probes. The chevron only appears when the in-cluster probe finds pods or nodes.

See [[#k8s-node]], [[#k8s-pod]], [[#k8s-service]] for the nested inventory cards. Related: [Infrastructure]({{ '/infrastructure/' | relative_url }}), [System architecture]({{ '/system-architecture/' | relative_url }}).

**Typical edge hosts (lab):** ARM edge `172.16.90.20`, NVR `10.0.10.16`.

---

<a id="k8s-node"></a>
### Cluster node

A Kubernetes **node** group inside the expanded Kubernetes panel. Sublabel shows the node’s internal / host IP when the API reports it. Child **pods** scheduled on that node nest inside the same labeled node frame (stacked under the node card). Click for Addresses (node name, IPs) and the filtered pod table for this node only.

**Example:** `omega-jetson-orin.mostardesigns.com` with `agentic-coordinator` / `agentic-engine` pods listed beneath.

Appears only while [[#platform-expand]] is open and the in-cluster probe can list Nodes (ClusterRole may be required).

---

<a id="k8s-pod"></a>
### Pod

An individual **pod** nested under its cluster node frame (or listed in a workload modal). Sublabel typically shows **podIP** · owning workload · phase. Click for Addresses: podIP, hostIP, nodeName, ready, restarts, and container status.

**Example:** `agentic-engine-…` under the ARM edge node with `podIP` in the pod CIDR and `hostIP` `172.16.90.20`.

Drawn only while Kubernetes is expanded ([[#platform-expand]]). Health follows the pod phase / ready condition from the API — not guessed from Deployment names.

---

<a id="k8s-service"></a>
### Service

A Kubernetes **Service** in the AO namespace (`agentic-*`). Sublabel shows **clusterIP**. Topology draws **Service → Pod** edges from Endpoints / EndpointSlices so you can see which pods currently back the Service.

**Example:** `agentic-ollama` → ClusterIP `10.43.x.x` with an edge to the `agentic-ollama` pod (or the hostNetwork endpoint on ARM edge host-binary mode).

Click for port / selector details when present. See also [[#k8s-ollama]], [[#k8s-engine]].

---

<a id="k8s-workload"></a>
### K8s workload

Legacy workload summary cards (still used when node inventory is empty). Prefer node/pod cards under [[#platform-expand]]. Modal Health tab lists member pods with addresses. Known roles deep-link below.

<a id="k8s-coordinator"></a>
#### Coordinator

`agentic-coordinator` Deployment — Web UI + Admin + graph builder. Hosts the Topology API that probes the rest of the namespace. NodePort **30487** (no hostPort :80 on edge).

<a id="k8s-engine"></a>
#### Engine

`agentic-engine` Deployment — `orchestration.serve` on :8765 (session overlay, MCP tunnel, direct agent, mTLS enrol, speech hello). Reach clients talk here, not to Web UI :30487.

<a id="k8s-warm-pool"></a>
#### Warm pool

`agentic-warm-pool` Deployment — pre-warmed worker replicas ready for k8s step execution when `AGENTIC_EXECUTION_BACKEND=kubernetes` (or warm-pool flags) are on.

<a id="k8s-broker"></a>
#### Delegation broker

`agentic-delegation-broker` — routes delegated tasks into the warm pool / worker jobs. Often present even when delegation is disabled for small edge models.

<a id="k8s-mcp-fetch"></a>
#### MCP fetch

Fetch MCP gateway sidecar Deployment used by workers for HTTP tool calls. Optional — may be absent on lean edge installs.

<a id="k8s-mcp-filesystem"></a>
#### MCP filesystem

Filesystem MCP gateway sidecar Deployment for path-scoped tool access. Optional — may be absent on lean edge installs.

<a id="k8s-worker-jobs"></a>
#### Worker jobs

Orchestrator Jobs / short-lived worker pods spun for individual steps (not the warm-pool Deployment).

<a id="k8s-ollama"></a>
#### Ollama (in-cluster)

`agentic-ollama` Deployment — AO-owned Ollama when `AGENTIC_OLLAMA_MODE=managed_k8s` (or `AGENTIC_JETSON_ENABLE_OLLAMA=1`). Cluster Service `http://agentic-ollama:11434`; optional NodePort **31134**.

| Edge host | How it runs |
|---|---|
| **x86/x64** | `ollama/ollama` image; models on hostPath `var/ollama-models` |
| **ARM64** | Privileged host-binary pod (nsenter → `/usr/local/bin/ollama serve`) with NFS models — avoids the multi-GB dustynv image on a small rootfs |

Topology also shows the logical **Ollama** model-runtime node ([[#models-ollama]]); this card is the Kubernetes workload behind it when ownership is in-cluster. Admin Control can restart this Deployment; external instances are not restarted. See [Ollama]({{ '/ollama/' | relative_url }}#managed-k8s), `scripts/jetson-enable-ollama.sh`, `scripts/jetson-migrate-ollama-to-k8s.sh`.

---

<a id="storage"></a>
### Storage / GPU

Persistent volumes, GPU weights, and host metrics mounts — run-store PVC, model weight paths, jtop / host metrics volume mounts, and similar platform attachments that back long-lived edge state.

---

## Edges

<a id="topology-edge"></a>
### Generic edge

A structural link between two topology components. Edges have a kind (dash pattern), optional protocol/port, and either live metrics or **no data** when uninstrumented. Hover highlights the two endpoints and the path through the edge; click opens the edge modal.

---

<a id="edge-request"></a>
### Request edge

A request/response call path between two components (ordinary HTTP/RPC-style). Solid / normal dash flow when instrumented.

**Example:** Web UI → Engine health or orchestrate-related control calls that are not long-lived streams.

---

<a id="edge-stream"></a>
### Stream edge

A streaming path (WebSocket or chunked HTTP) between components. Long-dash pattern.

**Examples:**

- Session bridge → Engine (`wss`)
- Speech client → Speech STT / TTS (chunked audio HTTP)

---

<a id="edge-reverse-tunnel"></a>
### Reverse tunnel

Engine calling back up into a Reach-hosted local MCP host — drawn **upward** with a distinct dash. This is the distinguishing Reach mechanism: tools stay on the device; the engine does not open inbound ports to the client.

**Example:** `engine/mcp-tunnel` → `reach/local-mcp-host` while a client step reads a local file via `client.filesystem_local`.

---

<a id="edge-advertisement"></a>
### Advertisement

Capability advertisement (not request traffic). Dotted pattern.

**Example:** `hello.speech` → Speech STT publishes “STT is at `http://…:8090`”. No audio flows on this edge. Contrast with the Speech client → STT **stream** edge.

---

<a id="edge-bypass"></a>
### Bypass

Path that skips Reach and hits the Web UI directly (**ao-web**, **ao-chat**, OpenClaw), routed on the **right margin** so the skip is spatially obvious.

**Examples:** Admin / chat browsers → `http://<edge>:30487`; OpenClaw plugin → orchestrate API on the same port. Reach clients stay on `https://<edge>:8765`.

---

## Ports and env (topology-relevant)

| Port | Role |
|---|---|
| **8765** | Engine hostPort (`AGENTIC_SERVE_PORT`) — Reach clients |
| **30765** | Engine NodePort (alternate in-cluster access) |
| **30487** | Web UI / Admin NodePort — browsers (ao-web / ao-chat), OpenClaw, reverse proxy |
| **8090 / 8091** | Speech STT / TTS (when enabled) |

| Variable | Effect on the graph |
|---|---|
| `AGENTIC_SERVE_SESSION_OVERLAY` | Overlay packer / session_overlay deployed |
| `AGENTIC_SERVE_MCP_TUNNEL` | Local MCP host / mcp_tunnel deployed |
| `AGENTIC_SERVE_TLS_*` | https/wss + mTLS enrol surface |
| `AGENTIC_SPEECH_ENABLED` (+ advertise URLs) | Speech client, hello.speech, STT/TTS |
| `AGENTIC_JETSON_ENABLE_ENGINE` | Engine presence on edge deploys |
| `AGENTIC_EXECUTION_BACKEND` / warm-pool flags | Execution + workers / sidecars |
| `OLLAMA_*` / provider API keys | Ollama / Remote LLMs nodes |
| `AGENTIC_OLLAMA_MODE` / `AGENTIC_JETSON_ENABLE_OLLAMA` | In-cluster Ollama workload ([[#k8s-ollama]]) vs external |
| `AGENTIC_EDGE_PLATFORM` | Platform sublabel |
| `AGENTIC_WEB_PORT` | Internal web listen port |

Full variable index: [Configuration]({{ '/configuration/' | relative_url }}). Deploy notes: [Infrastructure]({{ '/infrastructure/' | relative_url }}), [Engine daemon plan]({{ '/engine-daemon-plan/' | relative_url }}).

---

## Live data sources

| Source | Role |
|---|---|
| `GET /api/v1/admin/topology/graph` | Full snapshot for first paint / resync |
| Admin WebSocket `topology_subscribe` | `topology_snapshot` / `topology_delta` / `topology_health` / `topology_metrics` |
| Engine `GET /api/v1/admin/reach-sessions` | Application band grouping + overlay membership |
| Engine `/health` | Engine node probe |

Implementation lives in `agentic-orchestration-web` (graph builder + WS) and `agentic-orchestration-admin` (Angular Topology page). Design briefs under `agentic-orchestration-admin/docs/topology/`.

---

## Operator tips

1. **Reach apps family missing** — expected when no Reach client is connected (or engine overlay off). Web API family still shows. Check engine :8765 and `AGENTIC_SERVE_SESSION_OVERLAY` for Reach apps.
2. **Everything grey / unknown** — expected for uninstrumented layers; focus on Engine + Web UI colour and Application presence.
3. **Local tools present but reverse-tunnel edge idle** — tunnel env may be off, or no step has invoked a tunnel MCP yet (structural edge still **no data**).
4. **OpenClaw / ao-web / ao-chat “missing” from Reach** — correct; use the bypass lane and Web UI, not Session bridge.
5. **Catalog counts huge, canvas calm** — aggregation is intentional; open the cluster modal for member lists and per-`appId` `client.*` overlays.
