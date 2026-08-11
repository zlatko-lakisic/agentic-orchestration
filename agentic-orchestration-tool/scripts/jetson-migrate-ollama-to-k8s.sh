#!/usr/bin/env bash
# Migrate host systemd Ollama → in-cluster agentic-ollama (managed_k8s).
#
# 1. Saves model inventory under var/ollama-model-inventory/
# 2. Copies /usr/share/ollama/.ollama → var/ollama-models (via privileged nsenter)
# 3. Enables Deployment + points AO env at http://agentic-ollama:11434
# 4. Verifies models, then stops/disables/removes host ollama
#
#   bash agentic-orchestration-tool/scripts/jetson-migrate-ollama-to-k8s.sh
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
MODELS_DIR="${PROJECT_ROOT}/var/ollama-models"
INVENTORY_DIR="${PROJECT_ROOT}/var/ollama-model-inventory"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOST_NAME="$(hostname -s 2>/dev/null || hostname)"
POD="ao-host-ollama-migrate"

mkdir -p "${INVENTORY_DIR}" "${MODELS_DIR}"
chmod 775 "${MODELS_DIR}" 2>/dev/null || true

echo "=== inventory (${HOST_NAME}) ==="
{
  echo "# Ollama inventory ${STAMP} host=${HOST_NAME}"
  echo
  if command -v ollama >/dev/null 2>&1; then
    ollama list || true
  fi
  echo
  curl -sS --max-time 10 http://127.0.0.1:11434/api/tags || true
  echo
} | tee "${INVENTORY_DIR}/${HOST_NAME}-${STAMP}.txt"

# Capture model names before host uninstall (for optional pull fallback).
mapfile -t MODEL_NAMES < <(
  if command -v ollama >/dev/null 2>&1; then
    ollama list 2>/dev/null | awk 'NR>1 {print $1}' | grep -v '^$' || true
  fi
)

run_on_host() {
  local script_file="$1"
  local script
  script="$(cat "${script_file}")"
  kubectl -n "${NS}" delete pod "${POD}" --ignore-not-found --wait=true >/dev/null 2>&1 || true
  local yaml
  yaml="$(mktemp)"
  python3 - "${POD}" "${NS}" "${script}" "${yaml}" <<'PY'
import json, sys
from pathlib import Path
name, ns, script, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
doc = {
  "apiVersion": "v1",
  "kind": "Pod",
  "metadata": {"name": name, "namespace": ns},
  "spec": {
    "hostPID": True,
    "restartPolicy": "Never",
    "containers": [{
      "name": "nsenter",
      "image": "busybox:1.36",
      "imagePullPolicy": "IfNotPresent",
      "securityContext": {"privileged": True},
      "command": [
        "nsenter", "--target=1", "--mount", "--uts", "--ipc", "--net", "--pid", "--",
        "sh", "-c", script,
      ],
    }],
  },
}
Path(out).write_text(json.dumps(doc), encoding="utf-8")
PY
  kubectl apply -f "${yaml}"
  rm -f "${yaml}"

  local phase="Pending"
  for _ in $(seq 1 300); do
    phase="$(kubectl -n "${NS}" get pod "${POD}" -o jsonpath='{.status.phase}' 2>/dev/null || echo Missing)"
    if [[ "${phase}" == "Succeeded" || "${phase}" == "Failed" || "${phase}" == "Missing" ]]; then
      break
    fi
    sleep 2
  done
  kubectl -n "${NS}" logs "${POD}" || true
  if [[ "${phase}" != "Succeeded" ]]; then
    kubectl -n "${NS}" describe pod "${POD}" | tail -50 || true
    kubectl -n "${NS}" delete pod "${POD}" --ignore-not-found --wait=false || true
    echo "error: host nsenter pod ended phase=${phase}" >&2
    exit 1
  fi
  kubectl -n "${NS}" delete pod "${POD}" --ignore-not-found --wait=true || true
}

HOST_COPY="$(mktemp)"
cat >"${HOST_COPY}" <<EOF
set -eu
SRC=/usr/share/ollama/.ollama
DST=${MODELS_DIR}
echo "copy \${SRC} -> \${DST}"
if [ ! -d "\${SRC}" ]; then
  echo "error: missing \${SRC}" >&2
  exit 1
fi
mkdir -p "\${DST}"
if command -v rsync >/dev/null 2>&1; then
  rsync -a "\${SRC}/" "\${DST}/"
else
  cp -a "\${SRC}/." "\${DST}/"
fi
du -sh "\${DST}" || true
ls -la "\${DST}" | head -20
echo "copy-ok"
EOF

echo "=== copy host models into ${MODELS_DIR} ==="
run_on_host "${HOST_COPY}"
rm -f "${HOST_COPY}"

patch_env_file() {
  local f="$1"
  [[ -f "${f}" ]] || return 0
  python3 - "${f}" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
lines = text.splitlines()
keys = {
    "OLLAMA_API_BASE": "http://agentic-ollama:11434",
    "AGENTIC_OLLAMA_MODE": "managed_k8s",
    "AGENTIC_JETSON_ENABLE_OLLAMA": "1",
}
out = []
seen = set()
for line in lines:
    stripped = line.strip()
    if not stripped or stripped.startswith("#") or "=" not in stripped:
        out.append(line)
        continue
    key = stripped.split("=", 1)[0].strip()
    if key in keys:
        out.append(f"{key}={keys[key]}")
        seen.add(key)
    else:
        out.append(line)
for key, val in keys.items():
    if key not in seen:
        out.append(f"{key}={val}")
path.write_text("\n".join(out) + "\n", encoding="utf-8")
print(f"patched {path}")
PY
}

patch_env_file "${TOOL_ROOT}/config/env.host"
patch_env_file "${TOOL_ROOT}/.env"

echo "=== enable in-cluster Ollama ==="
bash "${TOOL_ROOT}/scripts/jetson-enable-ollama.sh" "${PROJECT_ROOT}"

echo "=== verify in-cluster models ==="
sleep 5
kubectl -n "${NS}" exec deploy/agentic-ollama -- ollama list || true
TAGS="$(curl -sS --max-time 30 http://127.0.0.1:31134/api/tags || echo '{}')"
echo "${TAGS}" | head -c 2000
echo
MODEL_COUNT="$(printf '%s' "${TAGS}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d.get("models") or []))')"
if [[ "${MODEL_COUNT}" == "0" && ${#MODEL_NAMES[@]} -gt 0 ]]; then
  echo "warning: copied store empty or unread; pulling ${#MODEL_NAMES[@]} model(s)" >&2
  for name in "${MODEL_NAMES[@]}"; do
    echo "=== pull ${name} ==="
    kubectl -n "${NS}" exec deploy/agentic-ollama -- ollama pull "${name}" || true
  done
  kubectl -n "${NS}" exec deploy/agentic-ollama -- ollama list
fi

echo "=== remove host systemd Ollama ==="
HOST_UNINSTALL="$(mktemp)"
cat >"${HOST_UNINSTALL}" <<'EOF'
set -eu
systemctl stop ollama.service 2>/dev/null || true
systemctl disable ollama.service 2>/dev/null || true
rm -f /etc/systemd/system/ollama.service
rm -rf /etc/systemd/system/ollama.service.d
systemctl daemon-reload 2>/dev/null || true
if command -v ollama >/dev/null 2>&1; then
  OBIN="$(command -v ollama)"
  rm -f "${OBIN}"
  echo "removed ${OBIN}"
fi
if [ -d /usr/share/ollama ]; then
  echo "host model store left at /usr/share/ollama (safe to rm -rf after verifying k8s models)"
fi
if systemctl is-active ollama.service >/dev/null 2>&1; then
  echo "error: ollama still active" >&2
  exit 1
fi
echo "host ollama inactive"
echo "uninstall-ok"
EOF
run_on_host "${HOST_UNINSTALL}"
rm -f "${HOST_UNINSTALL}"

echo "=== refresh AO secret / rollouts ==="
bash "${TOOL_ROOT}/scripts/jetson-sync-k8s-secret.sh" || true
kubectl -n "${NS}" rollout restart deployment/agentic-coordinator deployment/agentic-engine deployment/agentic-warm-pool 2>/dev/null || true
kubectl -n "${NS}" rollout status deployment/agentic-coordinator --timeout=180s || true

echo
echo "Migration complete on ${HOST_NAME}."
echo "  Inventory: ${INVENTORY_DIR}/${HOST_NAME}-${STAMP}.txt"
echo "  Models:    ${MODELS_DIR}"
echo "  API:       http://agentic-ollama:11434 (NodePort :31134)"
echo "  Optional:  sudo rm -rf /usr/share/ollama && sudo userdel ollama"
