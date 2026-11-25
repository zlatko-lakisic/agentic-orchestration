#!/usr/bin/env bash
# Stop/disable/remove host systemd ollama (keeps binary on aarch64 for host-binary mode).
#
# Runs as real root when possible (already root, or passwordless sudo). Only when
# neither is available does it fall back to a privileged hostPID nsenter pod — that
# path works solely because the caller's kubeconfig is cluster-admin, i.e. it uses
# kubectl access as host root. AGENTIC_ALLOW_NSENTER_ROOT=0 refuses the fallback.
#
#   bash agentic-orchestration-tool/scripts/jetson-uninstall-host-ollama.sh
set -euo pipefail
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
POD="ao-host-ollama-uninstall"
ARCH="$(uname -m)"

KEEP_BIN=0
if [[ "${ARCH}" == "aarch64" || "${ARCH}" == "arm64" ]]; then
  KEEP_BIN=1
fi

# The host-side work, as a POSIX sh script (same text for every execution path).
HOST_SCRIPT="$(cat <<EOS
set -eu
systemctl stop ollama.service 2>/dev/null || true
systemctl disable ollama.service 2>/dev/null || true
rm -f /etc/systemd/system/ollama.service
rm -rf /etc/systemd/system/ollama.service.d
systemctl daemon-reload 2>/dev/null || true
if command -v ollama >/dev/null 2>&1; then
  if [ "${KEEP_BIN}" = "1" ]; then
    echo "keeping host ollama binary: \$(command -v ollama)"
  else
    OBIN="\$(command -v ollama)"
    rm -f "\${OBIN}"
    echo "removed \${OBIN}"
  fi
fi
if systemctl is-active ollama.service >/dev/null 2>&1; then
  echo "error: ollama still active" >&2
  exit 1
fi
echo "host ollama inactive"
echo "uninstall-ok"
EOS
)"

VERIFY_HINT="Done. Verify in-cluster: kubectl get --raw /api/v1/namespaces/${NS}/services/agentic-ollama:11434/proxy/api/tags | head -c 300"

if [[ "$(id -u)" -eq 0 ]]; then
  sh -c "${HOST_SCRIPT}"
  echo "${VERIFY_HINT}"
  exit 0
fi
if sudo -n true 2>/dev/null; then
  printf '%s\n' "${HOST_SCRIPT}" | sudo -n sh
  echo "${VERIFY_HINT}"
  exit 0
fi
if [[ "${AGENTIC_ALLOW_NSENTER_ROOT:-1}" == "0" ]]; then
  echo "error: needs root; no sudo available and AGENTIC_ALLOW_NSENTER_ROOT=0" >&2
  exit 1
fi
echo "warning: no root/sudo — using a privileged nsenter pod (kubeconfig acts as host root)" >&2

kubectl -n "${NS}" delete pod "${POD}" --ignore-not-found --wait=true >/dev/null 2>&1 || true
YAML="$(mktemp)"
trap 'rm -f "${YAML}"' EXIT
python3 - "${POD}" "${NS}" "${HOST_SCRIPT}" "${YAML}" <<'PY'
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

kubectl apply -f "${YAML}"

phase="Pending"
for _ in $(seq 1 90); do
  phase="$(kubectl -n "${NS}" get pod "${POD}" -o jsonpath='{.status.phase}' 2>/dev/null || echo Missing)"
  if [[ "${phase}" == "Succeeded" || "${phase}" == "Failed" || "${phase}" == "Missing" ]]; then
    break
  fi
  sleep 2
done
kubectl -n "${NS}" logs "${POD}" || true
if [[ "${phase}" != "Succeeded" ]]; then
  kubectl -n "${NS}" describe pod "${POD}" | tail -40 || true
  kubectl -n "${NS}" delete pod "${POD}" --ignore-not-found --wait=false || true
  exit 1
fi
kubectl -n "${NS}" delete pod "${POD}" --ignore-not-found --wait=true || true
echo "${VERIFY_HINT}"
