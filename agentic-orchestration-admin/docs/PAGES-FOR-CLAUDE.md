# AO Admin — Page Writeup (Phase 0 ops console)

Updated after the Claude handoff redesign. See also `AO-Admin-Phase0-Review.md` and `AO-Admin-Redesign-Changes.md` in this folder.

| | |
|---|---|
| **App** | `agentic-orchestration-admin` (Angular / Fuse / Material) |
| **Served at** | `/admin/` |
| **Phase** | **0 — read-only** for config. Non-mutating verbs: refresh, copy, filter, test connection, export support bundle. Writes: Control (restart apps/stack, host reboot where armed), Access (API token mint/revoke, mTLS enroll-token mint, client revoke/unrevoke, app planning prefs), background model-pull cancel, detection "Ensure ready". |

## Navigation

```
CONTROL PLANE → Overview · Topology
OPERATE → Control · Components · Runs · Traces · Token usage · Activity
CONFIGURE → Capabilities · Behaviour · Access · Data · Deploy
Escape hatch → All settings
```

Legacy paths redirect (`/runtime/*`, `/catalogs`, `/memory`, `/security`, `/integrations`, `/deployments`, `/audit`, `/changes`, `/advanced`).

## Pages

| Route | Purpose |
|-------|---------|
| `/overview` | Attention-first triage, topology, compact telemetry, collapsed live logs, support-bundle export |
| `/topology` | Live deployment graph (bands, node/edge detail dialogs, table mode) |
| `/control` | Restart apps / stack, host reboot where armed (confirmed) |
| `/components` | List of Web, Engine, Execution, Ollama, MCP, Speech, OpenClaw, Reach |
| `/components/:id` | Status / Settings / Logs / Notes tabs; copy endpoint; test connection |
| `/runs` | Run-store + session history from web-visible paths |
| `/traces` | Per-run trace list, sequence diagram / event table, token help |
| `/llm-usage` | Token spend by window, model, app and agent |
| `/activity` | Fingerprint + topology timeline; pinned local change-set draft |
| `/capabilities/:kind` | Catalog browser (gated-first); MCP servers / RAG sources labels |
| `/behaviour` | Planner + memory merged with expansion sections |
| `/access` | Posture, API tokens (mint/revoke/usage), mTLS clients (revoke one CN/serial), security settings |
| `/data` | Storage with Present / Absent / Not visible from this process |
| `/deploy` | Profile, endpoints, tracked env.jetson keys, deploy workflow |
| `/settings` | All keys; injected k8s env toggle; restart/modified filters |

## Effective config contract

`GET /api/v1/admin/config/effective` entries include `effective`, `default`, `source` (`default` when using code default), `set`, `overrides`, `component`, `section`. Query `?includeInjected=1` includes Kubernetes service-injection noise.

## Live feeds (WebSocket)

List and dashboard data is pushed over the Admin WebSocket, not polled over
HTTP: `admin_feed_subscribe` with topics `topology`, `fingerprint`, `runs`,
`traces`, `llm_usage`, `control`, `storage`, `access`, `ao_resources`
(per-topic params are namespaced, e.g. `{ traces: { limit: 500 } }`), plus
`host_metrics_*`, `admin_logs_*` and `topology_*` streams. The matching list
GETs (`/runs`, `/traces`, `/llm-usage`, `/control/status`, `/storage`,
`/access/posture`, token and app-pref lists) still exist on the server but the
SPA does not call them.

## Other APIs (HTTP, called by the SPA)

- `GET /api/v1/admin/web-auth` (token bootstrap) · `/api/v1/session` · `/api/ping`
- `GET /api/v1/admin/runs/:id` · `GET /api/v1/admin/traces/:id`
- `GET /api/v1/admin/topology/graph` · `/api/v1/admin/topology/node/:id`
- `POST /api/v1/admin/control/restart`
- `GET /api/v1/admin/support-bundle`
- `GET/POST /api/v1/admin/tokens` · `DELETE /api/v1/admin/tokens/:id` · `GET /api/v1/admin/tokens/:id/usage`
- `GET /api/v1/admin/mtls/clients` · `POST .../revoke` · `POST .../unrevoke` (proxied to engine)
- Storage roots include `visibility` + `probeScope`
