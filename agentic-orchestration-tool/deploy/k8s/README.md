# Kubernetes manifests

## Run store (shared PVC)

Worker Jobs mount a **ReadWriteMany** volume at `AGENTIC_K8S_RUN_STORE_MOUNT` (default `/run/store`). Choose a backend that matches your cluster:

| Backend | Use when | Path |
|--------|----------|------|
| **nfs** | kind, minikube, local dev | `deploy/k8s/run-store/nfs/` |
| **filestore** | GKE with Filestore CSI | `deploy/k8s/run-store/filestore/` |

### Apply

```powershell
# kind / local (default)
.\scripts\k8s-apply-run-store.ps1

# GKE Filestore
$env:AGENTIC_K8S_RUN_STORE_VOLUME = "filestore"
$env:AGENTIC_K8S_FILESTORE_NETWORK = "default"   # your VPC network name
.\scripts\k8s-apply-run-store.ps1
```

```bash
AGENTIC_K8S_RUN_STORE_VOLUME=filestore AGENTIC_K8S_FILESTORE_NETWORK=default \
  ./scripts/k8s-apply-run-store.sh
```

Values can also live in `.env` (`AGENTIC_K8S_RUN_STORE_VOLUME`, `AGENTIC_K8S_FILESTORE_NETWORK`, `AGENTIC_K8S_FILESTORE_TIER`).

### NFS (local)

Deploys an in-cluster NFS server, a static PV, and PVC `agentic-run-store` (10 GiB RWX). Suitable for kind and single-node test clusters.

### Filestore (GKE)

Creates StorageClass `agentic-filestore-rwx` (Filestore CSI) and PVC `agentic-run-store` (1 TiB RWX — Filestore Standard minimum). Set `AGENTIC_K8S_FILESTORE_NETWORK` to the VPC network your GKE nodes use.

Requires the [Filestore CSI driver](https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/filestore-csi-driver) on the cluster.

### Migrating from the old manifest

If you previously applied `deploy/k8s/run-store-pvc.yaml` (RWX on `standard-rwo`), delete the stuck claim before re-applying:

```bash
kubectl delete pvc agentic-run-store -n agentic-orchestration
```

Then run the script with the correct `AGENTIC_K8S_RUN_STORE_VOLUME`.

## Other manifests

- `worker-job.example.yaml` — reference Job shape (normally created by `KubernetesJobRunner`).
