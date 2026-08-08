# AO Admin — Live Topology · Layout & Rendering

> **Handoff 3 of 4.** How the thing is actually drawn, why the layout is deterministic, and the rules that keep it from thrashing.

---

## 1. Technology choice

**Hand-authored SVG bound to Angular signals. No graph library, no canvas, no new dependency.**

| Rejected | Why |
|---|---|
| Force-directed (d3-force, cytoscape, vis) | Non-deterministic. Positions shift when a node appears. An operations diagram whose components move between glances is worse than no diagram. Also a new dependency in an air-gapped-target product |
| Canvas / WebGL | Node count is ~40 visible after aggregation. Canvas costs DOM events, focus, keyboard access, CSS theming, and screen-reader support for no benefit at this scale |
| Mermaid at runtime | Layout engine is the exact thing producing the current alignment problems, and it re-renders the whole graph on any change — no enter/exit animation possible |
| ApexCharts | Not a graph renderer |

SVG in Angular gives: `@for` with `track` by node id for free enter/exit, CSS transitions on `transform` for movement, CSS animation for the dash flow, native focus and click handling, and Fuse's theme tokens applied directly.

---

## 2. Component structure

| Component | Responsibility |
|---|---|
| `topology-page` | Toolbar, filters, banners, hosts the canvas |
| `topology-canvas` | The SVG. Viewport, zoom/pan, renders bands, nodes, edges |
| `topology-node` | One node. Pure — takes a positioned node, emits hover/click |
| `topology-edge` | One edge. Pure — takes a resolved path and metrics |
| `topology-legend` | Popover |
| `node-detail-dialog`, `edge-detail-dialog`, `cluster-dialog` | Modals |
| `TopologyStore` | Signals: graph state, seq, health map, metrics map, derived layout, selection, hover closure |
| `TopologyLayout` | Pure function: graph → positioned graph. No Angular, unit-testable |

`TopologyLayout` being a pure function is what makes this maintainable. Layout bugs are then reproducible from a fixture without a running socket.

---

## 3. Layout — deterministic lane assignment

The core constraint: **a node's position must depend only on its identity and kind, never on what else happens to be present.** Two operators looking at different deployments should find the planner in the same place.

### The layout contract

A static table, held client-side, maps `kind` → `(band, rank, lane, order)`.

| Band | Rank | Lane semantics |
|---|---|---|
| application | 0 | 0 session · 1 overlays · 2 local tools · 3 bypass |
| reach | 0 | 0 bridge · 1 overlay packer · 2 local MCP host · 3 speech · 4 mTLS |
| ao | 0 edge | 0 engine · 1 overlay API · 2 tunnel API · 3 direct agent · 4 speech advertise · 5 mTLS enrol · (right) web UI |
| ao | 1 planning | 0 planner |
| ao | 2 capability | 0 catalogs · 1 model backends · 2 local runtime · 3 remote LLMs |
| ao | 3 execution | 0 execution backend · 1 workers · 2 MCP sidecars |
| ao | 4 platform | 0 k3s / Jetson · 1 storage / GPU |

Lanes 0–2 are aligned across all three bands so the session, overlay, and local-tool columns read vertically. That vertical correspondence is the main thing the current Mermaid version fails to deliver.

Unknown kinds land in a trailing `other` lane within their band rather than being dropped — a new component type should appear, imperfectly placed, not vanish.

### Position computation

1. Group nodes by `(band, rank)`.
2. Within a row, sort by `lane`, then `order`, then `id`. Stable and total — no ties resolved by iteration order.
3. Compute a uniform column grid from the widest row; assign each lane an x. Rows with fewer nodes leave gaps rather than re-centring, so columns stay aligned across rows.
4. Rows are laid out top to bottom with fixed vertical rhythm. A row with no nodes collapses to zero height.
5. Bands are sized to their contents and always span the full canvas width.

**Consequence to accept deliberately:** an empty lane leaves a visible gap. That is correct — the gap tells the operator that something which normally sits there is absent.

### Movement

When a node enters or leaves, neighbours slide to their new slots via a CSS `transform` transition (~200 ms, ease-out). The layout function is pure and synchronous; the animation is entirely in the transition between old and new transforms. No animation library, no per-frame JS.

---

## 4. Edge routing

| Case | Routing |
|---|---|
| Adjacent ranks, same or near lane | Straight line, trimmed to node edges |
| Adjacent ranks, distant lanes | Vertical-first bezier: leave the source downward, curve, enter the target from above |
| Same rank | Horizontal line between facing edges |
| Reverse tunnel | Upward path offset horizontally from the downward edge in the same lane, so the pair reads as two directions, not one line |
| Bypass | Routed outside the band rectangles, down the right margin |

**Lines stop at node boundaries.** Compute the trim from node geometry; never draw through a node and rely on fill to hide it — the fill isn't guaranteed in every theme.

**Before drawing any edge, check it against every node rectangle.** If a straight path intersects an unrelated node, route around it. This is the most common failure in generated diagrams and the one operators notice immediately.

---

## 5. Animation

Dash flow is CSS only:

- `stroke-dasharray` fixed per edge kind.
- `stroke-dashoffset` animated to produce travel. Direction from source → target; reversed edges get the opposite sign.
- Speed by bucket, via a duration custom property: idle (no animation), low ~3 s, medium ~1.6 s, high ~0.8 s per cycle.

**Rules:**

- Only `stroke-dashoffset`, `opacity`, and `transform` are animated. Nothing else.
- Bucket changes transition the duration; they never restart the animation, which would produce a visible jump on every metrics tick.
- `prefers-reduced-motion: reduce` disables dash travel entirely; direction is then carried by arrowheads alone, which must therefore always be present.
- Animation suspends on `visibilitychange` and while paused.
- Node enter: fade plus slight scale, ~180 ms. Node exit: fade to ghost, hold for the grace window, then remove.

Never animate a number counting up. Metric values change instantly.

---

## 6. Path highlighting

On hover or focus, compute the transitive closure — all ancestors and all descendants — from an adjacency map maintained in the store and recomputed only on structure change, never on metrics ticks.

Applied as a single class on the SVG root plus a `highlighted` class on members. Dimming is `opacity` on non-members. **No geometry changes on hover** — no stroke-width growth, no scaling, no re-layout. Movement on hover in a dense diagram reads as instability.

Debounce hover entry ~60 ms so sweeping the pointer across the canvas doesn't strobe.

---

## 7. Modal and blur

Use `MatDialogModule`. The blur is applied to the diagram container, not the page:

- A class on the canvas wrapper applies `filter: blur(...)` plus a slight opacity reduction and a saturation drop, transitioning over ~150 ms.
- Blur the **canvas wrapper only** — never an ancestor of the dialog, or the dialog blurs itself.
- The toolbar and banners stay sharp; only the diagram recedes.
- `prefers-reduced-motion`: keep the dim, drop the blur transition.
- Test on Firefox and Safari — `filter: blur` on a large SVG subtree can force expensive repaints; if profiling shows a problem, blur a rasterized snapshot or fall back to dim-only. Do not ship a solution that drops the canvas to single-digit frame rates while a dialog is open.

Dialogs are focus-trapped, `Esc`-closable, and return focus to the invoking element. Dialog content keeps updating from the store (doc 01 §6).

---

## 8. Performance

Target: 60 fps with ~40 visible nodes and ~60 edges, metrics ticking at 2 s.

| Concern | Approach |
|---|---|
| Change detection | Zoneless, `OnPush` everywhere. Node and edge components take positioned inputs and are otherwise pure |
| Metrics ticks | Patch a signal map keyed by edge id. Only the affected `topology-edge` re-renders. Never replace the whole graph object |
| Layout runs | Only on structure change. Health and metrics must never trigger it. Assert this in a test |
| Adjacency / closure | Cached, invalidated on structure change only |
| Hidden tab | Suspend animation and unsubscribe metrics |
| Cluster expansion | Bounded — collapse workers/sidecars past 6 |

---

## 9. Theme

Everything from Fuse's existing token layer — Material 3 system tokens for surfaces and text, the Tailwind theme layer for the ramps. No hardcoded hex anywhere in the SVG.

Band identity comes from the ramp; status comes from an accent stroke plus a glyph. Because status never replaces the fill, a failing node still reads as belonging to its band.

Dark is the default for this surface. Light mode must be checked, particularly amber-on-light contrast for `degraded`, which is the pairing that usually fails.

---

## 10. Accessibility

The diagram is not a decorative image and must not be built as one.

- SVG root carries `role="img"` with a `<title>` and a `<desc>` summarising the current deployment state — regenerated as the graph changes, so a screen-reader user gets a real summary, not a static caption.
- Nodes are focusable in reading order (band, then rank, then lane) with visible focus rings. `Enter` opens the modal, focus triggers path highlight.
- Edges are reachable from their endpoints' modals rather than being individually tabbable — tabbing through 60 edges is hostile.
- **A parallel table view**, toggleable from the toolbar: nodes with status and reason, edges with endpoints and metrics. This is the accessible equivalent and it is also the fastest way for anyone to scan status. Build it; it is not a compliance afterthought.
- Status never encoded by colour alone — glyph plus text label always.
- Live region announces only status *transitions*, politely, and coalesced. Never announce metrics ticks.
- All animation opt-out under `prefers-reduced-motion`.

---

## 11. Responsive

| Width | Behaviour |
|---|---|
| ≥ 1280px | Full diagram, all bands, fit-to-width by default |
| 1024–1279px | Same layout, horizontal scroll within the canvas rather than shrinking text below 11px |
| ≤ 1023px | Diagram replaced by the table view, with a note that the diagram needs a wider screen |

Shrinking a 40-node graph onto a phone produces something unreadable that looks like it works. The table is the honest mobile answer.
