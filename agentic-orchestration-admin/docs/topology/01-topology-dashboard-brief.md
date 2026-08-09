# AO Admin — Live Topology Dashboard · Design Brief

> **Handoff 1 of 4.** What this screen is, how it behaves, and what it must never do.
> **Companions:** `02-topology-data-contract.md`, `03-topology-layout-and-rendering.md`, `04-topology-build-plan.md`
> **Target:** `agentic-orchestration-admin` (Angular 22.1 / Fuse v22 / Material 22.1 / Tailwind 4.3). No new runtime dependencies — see doc 03 §1 for why.

---

## 1. What this is

A full-width, live diagram of the **current deployment** — not a documentation diagram. It shows the components that exist right now, their health, and the traffic moving between them. When a sidecar spawns, a node appears. When a worker finishes, it leaves. When the engine stops answering, its node degrades and every path through it dims.

It replaces the topology card grid on Overview, which shows unrelated tiles and no relationships.

The mental model is the three-layer architecture graph the team already maintains in Mermaid: **Application → AO Reach → Agentic Orchestration**, with AO's internals ranked from edge API down to infrastructure. The difference is that Mermaid draws what *can* exist; this draws what *does*.

### The one rule that governs everything

> **The diagram may only show what the system reports.**

A component that isn't instrumented renders as `unknown`, not as healthy. An edge with no telemetry says `no data`, not `0 req/s`. A node the API stopped mentioning goes to `offline` and then disappears — it does not silently keep its last good colour. This is the same honesty principle already applied to the config surface, and it matters more here because a green diagram is the most reassuring artifact in the entire product.

---

## 2. Users and the questions they arrive with

| Question | How the screen answers it |
|---|---|
| "Is anything broken right now?" | Failed and degraded nodes are the only saturated colour on screen; everything healthy is calm |
| "What does this failure affect?" | Hover any node → its full upstream and downstream path highlights, everything else dims |
| "Is traffic actually flowing?" | Edges animate in the direction of flow; speed is bucketed by throughput; idle edges are static |
| "Why is this component unhealthy?" | Click → modal with probe results, recent transitions, its settings, and its logs |
| "What's actually deployed?" | Sidecars, workers, overlays, and speech services only render when present |
| "How much is this link carrying?" | Click an edge → modal with rate, latency, errors, and the last window's history |

---

## 3. Structure of the diagram

Three horizontal bands, equal width, stacked. Every band spans the full content width; bands are visually identical in width and left/right alignment so that columns read vertically.

```
┌─ 1 · Application ────────────────────────────────────────────────┐
│   Client UI         Domain overlays     Local tools    OpenClaw  │
└──────────────────────────────────────────────────────────────────┘
┌─ 2 · AO Reach (ao_reach SDK) ────────────────────────────────────┐
│   SessionBridge     OverlayPacker       LocalMcpHost   SpeechClient
│                                                        MtlsEnroller
└──────────────────────────────────────────────────────────────────┘
┌─ 3 · Agentic Orchestration ──────────────────────────────────────┐
│  rank 0  edge      Engine :8765 · session_overlay · mcp_tunnel ·  │
│                    direct_agent · hello.speech · mTLS enrol       │
│                                              Web UI :30487 →      │
│  rank 1  planning  Planner / Runner / CrewAI                      │
│  rank 2  capability  Catalogs → Model backends → Ollama / Remote  │
│  rank 3  execution   Backends → Workers → MCP sidecars            │
│  rank 4  platform    k3s / Jetson → PVCs · GPU · weights          │
└──────────────────────────────────────────────────────────────────┘
```

**Columns carry meaning across bands.** The overlay column runs `Domain overlays → OverlayPacker → session_overlay`. The local-tool column runs `Local tools → LocalMcpHost → mcp_tunnel`. A reader should be able to follow a mechanism vertically without tracing through the bridge. Doc 03 §3 specifies the lane contract that guarantees this.

**Two flows that are not top-to-bottom, and must be drawn as exceptions:**

- **The reverse tunnel.** `mcp_tunnel` calls *back up* into `LocalMcpHost`. This is the distinguishing feature of Reach and every existing diagram hides it by drawing everything downward. It gets an upward edge with a distinct dash pattern.
- **The OpenClaw bypass.** `OpenClaw → Web UI :30487` skips the Reach band and the engine entirely. It routes outside the bands, down the right margin, so the skip is spatially obvious.

---

## 4. Node states

Seven states. Every node carries a status glyph and a text label in addition to colour — the diagram must be readable with colour removed.

| State | Meaning | Treatment |
|---|---|---|
| `healthy` | Probe passing | Band colour, normal fill |
| `degraded` | Passing with warnings, or partial replicas | Amber accent, warning glyph |
| `failed` | Probe failing | Red accent, error glyph, connected edges go red |
| `starting` | Present, not yet ready | Band colour at reduced opacity, pulsing outline |
| `draining` | Shutting down, still serving | Reduced opacity, dashed outline |
| `unknown` | Present but not instrumented | Neutral grey, question glyph, `not instrumented` in the modal |
| `offline` | Was present, now gone; inside the grace window | Ghost outline only, no fill |

`unknown` is not a failure state and must not be counted as degraded in any summary. Conflating "we didn't measure it" with "it's fine" or "it's broken" are both lies, in opposite directions.

### Never-deployed components

Optional components that this deployment doesn't run (speech services on a minimal install, sidecars under the in-process backend) are **hidden by default**, with a `Show components not deployed` toggle that renders them as dashed placeholders. Operators need to know a capability exists; they don't need it cluttering the live view.

---

## 5. Edges

| Property | Encoding |
|---|---|
| Direction | Dash animation travels source → target. Always. |
| Throughput | Four speed buckets: idle (static), low, medium, high. Never continuous — a speed that tracks a live number looks nervous and communicates nothing. |
| Health | Inherits the worse of its two endpoints; a failing target turns the edge red |
| No telemetry | Static dashes, reduced opacity, `no data` in the modal. Not animated, not zero. |
| Kind | Solid dash = request/response · Long dash = stream (audio, WebSocket) · Short dash + upward = reverse tunnel · Dotted = advertisement (`hello.speech` returns URLs; it does not carry audio) |

The advertisement distinction matters: today `hello.speech → STT` and `SpeechClient → STT` render identically, which tells a reader the engine pipes audio. It doesn't.

---

## 6. Interaction

### Hover — path highlight

Hovering any node or edge highlights its **full transitive path**: all upstream ancestors and all downstream descendants, plus the edges connecting them. Everything else drops to ~25% opacity. Highlight is a visual state only — nothing moves, nothing resizes, no layout runs.

Hovering an edge highlights only that edge's two endpoints and the path through it.

Keyboard equivalent: focus a node with `Tab`, and the same highlight applies. Path highlight is not hover-only.

### Click — modal

Clicking a node or an edge opens a `mat-dialog`. While open, the diagram behind it takes a blur and dim treatment (doc 03 §7). The dialog is focus-trapped and closes on `Esc`.

**Node modal** — four tabs, using `MatTabsModule`:

| Tab | Content |
|---|---|
| Health | Current state, uptime, last probe result and timestamp, replica/instance count, recent state transitions with times |
| Traffic | Inbound and outbound edges with rate, latency p50/p95, error rate; sparkline per edge over the retained window |
| Config | The settings that govern this component, with source and apply-tier chips, deep-linked to the settings screen |
| Logs | The existing admin log stream, pre-filtered to this component's source |

**Edge modal** — rate, latency distribution, error count and recent error samples, bytes in/out, protocol and port, and the last window as a small ApexCharts line. When the edge is uninstrumented, the modal says so plainly and lists what would need to be instrumented to populate it.

**Cluster modal** — for aggregated nodes (agents, MCP servers, skills, workers, sidecars), a searchable table of members with per-member status and gate reason, reusing the Capabilities screen's status vocabulary. Clicking a member deep-links to its catalog detail.

### Live updates while a modal is open

Content keeps updating. It does **not** re-layout, and the modal never closes because its subject changed. If the subject disappears entirely, the modal shows an inline `This component went offline at 14:31` banner and remains open until dismissed — closing a dialog out from under someone reading it is worse than showing stale-but-labelled data.

---

## 7. Aggregation — non-negotiable

The catalog has 183 agent providers. Individual nodes for those, plus MCP servers, skills, workers, and sidecars, produce an unreadable and slow canvas.

**Aggregate by kind into cluster nodes.** A cluster node shows its kind, a total, and a status breakdown (`183 agents · 12 active · 22 gated`). Clicking opens the member list in a modal. Members never render on the canvas.

**Exception — small dynamic sets expand inline.** Workers and sidecars render individually while the count is ≤ 6, and collapse to a cluster above that, with the transition animated. Seeing three worker pods appear during a run is exactly the value of a live diagram; seeing forty is noise.

---

## 8. Colour

Category first, status as an overlay. Two ramps plus neutral, per the project's existing restraint.

| Element | Treatment |
|---|---|
| Application band | Neutral / grey ramp |
| Reach band | Secondary ramp (violet family) |
| AO band | Primary ramp (the steel/teal family already used in Admin) |
| Status | Amber (degraded), red (failed), grey (unknown), reduced opacity (starting/draining/offline) |

Status colour **overrides** band colour on the accent and glyph only — the node's fill stays in its band family, so you can always tell which layer a failing component belongs to. Colours come from Fuse's Material 3 system tokens and the Tailwind theme layer; nothing hardcoded. Dark mode is the default for this surface and light mode must be tested, not assumed.

Bands are labelled and separated by hairline rules, not heavy containers.

---

## 9. Controls

A single toolbar row above the canvas:

- **Live / Paused** indicator with last-update time. Pausing freezes the canvas for inspection without dropping the socket.
- **Filters** (`MatButtonToggleModule`): band, status, `only unhealthy`.
- **Show not-deployed** toggle.
- **Fit to width** / zoom in / out. No free-form node dragging — layout is deterministic and operator-arranged positions would be lost on every update.
- **Legend** — a `mat-menu` popover, not a permanent panel eating canvas.

---

## 10. What this screen must not do

- **Must not invent metrics.** Uninstrumented edges and nodes say so.
- **Must not use a force-directed layout.** Nodes must occupy stable positions across updates; a graph that reshuffles when one pod appears is unusable for operations. See doc 03 §3.
- **Must not mutate anything.** No restart buttons, no scale controls, no config edits in v1. Modals deep-link to the screens that own those actions.
- **Must not become the Overview page.** Overview keeps attention items, host metrics, and logs. This is a separate destination.
- **Must not animate when the tab is hidden.** Suspend animation and throttle the socket on `visibilitychange`.
- **Must not require the engine.** The engine is optional; when it's absent its node shows `failed` or `offline` and the rest of the graph still renders from what the web process knows.
