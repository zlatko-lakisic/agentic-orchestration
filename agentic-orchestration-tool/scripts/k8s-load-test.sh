#!/usr/bin/env bash
# K5.4 load test: N parallel K8s workflow runs (stub worker, no LLM).
set -euo pipefail
TOOL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${TOOL_ROOT}"

RUNS="${1:-5}"
WARM_POOL="${AGENTIC_K8S_WARM_POOL_ENABLED:-0}"
STUB_IMAGE="${AGENTIC_K8S_WORKER_IMAGE:-agentic-orchestrator-worker-stub:ci}"
WORKFLOW="config/workflows/workflow_brainstorm.yaml"

export AGENTIC_EXECUTION_BACKEND=kubernetes
export AGENTIC_K8S_WORKER_IMAGE="${STUB_IMAGE}"
export AGENTIC_K8S_NAMESPACE="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export AGENTIC_K8S_RUN_STORE_PVC="${AGENTIC_K8S_RUN_STORE_PVC:-agentic-run-store}"
export AGENTIC_K8S_RUN_STORE_MOUNT="${AGENTIC_K8S_RUN_STORE_MOUNT:-/run/store}"
export AGENTIC_LOG_FORMAT=json

if [[ -f .env ]]; then set -a; # shellcheck disable=SC1091
  source .env; set +a; fi

RUN_STORE="${AGENTIC_RUN_STORE_PATH:-/tmp/agentic-run-store}"
export AGENTIC_RUN_STORE_PATH="${RUN_STORE}"

echo "Load test: ${RUNS} parallel runs (${WORKFLOW}, warm_pool=${WARM_POOL})"
TIMINGS_FILE="$(mktemp)"
trap 'rm -f "${TIMINGS_FILE}"' EXIT

run_one() {
  local idx="$1"
  local start end elapsed code
  start=$(date +%s.%N)
  if python main.py "${WORKFLOW}" --quiet; then code=0; else code=$?; fi
  end=$(date +%s.%N)
  elapsed=$(python -c "print(round(${end}-${start}, 3))")
  echo "${elapsed} ${code}" >> "${TIMINGS_FILE}"
  echo "  run ${idx}: ${elapsed}s exit ${code}"
}

for i in $(seq 1 "${RUNS}"); do
  run_one "${i}" &
done
wait

FAILED=$(awk '$2 != "0" { c++ } END { print c+0 }' "${TIMINGS_FILE}")
python - <<'PY' "${TIMINGS_FILE}" "${RUNS}" "${FAILED}"
import sys
from pathlib import Path
lines = Path(sys.argv[1]).read_text().strip().splitlines()
secs = sorted(float(l.split()[0]) for l in lines if l.strip())
n = len(secs)
p50 = secs[int((n - 1) * 0.5)] if secs else 0
p95 = secs[int((n - 1) * 0.95)] if secs else 0
avg = sum(secs) / n if secs else 0
print()
print(f"Summary ({sys.argv[2]} runs, {sys.argv[3]} failed)")
print(f"  p50 step-run wall time: {p50:.2f}s")
print(f"  p95 step-run wall time: {p95:.2f}s")
print(f"  avg: {avg:.2f}s")
PY

[[ "${FAILED}" -eq 0 ]]
