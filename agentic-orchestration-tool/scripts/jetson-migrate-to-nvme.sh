#!/usr/bin/env bash
# Migrate Jetson AO project + Ollama models onto local NVMe (/mnt/nvme).
#
# Layout after success:
#   /mnt/nvme/projects/agentic-orchestration   (canonical git tree)
#   /var/projects/agentic-orchestration        → symlink to the path above
#   /mnt/nvme/ollama/models                    (Ollama blobs/manifests; no NFS)
#
# Root ops use a privileged nsenter pod (same pattern as host-binary Ollama)
# because /var/projects is root-owned and passwordless sudo is not available.
#
#   bash agentic-orchestration-tool/scripts/jetson-migrate-to-nvme.sh
set -eu

NVME_ROOT="${AGENTIC_JETSON_NVME_ROOT:-/mnt/nvme}"
PROJECT_LINK="${AGENTIC_JETSON_PROJECT_LINK:-/var/projects/agentic-orchestration}"
PROJECT_NVME="${NVME_ROOT}/projects/agentic-orchestration"
OLLAMA_MODELS_NVME="${AGENTIC_OLLAMA_MODELS_HOSTPATH:-${NVME_ROOT}/ollama/models}"
NFS_MODELS_DEFAULT="/nfs/omega-jetson/ollama/models"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

if [[ "$(uname -m)" != "aarch64" && "$(uname -m)" != "arm64" ]]; then
  echo "error: this migration is for Jetson (aarch64); refusing on $(uname -m)" >&2
  exit 1
fi
if [[ ! -d "${NVME_ROOT}" ]]; then
  echo "error: ${NVME_ROOT} missing — mount the NVMe first" >&2
  exit 1
fi
if [[ ! -d "${PROJECT_LINK}" && ! -L "${PROJECT_LINK}" ]]; then
  echo "error: project not found at ${PROJECT_LINK}" >&2
  exit 1
fi

echo "=== Jetson → NVMe migration ==="
echo "  nvme:     ${NVME_ROOT}"
echo "  project:  ${PROJECT_LINK} → ${PROJECT_NVME}"
echo "  models:   ${OLLAMA_MODELS_NVME}"

# Already migrated?
if [[ -L "${PROJECT_LINK}" ]]; then
  target="$(readlink -f "${PROJECT_LINK}" 2>/dev/null || readlink "${PROJECT_LINK}")"
  if [[ "${target}" == "${PROJECT_NVME}" ]]; then
    echo "project symlink already points at NVMe (${target})"
  else
    echo "warning: ${PROJECT_LINK} → ${target} (expected ${PROJECT_NVME})" >&2
  fi
fi

mkdir -p "${NVME_ROOT}/projects" "${OLLAMA_MODELS_NVME}"
chmod 775 "${NVME_ROOT}/projects" "${NVME_ROOT}/ollama" "${OLLAMA_MODELS_NVME}" 2>/dev/null || true

echo "=== scale down workloads for migration ==="
kubectl -n "${NS}" scale deploy/agentic-coordinator --replicas=0 2>/dev/null || true
kubectl -n "${NS}" scale deploy/agentic-engine --replicas=0 2>/dev/null || true
kubectl -n "${NS}" scale deploy/agentic-ollama --replicas=0 2>/dev/null || true
kubectl -n "${NS}" scale deploy/agentic-warm-pool --replicas=0 2>/dev/null || true
sleep 3

# --- 1) Mirror project onto NVMe (skip if already the live tree) ---
live_root="$(readlink -f "${PROJECT_LINK}" 2>/dev/null || echo "${PROJECT_LINK}")"
if [[ "${live_root}" == "${PROJECT_NVME}" ]]; then
  echo "=== project already live on NVMe; skipping rsync ==="
else
  echo "=== rsync project → ${PROJECT_NVME} ==="
  mkdir -p "${PROJECT_NVME}"
  rsync -aHAX \
    --exclude '.git/objects/pack/*.tmp' \
    "${live_root}/" "${PROJECT_NVME}/"
fi

# --- 2) Copy Ollama models off NFS (or existing hostPath) ---
SRC_MODELS=""
for candidate in \
  "${AGENTIC_OLLAMA_MODELS_SRC:-}" \
  "${NFS_MODELS_DEFAULT}" \
  "/usr/share/ollama/.ollama/models" \
  "${live_root}/var/ollama-models/models" \
  "${live_root}/var/ollama-models"
do
  [[ -z "${candidate}" ]] && continue
  if [[ -d "${candidate}/blobs" || -d "${candidate}/manifests" ]]; then
    SRC_MODELS="${candidate}"
    break
  fi
done

if [[ -z "${SRC_MODELS}" ]]; then
  echo "warning: no source models found; leaving ${OLLAMA_MODELS_NVME} as-is" >&2
elif [[ "$(readlink -f "${SRC_MODELS}" 2>/dev/null || echo "${SRC_MODELS}")" == "$(readlink -f "${OLLAMA_MODELS_NVME}")" ]]; then
  echo "=== models already on NVMe ==="
else
  echo "=== rsync models ${SRC_MODELS} → ${OLLAMA_MODELS_NVME} ==="
  rsync -aHAX "${SRC_MODELS}/" "${OLLAMA_MODELS_NVME}/"
  chmod -R a+rX "${OLLAMA_MODELS_NVME}" 2>/dev/null || true
fi

# Pin env on the NVMe copy (and live tree if still on eMMC) before cutover.
pin_models_env() {
  local envf="$1"
  [[ -f "${envf}" ]] || return 0
  if grep -q '^AGENTIC_OLLAMA_MODELS_HOSTPATH=' "${envf}" 2>/dev/null; then
    sed -i "s|^AGENTIC_OLLAMA_MODELS_HOSTPATH=.*|AGENTIC_OLLAMA_MODELS_HOSTPATH=${OLLAMA_MODELS_NVME}|" "${envf}"
  else
    printf '\nAGENTIC_OLLAMA_MODELS_HOSTPATH=%s\n' "${OLLAMA_MODELS_NVME}" >>"${envf}"
  fi
}
pin_models_env "${PROJECT_NVME}/agentic-orchestration-tool/.env"
pin_models_env "${live_root}/agentic-orchestration-tool/.env"

# --- 3) Root cutover: replace /var/projects/... with symlink via nsenter ---
if [[ -L "${PROJECT_LINK}" ]] && [[ "$(readlink -f "${PROJECT_LINK}")" == "${PROJECT_NVME}" ]]; then
  echo "=== symlink cutover already done ==="
else
  BAK="${PROJECT_LINK}.emmc-bak-$(date +%Y%m%d%H%M%S)"
  echo "=== nsenter cutover: mv ${PROJECT_LINK} → ${BAK}; ln -s ${PROJECT_NVME} ==="
  kubectl -n "${NS}" delete pod jetson-nvme-cutover --ignore-not-found >/dev/null 2>&1 || true
  cat <<EOF | kubectl -n "${NS}" apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: jetson-nvme-cutover
  labels:
    app.kubernetes.io/name: jetson-nvme-cutover
spec:
  hostPID: true
  hostNetwork: true
  restartPolicy: Never
  containers:
    - name: cutover
      image: busybox:1.36
      imagePullPolicy: IfNotPresent
      securityContext:
        privileged: true
      command:
        - nsenter
        - --target=1
        - --mount
        - --uts
        - --ipc
        - --net
        - --pid
        - --
        - sh
        - -c
        - |
          set -eu
          LINK="${PROJECT_LINK}"
          NVME="${PROJECT_NVME}"
          BAK="${BAK}"
          test -d "\${NVME}"
          test -d "\${NVME}/.git" || test -f "\${NVME}/CHANGELOG.md"
          if [ -L "\${LINK}" ]; then
            cur=\$(readlink -f "\${LINK}" || readlink "\${LINK}")
            if [ "\${cur}" = "\${NVME}" ]; then
              echo "already linked"
              exit 0
            fi
            rm -f "\${LINK}"
          elif [ -d "\${LINK}" ]; then
            mv "\${LINK}" "\${BAK}"
          else
            echo "unexpected path state: \${LINK}" >&2
            exit 1
          fi
          ln -s "\${NVME}" "\${LINK}"
          # Point host Ollama home models at NVMe (best-effort).
          mkdir -p /usr/share/ollama/.ollama
          ln -sfn "${OLLAMA_MODELS_NVME}" /usr/share/ollama/.ollama/models
          ls -la "\${LINK}" /usr/share/ollama/.ollama/models
          echo cutover_ok
EOF
  kubectl -n "${NS}" wait --for=jsonpath='{.status.phase}'=Succeeded pod/jetson-nvme-cutover --timeout=120s 2>/dev/null \
    || kubectl -n "${NS}" wait --for=condition=Ready pod/jetson-nvme-cutover --timeout=60s 2>/dev/null \
    || true
  for _ in $(seq 1 60); do
    phase="$(kubectl -n "${NS}" get pod jetson-nvme-cutover -o jsonpath='{.status.phase}' 2>/dev/null || true)"
    [[ "${phase}" == "Succeeded" || "${phase}" == "Failed" ]] && break
    sleep 2
  done
  kubectl -n "${NS}" logs pod/jetson-nvme-cutover || true
  phase="$(kubectl -n "${NS}" get pod jetson-nvme-cutover -o jsonpath='{.status.phase}' 2>/dev/null || true)"
  kubectl -n "${NS}" delete pod jetson-nvme-cutover --ignore-not-found >/dev/null 2>&1 || true
  if [[ "${phase}" != "Succeeded" ]]; then
    echo "error: cutover pod phase=${phase}" >&2
    kubectl -n "${NS}" scale deploy/agentic-coordinator --replicas=1 2>/dev/null || true
    kubectl -n "${NS}" scale deploy/agentic-engine --replicas=1 2>/dev/null || true
    kubectl -n "${NS}" scale deploy/agentic-ollama --replicas=1 2>/dev/null || true
    kubectl -n "${NS}" scale deploy/agentic-warm-pool --replicas=2 2>/dev/null || true
    exit 1
  fi

  if [[ ! -L "${PROJECT_LINK}" ]]; then
    echo "error: ${PROJECT_LINK} is not a symlink after cutover" >&2
    exit 1
  fi
  echo "eMMC backup (safe to remove after verify): ${BAK}"
fi

echo "=== verify ==="
readlink -f "${PROJECT_LINK}"
df -h "${PROJECT_LINK}" "${OLLAMA_MODELS_NVME}" | sed 's/^/  /'
du -sh "${OLLAMA_MODELS_NVME}" 2>/dev/null | sed 's/^/  models /' || true
ls "${OLLAMA_MODELS_NVME}/manifests" 2>/dev/null | head -5 | sed 's/^/  manifest /' || true

echo
echo "Migration complete. Next: bash ${PROJECT_LINK}/agentic-orchestration-tool/scripts/jetson-deploy.sh"
echo "After verify, remove eMMC backup under /var/projects/*.emmc-bak-* to free rootfs."
