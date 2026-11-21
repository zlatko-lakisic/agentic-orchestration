#!/usr/bin/env bash
set -euo pipefail
cd /var/projects/agentic-orchestration
bash agentic-orchestration-tool/scripts/jetson-deploy.sh
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
NS=agentic-orchestration
COORD=ghcr.io/zlatko-lakisic/agentic-orchestrator-coordinator:v2.22.0
WORKER=ghcr.io/zlatko-lakisic/agentic-orchestrator-worker:v2.22.0
kubectl set image deployment/agentic-coordinator -n "$NS" coordinator="$COORD"
kubectl set image deployment/agentic-engine -n "$NS" engine="$COORD" 2>/dev/null || true
kubectl set image deployment/agentic-warm-pool -n "$NS" worker="$WORKER"
kubectl set image deployment/agentic-delegation-broker -n "$NS" broker="$WORKER" 2>/dev/null || true
kubectl set env deployment/agentic-coordinator -n "$NS" AGENTIC_K8S_WORKER_IMAGE="$WORKER" 2>/dev/null || true
kubectl rollout status deployment/agentic-coordinator -n "$NS" --timeout=300s
kubectl rollout status deployment/agentic-engine -n "$NS" --timeout=300s
kubectl rollout status deployment/agentic-warm-pool -n "$NS" --timeout=300s
curl -sk https://127.0.0.1:8765/health | python3 -c 'import sys,json; d=json.load(sys.stdin); print("engine", d.get("version"), d.get("service"))'
python3 - <<'PY'
from pathlib import Path
import sys
sys.path.insert(0, "/var/projects/agentic-orchestration/agentic-orchestration-tool")
from orchestration.agent_providers_catalog import load_agent_providers_catalog, planner_exclude_enabled
entries = load_agent_providers_catalog(Path("/var/projects/agentic-orchestration/agentic-orchestration-tool/config/agent_providers_jetson"))
m = [e for e in entries if e.get("id")=="media_render_short"]
assert m and planner_exclude_enabled(m[0]), m
from orchestration import media_render
print("media_render_ok", m[0]["entrypoint"])
PY
