#!/usr/bin/env bash
# Apply coordinator Deployment + Service + RBAC (K3.7).
set -euo pipefail
TOOL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
kubectl apply -f "${TOOL_ROOT}/deploy/k8s/base/namespace.yaml"
kubectl apply -k "${TOOL_ROOT}/deploy/k8s/coordinator"
kubectl rollout status deployment/agentic-coordinator -n agentic-orchestration --timeout=180s
echo "Coordinator ready. Port-forward: kubectl port-forward -n agentic-orchestration svc/agentic-coordinator 3847:3847"
