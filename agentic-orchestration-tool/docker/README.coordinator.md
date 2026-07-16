# Coordinator image (K3.7)

Long-running **web + orchestrator** container for in-cluster Kubernetes execution.

## Build

From **monorepo root**:

```bash
docker build -f agentic-orchestration-tool/docker/Dockerfile.coordinator \
  -t agentic-orchestrator-coordinator:local .
```

### Published images (GHCR)

On each `v*.*.*` tag, CI publishes multi-arch images:

```text
ghcr.io/zlatko-lakisic/agentic-orchestrator-coordinator:vX.Y.Z
ghcr.io/zlatko-lakisic/agentic-orchestrator-worker:vX.Y.Z
```

Jetson can pull instead of building (see `RELEASING.md` / `jetson-k3s-deploy.sh` + `AGENTIC_USE_GHCR=1`).

## Run locally (docker)

Requires `.env` with API keys and K8s settings if using `AGENTIC_EXECUTION_BACKEND=kubernetes`:

```bash
docker run --rm -p 3847:3847 --env-file agentic-orchestration-tool/.env \
  -e AGENTIC_EXECUTION_BACKEND=kubernetes \
  -e AGENTIC_RUN_STORE_PATH=/run/store \
  -v /tmp/agentic-run:/run/store \
  -v $HOME/.kube/config:/root/.kube/config:ro \
  agentic-orchestrator-coordinator:local
```

For local dev without K8s, use `AGENTIC_EXECUTION_BACKEND=inprocess` (default).

## Smoke

```powershell
powershell -File agentic-orchestration-tool/scripts/docker-coordinator-smoke.ps1
```

## Layout

| Path | Purpose |
|------|---------|
| `/app/web` | Node `server.mjs` + static UI |
| `/app/tool` | Python orchestration tool (`AGENTIC_TOOL_ROOT`) |
| `/run/store` | Run store PVC mount (K8s) |

## Related

- `deploy/k8s/coordinator/` — Deployment, Service, RBAC
- `docker/Dockerfile.worker` — per-step worker Jobs
