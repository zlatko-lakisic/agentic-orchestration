# AO Admin — Changes & Improvements

> The rework, screen by screen, with the reasoning for each change.
> Constraint honoured throughout: **only components already present in the Fuse v22 template** — Material (table/sort/paginator, tabs, expansion, menu, badge, tooltip, autocomplete, button-toggle, dialog, sidenav/drawer, progress-bar, slide-toggle, select, form-field, divider, card, list, radio, checkbox), CDK (overlay, layout, drag-drop, text-field), ApexCharts, Lucide sprite, Transloco. No new libraries, no graph engine.
> Companion: `AO-Admin-Phase0-Review.md` (what's wrong and why).

---

## 1. The reframe

One sentence drives every change below:

> Organize the console around **the things an operator manages**, not around **where configuration values are stored**.

Today's nav mirrors the code's env-var grouping. The replacement mirrors the four questions operators actually arrive with:

| Operator arrives asking | Today they must | After |
|---|---|---|
| "Is it healthy, what needs me?" | Scroll past two charts and a log terminal | Overview, attention first |
| "Why can't the planner see my model?" | Guess between Models & hardware, Catalogs, Advanced | Capabilities → the entry states its own gate |
| "The engine is misbehaving" | Assemble it from Execution, Deployments, Advanced, Overview | Components → Engine: status, settings, logs, endpoints, in one place |
| "Who can reach this box?" | Read a masked file path and infer | Access, opening with a posture verdict |
| "What changed, and what's pending?" | Nowhere | Activity |

---

## 2. New information architecture

Nine destinations, down from thirteen. Every one is a noun the operator recognizes.

```
AO Admin                                    [ jetson-01 · edge ]

  Overview            Triage: attention, topology, telemetry, logs

  OPERATE
    Components        Web · Engine · Execution · Ollama · MCP · Speech
    Runs              Session history, phases, QA scores          [new]
    Activity          Audit + tasks + pending changes, one timeline

  CONFIGURE
    Capabilities      Agents · MCP · Skills · RAG · Workflows · Harnesses · Societies
    Behaviour         Planner · iteration · memory · QA gates · anonymization
    Access            Posture · identity · secrets · deals · mTLS
    Data              Storage roots · retention
    Deploy            Profile · env.jetson · endpoints · rollout path

  All settings        Every key, searchable, with provenance
```

### What moved and why

**`Components` replaces Runtime → Execution + half of Models & hardware + parts of Deployments and Advanced.**
The most important structural change. An operator debugging the engine currently visits four screens; the engine's port lives in Deployments, its TLS files in Access & security, its health on Overview, its backend in Execution. Components inverts this: each component is a page with its own status, endpoints, settings, logs, and (Phase 1) restart. This is the Rancher/Argo pattern and it's the difference between a config browser and a console.

**`Behaviour` merges Planner & defaults + Memory & quality.**
These are one thing: how a run is shaped. Planner caps, iterative rounds, KB injection, QA gates, and anonymization are all "what happens when a task is processed." Splitting them across two nav items and calling one of them "Memory & quality" hides the relationship. Sub-sections inside the page keep them distinct.

**`Capabilities` replaces `Catalogs`.**
Not just a rename. "Catalog" describes the file layout; "capability" describes what the operator is deciding about — what this deployment *can do*. The page's job becomes answering "what's available, what isn't, and why," which reframes the gate reasons from metadata into the headline.

**`Access` replaces `Access & security`** and opens with a posture verdict rather than a settings list.

**`Runs` is new.**
Sessions, phases, QA scores, and learning traces exist on disk and are invisible in Admin. Every comparable system (Temporal, Airflow, Argo) makes run history primary. This is the single largest missing *capability*, as opposed to missing polish. Phase 0 can ship it read-only from the sessions directory.

**`Activity` merges Audit + Change set + a task list.**
One timeline: what happened, what's pending, what failed. Removes the two empty nav items by giving them a home that has content on day one (topology transitions, log-derived events, config fingerprint changes) instead of waiting for Phase 1 mutations.

**`All settings` replaces `Advanced`.**
Same escape-hatch role, honest name, and — critically — it is no longer where uncategorized keys go to be forgotten. Every key appears here *and* in its grouped home. Advanced-as-a-dumping-ground is what let Kubernetes service-injection vars accumulate.

**Deleted from nav:** `Runtime` (as a group), `Integrations` (folds into Components — OpenClaw and Reach are components with endpoints; Home Assistant and search MCPs are Capabilities entries), separate `Audit` and `Change set`.

---

## 3. Changes that apply to every screen

### 3.1 Effective value, always — the blocking fix

No row may render `—` / `UNSET` as its value. Every setting shows what is in effect:

```
Answer cache          on          default        Next run
Impartial QA gate     off         default        Next run
Iterative rounds      2           env.jetson ⚠   Next run
Execution backend     kubernetes  process env    Restart
```

`default` becomes a first-class source, and `Not set` survives only for genuinely optional values with no default (a credential, an override path). Where a value is overridden, a second line names what it overrode. **This is a backend change before it is a UI change** — the effective-config endpoint must return `{ effective, source, default, overrides[] }` rather than set-ness.

Without this, nothing else on this list matters.

### 3.2 Row layout: table, not stacked pairs

Replace the 73px two-line stacked row with a `mat-table` row at compact density:

| Setting | Value | Source | Applies |
|---|---|---|---|
| Iterative rounds<br><span style="opacity:.6">`AGENTIC_DYNAMIC_ITERATIVE_ROUNDS`</span> | `2` | env.jetson ⚠ | Next run |

Four columns, ~40px rows, key in mono beneath the label at reduced opacity. Roughly triples visible rows per screen. Uses `MatTableModule` + `MatSortModule` already in the template. Sortable by any column — sorting by *Applies* to find everything requiring a restart is a real workflow.

### 3.3 Sections and conditional disclosure

Every settings page groups into named sections via `MatExpansionModule` (expanded by default, collapsible for scanning) or plain section headers with dividers. Sections are specified per-page below.

Conditional disclosure where a value governs relevance — the Kubernetes block only renders when the backend is `kubernetes`, with one line explaining the hidden section rather than a silent gap.

### 3.4 Apply-tier chips carry weight only when they're heavy

Today every row wears an amber `RESTART`. Instead:

- `Live` and `Next run` — plain text, low contrast. The common case shouldn't shout.
- `Restart: web` / `Restart: engine` — amber chip.
- `Redeploy` — amber chip with `git-branch` icon.
- **`TRACKED` becomes `env.jetson ⚠`** with a tooltip stating the actual consequence: *"Also set in config/env.jetson — a local change here is reverted by the next deploy."* This is the most operationally important fact in the surface and currently it's a word with no explanation.

### 3.5 Verbs that don't mutate anything

Phase 0 stays read-only for *config*, but these are all non-mutating and all shippable now:

| Verb | Where | Why it matters |
|---|---|---|
| Refresh (per panel) | Everywhere | Currently only the bell refreshes |
| Copy endpoint / copy key name | Components, Capabilities | Operators paste these into other systems constantly |
| Test connection | Components (Ollama, HA, engine) | Read-only probe; answers "is it reachable" without a chat run |
| Filter / group / facet | Capabilities, All settings, Runs | The 183-row table is unusable without it |
| Compare to profile | Deploy | Diff current config against a named profile — read-only, high value |
| Export support bundle | Overview or Activity | Redacted config + health + recent logs, one file |
| Open in chat / open component URL | Everywhere | Exists; keep |

### 3.6 Environment identity

Sidebar footer gains `jetson-01 · edge` with a colour-coded left border (neutral/amber/violet/teal per profile), plus the operator identity from `/api/session`. Two tabs open against different hosts must be distinguishable at a glance.

### 3.7 Filter Kubernetes injection variables

`*_PORT_<n>_TCP*`, `*_SERVICE_HOST`, `*_SERVICE_PORT` are excluded from All settings by default, behind a `Show injected environment` toggle. They are not AO configuration. This alone removes roughly the entire first screen of Advanced.

---

## 4. Screen by screen

### 4.1 Overview — invert the triage order

**Order today:** KPI counters → CPU chart → GPU chart → web process card → topology grid → 400-line log terminal → attention.
**Order after:** attention → topology → telemetry → logs (collapsed).

| Change | Why |
|---|---|
| **Attention moves to the top**, above the fold, as the first thing rendered | It is the only actionable content on the page and it is currently last |
| **KPI counters name their subjects** — `4 healthy: web, engine, execution, ollama` rather than `4 components up` | A count without identity requires a second lookup |
| **Topology gains relationships.** Ordered rows by dependency (web → engine → execution → ollama / MCP), with a thin connector rule and each card showing the one fact that matters (port, backend, resident models). Remove the oversized checkmark watermarks — they consume roughly a third of each card to say what the status word already says | It's currently a grid of unrelated tiles labelled "Topology." Ordering and connectors are achievable with plain layout and a `MatDivider`; no graph library needed |
| **Charts shrink to one row** of two compact ApexCharts plus the four progress bars, moved below topology | Telemetry is context for triage, not the headline. Same components, less real estate |
| **Logs collapse into an expansion panel**, closed by default, with severity colouring (error/warn/info) in addition to the existing source chips, and a `Follow` toggle | A 400-line terminal is the largest element on the page and is only occasionally what you want. Severity colouring is what makes a log tail scannable |
| Add **`Export support bundle`** to the header | Highest-value single artifact for debugging, and it's read-only |

### 4.2 Components — new, replaces Runtime → Execution + Integrations

List page: one row per component with status, kind, endpoint, and last-probe time. Detail page per component with four tabs (`MatTabsModule`, already used):

| Tab | Contents |
|---|---|
| **Status** | Health, uptime, pid/instance, endpoints with copy actions, `Test connection`, dependency list (what it needs, what needs it) |
| **Settings** | Only the keys that configure *this component*, in sections — the engine's TLS files appear here, not under Access |
| **Logs** | The existing stream, pre-filtered to this source |
| **Notes** | The port-guard copy, deploy path, and known constraints (e.g. stdio MCPs unsupported under the Kubernetes backend) |

Components: Web/coordinator, Engine, Execution backend, Ollama, MCP servers, Speech, OpenClaw bridge, Reach. The last two are where the current Integrations static cards live — they're components with endpoints, not a separate category.

**This is the change that most directly answers "an administrator can't administer this."** It gives every object a home with its own facts and its own actions.

### 4.3 Capabilities — make the gates the headline

| Change | Why |
|---|---|
| **Counts bar** above the table: `183 total · 12 active · 22 hidden · 3 excluded · 2 blocked`, each a filter | Currently absent; these four numbers are the summary of the entire page |
| **Default sort puts gated entries first** | An all-`AVAILABLE` first screen is the least informative possible ordering. The hidden and excluded rows are the only ones anyone needs |
| **Facet filters** via `MatButtonToggleModule` (status) and `MatSelectModule` (provider, gate type) | 183 rows with only free-text search is unusable |
| **Group by provider** as a toggle | `hf_*` entries are 22 rows behaving identically; collapsed to one group they stop dominating |
| **Gate column shows the reason inline**, not `—`: `needs HF_TOKEN`, `VRAM 40 GB > 8 GB budget`, `stdio unsupported on k8s` — each linking to its fix | The reason is already computed and is currently one drawer-click away |
| **Availability trace stays** in the drawer, promoted with a `Why?` link on every gated row | Best idea in the product; needs a visible entry point |
| Rename tab `MCP` → `MCP servers`, `RAG` → `RAG sources` | Two-letter tabs assume knowledge the reader may not have |

### 4.4 Behaviour — merges Planner & Memory, with real sections

Sections in this order, each an expansion panel:

1. **Run shape** — default run mode, max plan steps, strict/remap provider IDs
2. **Iteration** — target/max/min rounds, controller model, streaming
3. **Planner model** — model, LiteLLM, JSON mode, repair retry, timeout
4. **Sessions & cache** — session slug, planner turns, excerpt chars, answer cache, step-context injection
5. **Knowledge base** — enabled, path, hit caps, snippet sizes
6. **Learning** — stats/traces, LLM eval
7. **Quality gates** — impartial QA, mode, min score, judge, faithfulness, final QA
8. **Anonymization** — scrub before cloud, provider types, pattern files, reversible tokens, NER
9. **Web client defaults** — the `Next session` tier, with the note that these seed the chat UI and don't affect in-flight runs

Two content additions:
- The **quality-gates section carries the honest note** that impartial QA, final QA, and learning eval are three separate mechanisms whose scores are not comparable. That's true today and an operator reading three QA settings will assume otherwise.
- **Help text on every row**, drawn from the `.env.example` comments, restated plainly. `MatTooltipModule` is already imported.

### 4.5 Access — lead with a verdict

Opens with a **posture panel** stating, in plain words, what is currently true:

> **This deployment accepts unauthenticated requests over plaintext HTTP.**
> Admin is served on `http://10.0.10.16:30487` · identity not required · engine TLS configured, web TLS absent.
> Anyone who can reach this address on the network can read and (from Phase 1) change configuration.

Derived from bind host, `AGENTIC_REQUIRE_IDENTITY`, TLS keys, and the request scheme — all already available. Green verdict when the posture is sound.

Then sections: **Identity** (require-identity, header names, currently-resolved identity), **Secrets** (set/unset with metadata and, where derivable, reverse-dependency counts — never values, never masked *paths*), **Deals**, **mTLS** (CA presence, expiry, issued client count).

Fix: **stop masking file paths.** `AGENTIC_SERVE_TLS_CERTFILE` should show the path and whether the file exists. Masking it hides useful information and protects nothing.

### 4.6 Data — tell the truth about visibility

| Change | Why |
|---|---|
| `MISSING` → **`not visible from this process`** where the path can't be inspected from the web pod, distinct from genuinely absent | Fixes the three-way contradiction between Overview, Behaviour, and Data. Reporting absence you can't verify is exactly the overclaim the honesty principle forbids |
| Show **which process/filesystem** each root belongs to (web pod, engine, PVC) | Explains why a directory reads empty here and full elsewhere |
| Sizes computed async with a `Calculating…` state, `MatProgressBarModule` | Currently everything reads `0 B`, which is either wrong or unmeasured |
| Add retention settings as a section | They belong with the data they govern |

### 4.7 Deploy

| Change | Why |
|---|---|
| **Profile card** at top: active profile, when applied, what it overrides | Currently `Edge platform  jetson  TRACKED` in a list of six rows |
| **`env.jetson` panel** listing the 14 tracked keys, with the deploy workflow stated: *push → `git pull` on device → `jetson-deploy.sh`* | The most consequential mechanism in the product and it's currently implied by a chip |
| **Endpoints table** — web, engine, speech, verticals, with ports, NodePorts, and copy actions | Consolidates what's scattered across Overview and Integrations |
| **`Compare to profile`** — read-only diff of current config against a named profile | Non-mutating, and it's how you find drift |

### 4.8 Runs — new

Table of recent sessions: id, started, mode, steps, duration, QA score, outcome. Row opens a detail drawer with the phase list, per-step provider and timing, QA verdict, and links to output artifacts. Read from the sessions directory; no new mutation surface.

This is the only screen that shows the system doing its job. Its absence is why the console reads as configuration-only.

### 4.9 Activity — merges Audit, Change set, tasks

One reverse-chronological timeline with a source filter: config fingerprint changes, topology transitions, component restarts detected from logs, and (Phase 1) applied change sets with diffs. Pending local edits appear as a pinned section at the top rather than a separate dead nav item.

On day one this has content — fingerprint changes and topology transitions are already observable — which is the point. It replaces two empty screens with one populated one.

### 4.10 All settings

Same table treatment as §3.2, plus: injected-env filter (§3.7), a `Modified from default` toggle, a `Requires restart` filter, and a `Managed in: Components → Engine →` link on every row that has a grouped home, so the escape hatch teaches the structure instead of competing with it.

---

## 5. What to fix first

Ordered by ratio of operator value to effort. Items 1–3 are prerequisites; the rest can proceed in parallel.

| # | Change | Effort | Why this order |
|---|---|---|---|
| 1 | **Effective values with defaults** (§3.1) — backend then UI | M | Every other improvement is decoration until rows say something true |
| 2 | **Filter injected k8s env** (§3.7) | S | One predicate; removes the worst screen in the product |
| 3 | **Fix the storage-visibility contradiction** (§4.6) | S | Three screens currently disagree; it's an honesty defect, not a cosmetic one |
| 4 | **Overview triage reorder** (§4.1) | S | Pure layout reorder of existing components; large perceived change |
| 5 | **Access posture panel** (§4.5) | S | Highest-stakes gap for the target verticals; derived from data already present |
| 6 | **Capabilities counts + facets + gates-first sort** (§4.3) | M | Turns the emptiest screen into the most useful one |
| 7 | **Table row layout + compact density** (§3.2) | M | Triples information density everywhere at once |
| 8 | **Sections + conditional disclosure** (§3.3, §4.4) | M | Makes settings pages navigable; requires per-page section mapping |
| 9 | **Components section** (§4.2) | L | The structural fix; biggest change, biggest payoff |
| 10 | **Nav restructure to nine items** (§2) | M | Do after 9, since Components is the destination that makes it coherent |
| 11 | **Runs** (§4.8) | L | New capability; needs a sessions read endpoint |
| 12 | **Activity** (§4.9) | M | Removes two dead nav items |
| 13 | Non-mutating verbs — test, copy, refresh, compare, export bundle (§3.5) | M | Distribute across the above |

Items 1–5 are roughly a week and would change the character of the product on their own.

---

## 6. What not to do

- **Don't add write capability to close this gap.** Nothing in the user's complaint requires mutation. The console is unusable because it doesn't *say* enough, not because it can't *change* anything. Phase 1 write should follow a console that's already worth opening.
- **Don't keep eight pages on one shared component.** The primitive is fine; page-level reuse is what produced the sameness.
- **Don't soften the Phase 0 honesty copy.** The empty states are correct. Move the pages, keep the candour.
- **Don't introduce a graph library for topology.** Ordered rows with connector rules communicate dependency adequately and stay inside the template.
- **Don't restore per-run controls.** Run mode, rounds, and skip-QA belong to the chat UI. `Runs` is history, not control.
