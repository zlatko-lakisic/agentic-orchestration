#!/usr/bin/env bash
# Deploy agentic-orchestration on Jetson / single-node k3s (aarch64).
# Run as root on the device:
#   sudo bash scripts/jetson-k3s-deploy.sh
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
RUN_STORE_HOST="${AGENTIC_RUN_STORE_HOST_PATH:-/var/lib/agentic/run-store}"
COORDINATOR_IMAGE="${COORDINATOR_IMAGE:-agentic-orchestrator-coordinator:local}"
WORKER_IMAGE="${WORKER_IMAGE:-agentic-orchestrator-worker:local}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
WEB_PORT="${WEB_PORT:-80}"
# When AGENTIC_USE_GHCR=1, pull prebuilt images instead of docker build on-device.
# Override registry/owner/tag as needed:
#   AGENTIC_GHCR_OWNER=zlatko-lakisic AGENTIC_IMAGE_TAG=v1.12.0
AGENTIC_USE_GHCR="${AGENTIC_USE_GHCR:-0}"
AGENTIC_GHCR_REGISTRY="${AGENTIC_GHCR_REGISTRY:-ghcr.io}"
AGENTIC_GHCR_OWNER="${AGENTIC_GHCR_OWNER:-zlatko-lakisic}"
AGENTIC_IMAGE_TAG="${AGENTIC_IMAGE_TAG:-}"

log() { printf '\n=== %s ===\n' "$*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

log "Stop legacy systemd web service"
systemctl stop agentic-orchestration-web.service 2>/dev/null || true
systemctl disable agentic-orchestration-web.service 2>/dev/null || true

log "Resolve duplicate Ollama systemd units"
if systemctl is-active --quiet ollama.service 2>/dev/null; then
  systemctl disable --now agentic-ollama.service 2>/dev/null || true
elif systemctl is-enabled --quiet agentic-ollama.service 2>/dev/null; then
  : # agentic-ollama only — leave enabled
else
  systemctl disable --now agentic-ollama.service 2>/dev/null || true
fi

log "Update repository from GitHub"
cd "${PROJECT_ROOT}"
git config --global --add safe.directory "${PROJECT_ROOT}" 2>/dev/null || true
DEPLOY_USER="${SUDO_USER:-${DEPLOY_USER:-}}"
if [[ -n "${DEPLOY_USER}" && "${DEPLOY_USER}" != "root" ]]; then
  sudo -u "${DEPLOY_USER}" git -C "${PROJECT_ROOT}" fetch "${GIT_REMOTE}"
  sudo -u "${DEPLOY_USER}" git -C "${PROJECT_ROOT}" checkout "${GIT_BRANCH}"
  sudo -u "${DEPLOY_USER}" git -C "${PROJECT_ROOT}" pull "${GIT_REMOTE}" "${GIT_BRANCH}"
elif [[ -d .git ]]; then
  git fetch "${GIT_REMOTE}"
  git checkout "${GIT_BRANCH}"
  git pull "${GIT_REMOTE}" "${GIT_BRANCH}"
else
  echo "Missing git repo at ${PROJECT_ROOT}" >&2
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  python3 "${TOOL_ROOT}/scripts/write-deploy-stamp.py" "${PROJECT_ROOT}" \
    || echo "warn: deploy stamp was not written"
fi

log "Ensure run-store host directory"
mkdir -p "${RUN_STORE_HOST}/mcp-fs-workspace"
# The run store holds step specs and results (prompts, tool output, artifacts):
# it must not be readable by every local user (it used to be chmod 1777).
# Pods write it as root; the deploy user gets access through its primary group
# (setgid keeps new entries in that group) for host-side runs and smoke tests.
RUN_STORE_GROUP="${AGENTIC_RUN_STORE_GROUP:-}"
if [[ -z "${RUN_STORE_GROUP}" ]]; then
  RUN_STORE_OWNER_USER="${SUDO_USER:-${DEPLOY_USER:-}}"
  if [[ -n "${RUN_STORE_OWNER_USER}" && "${RUN_STORE_OWNER_USER}" != "root" ]]; then
    RUN_STORE_GROUP="$(id -gn "${RUN_STORE_OWNER_USER}" 2>/dev/null || true)"
  fi
fi
if [[ -n "${RUN_STORE_GROUP}" ]] && getent group "${RUN_STORE_GROUP}" >/dev/null 2>&1; then
  chown "root:${RUN_STORE_GROUP}" "${RUN_STORE_HOST}" "${RUN_STORE_HOST}/mcp-fs-workspace" || true
  chmod 2770 "${RUN_STORE_HOST}" || true
else
  chmod 0700 "${RUN_STORE_HOST}" || true
fi

log "Install k3s (docker runtime) if needed"
if ! command -v k3s >/dev/null 2>&1; then
  # Pin the release. Unpinned, the node gets whatever get.k3s.io serves that day.
  # Pick a version from https://github.com/k3s-io/k3s/releases, e.g.
  #   INSTALL_K3S_VERSION=v1.xx.y+k3s1 sudo -E bash scripts/jetson-k3s-deploy.sh
  # AGENTIC_K3S_ALLOW_UNPINNED=1 installs the current stable channel instead.
  if [[ -z "${INSTALL_K3S_VERSION:-}" && "${AGENTIC_K3S_ALLOW_UNPINNED:-0}" != "1" ]]; then
    echo "error: k3s is not installed and INSTALL_K3S_VERSION is not set." >&2
    echo "       Set INSTALL_K3S_VERSION=<release tag> (https://github.com/k3s-io/k3s/releases)," >&2
    echo "       or AGENTIC_K3S_ALLOW_UNPINNED=1 to accept the current stable release." >&2
    exit 1
  fi
  # The admin kubeconfig is cluster-admin and, on this single node, host root
  # (privileged pods). Mode 644 handed that to every local user. Restrict it to
  # a group: root plus the members of AGENTIC_KUBECONFIG_GROUP (default k3s-admin).
  # AGENTIC_KUBECONFIG_GROUP="" writes it root-only (0600); use sudo for kubectl.
  # (Also use that when pinning an old k3s that lacks --write-kubeconfig-group:
  # check `k3s server --help` for the release you pin.)
  KUBECONFIG_GROUP="${AGENTIC_KUBECONFIG_GROUP-k3s-admin}"
  K3S_KUBECONFIG_FLAGS="--write-kubeconfig-mode 600"
  if [[ -n "${KUBECONFIG_GROUP}" ]]; then
    groupadd -f "${KUBECONFIG_GROUP}"
    KUBECONFIG_USER="${SUDO_USER:-${DEPLOY_USER:-}}"
    if [[ -n "${KUBECONFIG_USER}" && "${KUBECONFIG_USER}" != "root" ]]; then
      usermod -aG "${KUBECONFIG_GROUP}" "${KUBECONFIG_USER}"
      echo "added ${KUBECONFIG_USER} to group ${KUBECONFIG_GROUP} (log in again for kubectl without sudo)"
    fi
    K3S_KUBECONFIG_FLAGS="--write-kubeconfig-mode 640 --write-kubeconfig-group ${KUBECONFIG_GROUP}"
  fi
  curl -sfL https://get.k3s.io \
    | INSTALL_K3S_VERSION="${INSTALL_K3S_VERSION:-}" \
      INSTALL_K3S_EXEC="--docker ${K3S_KUBECONFIG_FLAGS}" sh -
fi
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

log "Patch k3s Traefik LoadBalancer → ClusterIP (avoids svclb iptables crash on Jetson)"
if kubectl get svc traefik -n kube-system >/dev/null 2>&1; then
  kubectl get svc traefik -n kube-system -o yaml \
    | sed 's/type: LoadBalancer/type: ClusterIP/' \
    | sed '/nodePort:/d' \
    | sed '/externalTrafficPolicy:/d' \
    | kubectl apply -f - >/dev/null 2>&1 || true
fi

log "Ollama reachable from pods (0.0.0.0:11434 + host.k3s.internal in CoreDNS)"
bash "${TOOL_ROOT}/scripts/jetson-fix-ollama-k8s.sh"

log "Apply namespace + hostPath run-store (Jetson path ${RUN_STORE_HOST})"
kubectl apply -f "${TOOL_ROOT}/deploy/k8s/base/namespace.yaml"
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolume
metadata:
  name: agentic-run-store-hostpath
  labels:
    app.kubernetes.io/name: agentic-run-store
spec:
  capacity:
    storage: 20Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: agentic-run-store-hostpath
  hostPath:
    path: ${RUN_STORE_HOST}
    type: DirectoryOrCreate
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: agentic-run-store
  namespace: agentic-orchestration
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: agentic-run-store-hostpath
  resources:
    requests:
      storage: 20Gi
  volumeName: agentic-run-store-hostpath
EOF

log "Sync K8s secret from tool .env"
# One generator for the Secret (same script the routine deploy uses).
PROJECT_ROOT="${PROJECT_ROOT}" RUN_STORE_HOST="${RUN_STORE_HOST}" WORKER_IMAGE="${WORKER_IMAGE}" \
  bash "${TOOL_ROOT}/scripts/jetson-sync-k8s-secret.sh" --no-restart

log "Build or pull coordinator + worker images"
if [[ "${AGENTIC_USE_GHCR}" == "1" || "${AGENTIC_USE_GHCR}" == "true" || "${AGENTIC_USE_GHCR}" == "yes" ]]; then
  if [[ -z "${AGENTIC_IMAGE_TAG}" ]]; then
    if [[ -f "${PROJECT_ROOT}/VERSION" ]]; then
      AGENTIC_IMAGE_TAG="v$(tr -d '[:space:]' < "${PROJECT_ROOT}/VERSION")"
    else
      AGENTIC_IMAGE_TAG="latest"
    fi
  fi
  OWNER_LC="$(echo "${AGENTIC_GHCR_OWNER}" | tr '[:upper:]' '[:lower:]')"
  COORDINATOR_IMAGE="${AGENTIC_GHCR_REGISTRY}/${OWNER_LC}/agentic-orchestrator-coordinator:${AGENTIC_IMAGE_TAG}"
  WORKER_IMAGE="${AGENTIC_GHCR_REGISTRY}/${OWNER_LC}/agentic-orchestrator-worker:${AGENTIC_IMAGE_TAG}"
  log "Pulling GHCR images (tag=${AGENTIC_IMAGE_TAG})"
  echo "  coordinator: ${COORDINATOR_IMAGE}"
  echo "  worker:      ${WORKER_IMAGE}"
  if [[ -n "${GITHUB_TOKEN:-${GHCR_TOKEN:-}}" ]]; then
    echo "${GITHUB_TOKEN:-${GHCR_TOKEN}}" | docker login "${AGENTIC_GHCR_REGISTRY}" -u "${GITHUB_USER:-${AGENTIC_GHCR_OWNER}}" --password-stdin
  fi
  docker pull "${COORDINATOR_IMAGE}"
  docker pull "${WORKER_IMAGE}"
else
  log "Building coordinator + worker images (native aarch64)"
  docker build -f "${TOOL_ROOT}/docker/Dockerfile.coordinator" \
    -t "${COORDINATOR_IMAGE}" "${PROJECT_ROOT}"
  docker build -f "${TOOL_ROOT}/docker/Dockerfile.worker" \
    -t "${WORKER_IMAGE}" "${TOOL_ROOT}"
fi

log "Apply coordinator RBAC + deployment"
kubectl apply -k "${TOOL_ROOT}/deploy/k8s/coordinator"
bash "${TOOL_ROOT}/scripts/jetson-coordinator-rollout.sh" apply
kubectl set env deployment/agentic-coordinator -n agentic-orchestration \
  AGENTIC_K8S_WARM_POOL_ENABLED=1 \
  AGENTIC_LOG_FORMAT=json \
  AGENTIC_K8S_WORKER_IMAGE="${WORKER_IMAGE}" 2>/dev/null || true
kubectl set image deployment/agentic-coordinator -n agentic-orchestration \
  coordinator="${COORDINATOR_IMAGE}" 2>/dev/null || true

log "Expose coordinator (NodePort 30487; Traefik upstream)"
kubectl apply -f "${TOOL_ROOT}/deploy/k8s/coordinator/service-nodeport.yaml"
if [[ -f "${TOOL_ROOT}/scripts/jetson-web-port-redirect.sh" ]]; then
  bash "${TOOL_ROOT}/scripts/jetson-web-port-redirect.sh" disable 2>/dev/null || true
fi

log "Apply warm pool + delegation broker"
kubectl apply -f "${TOOL_ROOT}/deploy/k8s/warm-pool.yaml"
kubectl apply -f "${TOOL_ROOT}/deploy/k8s/delegation-broker.yaml"
kubectl set image deployment/agentic-warm-pool -n agentic-orchestration \
  worker="${WORKER_IMAGE}" 2>/dev/null || true
kubectl set image deployment/agentic-delegation-broker -n agentic-orchestration \
  broker="${WORKER_IMAGE}" 2>/dev/null || true

log "Wait for rollouts"
bash "${TOOL_ROOT}/scripts/jetson-coordinator-rollout.sh" wait 600
kubectl rollout status deployment/agentic-warm-pool -n agentic-orchestration --timeout=300s
kubectl rollout status deployment/agentic-delegation-broker -n agentic-orchestration --timeout=300s

log "Smoke: HTTP + kubernetes brainstorm workflow"
sleep 5
curl -sf "http://127.0.0.1:${WEB_PORT}/api/ping" | head -c 200 || curl -sf "http://127.0.0.1:30487/api/ping" | head -c 200
echo ""
curl -sf -o /dev/null -w "home HTTP %{http_code}\n" "http://127.0.0.1:${WEB_PORT}/" \
  || curl -sf -o /dev/null -w "home HTTP %{http_code}\n" "http://127.0.0.1:30487/"

cd "${TOOL_ROOT}"
export AGENTIC_EXECUTION_BACKEND=kubernetes
export AGENTIC_RUN_STORE_PATH="${RUN_STORE_HOST}"
export AGENTIC_K8S_WARM_POOL_ENABLED=1
export AGENTIC_K8S_WORKER_IMAGE="${WORKER_IMAGE}"
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

if [[ -d .venv ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
elif command -v python3 >/dev/null 2>&1; then
  python3 -m venv .venv
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install -q -r requirements.txt
fi

python main.py --batch --config config/workflows/workflow_brainstorm.yaml --quiet

log "Deploy complete"
kubectl get pods -n agentic-orchestration
echo "Web UI: http://$(hostname -I | awk '{print $1}'):${WEB_PORT}/"
