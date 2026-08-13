#!/usr/bin/env bash
# One-shot Ada fix: ensure tool .venv + HA env in k8s secret. Do not commit.
set -eu
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
NS=agentic-orchestration
TOOL_ROOT=/var/projects/agentic-orchestration/agentic-orchestration-tool
ENV_FILE="${TOOL_ROOT}/.env"

echo "=== HA in host .env ==="
grep -E '^HOME_ASSISTANT_' "${ENV_FILE}" | cut -d= -f1 || true

echo "=== HA in secret (names only) ==="
kubectl -n "${NS}" get secret agentic-orchestrator-env -o go-template='{{range $k,$v := .data}}{{println $k}}{{end}}' | grep HOME_ASSISTANT || echo "(none)"

echo "=== coordinator env lengths ==="
kubectl -n "${NS}" exec deploy/agentic-coordinator -- sh -c 'printf "URL_len=%s TOKEN_len=%s PYTHON=%s AGENTIC_PYTHON=%s\n" "${#HOME_ASSISTANT_URL}" "${#HOME_ASSISTANT_TOKEN}" "$(command -v python3)" "${AGENTIC_PYTHON:-}"'

echo "=== coordinator venv / import check ==="
kubectl -n "${NS}" exec deploy/agentic-coordinator -- sh -c '
TOOL=/app/tool
VPY="$TOOL/.venv/bin/python"
if [ -x "$VPY" ]; then
  echo "venv_python=$VPY"
  "$VPY" -c "import dotenv; print(\"dotenv_ok\")" || echo "dotenv_fail"
  "$VPY" -c "import crewai; print(\"crewai_ok\")" || echo "crewai_fail"
else
  echo "no_venv_python"
fi
python3 -c "import dotenv; print(\"sys_dotenv_ok\")" 2>/dev/null || echo "sys_dotenv_fail"
ls -la "$TOOL/.venv/bin" 2>/dev/null | head -5 || true
'

echo "=== warm-pool import check ==="
WP=$(kubectl -n "${NS}" get pods -l app=agentic-warm-pool -o jsonpath='{.items[0].metadata.name}')
kubectl -n "${NS}" exec "$WP" -- sh -c '
VPY=/app/tool/.venv/bin/python
if [ -x "$VPY" ]; then "$VPY" -c "import dotenv,crewai; print(\"warm_ok\")"; else echo "warm_no_venv"; python3 -c "import dotenv,crewai; print(\"warm_sys_ok\")" 2>/dev/null || echo "warm_sys_fail"; fi
'
