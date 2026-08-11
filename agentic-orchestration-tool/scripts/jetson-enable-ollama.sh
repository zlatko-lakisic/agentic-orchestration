#!/usr/bin/env bash
# Publish in-cluster Ollama (AGENTIC_OLLAMA_MODE=managed_k8s).
# Additive: does not stop host systemd ollama. Point pods at the Service by
# setting OLLAMA_API_BASE=http://agentic-ollama:11434 in the k8s secret / .env.
#
# Jetson NFS models (no local disk): set AGENTIC_OLLAMA_MODELS_HOSTPATH to the
# real models directory (e.g. /nfs/omega-jetson/ollama/models), or leave unset
# and this script auto-detects a models symlink under var/ollama-models or
# /usr/share/ollama/.ollama/models.
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
MODELS_HOME="${PROJECT_ROOT}/var/ollama-models"

if [[ ! -f "${DEPLOY_YAML}" ]]; then
  echo "error: missing ${DEPLOY_YAML}" >&2
  exit 1
fi

mkdir -p "${MODELS_HOME}"
chmod 775 "${MODELS_HOME}" 2>/dev/null || true

# Resolve NFS / external models dir (Jetson). Prefer explicit env.
MODELS_DATA="${AGENTIC_OLLAMA_MODELS_HOSTPATH:-}"
if [[ -z "${MODELS_DATA}" ]]; then
  for candidate in \
    "${MODELS_HOME}/models" \
    "/usr/share/ollama/.ollama/models" \
    "/nfs/omega-jetson/ollama/models"
  do
    if [[ -L "${candidate}" ]]; then
      MODELS_DATA="$(readlink -f "${candidate}" 2>/dev/null || readlink "${candidate}")"
      break
    fi
  done
fi
# Only mount a second volume when models live outside MODELS_HOME (symlink/NFS).
if [[ -n "${MODELS_DATA}" ]]; then
  case "${MODELS_DATA}" in
    "${MODELS_HOME}"/*) MODELS_DATA="" ;;
  esac
fi
if [[ -n "${MODELS_DATA}" && ! -d "${MODELS_DATA}" ]]; then
  echo "warning: AGENTIC_OLLAMA_MODELS_HOSTPATH=${MODELS_DATA} missing; continuing without extra mount" >&2
  MODELS_DATA=""
fi

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

# Optional RuntimeClass (only when containerd actually supports the handler).
RUNTIME_CLASS="${AGENTIC_OLLAMA_RUNTIME_CLASS:-}"
if [[ -z "${RUNTIME_CLASS}" && "${ARCH}" != "aarch64" && "${ARCH}" != "arm64" ]]; then
  # Ada / x86: try nvidia when the RuntimeClass exists; Jetson k3s often lists
  # the class but rejects the handler ("RuntimeHandler nvidia not supported").
  if kubectl get runtimeclass nvidia >/dev/null 2>&1; then
    RUNTIME_CLASS="nvidia"
  fi
fi

TMP_DEPLOY="$(mktemp)"
trap 'rm -f "${TMP_DEPLOY}"' EXIT
python3 - "${DEPLOY_YAML}" "${TMP_DEPLOY}" "${IMAGE}" "${MODELS_HOME}" "${MODELS_DATA}" "${RUNTIME_CLASS}" <<'PY'
import sys
src, dst, image, home, models_data, runtime_class = sys.argv[1:7]
text = open(src, encoding="utf-8").read()
old = "image: ollama/ollama:latest"
new = f"image: {image}"
if old not in text:
    raise SystemExit(f"expected {old!r} in {src}")
text = text.replace(old, new, 1)
# Ensure home hostPath matches this project root.
text = text.replace(
    "path: /var/projects/agentic-orchestration/var/ollama-models",
    f"path: {home}",
    1,
)
if runtime_class:
    text = text.replace(
        "    spec:\n      containers:",
        f"    spec:\n      runtimeClassName: {runtime_class}\n      containers:",
        1,
    )
if models_data:
    # Mount real NFS/host models over /root/.ollama/models (replaces any symlink).
    mount = (
        "          volumeMounts:\n"
        "            - name: ollama-home\n"
        "              mountPath: /root/.ollama\n"
        "            - name: ollama-models-data\n"
        "              mountPath: /root/.ollama/models\n"
    )
    text = text.replace(
        "          volumeMounts:\n"
        "            - name: ollama-home\n"
        "              mountPath: /root/.ollama\n",
        mount,
        1,
    )
    vol = (
        "      volumes:\n"
        "        - name: ollama-home\n"
        "          hostPath:\n"
        f"            path: {home}\n"
        "            type: DirectoryOrCreate\n"
        "        - name: ollama-models-data\n"
        "          hostPath:\n"
        f"            path: {models_data}\n"
        "            type: Directory\n"
    )
    # Replace trailing volumes section.
    marker = "      volumes:\n"
    idx = text.rfind(marker)
    if idx < 0:
        raise SystemExit("volumes section not found")
    text = text[:idx] + vol
open(dst, "w", encoding="utf-8").write(text)
print(f"image={image} home={home} models_data={models_data or '-'} runtimeClass={runtime_class or '-'}")
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
