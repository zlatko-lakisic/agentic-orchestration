#!/usr/bin/env bash
# Point OLLAMA_API_BASE in the agentic-orchestrator-env Secret at the host Ollama.
set -euo pipefail
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
NS=agentic-orchestration
SECRET=agentic-orchestrator-env
# The decoded Secret (every API key) is written to disk briefly: keep it private
# and remove it on any exit, including a failure half way through.
umask 077
TMP="$(mktemp)"
TMP2="$(mktemp)"
trap 'rm -f "${TMP}" "${TMP2}"' EXIT
kubectl get secret "$SECRET" -n "$NS" -o go-template='{{range $k,$v := .data}}{{printf "%s=%s\n" $k (base64decode $v)}}{{end}}' > "$TMP"
grep -v '^OLLAMA_API_BASE=' "$TMP" > "$TMP2" || true
echo 'OLLAMA_API_BASE=http://host.k3s.internal:11434' >> "$TMP2"
kubectl create secret generic "$SECRET" -n "$NS" --from-env-file="$TMP2" --dry-run=client -o yaml | kubectl apply -f -
for deploy in agentic-coordinator agentic-warm-pool agentic-delegation-broker; do
  if kubectl get deployment "${deploy}" -n "$NS" >/dev/null 2>&1; then
    kubectl rollout restart "deployment/${deploy}" -n "$NS"
  fi
done
kubectl rollout status deployment/agentic-coordinator -n "$NS" --timeout=300s
echo "OLLAMA_API_BASE patched; pods restarted"
