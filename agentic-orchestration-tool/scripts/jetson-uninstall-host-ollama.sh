#!/usr/bin/env bash
# Stop/disable/remove host systemd ollama (keeps binary on aarch64 for host-binary mode).
# Uses a privileged nsenter pod (no passwordless sudo required).
#
#   bash agentic-orchestration-tool/scripts/jetson-uninstall-host-ollama.sh
set -eu
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
POD="ao-host-ollama-uninstall"
ARCH="$(uname -m)"

KEEP_BIN=0
if [[ "${ARCH}" == "aarch64" || "${ARCH}" == "arm64" ]]; then
  KEEP_BIN=1
fi

kubectl -n "${NS}" delete pod "${POD}" --ignore-not-found --wait=true >/dev/null 2>&1 || true
YAML="$(mktemp)"
python3 - "${POD}" "${NS}" "${KEEP_BIN}" "${YAML}" <<'PY'
import json, sys
from pathlib import Path
name, ns, keep_bin, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
script = f"""
set -eu
systemctl stop ollama.service 2>/dev/null || true
systemctl disable ollama.service 2>/dev/null || true
rm -f /etc/systemd/system/ollama.service
rm -rf /etc/systemd/system/ollama.service.d
systemctl daemon-reload 2>/dev/null || true
if command -v ollama >/dev/null 2>&1; then
  if [ "{keep_bin}" = "1" ]; then
    echo "keeping host ollama binary: $(command -v ollama)"
  else
    OBIN="$(command -v ollama)"
    rm -f "${{OBIN}}"
    echo "removed ${{OBIN}}"
  fi
fi
if systemctl is-active ollama.service >/dev/null 2>&1; then
  echo "error: ollama still active" >&2
  exit 1
fi
echo "host ollama inactive"
echo "uninstall-ok"
"""
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
rm -f "${YAML}"

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
echo "Done. Verify in-cluster: curl -s http://127.0.0.1:31134/api/tags | head"
