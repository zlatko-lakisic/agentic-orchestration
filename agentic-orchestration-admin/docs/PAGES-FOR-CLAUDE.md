# AO Admin — Page Writeup (Phase 0 ops console)

Updated after the Claude handoff redesign. See also `AO-Admin-Phase0-Review.md` and `AO-Admin-Redesign-Changes.md` in this folder.

| | |
|---|---|
| **App** | `agentic-orchestration-admin` (Angular / Fuse / Material) |
| **Served at** | `/admin/` |
| **Phase** | **0 — read-only** for config. Non-mutating verbs: refresh, copy, filter, test connection, export support bundle. |

## Navigation

```
Overview
OPERATE → Components · Runs · Activity
CONFIGURE → Capabilities · Behaviour · Access · Data · Deploy
Escape hatch → All settings
```

Legacy paths redirect (`/runtime/*`, `/catalogs`, `/memory`, `/security`, `/integrations`, `/deployments`, `/audit`, `/changes`, `/advanced`).

## Pages

| Route | Purpose |
|-------|---------|
| `/overview` | Attention-first triage, topology, compact telemetry, collapsed live logs, support-bundle export |
| `/components` | List of Web, Engine, Execution, Ollama, MCP, Speech, OpenClaw, Reach |
| `/components/:id` | Status / Settings / Logs / Notes tabs; copy endpoint; test connection |
| `/runs` | Run-store + session history from web-visible paths |
| `/activity` | Fingerprint + topology timeline; pinned local change-set draft |
| `/capabilities/:kind` | Catalog browser (gated-first); MCP servers / RAG sources labels |
| `/behaviour` | Planner + memory merged with expansion sections |
| `/access` | Posture verdict banner + security settings |
| `/data` | Storage with Present / Absent / Not visible from this process |
| `/deploy` | Profile, endpoints, tracked env.jetson keys, deploy workflow |
| `/settings` | All keys; injected k8s env toggle; restart/modified filters |

## Effective config contract

`GET /api/v1/admin/config/effective` entries include `effective`, `default`, `source` (`default` when using code default), `set`, `overrides`, `component`, `section`. Query `?includeInjected=1` includes Kubernetes service-injection noise.

## Other APIs

- `GET /api/v1/admin/access/posture`
- `GET /api/v1/admin/runs` · `/api/v1/admin/runs/:id`
- `GET /api/v1/admin/support-bundle`
- Storage roots include `visibility` + `probeScope`
