#!/usr/bin/env bash
# Publish in-cluster Ollama (AGENTIC_OLLAMA_MODE=managed_k8s).
# Additive: does not stop host systemd ollama. Point pods at the Service by
# setting OLLAMA_API_BASE=http://agentic-ollama:11434 in the k8s secret / .env.
#
#   bash agentic-orchestration-tool/scripts/jetson-enable-ollama.sh
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

OLLAMA_DIR="${TOOL_ROOT}/deploy/k8s/ollama"
DEPLOY_YAML="${OLLAMA_DIR}/deployment.yaml"
SVC_YAML="${OLLAMA_DIR}/service.yaml"
NP_YAML="${OLLAMA_DIR}/service-nodeport.yaml"
MODELS_DIR="${PROJECT_ROOT}/var/ollama-models"

if [[ ! -f "${DEPLOY_YAML}" ]]; then
  echo "error: missing ${DEPLOY_YAML}" >&2
  exit 1
fi

mkdir -p "${MODELS_DIR}"
chmod 775 "${MODELS_DIR}" 2>/dev/null || true

# On Jetson / aarch64 the official ollama/ollama image may be unavailable —
# prefer dustynv when AGENTIC_JETSON_OLLAMA_IMAGE is set or platform is jetson.
ARCH="$(uname -m)"
IMAGE="${AGENTIC_OLLAMA_IMAGE:-}"
if [[ -z "${IMAGE}" ]]; then
  if [[ "${ARCH}" == "aarch64" || "${ARCH}" == "arm64" ]]; then
    IMAGE="${AGENTIC_JETSON_OLLAMA_IMAGE:-dustynv/ollama:r36.2.0}"
  else
    IMAGE="ollama/ollama:latest"
  fi
fi

TMP_DEPLOY="$(mktemp)"
trap 'rm -f "${TMP_DEPLOY}"' EXIT
python3 - "${DEPLOY_YAML}" "${TMP_DEPLOY}" "${IMAGE}" <<'PY'
import sys
src, dst, image = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(src, encoding="utf-8").read()
old = "image: ollama/ollama:latest"
new = f"image: {image}"
if old not in text:
    raise SystemExit(f"expected {old!r} in {src}")
open(dst, "w", encoding="utf-8").write(text.replace(old, new, 1))
PY

echo "=== apply agentic-ollama (${IMAGE}) ==="
kubectl apply -f "${TMP_DEPLOY}"
kubectl apply -f "${SVC_YAML}"
if [[ "${AGENTIC_OLLAMA_NODEPORT:-1}" != "0" ]]; then
  kubectl apply -f "${NP_YAML}"
fi

echo "=== wait for agentic-ollama rollout ==="
kubectl rollout status deployment/agentic-ollama -n "${NS}" --timeout=300s

# Hint operators to point AO at the Service when using managed_k8s.
ENV_FILE="${TOOL_ROOT}/.env"
if [[ -f "${ENV_FILE}" ]]; then
  if ! grep -qE '^[[:space:]]*OLLAMA_API_BASE=' "${ENV_FILE}" 2>/dev/null; then
    echo "OLLAMA_API_BASE=http://agentic-ollama:11434" >>"${ENV_FILE}"
    echo "Appended OLLAMA_API_BASE=http://agentic-ollama:11434 to ${ENV_FILE}"
  fi
  if ! grep -qE '^[[:space:]]*AGENTIC_OLLAMA_MODE=' "${ENV_FILE}" 2>/dev/null; then
    echo "AGENTIC_OLLAMA_MODE=managed_k8s" >>"${ENV_FILE}"
    echo "Appended AGENTIC_OLLAMA_MODE=managed_k8s to ${ENV_FILE}"
  fi
  bash "${TOOL_ROOT}/scripts/jetson-sync-k8s-secret.sh" || true
fi

echo "Ollama Service: http://agentic-ollama:11434 (in-cluster)"
if [[ "${AGENTIC_OLLAMA_NODEPORT:-1}" != "0" ]]; then
  echo "Ollama NodePort: http://<host>:31134"
fi
kubectl exec -n "${NS}" deploy/agentic-ollama -- ollama list 2>/dev/null \
  || curl -sf "http://127.0.0.1:31134/api/tags" | head -c 200 || true
echo
