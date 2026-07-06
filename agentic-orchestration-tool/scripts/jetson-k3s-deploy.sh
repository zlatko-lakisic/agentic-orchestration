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

log "Ensure run-store host directory"
mkdir -p "${RUN_STORE_HOST}/mcp-fs-workspace"
chmod 1777 "${RUN_STORE_HOST}" || true

log "Install k3s (docker runtime) if needed"
if ! command -v k3s >/dev/null 2>&1; then
  curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--docker --write-kubeconfig-mode 644" sh -
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
ENV_FILE="${TOOL_ROOT}/.env"
APPLY_ENV="${TOOL_ROOT}/scripts/jetson-apply-env.sh"
if [[ -f "${APPLY_ENV}" ]]; then
  bash "${APPLY_ENV}"
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi
SECRET_TMP="$(mktemp)"
{
  grep -v '^#' "${ENV_FILE}" | grep '=' || true
  cat <<ENVEOF
AGENTIC_EXECUTION_BACKEND=kubernetes
AGENTIC_RUN_STORE_PATH=${RUN_STORE_HOST}
AGENTIC_K8S_RUN_STORE_VOLUME=hostpath
AGENTIC_K8S_RUN_STORE_HOST_PATH=${RUN_STORE_HOST}
AGENTIC_K8S_WORKER_IMAGE=${WORKER_IMAGE}
AGENTIC_K8S_NAMESPACE=agentic-orchestration
AGENTIC_K8S_RUN_STORE_PVC=agentic-run-store
AGENTIC_K8S_RUN_STORE_MOUNT=/run/store
AGENTIC_K8S_ENV_SECRET=agentic-orchestrator-env
AGENTIC_K8S_WARM_POOL_ENABLED=1
AGENTIC_K8S_DELEGATION_ENABLED=1
AGENTIC_K8S_WORKER_STDIO_MCPS=fetch_url,filesystem_local
AGENTIC_MCP_FETCH_ENABLED=1
FILESYSTEM_MCP_ALLOWED_DIRECTORY=/run/store/mcp-fs-workspace
AGENTIC_LOG_FORMAT=json
ENVEOF
} | awk -F= '{
  line=$0
  sub(/\r$/, "", line)
  if (line ~ /^[[:space:]]*#/ || line !~ /=/) next
  key=line
  sub(/=.*$/, "", key)
  gsub(/^[[:space:]]+|[[:space:]]+$/, "", key)
  if (key == "") next
  if (!(key in order)) order[++n]=key
  vals[key]=line
} END { for (i=1;i<=n;i++) print vals[order[i]] }' > "${SECRET_TMP}"
kubectl create secret generic agentic-orchestrator-env \
  -n agentic-orchestration \
  --from-env-file="${SECRET_TMP}" \
  --dry-run=client -o yaml | kubectl apply -f -
rm -f "${SECRET_TMP}"

log "Build coordinator + worker images (native aarch64)"
docker build -f "${TOOL_ROOT}/docker/Dockerfile.coordinator" \
  -t "${COORDINATOR_IMAGE}" "${PROJECT_ROOT}"
docker build -f "${TOOL_ROOT}/docker/Dockerfile.worker" \
  -t "${WORKER_IMAGE}" "${TOOL_ROOT}"

log "Apply coordinator RBAC + deployment"
kubectl apply -k "${TOOL_ROOT}/deploy/k8s/coordinator"
bash "${TOOL_ROOT}/scripts/jetson-coordinator-rollout.sh" apply
kubectl set env deployment/agentic-coordinator -n agentic-orchestration \
  AGENTIC_K8S_WARM_POOL_ENABLED=1 \
  AGENTIC_LOG_FORMAT=json \
  AGENTIC_K8S_WORKER_IMAGE="${WORKER_IMAGE}" 2>/dev/null || true
kubectl set image deployment/agentic-coordinator -n agentic-orchestration \
  coordinator="${COORDINATOR_IMAGE}" 2>/dev/null || true

log "Expose coordinator (NodePort 30487; optional iptables :80 redirect)"
kubectl apply -f "${TOOL_ROOT}/deploy/k8s/coordinator/service-nodeport.yaml"
if [[ "${WEB_PORT}" == "80" ]]; then
  bash "${TOOL_ROOT}/scripts/jetson-web-port-redirect.sh" enable
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
