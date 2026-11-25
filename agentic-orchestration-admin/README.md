# AO Admin (Phase 0)

Control Plane console built on **Fuse Angular 22** (Material + Tailwind). Configuration is **read-only**; a small set of operator actions do write (see [Scope](#phase-0-scope)).

UI structure follows the Fuse template patterns:

| Screen | Fuse reference |
|--------|----------------|
| Shell | `domains/admin/layout` (sidenav + toolbar + shortcuts/notifications) |
| Overview | Analytics dashboard (`mat-card` grid + Fuse page header) |
| Capabilities | Orders app (`mat-table` + end detail drawer + tab nav) |
| Component detail | Settings layout (`mat-tab-nav-bar` + section body) |
| Config pages | Settings account/notifications section density |

## Develop

```bash
cd agentic-orchestration-admin
npm ci
npm start          # http://127.0.0.1:3873  (proxies /api → web :3847)
```

Ensure `agentic-orchestration-web` is running on `:3847`.

Requires Node 24 (`engines` in `package.json`). All `@angular/*` packages are
pinned to one version and must be bumped together.

## Check

```bash
npm run lint                 # eslint (eslint.config.ts)
npm test -- --watch=false    # vitest via ng test
```

## Build into the web package

```bash
npm run build
# → agentic-orchestration-web/public/admin/
```

The build output is committed there and is what the coordinator image and
hostPath deploys serve, so rebuild and commit it with any source change.
Hashed chunk names change between builds: clear the old files first
(`git rm -r ../agentic-orchestration-web/public/admin` then build and `git add`),
and never commit `deploy-stamp.json`.

Open **http://127.0.0.1:3847/admin/** (served by `server.mjs`).

## Authentication

The SPA fetches the assigned `ao-web` token from `GET /api/v1/admin/web-auth`
at boot and keeps it **in memory only** (cleared on logout, never in
`localStorage`). It is sent as `Authorization: Bearer` on same-origin API calls
and as a WebSocket subprotocol (`ao-auth`, `ao-bearer.<token>`), not in the URL.
If the server refuses the bootstrap (`403 web_auth_untrusted_source`) the app
shows the server's hint instead of loading.

## Phase 0 scope

Read-only:

- Overview, live topology, host metrics, live logs
- Runs, traces (bundled Mermaid sequence diagrams), token usage
- Capabilities (catalog) browser with credential gate reasons
- Effective config with source + apply-tier chips; local change-set export
  (settings are **not** written from Admin)

Operator actions that **do** call write APIs:

- Control: restart apps / the stack, and reboot the host where armed
  (confirmation dialog; reboot needs a typed phrase)
- Access: mint and revoke API tokens, mint mTLS enrollment tokens,
  revoke / un-revoke mTLS clients, save per-app planning prefs
- Host utilization: cancel a background model pull
- Component detail: "Ensure ready" for object detection

## License note

Fuse is a commercial ThemeForest template. This package is a customized AO Admin app derived from it for this product; keep ThemeForest license compliance for redistribution.
