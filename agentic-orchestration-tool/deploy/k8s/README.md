# Kubernetes manifests

## Run store (shared PVC)

Worker Jobs mount a **ReadWriteMany** volume at `AGENTIC_K8S_RUN_STORE_MOUNT` (default `/run/store`). Choose a backend that matches your cluster:

| Backend | Use when | Path |
|--------|----------|------|
| **hostpath** | kind + bind mount from laptop (recommended local) | `deploy/k8s/run-store/hostpath/` |
| **nfs** | kind / minikube without host bind | `deploy/k8s/run-store/nfs/` |
| **filestore** | GKE with Filestore CSI | `deploy/k8s/run-store/filestore/` |

### Apply

```powershell
# kind + D:\run bind mount (recommended Windows local)
$env:AGENTIC_K8S_RUN_STORE_VOLUME = "hostpath"
.\scripts\k8s-kind-up.ps1
.\scripts\k8s-apply-run-store.ps1

# kind / local NFS (no host bind)
.\scripts\k8s-apply-run-store.ps1   # AGENTIC_K8S_RUN_STORE_VOLUME=nfs (default)

# GKE Filestore
$env:AGENTIC_K8S_RUN_STORE_VOLUME = "filestore"
$env:AGENTIC_K8S_FILESTORE_NETWORK = "default"
.\scripts\k8s-apply-run-store.ps1
```

Values can also live in `.env` (`AGENTIC_K8S_RUN_STORE_VOLUME`, `AGENTIC_K8S_FILESTORE_*`, `AGENTIC_K8S_RUN_STORE_HOST_PATH`).

### hostpath (kind local — recommended)

1. Create kind cluster with host bind mount:
   - Windows: `.\scripts\k8s-kind-up.ps1` (defaults `D:/run` → `/run/store`)
   - Linux / CI: `bash scripts/k8s-kind-up.sh` with `AGENTIC_RUN_STORE_PATH=/tmp/agentic-run-store`
2. Apply: `AGENTIC_K8S_RUN_STORE_VOLUME=hostpath` + `k8s-apply-run-store.*`
3. Set `AGENTIC_RUN_STORE_PATH` to the **same host directory** on the coordinator.

### NFS (local)

Deploys an in-cluster NFS server, a static PV, and PVC `agentic-run-store` (10 GiB RWX). Suitable when the coordinator cannot bind-mount the node filesystem.

### Filestore (GKE)

Creates StorageClass `agentic-filestore-rwx` (Filestore CSI) and PVC `agentic-run-store` (1 TiB RWX — Filestore Standard minimum). Requires the [Filestore CSI driver](https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/filestore-csi-driver) on the cluster.

### CI (kind e2e)

GitHub Actions job **kind-kubernetes-e2e** runs `scripts/k8s-kind-e2e.sh`:

- kind cluster (`deploy/k8s/kind/cluster.ci.yaml`)
- hostPath PVC + probe pod
- stub worker image (`docker/Dockerfile.worker-stub`) — no LLM; verifies agent-skills `StepSpec` handoff
- `tests/test_kind_kubernetes_e2e.py` (brainstorm two-step + agent skills smoke)

Local reproduction (Linux / Git Bash with Docker + kind):

```bash
cd agentic-orchestration-tool
bash scripts/k8s-kind-e2e.sh
```

## Full stack (local kind)

```powershell
# Builds coordinator + worker, syncs secret, applies coordinator + warm pool + delegation broker + fetch gateway
powershell -File agentic-orchestration-tool/scripts/k8s-apply-full-stack.ps1

kubectl port-forward -n agentic-orchestration svc/agentic-coordinator 3847:3847
# Open http://127.0.0.1:3847
```

## Coordinator (K3.7)

In-cluster web UI + orchestrator (creates worker Jobs via in-cluster API):

```powershell
# From monorepo root — build + load images (kind)
docker build -f agentic-orchestration-tool/docker/Dockerfile.coordinator -t agentic-orchestrator-coordinator:local .
kind load docker-image agentic-orchestrator-coordinator:local --name agentic

powershell -File agentic-orchestration-tool/scripts/k8s-apply-coordinator.ps1
kubectl port-forward -n agentic-orchestration svc/agentic-coordinator 3847:3847
```

See `deploy/k8s/coordinator/README.md` and `docker/README.coordinator.md`.

## K5 operational polish

| Item | Path |
|------|------|
| Warm pool | `deploy/k8s/warm-pool.yaml`, `AGENTIC_K8S_WARM_POOL_ENABLED=1` |
| Structured logging | `deploy/k8s/LOGGING.md`, `AGENTIC_LOG_FORMAT=json` |
| CrewAI pin / upgrade | `requirements.txt` (`crewai==…`), `docker/CREWAI_UPGRADE.md` |
| Load test | `scripts/k8s-load-test.ps1` (stub worker, p50/p95 wall time) |
| Delegation RPC | `deploy/k8s/delegation-broker.yaml`, `AGENTIC_K8S_DELEGATION_ENABLED=1`, tool `k8s_delegate_task` |

## Other manifests

- `deploy/k8s/coordinator/` — **K3.7** coordinator Deployment, Service, RBAC (web UI + in-cluster Job dispatch)
- `deploy/k8s/warm-pool.yaml` — **K5.1** warm pool Deployment (`AGENTIC_K8S_WARM_POOL_ENABLED=1`)
- `deploy/k8s/delegation-broker.yaml` — **K5.5** delegation broker (`AGENTIC_K8S_DELEGATION_ENABLED=1`)
- `deploy/k8s/LOGGING.md` — **K5.2** JSON log contract for Loki/Datadog
- `deploy/k8s/kind/cluster.yaml` — templated kind config (`__RUN_STORE_HOST_PATH__`)
- `deploy/k8s/run-store/probe-pod.yaml` — PVC mount smoke test
- `deploy/k8s/mcp-sidecars/` — K4 MCP sidecars and HTTP gateways
- `deploy/k8s/worker-image-prep.yaml` — optional worker image pre-pull DaemonSet
- `worker-job.example.yaml` — reference Job shape (normally created by `KubernetesJobRunner`)
