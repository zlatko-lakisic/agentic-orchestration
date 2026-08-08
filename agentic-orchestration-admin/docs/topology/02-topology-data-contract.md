# AO Admin — Live Topology · Data Contract

> **Handoff 2 of 4.** The API and socket protocol the dashboard consumes. This is the part that must exist before any UI work is worth starting.
> Field names below are the proposal; Step 0 (doc 04) confirms what already exists and this document yields to those findings.

---

## 1. Shape of the problem

The dashboard needs three streams that update at very different rates, and conflating them is the main failure mode:

| Stream | Changes | Delivery |
|---|---|---|
| **Structure** — which nodes and edges exist | Seconds to hours | Snapshot on connect, then deltas |
| **Health** — each node's state | Seconds | Batched events |
| **Metrics** — throughput, latency, errors per edge | Continuously | Batched ticks at a fixed cadence |

Sending the full graph every second is the obvious wrong answer: it churns the DOM, defeats enter/exit animation, and makes it impossible to distinguish "this node is new" from "this node was in the last payload too."

---

## 2. REST — initial snapshot

**`GET /api/v1/admin/topology/graph`**

Returns the complete current graph plus a sequence number. Called on load, on resync, and on manual refresh. This is also the fallback when the socket is unavailable — the dashboard must render, statically, without a working WebSocket.

Response fields:

| Field | Type | Notes |
|---|---|---|
| `seq` | integer | Monotonic. Every delta carries the seq it advances from |
| `generatedAt` | timestamp | Server clock |
| `nodes` | array | See §3 |
| `edges` | array | See §4 |
| `capabilities` | object | Which metrics are actually instrumented — see §7 |

**`GET /api/v1/admin/topology/node/{id}`** — the node modal's detail payload: probe history, recent transitions, replica list, related config keys, log source name.

**`GET /api/v1/admin/topology/edge/{id}/metrics?window=15m`** — time series for the edge modal.

---

## 3. Node schema

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable across restarts. `engine`, `worker/abc123`, `sidecar/pod-xyz/fetch_url`. Never a random per-connection id — the client keys enter/exit animation on this |
| `kind` | enum | `ui`, `overlay-source`, `local-tools`, `openclaw`, `session-bridge`, `overlay-packer`, `local-mcp-host`, `speech-client`, `mtls-enroller`, `engine`, `endpoint`, `web-ui`, `planner`, `catalog`, `model-backend`, `model-runtime`, `execution-backend`, `worker`, `mcp-sidecar`, `platform`, `storage` |
| `band` | enum | `application`, `reach`, `ao`. Drives which band renders it |
| `label` | string | Display name, ≤ 20 chars |
| `sublabel` | string | ≤ 20 chars. Port, backend, model, replica count |
| `status` | enum | `healthy`, `degraded`, `failed`, `starting`, `draining`, `unknown` |
| `statusReason` | string | Required whenever status is not `healthy`. Shown in the modal, never on the canvas |
| `instrumented` | boolean | False → client renders `unknown` regardless of `status` |
| `deployed` | boolean | False → hidden unless "show not-deployed" is on |
| `count` | integer | Present on cluster nodes. Members fetched on demand |
| `breakdown` | object | Optional status counts for clusters: `{ available, gated, excluded, failed }` |
| `parent` | string | For workers/sidecars: the node they belong to. Drives clustering |
| `lastProbeAt` | timestamp | Drives the staleness overlay |

**Cluster nodes are produced by the server, not the client.** The server decides that 183 agents are one `catalog` node with a breakdown. Sending 183 nodes and asking the client to aggregate wastes the payload and puts the policy in the wrong place. Workers and sidecars are the exception — those arrive individually and the client collapses them past a threshold (doc 01 §7), because the client is the one that knows the current viewport.

---

## 4. Edge schema

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable. `bridge->engine`, `tunnel->local-mcp-host` |
| `from`, `to` | string | Node ids. Direction is authoritative — the animation follows it |
| `kind` | enum | `request`, `stream`, `reverse-tunnel`, `advertisement`, `bypass` |
| `protocol` | string | `wss`, `https`, `http`, `grpc`, `stdio` |
| `port` | integer | Optional |
| `instrumented` | boolean | False → static dashes, `no data` in modal |
| `status` | enum | `ok`, `degraded`, `failing`, `idle`, `unknown` |

Metrics do **not** live on the edge object in the structural payload. They arrive on the metrics tick (§6), so a structure delta never carries a number that's already stale.

`kind` is what lets the client draw the reverse tunnel upward and the advertisement as dotted. Without it the diagram flattens back into "everything points down," which is the defect in the current Mermaid source.

---

## 5. WebSocket — structure and health

Reuse the existing admin socket rather than opening a second one. Subscribe with `topology_subscribe`; the server replies with the current `seq` and then streams.

| Event | Payload | Client action |
|---|---|---|
| `topology_snapshot` | Full graph + `seq` | Replace state. Sent on subscribe and on resync |
| `topology_delta` | `seq`, `fromSeq`, `nodesUpserted[]`, `nodesRemoved[]`, `edgesUpserted[]`, `edgesRemoved[]` | Apply if `fromSeq` matches local seq; otherwise request resync |
| `topology_health` | `seq`, array of `{ id, status, statusReason, lastProbeAt }` | Patch status only. Never triggers layout |
| `topology_metrics` | `tick`, array of `{ edgeId, rate, latencyP50, latencyP95, errorRate, bytesIn, bytesOut }` | Patch metrics only. Never triggers layout |

**Separating health and metrics from structure is the load-bearing decision.** Only `topology_delta` and `topology_snapshot` may cause nodes to appear or disappear or the layout to run. Health and metrics patch existing elements in place. If health events can add nodes, every layout becomes unpredictable and the enter/exit animation fires at random.

### Cadence

- Structure deltas: as they happen, coalesced server-side over ~250 ms.
- Health: coalesced over 1 s.
- Metrics: fixed tick, default 2 s, configurable. Suspended while the tab is hidden or the view is paused.

### Reconciliation

The client holds `seq`. Every delta names the seq it advances from. On mismatch — missed message, reconnect, server restart — the client requests `topology_resync` and applies a fresh snapshot. It never attempts to patch across a gap. On reconnect after any outage the server sends a snapshot, not a delta.

### Flap suppression

A node that disappears enters `offline` and stays on the canvas as a ghost for a grace window (default 30 s) before removal. A node that returns within the window transitions back rather than re-entering. Workers that legitimately live for eight seconds would otherwise produce a canvas that flickers constantly — and the operator's real question is "did anything run," not "is it running at this instant."

---

## 6. Metrics semantics

| Field | Unit | Notes |
|---|---|---|
| `rate` | events/sec over the tick window | The animation speed bucket derives from this |
| `latencyP50`, `latencyP95` | ms | Null when not measured — the client must distinguish null from 0 |
| `errorRate` | 0–1 | Drives the edge's `failing` status above a threshold |
| `bytesIn`, `bytesOut` | bytes over the window | Modal only, never on canvas |

Speed buckets (client-side, thresholds configurable): `idle` = 0, `low` < 1/s, `medium` < 20/s, `high` ≥ 20/s.

**Null is not zero, and the UI must render the difference.** `latencyP95: null` means unmeasured; `0` would be a lie about a fast link.

---

## 7. The capabilities object

The snapshot declares what's actually instrumented:

| Field | Meaning |
|---|---|
| `edgeMetrics` | Which edge kinds report rate/latency at all |
| `nodeProbes` | Which node kinds have a real health probe versus presence-only detection |
| `historyWindow` | How far back edge metric history is retained |
| `sources` | Which subsystems fed this graph (web process, engine, k8s API) and whether each was reachable |

This is what lets the UI be honest without hardcoding assumptions. If `nodeProbes` doesn't list `mcp-sidecar`, sidecars render `unknown` and their modals say presence is detected but health is not probed — rather than the UI quietly showing a green tick because a pod exists.

`sources` also drives partial-data handling: when the k8s source is unreachable, the platform and worker portions of the graph render as `unknown` with a banner naming the source, and the rest stays live. This is the same defect class as the storage screen reporting `MISSING` for paths it can't see.

---

## 8. Where this data comes from

| Portion | Source |
|---|---|
| Application and Reach bands | Engine connection registry — connected Reach sessions, their negotiated capabilities, active overlays, registered local MCP hosts |
| Engine and endpoints | Engine health endpoint plus per-endpoint request counters |
| Web UI, planner, catalogs | Web process |
| Model backends and runtimes | Catalog resolution plus Ollama's model list and remote provider credential state |
| Backends, workers, sidecars | Execution backend; k8s API for pods and jobs |
| Platform, PVCs, GPU | k8s API, node metrics |

**The Application band is only knowable through Reach.** AO sees a connected session and what it advertised — not the product's internal structure. Nodes in band 1 must be derived from session capabilities and labelled as such; the dashboard must not imply it can see inside a customer's application. When no Reach session is connected, band 1 is legitimately empty and should say `no connected clients`, not render a speculative UI node.

---

## 9. Failure behaviour

| Condition | Behaviour |
|---|---|
| Socket never connects | Render from the REST snapshot. Banner: `Not live — showing a snapshot from HH:MM`. Manual refresh available |
| Socket drops mid-session | Keep last graph, dim the canvas slightly, banner with reconnect countdown. Metrics freeze and are marked stale rather than decaying to zero |
| Engine unreachable | Engine node `failed`, its downstream `unknown`, bands 1 and 2 empty with an explanatory note. Rest of the graph unaffected |
| k8s source unreachable | Execution and platform ranks `unknown` with a source banner |
| Seq gap | Silent resync. No user-visible interruption |
| Metric tick missing for > 3 intervals | Edges fall back to static with a staleness indicator |

Nothing here produces a blank screen or a full-page error. Partial data with honest labelling beats an empty canvas in every case.
