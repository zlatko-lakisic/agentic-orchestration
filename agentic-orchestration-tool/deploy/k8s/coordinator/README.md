# Coordinator Deployment (K3.7)

Runs the **web UI + Python orchestrator** in-cluster. The coordinator pod:

- Serves HTTP/WebSocket on port **3847** (`agentic-coordinator` Service)
- Sets `AGENTIC_EXECUTION_BACKEND=kubernetes` and creates worker **Jobs** per step
- Mounts the shared run-store **PVC** at `/run/store` (same path as worker Jobs)
- Uses **in-cluster** Kubernetes API credentials (`ServiceAccount` + `Role`)

## Prerequisites

1. Namespace + run-store PVC (`scripts/k8s-apply-run-store.ps1`)
2. Secret `agentic-orchestrator-env` (API keys, MCP flags) — see `scripts/k8s-local-verify.ps1`
3. Worker image available in the cluster (`AGENTIC_K8S_WORKER_IMAGE`)
4. Coordinator image built and loaded (kind) or pushed to your registry

## Build coordinator image

From **monorepo root** (`agentic-orchestration/`):

```bash
docker build -f agentic-orchestration-tool/docker/Dockerfile.coordinator \
  -t agentic-orchestrator-coordinator:local .
```

```powershell
docker build -f agentic-orchestration-tool\docker\Dockerfile.coordinator `
  -t agentic-orchestrator-coordinator:local .
```

## Apply

```powershell
# kind: load images first
kind load docker-image agentic-orchestrator-coordinator:local --name agentic
kind load docker-image agentic-orchestrator-worker:local --name agentic

powershell -File agentic-orchestration-tool/scripts/k8s-apply-coordinator.ps1
```

```bash
kind load docker-image agentic-orchestrator-coordinator:local --name agentic
bash agentic-orchestration-tool/scripts/k8s-apply-coordinator.sh
```

## Access

```bash
kubectl port-forward -n agentic-orchestration svc/agentic-coordinator 3847:3847
```

Open `http://127.0.0.1:3847`.

## Customize image / worker

Edit `deployment.yaml` or patch after apply:

```bash
kubectl set image deployment/agentic-coordinator -n agentic-orchestration \
  coordinator=your-registry/agentic-coordinator:tag
kubectl set env deployment/agentic-coordinator -n agentic-orchestration \
  AGENTIC_K8S_WORKER_IMAGE=your-registry/agentic-worker:tag
```

## RBAC

`agentic-coordinator` ServiceAccount may **create/get/list/watch/delete Jobs** and **get/list/watch Pods** in `agentic-orchestration`. Required by `KubernetesJobRunner`.

## Related

- `docker/README.coordinator.md` — image details
- `deploy/k8s/worker-job.example.yaml` — worker Job shape (created dynamically)
- `deploy/k8s/README.md` — run-store backends
