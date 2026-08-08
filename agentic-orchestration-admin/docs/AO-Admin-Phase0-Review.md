# AO Admin Phase 0 — Review

> Assessment of the shipped Admin surface against its own design intent and against comparable operator consoles.
> Evidence: 15 screenshots of the running app at `10.0.10.16:30487/admin` plus `PAGES-FOR-CLAUDE.md`.
> Companion: `AO-Admin-Redesign-Changes.md` (what to do about it).

---

## 1. Verdict

Your instinct is right, and the reason is more specific than "it needs polish."

**What was built is a configuration viewer. What an admin needs is an operations console.** Those are different products that happen to share a sidebar.

The clearest symptom: of thirteen navigation destinations, **eight render the same component** — `ao-config-settings-page` pointed at a different group key. Planner, Execution, Models, Memory, Security, Integrations, Deployments, and Advanced are one screen wearing eight hats. That is why every page looks the same, and it's why none of them does the specific job its name promises. Security doesn't tell you your security posture. Execution doesn't tell you the backend is misconfigured for stdio MCPs. Deployments doesn't deploy or even describe the deploy path.

The second symptom is worse, because it's an information defect rather than a layout one: **most rows display "—" and "UNSET."** On the Planner page, five of six visible rows are `—`. On Memory & quality, five of seven. An operator reading `Answer cache — UNSET` learns nothing at all — not whether answer caching is on, not what it does, not what happens if they change it. The unset env var was reported instead of the effective value, so the single promise the design was built on ("effective value with provenance") is not being kept on the majority of rows. Everything else in the surface depends on that promise.

I own part of this. My Phase 0 recommendation — read-only console first, write API later — was sound as sequencing but I under-specified what read-only had to *deliver* to be worth shipping, and I didn't guard against the shared-component collapse. A read-only console is only useful if reading it answers questions. Right now it mostly reports which environment variables happen to be set in a container.

---

## 2. What is genuinely good

Not throat-clearing — these are real and should survive the rework.

- **Provenance chips exist at all.** Source plus apply-tier on every row is rarer than it should be; Vault, Consul, and most k8s dashboards don't do it. The concept is sound and it's implemented.
- **Live telemetry works.** WebSocket host metrics with jtop/tegrastats on Jetson, streaming logs with source filters, no manual refresh. That's the hard part of an ops console and it's done.
- **Catalogs availability trace** is implemented, including gate reasons and fix deep-links into config pages with `?flash=`. This is the best idea in the product and it's currently buried in a drawer behind a table nobody would scroll.
- **The Reach port guard shipped** as a real UI affordance in two places. That's a documentation problem converted into an interface problem, correctly.
- **Command palette with config-key search and flash-to-row.** Exactly right, and it's the only thing currently making 218 variables navigable.
- **Phase 0 honesty.** Audit and Change set say plainly that they're read-only and what arrives in Phase 1. That's the honesty principle held under pressure, and it should not be softened — but see §4.9 for why they still shouldn't be in the nav.

---

## 3. How comparable products solve this

The relevant comparison set isn't "AI products." It's consoles that manage a running distributed system with a lot of configuration.

| Product | Home screen is | Organizing unit | Config model | What AO can learn |
|---|---|---|---|---|
| **Argo CD** | Application health + sync status, with a live topology tree | The application and its resources | Desired vs live state, with a diff always one click away | Topology should show *relationships and drift*, not a grid of cards |
| **HashiCorp Vault** | Secrets engines list | The engine/mount | Every setting shows current value **and** default; secrets show metadata only | Never show a bare "unset" — show the effective default |
| **Rancher / Lens** | Cluster health, workloads needing attention | The workload | Config is edited in context of the object it belongs to | Settings belong to a component, not to a taxonomy of env-var prefixes |
| **Temporal Web** | Workflow executions, filterable | The run | Config is a small secondary surface | Run history is a first-class operator need — AO has sessions and no view of them |
| **Grafana** | Dashboards, alerts front and centre | The alert / panel | Provisioning shown as read-only with source file | Alert-first triage; charts are context, not the headline |
| **Portainer / Coolify** | Environment selector, then stacks | The environment | Inline actions on every object | Which environment am I on, and can I act from where I'm standing |
| **Cloudflare / AWS consoles** | Resource list → detail → action | The resource | Never a flat settings dump; settings live under the thing they configure | The taxonomy should be nouns the operator manages |

**The pattern every one of them shares, and AO Admin currently breaks:**

> Admin consoles are organized around **the objects an operator manages**. AO Admin is organized around **where configuration values are stored**.

"Runtime / Configuration / Operations" containing "Planner & defaults / Execution / Models & hardware / Memory & quality / Advanced" is an implementation taxonomy — it mirrors how the env vars were grouped in code. No operator arrives thinking "I need the memory group." They arrive thinking *"the engine is down," "why can't the planner see my model," "who can reach this box," "what changed since Tuesday."* None of those four questions maps cleanly onto a current nav item.

The second shared pattern: **every one of those consoles lets you act.** Even the read-only-ish ones (Grafana provisioned dashboards, Argo in view mode) offer refresh, test, diff, and drill-down. AO Admin's only verbs are *scroll*, *search*, *open in new tab*, and *copy*. Thirteen screens, four verbs.

---

## 4. Defects, by severity

### Blocking — the surface can't do its job until these are fixed

**4.1 "Unset" is reported instead of the effective value.**
Screenshots 2, 4, 8, 9, 11. `Answer cache — UNSET`, `Impartial QA gate — UNSET`, `Require identity — UNSET`, `Deal authorization — UNSET`, `Knowledge base — UNSET`. Every one of these has a code default that determines actual behaviour. The operator cannot distinguish "off" from "on by default" from "this key doesn't do anything." This defeats the entire provenance model — the whole point was *effective* value first, source second. **Every row must show the value in effect, with `default` as a legitimate source.**

**4.2 Two pages disagree about reality.**
Overview's attention item says `KB is enabled — ensure only one writer owns kb.sqlite3` (screenshot 7). Memory & quality says `Knowledge base — UNSET` (screenshot 8). Data & storage says the KB directory is `MISSING`, 0 files, 0 B (screenshot 12). Three screens, three different answers about whether the KB exists. At least one is wrong and probably all three are partially right — the web pod is stat-ing paths that live on the engine or a PVC it can't see. **Reporting `MISSING` for a path you cannot inspect is a false negative, and it's exactly the class of overclaim the project's honesty principle exists to prevent.** It should read `not visible from this process`.

**4.3 Security cannot answer the security question.**
Screenshot 9 lists `AGENTIC_SERVE_TLS_CERTFILE ••••••` — masking a *file path*, which protects nothing and hides useful information. Meanwhile the browser address bar in every screenshot reads **Not Secure**, `http://10.0.10.16:30487/admin`, and `Require identity — UNSET`. So: the admin console of a system targeting government and financial-services deployments is served over plaintext HTTP on a LAN IP with no authentication, and the Security page does not mention this. The posture banner from the design (§8 of the original spec) was not built. This is the single most damaging gap for the target verticals.

**4.4 Advanced is polluted with Kubernetes service-injection variables.**
Screenshot 14: `AGENTIC_COORDINATOR_PORT_3847_TCP_ADDR`, `_TCP_PROTO`, `_SERVICE_HOST`, `_SERVICE_PORT`. These are injected by Kubernetes into every pod. They are not AO configuration, nobody will ever set them, and they're crowding out the genuine escape-hatch knobs that Advanced exists to expose. They also inflate the "218 variables" figure into meaninglessness.

### Major — severely limits usefulness

**4.5 No sections, no grouping, no conditional disclosure within pages.**
Planner (screenshot 2) runs `Answer cache → Max iterative rounds → Min iterative rounds → Iterative rounds → Iterative controller model → Default session slug` as one undifferentiated list. The three iterative-rounds keys are adjacent by accident of alphabet, not design. Execution (screenshot 3) mixes backend selection, stdio policy, delegation, a k8s secret name, an MCP allowlist, and a namespace with no hierarchy — and shows every Kubernetes row unconditionally, whether or not the Kubernetes backend is selected. The spec called for sections and backend-conditional disclosure; neither shipped.

**4.6 Raw keys used as human labels.**
`AGENTIC_K8S_ENV_SECRET`, `AGENTIC_K8S_EXTRA_HTTP_MCPS` appear as the label *and* again as the key underneath (screenshot 3). The label dictionary has gaps and the fallback is the key itself, printed twice.

**4.7 Density is wrong for the data volume.**
Roughly 73px per row for a single value, with the value column starting near the horizontal midpoint and the right third of a 1500px viewport empty. Six settings visible per screen against 218 variables — that's 36 screens of scrolling. The design specified compact density and a tabular layout precisely because of this volume.

**4.8 Overview leads with charts and buries the decision.**
Screenshot 1 opens with four KPI counters and two large area charts. The actual actionable item — the KB dual-writer warning — is at the very bottom of the page (screenshot 7), below a 400-line log terminal. Triage order is inverted: what needs you should be first, telemetry is context. The four KPI cards also report counts without identity (`4 components up` — which four?), and the topology "grid" is a set of independent cards with oversized green checkmark watermarks, showing no relationships, no dependency order, and no failure propagation.

**4.9 Two of thirteen nav items are empty shells.**
Audit and Change set both render "Nothing here yet." Change set additionally cannot be populated — `PAGES-FOR-CLAUDE.md` confirms setting rows never call `upsert()`, so the page is structurally unreachable in normal use. Advertising capability in navigation that the product does not have is the one place the honesty principle is being broken, even though the empty-state copy is scrupulously honest once you arrive.

**4.10 Catalogs — the best data in the product, presented as a phone book.**
Screenshot 5: 183 entries, four columns (Id / Type / Status / Gate), every visible row `AVAILABLE` with gate `—`. No counts breakdown, no facet filters, no grouping by provider, no way to see the hidden and excluded entries that are the *only interesting rows in the table*. The availability trace — genuinely the strongest idea here — is one drawer-click away from a list nobody has a reason to scroll.

### Moderate

**4.11 Apply-tier chips are uniformly loud.** Amber `RESTART` on every row in screenshots 3, 4, 9, 10, 11 becomes wallpaper. When everything is flagged, nothing is.
**4.12 `TRACKED` conflates plane with meaning.** It means "lives in env.jetson and will be reverted by the next deploy" — the most operationally important fact in the surface — but the chip alone doesn't say so, and there's no warning treatment.
**4.13 No environment identity.** The sidebar says "AO / Admin"; the only clue about which box you're on is the IP in the URL. Two tabs open against laptop and edge are indistinguishable.
**4.14 The old logo at 32px** is the illegible mush predicted earlier. Superseded by the mark work.
**4.15 Runtime tabs duplicate the sidebar.** Planner/Execution/Models appear both as three sidebar entries and as three tabs, with the sidebar highlighting one while the tab bar highlights the same one. Two navigation systems for one level.
**4.16 No sessions or run history anywhere.** The system's core output — orchestration runs, phases, QA scores — is invisible in the admin surface. Every comparable tool (Temporal, Airflow, Argo) makes run history a primary destination.

---

## 5. Root causes

Four, and they're worth naming because they'll recur otherwise.

1. **One component was reused where eight screens were specified.** `ao-config-settings-page` is a reasonable primitive that got promoted to page-level. The result is uniform, which reads as consistent, but the uniformity is the defect — these screens have genuinely different jobs.
2. **The env-var grouping in code became the navigation taxonomy.** `group: 'planner' | 'execution' | 'models' | 'memory' | ...` was an implementation convenience for bucketing keys; it shipped as the operator's mental model.
3. **Read-only was interpreted as "no verbs" rather than "no mutations."** Refresh, test connection, copy endpoint, filter, group, compare, export, drill into a run — none of these mutate config, all of them were available, none shipped.
4. **The effective-config API returns set-ness, not effective values.** The UI is faithfully rendering what it's given; the defect is upstream of the frontend. Fixing 4.1 is a backend change first.

---

## 6. Fair summary

The infrastructure underneath this is good — live metrics, streaming logs, provenance modelling, availability tracing, a working palette. The failure is one of framing: it was built as a *browser for the configuration system* rather than a *console for the running system*, and then eight screens were generated from one template so nothing got its own affordances.

That's recoverable without a rewrite. Most of what's needed is regrouping, adding verbs that don't mutate anything, and fixing the effective-value contract. Details in `AO-Admin-Redesign-Changes.md`.
