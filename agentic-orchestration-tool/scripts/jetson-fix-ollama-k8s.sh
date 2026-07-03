#!/usr/bin/env bash
# Fix Ollama reachability from k3s pods on Jetson:
# - Ollama must listen on 0.0.0.0:11434 (not 127.0.0.1 only)
# - CoreDNS NodeHosts must map host.k3s.internal -> cni gateway
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

log() { printf '\n=== %s ===\n' "$*"; }

log "Configure Ollama to listen on all interfaces"
mkdir -p /etc/systemd/system/ollama.service.d
cat >/etc/systemd/system/ollama.service.d/listen.conf <<'EOF'
[Service]
Environment=OLLAMA_HOST=0.0.0.0:11434
EOF
systemctl daemon-reload
systemctl restart ollama
sleep 2
ss -tlnp | grep 11434 || { echo "Ollama not listening on 11434" >&2; exit 1; }

log "Add host.k3s.internal to CoreDNS NodeHosts"
CNI_GW="$(ip -4 addr show cni0 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1 || true)"
CNI_GW="${CNI_GW:-10.42.0.1}"
ENTRY="${CNI_GW} host.k3s.internal"
CURRENT="$(kubectl get configmap coredns -n kube-system -o jsonpath='{.data.NodeHosts}')"
if grep -q 'host.k3s.internal' <<<"$CURRENT"; then
  echo "host.k3s.internal already in NodeHosts"
else
  PATCHED="${CURRENT}"$'\n'"${ENTRY}"$'\n'
  kubectl patch configmap coredns -n kube-system --type merge \
    -p "$(python3 -c "import json,sys; print(json.dumps({'data': {'NodeHosts': sys.stdin.read()}}))" <<<"$PATCHED")"
fi
kubectl rollout restart deployment/coredns -n kube-system
kubectl rollout status deployment/coredns -n kube-system --timeout=90s

log "Verify from coordinator pod"
sleep 5
kubectl exec -n agentic-orchestration deploy/agentic-coordinator -- \
  curl -sf --max-time 15 "http://host.k3s.internal:11434/api/tags" | head -c 300
echo
echo "OK: pods can reach Ollama at http://host.k3s.internal:11434"
