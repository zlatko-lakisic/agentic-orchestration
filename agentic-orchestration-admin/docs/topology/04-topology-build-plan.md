# AO Admin — Live Topology · Build Plan

> **Handoff 4 of 4.** Discovery, sequencing, acceptance criteria, and the decisions that need an owner before code.

---

## Step 0 — Discovery, before writing anything

The three preceding documents describe a target. This step establishes how far the current system is from it. **Do not begin implementation until this is recorded** — several proposals below may already exist under different names, and at least one probably cannot be built as described.

| # | Find | Blocks |
|---|---|---|
| 1 | Existing admin WebSocket message envelope, subscribe/unsubscribe pattern, reconnect behaviour | Whether topology reuses the socket or needs a new channel |
| 2 | Exact payload of `GET /api/v1/admin/health/topology` today — fields, which components it covers, how status is derived | How much of the node schema already exists |
| 3 | Does anything track **edges** today, or only components? | If nothing does, edges are net-new backend work and the largest item in the plan |
| 4 | Engine's connection registry: can it enumerate connected Reach sessions, their overlays, and their registered local MCP hosts? | Whether bands 1 and 2 are populatable at all |
| 5 | Per-endpoint request counters on the engine — do they exist, at what granularity? | Whether edge metrics are real or Phase 3 |
| 6 | k8s access from the web process: can it list pods/jobs, or is that engine-only or absent? | Whether workers and sidecars appear live |
| 7 | Are health probes real probes, or presence checks? Per component kind | Populates the `nodeProbes` capability honestly |
| 8 | Whether component ids are stable across restarts | Enter/exit animation and flap suppression depend on this entirely |
| 9 | How sidecars are discoverable — labels, annotations, naming convention | Whether the sidecar portion is buildable |
| 10 | Existing log-source names, so node modals can filter the stream | Logs tab |
| 11 | Whether `MatDialogModule` is already wired in the admin app | Trivial, but confirm |
| 12 | Whether a topology or graph view already exists in any form | Avoid a second one |

**Output:** a findings table marking each row `exists` / `partial (detail)` / `absent`. Everything `absent` becomes backend scope and should be sized before UI work is scheduled.

**The likely finding:** structure is mostly derivable today, node health partially, and **edge metrics not at all**. Plan for that — see phasing.

---

## Phasing

Each phase ships something usable. None depends on the next being funded.

### Phase 1 — Static graph, live structure and health

Full three-band layout, the deterministic lane contract, node states, hover path highlight, click-to-modal with health/config/logs tabs, clustering, filters, legend, table view, blur treatment.

Edges render with direction and kind, arrowheads, and **no animation and no metrics** — every edge shows `no data`, honestly, because it does. Structure and health arrive over the socket; nodes appear and disappear for real.

This is the phase that delivers most of the operator value. A diagram that shows what's deployed and what's unhealthy, updating live, is useful without a single throughput number.

### Phase 2 — Edge metrics and flow animation

Metrics tick, speed buckets, dash animation, edge modal with rate/latency/errors and history, edge status derived from error rate. Instrumentation work on the backend is the bulk of this.

Partial instrumentation is expected and fine: instrumented edges animate, the rest stay static and say so. Do not delay the phase waiting for full coverage.

### Phase 3 — Depth

Worker and sidecar lifecycle detail, per-run overlay (highlight the path a specific run took), historical scrub, alert integration.

The per-run overlay is the most valuable item here and worth pulling forward if `Runs` (from the earlier admin review) gets built — being able to select a run and see which components it touched connects the two screens.

---

## Acceptance criteria

Testable, per phase.

### Phase 1

1. With the socket disconnected, the page still renders a complete graph from the REST snapshot, with a banner naming the snapshot time.
2. Killing the engine moves its node to `failed` within one health interval; bands 1 and 2 empty with an explanatory note; ranks 1–4 continue rendering.
3. A node that is present but has no real probe renders `unknown`, never `healthy`, and its modal states that health is not probed.
4. Starting a worker makes a node appear with an enter animation; no other node changes position by more than its slot shift; the planner stays exactly where it was.
5. A worker that exits stays as a ghost for the grace window, then disappears. A worker that restarts within the window does not re-enter.
6. Hovering the planner highlights its full upstream and downstream closure and dims everything else, with no geometry change and no layout run.
7. Opening a modal blurs only the canvas; the toolbar stays sharp; focus is trapped; `Esc` closes and returns focus to the node.
8. A modal open on a component that goes offline shows an inline banner and stays open.
9. The catalog renders as one cluster node with a count and breakdown — never 183 nodes.
10. The table view lists every node and edge with status and reason, and is reachable by keyboard from the toolbar.
11. With colour removed (greyscale screenshot), every node's status is still identifiable.
12. `prefers-reduced-motion` disables enter/exit and dash animation; arrowheads still convey direction.
13. At ≤ 1023px the table view replaces the diagram.
14. A seq gap triggers a silent resync with no visible interruption.

### Phase 2

15. An edge with `instrumented: false` never animates and its modal says `no data` rather than showing zeros.
16. `latencyP95: null` renders as `not measured`, never as `0 ms`.
17. A metrics tick patches only edge visuals — assert via test that no layout run occurs.
18. Speed bucket changes transition smoothly with no animation restart or visible jump.
19. Hiding the tab suspends animation and metrics; returning resumes without a full reload.
20. Sustained 60 fps with 40 nodes, 60 edges, 2 s ticks, measured with the profiler.

---

## Open decisions

| # | Question | Recommendation |
|---|---|---|
| 1 | Reuse the admin socket or open a dedicated one? | Reuse. A second socket doubles reconnect and auth handling for no benefit |
| 2 | Who computes cluster aggregation? | Server for catalogs (policy), client for workers/sidecars (viewport-dependent) |
| 3 | Does the web process get k8s read access, or does it proxy the engine? | Proxy the engine where it already has access; adding cluster credentials to the web process widens the blast radius of the least-protected component |
| 4 | Is band 1 populated at all in v1? | Only from Reach session capabilities, explicitly labelled as client-reported. Empty state when no sessions connected |
| 5 | Edge metric retention window | 15 minutes in memory is enough for the modal sparkline; longer belongs in a metrics system, not here |
| 6 | Does this replace Overview's topology grid or sit beside it? | Replace it. Overview links here; two topology views will drift |
| 7 | Grace window length | 30 s default, configurable. Validate against real worker lifetimes in Step 0 |

---

## Out of scope for v1

- Any mutation: no restart, scale, drain, or config edit from the diagram. Modals deep-link to the screens that own those actions.
- Manual node repositioning or saved layouts.
- Historical playback or time-travel.
- Alerting, thresholds, notification rules.
- Cross-deployment or fleet view. One deployment, one diagram.
- Anything requiring a new runtime dependency.

---

## Risks

| Risk | Mitigation |
|---|---|
| **Edge telemetry doesn't exist** and Phase 2 balloons | Phase 1 is designed to be complete without it. Do not let Phase 2 scope block Phase 1 shipping |
| **Component ids unstable across restarts** | Breaks enter/exit and flap suppression. Step 0 #8 — if unstable, fixing id derivation is a prerequisite, not a nice-to-have |
| **Blur performance** on large SVG in Safari/Firefox | Profile early. Dim-only fallback specified in doc 03 §7 |
| **Layout thrash** from health events triggering re-layout | Assert with a test that only structure changes run layout |
| **The diagram becomes reassuring rather than informative** — everything green because most things are unprobed | The `unknown` state and the `capabilities` object exist precisely for this. Do not let `unknown` render as green, and do not count it as healthy in any summary |

The last risk is the one that would quietly waste the whole effort. A topology dashboard that shows all-green because half the components aren't instrumented is worse than no dashboard — it converts missing information into false confidence, which is exactly the failure the project's honesty principle exists to prevent.
