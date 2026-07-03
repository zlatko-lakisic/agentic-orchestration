#!/usr/bin/env bash
set -euo pipefail
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
NS=agentic-orchestration
SECRET=agentic-orchestrator-env
TMP="$(mktemp)"
kubectl get secret "$SECRET" -n "$NS" -o go-template='{{range $k,$v := .data}}{{printf "%s=%s\n" $k (base64decode $v)}}{{end}}' > "$TMP"
grep -v '^OLLAMA_API_BASE=' "$TMP" > "${TMP}.2" || true
mv "${TMP}.2" "$TMP"
echo 'OLLAMA_API_BASE=http://host.k3s.internal:11434' >> "$TMP"
kubectl create secret generic "$SECRET" -n "$NS" --from-env-file="$TMP" --dry-run=client -o yaml | kubectl apply -f -
rm -f "$TMP"
kubectl rollout restart deployment/agentic-coordinator deployment/agentic-warm-pool deployment/agentic-delegation-broker -n "$NS"
kubectl rollout status deployment/agentic-coordinator -n "$NS" --timeout=300s
echo "OLLAMA_API_BASE patched; pods restarted"
