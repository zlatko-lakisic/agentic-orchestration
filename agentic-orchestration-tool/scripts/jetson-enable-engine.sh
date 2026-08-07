#!/usr/bin/env bash
# Publish the Engine API daemon alongside the Node web UI (additive).
# Web UI stays on NodePort 30487. Daemon binds 0.0.0.0:8765 (hostPort) + NodePort 30765.
#
# Run on the Jetson after git pull (never SCP):
#   bash agentic-orchestration-tool/scripts/jetson-enable-engine.sh
#
# KnowBuddy Remote URL: http://<jetson-ip>:8765
# Verify:
#   curl -s http://127.0.0.1:8765/health
#   curl -s http://127.0.0.1:30487/api/ping   # web still agentic-orchestration-web
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

ENGINE_DIR="${TOOL_ROOT}/deploy/k8s/engine"
DEPLOY_YAML="${ENGINE_DIR}/deployment.yaml"
SVC_YAML="${ENGINE_DIR}/service.yaml"
NP_YAML="${ENGINE_DIR}/service-nodeport.yaml"

if [[ ! -f "${DEPLOY_YAML}" ]]; then
  echo "error: missing ${DEPLOY_YAML}" >&2
  exit 1
fi

if [[ ! -d "${TOOL_ROOT}/orchestration/serve" ]]; then
  echo "error: orchestration/serve missing under ${TOOL_ROOT} — git pull first" >&2
  exit 1
fi

# Reuse the coordinator image already loaded on the node (local or GHCR tag).
COORD_IMAGE="$(
  kubectl get deployment agentic-coordinator -n "${NS}" \
    -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true
)"
if [[ -z "${COORD_IMAGE}" ]]; then
  COORD_IMAGE="${AGENTIC_ENGINE_IMAGE:-agentic-orchestrator-coordinator:local}"
  echo "warning: agentic-coordinator not found; using image ${COORD_IMAGE}" >&2
else
  echo "=== engine image (from coordinator): ${COORD_IMAGE} ==="
fi

TMP_DEPLOY="$(mktemp)"
trap 'rm -f "${TMP_DEPLOY}"' EXIT
python3 - "${DEPLOY_YAML}" "${TMP_DEPLOY}" "${COORD_IMAGE}" <<'PY'
import sys
src, dst, image = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(src, encoding="utf-8").read()
old = "image: agentic-orchestrator-coordinator:local"
new = f"image: {image}"
if old not in text:
    raise SystemExit(f"expected {old!r} in {src}")
open(dst, "w", encoding="utf-8").write(text.replace(old, new, 1))
PY

echo "=== apply agentic-engine Deployment + Services ==="
kubectl apply -f "${TMP_DEPLOY}"
kubectl apply -f "${SVC_YAML}"
kubectl apply -f "${NP_YAML}"

echo "=== wait for agentic-engine rollout ==="
kubectl rollout status deployment/agentic-engine -n "${NS}" --timeout=300s

ENGINE_URL="${AGENTIC_ENGINE_URL:-}"
WEB_URL="${AGENTIC_WEB_URL:-http://127.0.0.1:30487}"

# Prefer HTTPS when TLS env is present in the tool .env (mTLS / server TLS).
if [[ -z "${ENGINE_URL}" ]]; then
  if grep -qE '^[[:space:]]*AGENTIC_SERVE_TLS_CERTFILE=' "${TOOL_ROOT}/.env" 2>/dev/null; then
    ENGINE_URL="https://127.0.0.1:8765"
  else
    ENGINE_URL="http://127.0.0.1:8765"
  fi
fi
CURL_ENGINE=(curl -sf)
if [[ "${ENGINE_URL}" == https://* ]]; then
  CURL_ENGINE=(curl -sfk)
fi

echo "=== verify engine /health (expect service=agentic-orchestration-engine) ==="
for i in 1 2 3 4 5 6 7 8 9 10; do
  if "${CURL_ENGINE[@]}" "${ENGINE_URL}/health" | tee /tmp/agentic-engine-health.json | grep -q 'agentic-orchestration-engine'; then
    break
  fi
  sleep 3
done
if ! grep -q 'agentic-orchestration-engine' /tmp/agentic-engine-health.json 2>/dev/null; then
  echo "error: engine /health failed or wrong service" >&2
  kubectl get pods -n "${NS}" -l app.kubernetes.io/name=agentic-engine -o wide >&2 || true
  kubectl logs -n "${NS}" -l app.kubernetes.io/name=agentic-engine --tail=80 >&2 || true
  exit 1
fi
cat /tmp/agentic-engine-health.json
echo

echo "=== verify engine /api/ping ==="
"${CURL_ENGINE[@]}" "${ENGINE_URL}/api/ping"
echo

echo "=== verify web UI still on 30487 (expect agentic-orchestration-web) ==="
if curl -sf "${WEB_URL}/api/ping" | tee /tmp/agentic-web-ping.json | grep -q 'agentic-orchestration-web\|"ok"'; then
  cat /tmp/agentic-web-ping.json
  echo
else
  echo "warning: web /api/ping check failed — web UI may still be rolling out" >&2
fi

echo
echo "Engine daemon ready."
if [[ "${ENGINE_URL}" == https://* ]]; then
  echo "  KnowBuddy / Reach Remote URL: https://<jetson-ip>:8765  (mTLS when CA configured)"
  echo "  Alternate NodePort:   https://<jetson-ip>:30765"
else
  echo "  KnowBuddy Remote URL: http://<jetson-ip>:8765"
  echo "  Alternate NodePort:   http://<jetson-ip>:30765"
fi
echo "  Web UI (unchanged):   http://<jetson-ip>:30487"
echo "  Do NOT set KnowBuddy Remote URL to :30487 — /api/v1/* lives only on the engine."
