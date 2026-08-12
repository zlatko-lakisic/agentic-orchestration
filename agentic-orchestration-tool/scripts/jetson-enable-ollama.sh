#!/usr/bin/env bash
# Publish in-cluster Ollama (AGENTIC_OLLAMA_MODE=managed_k8s).
#
# Ada / x86: runs ollama/ollama:latest with models on hostPath var/ollama-models.
# Jetson / aarch64: does NOT pull dustynv (≈6.7GiB) — rootfs is too small. Instead
# a privileged pod nsenter's the host and runs /usr/local/bin/ollama serve against
# NFS models (AGENTIC_OLLAMA_MODELS_HOSTPATH, default /nfs/omega-jetson/ollama/models).
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

mkdir -p "${MODELS_HOME}" 2>/dev/null || true
chmod 775 "${MODELS_HOME}" 2>/dev/null || true

ARCH="$(uname -m)"
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
    elif [[ -d "${candidate}" && "${candidate}" == /nfs/* ]]; then
      MODELS_DATA="${candidate}"
      break
    fi
  done
fi
if [[ -n "${MODELS_DATA}" ]]; then
  case "${MODELS_DATA}" in
    "${MODELS_HOME}"/*) MODELS_DATA="" ;;
  esac
fi
if [[ -n "${MODELS_DATA}" && ! -d "${MODELS_DATA}" ]]; then
  echo "warning: models hostPath ${MODELS_DATA} missing; continuing without extra mount" >&2
  MODELS_DATA=""
fi

RUNTIME_CLASS="${AGENTIC_OLLAMA_RUNTIME_CLASS:-}"
# Default OFF: Ada's k3s advertises RuntimeClass nvidia but containerd often
# lacks the handler ("RuntimeHandler nvidia not supported"). Image mode uses
# privileged hostPath GPU mounts in deployment.yaml instead.
if [[ "${RUNTIME_CLASS}" == "0" || "${RUNTIME_CLASS}" == "none" || "${RUNTIME_CLASS}" == "false" ]]; then
  RUNTIME_CLASS=""
fi

TMP_DEPLOY="$(mktemp)"
trap 'rm -f "${TMP_DEPLOY}"' EXIT

# Jetson: host-binary mode (no multi-GB image pull).
if [[ "${ARCH}" == "aarch64" || "${ARCH}" == "arm64" ]] && [[ "${AGENTIC_OLLAMA_FORCE_IMAGE:-0}" != "1" ]]; then
  MODELS_DATA="${MODELS_DATA:-/nfs/omega-jetson/ollama/models}"
  OLLAMA_BIN="${AGENTIC_OLLAMA_HOST_BIN:-/usr/local/bin/ollama}"
  OLLAMA_HOME_HOST="${AGENTIC_OLLAMA_HOST_HOME:-/usr/share/ollama}"
  python3 - "${TMP_DEPLOY}" "${NS}" "${OLLAMA_BIN}" "${OLLAMA_HOME_HOST}" "${MODELS_DATA}" <<'PY'
import sys
out, ns, obin, ohome, models = sys.argv[1:6]
# Host-binary: busybox + nsenter runs host ollama with NFS models via host mount namespace.
doc = f"""apiVersion: apps/v1
kind: Deployment
metadata:
  name: agentic-ollama
  namespace: {ns}
  labels:
    app.kubernetes.io/name: agentic-ollama
    app.kubernetes.io/component: ollama
    agentic.io/ollama-mode: host-binary
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app.kubernetes.io/name: agentic-ollama
  template:
    metadata:
      labels:
        app.kubernetes.io/name: agentic-ollama
        app.kubernetes.io/component: ollama
        agentic.io/ollama-mode: host-binary
    spec:
      hostPID: true
      hostNetwork: true
      containers:
        - name: ollama
          image: busybox:1.36
          imagePullPolicy: IfNotPresent
          securityContext:
            privileged: true
          command:
            - nsenter
            - --target=1
            - --mount
            - --uts
            - --ipc
            - --net
            - --pid
            - --
            - sh
            - -c
            - |
              set -eu
              export OLLAMA_HOST=0.0.0.0:11434
              export OLLAMA_KEEP_ALIVE=-1
              export HOME={ohome}
              # Prefer NFS models when present (Jetson has no local model disk).
              if [ -d "{models}" ]; then
                mkdir -p "{ohome}/.ollama"
                ln -sfn "{models}" "{ohome}/.ollama/models"
              fi
              exec {obin} serve
          ports:
            - name: http
              containerPort: 11434
          readinessProbe:
            httpGet:
              path: /api/tags
              port: http
              host: 127.0.0.1
            initialDelaySeconds: 3
            periodSeconds: 5
            timeoutSeconds: 5
            failureThreshold: 12
          livenessProbe:
            httpGet:
              path: /api/tags
              port: http
              host: 127.0.0.1
            initialDelaySeconds: 15
            periodSeconds: 20
            timeoutSeconds: 5
            failureThreshold: 6
          resources:
            requests:
              cpu: "100m"
              memory: 256Mi
"""
open(out, "w", encoding="utf-8").write(doc)
print(f"mode=host-binary bin={obin} home={ohome} models={models}")
PY
else
  IMAGE="${AGENTIC_OLLAMA_IMAGE:-ollama/ollama:0.9.6}"
  python3 - "${DEPLOY_YAML}" "${TMP_DEPLOY}" "${IMAGE}" "${MODELS_HOME}" "${MODELS_DATA}" "${RUNTIME_CLASS}" <<'PY'
import sys
src, dst, image, home, models_data, runtime_class = sys.argv[1:7]
text = open(src, encoding="utf-8").read()
import re
text2, n = re.subn(
    r"(?m)^(\s*image:\s*)ollama/ollama:\S+",
    rf"\1{image}",
    text,
    count=1,
)
if n != 1:
    raise SystemExit(f"expected one ollama image: line in {src}")
text = text2
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
    marker = "      volumes:\n"
    idx = text.rfind(marker)
    if idx < 0:
        raise SystemExit("volumes section not found")
    text = text[:idx] + vol
open(dst, "w", encoding="utf-8").write(text)
print(f"mode=image image={image} home={home} models_data={models_data or '-'} runtimeClass={runtime_class or '-'}")
PY
fi

echo "=== apply agentic-ollama ==="
kubectl apply -f "${TMP_DEPLOY}"
kubectl apply -f "${SVC_YAML}"
if [[ "${AGENTIC_OLLAMA_NODEPORT:-1}" != "0" ]]; then
  kubectl apply -f "${NP_YAML}"
fi

echo "=== wait for agentic-ollama rollout ==="
kubectl rollout status deployment/agentic-ollama -n "${NS}" --timeout=300s

ENV_FILE="${TOOL_ROOT}/.env"
if [[ -f "${ENV_FILE}" ]]; then
  if ! grep -qE '^[[:space:]]*OLLAMA_API_BASE=' "${ENV_FILE}" 2>/dev/null; then
    echo "OLLAMA_API_BASE=http://agentic-ollama:11434" >>"${ENV_FILE}"
  fi
  if ! grep -qE '^[[:space:]]*AGENTIC_OLLAMA_MODE=' "${ENV_FILE}" 2>/dev/null; then
    echo "AGENTIC_OLLAMA_MODE=managed_k8s" >>"${ENV_FILE}"
  fi
  bash "${TOOL_ROOT}/scripts/jetson-sync-k8s-secret.sh" || true
fi

echo "Ollama Service: http://agentic-ollama:11434 (in-cluster)"
if [[ "${AGENTIC_OLLAMA_NODEPORT:-1}" != "0" ]]; then
  echo "Ollama NodePort: http://<host>:31134"
fi
# hostNetwork Jetson listens on host :11434; Ada uses ClusterIP/NodePort.
kubectl exec -n "${NS}" deploy/agentic-ollama -- ollama list 2>/dev/null \
  || curl -sf "http://127.0.0.1:31134/api/tags" | head -c 200 \
  || curl -sf "http://127.0.0.1:11434/api/tags" | head -c 200 \
  || true
echo
