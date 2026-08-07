# AO Admin (Phase 0)

Read-only Control Plane console built on **Fuse Angular 22** (Material + Tailwind).

## Develop

```bash
cd agentic-orchestration-admin
npm ci
npm start          # http://127.0.0.1:3873  (proxies /api → web :3847)
```

Ensure `agentic-orchestration-web` is running on `:3847`.

## Build into the web package

```bash
npm run build
# → agentic-orchestration-web/public/admin/
```

Open **http://127.0.0.1:3847/admin/** (served by `server.mjs`).

## Phase 0 scope

- Overview / topology / host metrics
- Catalog browser with credential gate reasons
- Effective config with source + apply-tier chips
- Integrations Reach port guard (`:8765`, not `:30487`)
- Local change-set export only — **no write API**

## License note

Fuse is a commercial ThemeForest template. This package is a customized AO Admin app derived from it for this product; keep ThemeForest license compliance for redistribution.
