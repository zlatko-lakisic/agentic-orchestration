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

# Run a host script as root via privileged nsenter (no passwordless sudo).
nsenter_root() {
  local name="$1"
  local script="$2"
  local b64
  b64="$(printf '%s' "${script}" | base64 -w0 2>/dev/null || printf '%s' "${script}" | base64)"
  kubectl -n "${NS}" delete pod "${name}" --ignore-not-found >/dev/null 2>&1 || true
  cat <<EOF | kubectl -n "${NS}" apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: ${name}
spec:
  hostPID: true
  hostNetwork: true
  restartPolicy: Never
  containers:
    - name: run
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
          echo '${b64}' | base64 -d > /tmp/${name}.sh
          chmod +x /tmp/${name}.sh
          sh /tmp/${name}.sh
EOF
  local phase=""
  local i
  for i in $(seq 1 300); do
    phase="$(kubectl -n "${NS}" get pod "${name}" -o jsonpath='{.status.phase}' 2>/dev/null || true)"
    if [[ "${phase}" == "Succeeded" || "${phase}" == "Failed" ]]; then
      break
    fi
    sleep 2
  done
  kubectl -n "${NS}" logs "pod/${name}" || true
  kubectl -n "${NS}" delete pod "${name}" --ignore-not-found >/dev/null 2>&1 || true
  if [[ "${phase}" != "Succeeded" ]]; then
    echo "error: ${name} pod phase=${phase}" >&2
    return 1
  fi
}

restore_scale() {
  kubectl -n "${NS}" scale deploy/agentic-coordinator --replicas=1 2>/dev/null || true
  kubectl -n "${NS}" scale deploy/agentic-engine --replicas=1 2>/dev/null || true
  kubectl -n "${NS}" scale deploy/agentic-ollama --replicas=1 2>/dev/null || true
  kubectl -n "${NS}" scale deploy/agentic-warm-pool --replicas=2 2>/dev/null || true
}

echo "=== scale down workloads for migration ==="
kubectl -n "${NS}" scale deploy/agentic-coordinator --replicas=0 2>/dev/null || true
kubectl -n "${NS}" scale deploy/agentic-engine --replicas=0 2>/dev/null || true
kubectl -n "${NS}" scale deploy/agentic-ollama --replicas=0 2>/dev/null || true
kubectl -n "${NS}" scale deploy/agentic-warm-pool --replicas=0 2>/dev/null || true
sleep 3

live_root="$(readlink -f "${PROJECT_LINK}" 2>/dev/null || echo "${PROJECT_LINK}")"
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

if [[ "${live_root}" == "${PROJECT_NVME}" ]]; then
  echo "=== project already live on NVMe; skipping project rsync ==="
else
  echo "=== root rsync project → ${PROJECT_NVME} ==="
  nsenter_root jetson-nvme-rsync-proj "$(cat <<EOS
set -eu
mkdir -p '${PROJECT_NVME}'
rsync -aHAX '${live_root}/' '${PROJECT_NVME}/'
test -d '${PROJECT_NVME}/.git' || test -f '${PROJECT_NVME}/CHANGELOG.md'
du -sh '${PROJECT_NVME}'
echo project_rsync_ok
EOS
)" || { restore_scale; exit 1; }
fi

if [[ -z "${SRC_MODELS}" ]]; then
  echo "warning: no source models found; leaving ${OLLAMA_MODELS_NVME} as-is" >&2
elif [[ "$(readlink -f "${SRC_MODELS}" 2>/dev/null || echo "${SRC_MODELS}")" == "$(readlink -f "${OLLAMA_MODELS_NVME}")" ]]; then
  echo "=== models already on NVMe ==="
else
  echo "=== root rsync models ${SRC_MODELS} → ${OLLAMA_MODELS_NVME} ==="
  nsenter_root jetson-nvme-rsync-models "$(cat <<EOS
set -eu
mkdir -p '${OLLAMA_MODELS_NVME}'
rsync -aHAX '${SRC_MODELS}/' '${OLLAMA_MODELS_NVME}/'
chmod -R a+rX '${OLLAMA_MODELS_NVME}' || true
du -sh '${OLLAMA_MODELS_NVME}'
echo models_rsync_ok
EOS
)" || { restore_scale; exit 1; }
fi

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
if [[ "${live_root}" != "${PROJECT_NVME}" ]]; then
  pin_models_env "${live_root}/agentic-orchestration-tool/.env"
fi

if [[ -L "${PROJECT_LINK}" ]] && [[ "$(readlink -f "${PROJECT_LINK}")" == "${PROJECT_NVME}" ]]; then
  echo "=== symlink cutover already done ==="
else
  BAK="${PROJECT_LINK}.emmc-bak-$(date +%Y%m%d%H%M%S)"
  echo "=== nsenter cutover: mv ${PROJECT_LINK} → ${BAK}; ln -s ${PROJECT_NVME} ==="
  nsenter_root jetson-nvme-cutover "$(cat <<EOS
set -eu
LINK='${PROJECT_LINK}'
NVME='${PROJECT_NVME}'
BAK='${BAK}'
MODELS='${OLLAMA_MODELS_NVME}'
test -d "\${NVME}"
test -d "\${NVME}/.git" || test -f "\${NVME}/CHANGELOG.md"
if [ -L "\${LINK}" ]; then
  cur=\$(readlink -f "\${LINK}" || readlink "\${LINK}")
  if [ "\${cur}" = "\${NVME}" ]; then
    echo already_linked
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
mkdir -p /usr/share/ollama/.ollama
ln -sfn "\${MODELS}" /usr/share/ollama/.ollama/models
ls -la "\${LINK}" /usr/share/ollama/.ollama/models
echo cutover_ok
EOS
)" || { restore_scale; exit 1; }

  if [[ ! -L "${PROJECT_LINK}" ]]; then
    echo "error: ${PROJECT_LINK} is not a symlink after cutover" >&2
    restore_scale
    exit 1
  fi
  echo "eMMC backup (safe to remove after verify): ${BAK}"
fi

echo "=== verify ==="
readlink -f "${PROJECT_LINK}"
df -h "${PROJECT_LINK}" "${OLLAMA_MODELS_NVME}" | sed 's/^/  /'
du -sh "${OLLAMA_MODELS_NVME}" 2>/dev/null | sed 's/^/  models /' || true

echo
echo "Migration complete. Next: bash ${PROJECT_LINK}/agentic-orchestration-tool/scripts/jetson-deploy.sh"
echo "After verify, remove eMMC backup under /var/projects/*.emmc-bak-* to free rootfs."
