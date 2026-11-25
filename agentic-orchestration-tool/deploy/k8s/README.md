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
- `deploy/k8s/network-policy/namespace-isolation.yaml` — **opt-in** NetworkPolicies (not applied by any script; read the caveats in the file)

## Security and hardening

What the manifests and scripts do, and what is left to the operator. The settings
below are read by the coordinator / engine unless stated otherwise.

### Secrets and worker Jobs

- **API keys are not copied into Job specs.** Worker Jobs get secret-like variables
  (`*_API_KEY`, `*_TOKEN`, `*_SECRET*`, `*_PASSWORD`, `*_DSN`, URLs with embedded
  credentials) from the `AGENTIC_K8S_ENV_SECRET` Secret via `envFrom`, not as
  literal `env[].value` entries that anyone with `get jobs` / `get pods` can read.
  Non-secret configuration still travels as literals. A cluster without that
  Secret can set `AGENTIC_K8S_WORKER_ENV_LITERAL_SECRETS=1` to restore the old
  copy-everything behaviour (a warning is logged when keys are withheld and no
  Secret is configured).
- **One Secret generator.** `scripts/jetson-sync-k8s-secret.sh` is the only script
  that builds `agentic-orchestrator-env`. Precedence: feature defaults < the tool
  `.env` (with `config/env.jetson` and `config/env.host` merged in) < cluster wiring
  (namespace, PVC, worker image). `AGENTIC_SECRET_DRY_RUN=1` prints the key names
  without touching the cluster.
- **`AGENTIC_SERVE_ADMIN_TOKEN`** — shared operator secret between the coordinator
  and the engine daemon (`Authorization: Bearer …` on the daemon's
  `/api/v1/admin/*`). Generated into the Secret on first sync when `.env` does not
  define one, then reused, so both pods always agree.
- The **fetch gateway** (`mcp-sidecars/fetch-url-gateway.yaml`) no longer receives
  the Secret at all.

### Run store

The run store holds every step's spec and result — prompts, tool output, artifacts.

- `scripts/jetson-k3s-deploy.sh` creates the host directory `root:<deploy group>`
  mode `2770` (it used to be `1777`, readable by every local user). On a host
  installed earlier, tighten it once:
  `sudo chown root:$(id -gn) /var/lib/agentic/run-store && sudo chmod 2770 /var/lib/agentic/run-store`
  (`jetson-sync-k8s-secret.sh` prints a warning while it is still world-accessible).
- **Retention.** Nothing deletes `{run store}/{run_id}/` on a persistent store: only
  the temporary store used when `AGENTIC_RUN_STORE_PATH` is unset is removed after a
  run. Prune it yourself, e.g. a daily
  `find /var/lib/agentic/run-store -mindepth 1 -maxdepth 1 -type d -mtime +14 ! -name warm-pool ! -name delegation ! -name execution-queue ! -name mcp-fs-workspace -exec rm -rf {} +`
  (keep the queue directories and the filesystem-MCP workspace).

### Kubeconfig and host root

On a single-node k3s host the admin kubeconfig is cluster-admin, and cluster-admin
can start a privileged pod, i.e. it is host root.

- New installs (`jetson-k3s-deploy.sh`) write `/etc/rancher/k3s/k3s.yaml` mode `640`,
  group `k3s-admin` (`AGENTIC_KUBECONFIG_GROUP`), and add the deploy user to that
  group. `INSTALL_K3S_VERSION` must be set (or `AGENTIC_K3S_ALLOW_UNPINNED=1`).
- **Existing hosts were installed with mode `644`** — every local user holds
  cluster-admin. To fix one, first check that the installed k3s knows the group
  flag (`k3s server --help | grep write-kubeconfig-group`; an unknown flag stops
  k3s from starting). Then: `sudo groupadd -f k3s-admin`,
  `sudo usermod -aG k3s-admin <deploy user>`, replace
  `--write-kubeconfig-mode 644` with
  `--write-kubeconfig-mode 640 --write-kubeconfig-group k3s-admin` in
  `/etc/systemd/system/k3s.service`, then `sudo systemctl daemon-reload &&
  sudo systemctl restart k3s`, and log in again. Without the group flag use
  `--write-kubeconfig-mode 600` and run `kubectl` through `sudo`. (Not automated:
  it restarts the control plane, and the routine deploy scripts run `kubectl` as
  the deploy user.)
- `scripts/jetson-migrate-to-nvme.sh` and `scripts/jetson-uninstall-host-ollama.sh`
  use real root (root or passwordless sudo) when available and fall back to a
  privileged nsenter pod only otherwise; `AGENTIC_ALLOW_NSENTER_ROOT=0` forbids the
  fallback. The Jetson "host-binary" Ollama Deployment still runs host Ollama from
  a privileged `hostPID` pod — that is how Ollama runs there.
- **Root systemd units** (host control, GPU metrics writers) run root-owned copies
  of their scripts from `/usr/local/libexec/agentic-orchestration/`, installed from
  the committed (`git HEAD`) version by the install scripts. They no longer execute
  files from the checkout, which the deploy user — and pods that mount the tool
  tree read-write — can modify.
- The host-control request directory (`var/agentic-control`) is `2770`, group
  `agentic-control` (`AGENTIC_HOST_CONTROL_GROUP`); it used to be `777`, which let
  any local user reboot the host by creating `reboot.request`.

### Pods

- Worker Jobs, coordinator, engine, warm pool and broker set
  `allowPrivilegeEscalation: false`. They still run as **root**: they install
  packages at start and write hostPath / PVC directories owned by other uids, so a
  non-root default would break existing deployments. To run worker Jobs
  unprivileged: `AGENTIC_K8S_WORKER_RUN_AS_USER=10001` (adds `runAsNonRoot`; the
  worker image ships that account) and `AGENTIC_K8S_WORKER_HARDENED=1` (drops all
  capabilities, `RuntimeDefault` seccomp), with a run store writable by that uid.
- The service-account token is still mounted into worker and warm-pool pods: the
  code detects "running in Kubernetes" by that directory
  (`orchestration/ollama_ownership.py`). The MCP gateways and plant-knowledge MCP
  do not mount it.
- Code hostPath mounts (`/app/orchestration` in the warm pool, the per-file mounts
  and the Admin bundle in the coordinator) are read-only. The **engine still mounts
  the whole tool tree read-write** because its state directories
  (`__orchestrator_*`) live inside it.
- `ollama` and `comfyui` are `privileged` (GPU device access without the NVIDIA
  runtime class) and share the namespace, which is why the namespace only carries
  Pod Security *warn/audit* labels. Enforcing `baseline` requires moving them to
  their own namespace first.
- The coordinator, engine and delegation broker share one ServiceAccount
  (`jobs: create/delete`, `deployments: patch`, `deployments/scale: patch`).
- **Ollama NodePort 31134 is opt-in** (`AGENTIC_OLLAMA_NODEPORT=1`); Ollama has no
  authentication. An already-applied `agentic-ollama-nodeport` Service is left in
  place and reported — delete it with
  `kubectl delete service agentic-ollama-nodeport -n agentic-orchestration`.
  On Jetson host-binary mode the broker also listens on the host's `:11434`.

### Images

- `agentic-comfyui` defaults to the release tag of the checkout (`v$(cat VERSION)`)
  instead of `:latest`; override with `AGENTIC_IMAGE_TAG` / `AGENTIC_COMFYUI_IMAGE`.
- Still floating — pin them yourself: `ollama/ollama:latest`
  (`AGENTIC_OLLAMA_IMAGE`), `supercorp/supergateway:uvx`
  (`AGENTIC_K8S_SUPERGATEWAY_IMAGE`), and the packages the gateways download at
  pod start (`AGENTIC_K8S_MCP_FETCH_PACKAGE=mcp-server-fetch==<version>`,
  `AGENTIC_K8S_MCP_FILESYSTEM_PACKAGE=@modelcontextprotocol/server-filesystem@<version>`).
- The warm pool, engine and Ollama broker `pip install` missing packages at
  container start; rebuild the images with those baked in for offline or
  reproducible starts.

### Worker Jobs: timeouts and retries

- Jobs carry `activeDeadlineSeconds` (= `AGENTIC_K8S_JOB_TIMEOUT_SECONDS`) and are
  deleted when the coordinator's wait times out, so a timed-out step stops running.
- Each attempt gets its own Job name (`…-<6 hex>`), so a retry does not collide
  with the previous attempt's Job.
- A pod that cannot start (bad image name immediately; image pull back-off,
  container config errors or `Unschedulable` after
  `AGENTIC_K8S_JOB_START_TIMEOUT_SECONDS`, default 600, `0` disables) fails the step
  instead of waiting out the full Job timeout.
- **Warm-pool autoscale really scales now.** `AGENTIC_EXEC_QUEUE_AUTOSCALE_ENABLED=1`
  used to be a silent no-op (it shelled out to a `kubectl` the images do not ship).
  It now uses the Kubernetes API and moves `agentic-warm-pool` between
  `AGENTIC_EXEC_QUEUE_AUTOSCALE_MIN_REPLICAS` and `…_MAX_REPLICAS`; failures are logged.
- The delegation broker serves `AGENTIC_K8S_DELEGATION_CONCURRENCY` (default 4)
  requests at once and always runs children as dedicated Jobs, never through the
  warm pool.

### Host-specific paths

`config/env.jetson` and the manifests contain no personal paths. Set these in
`config/env.host` (gitignored, merged into `.env` by `jetson-apply-env.sh`):

```
AGENTIC_OPENCLAW_HOME=/home/<your-user>/.openclaw
FILESYSTEM_MCP_ALLOWED_DIRECTORY=/home/<your-user>/.openclaw/workspace
```

The OpenClaw hostPath patches are rendered for `AGENTIC_OPENCLAW_HOME` and skipped
when it is unset (a host whose `.env` already has
`FILESYSTEM_MCP_ALLOWED_DIRECTORY=<dir>/.openclaw/workspace` keeps its mounts).
