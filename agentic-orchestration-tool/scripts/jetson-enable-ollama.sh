#!/usr/bin/env bash
# Publish in-cluster Ollama (AGENTIC_OLLAMA_MODE=managed_k8s).
#
# Ada / x86: runs ollama/ollama:latest with models on hostPath var/ollama-models.
# Jetson / aarch64: does NOT pull dustynv (≈6.7GiB) — rootfs is too small. Instead
# a privileged pod nsenter's the host and runs /usr/local/bin/ollama serve against
# local NVMe models (AGENTIC_OLLAMA_MODELS_HOSTPATH, default /mnt/nvme/ollama/models).
#
# Public API is the resource-broker sidecar on :11434 (the daemon stays on
# loopback :11435). The sidecar reuses the image this cluster's coordinator runs
# and the git checkout's orchestration/ tree.
#
#   bash agentic-orchestration-tool/scripts/jetson-enable-ollama.sh
#
# Env: AGENTIC_OLLAMA_RESOURCE_SHARING=0 → no broker, plain Ollama on :11434.
#      AGENTIC_OLLAMA_BROKER_IMAGE=…     → override the sidecar image.
#      AGENTIC_OLLAMA_DRY_RUN=1          → print the manifest, apply nothing.
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
NVME_MODELS="${AGENTIC_JETSON_NVME_OLLAMA_MODELS:-/mnt/nvme/ollama/models}"

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
    "${NVME_MODELS}" \
    "${MODELS_HOME}/models" \
    "/usr/share/ollama/.ollama/models" \
    "/nfs/omega-jetson/ollama/models"
  do
    if [[ -L "${candidate}" ]]; then
      MODELS_DATA="$(readlink -f "${candidate}" 2>/dev/null || readlink "${candidate}")"
      break
    elif [[ -d "${candidate}" ]]; then
      # Prefer NVMe / project-local stores; NFS is legacy fallback only.
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

# Broker image: the sidecar runs orchestration code, so reuse the image this
# cluster's coordinator already runs (Jetson and Ada are on different tags).
# A dev-built agentic-orchestrator-coordinator:local exists on no edge node and
# leaves the pod in ImagePullBackOff, which takes :11434 down with it.
BROKER_IMAGE="${AGENTIC_OLLAMA_BROKER_IMAGE:-}"
if [[ -z "${BROKER_IMAGE}" ]]; then
  BROKER_IMAGE="$(kubectl get deploy agentic-coordinator -n "${NS}" \
    -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true)"
fi
BROKER_IMAGE="${BROKER_IMAGE:-agentic-orchestrator-coordinator:local}"

# Set to 0 to run plain Ollama on :11434 with no broker (rollback / debugging).
SHARING="${AGENTIC_OLLAMA_RESOURCE_SHARING:-1}"
case "${SHARING}" in
  0 | false | no | off) SHARING=0 ;;
  *) SHARING=1 ;;
esac

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
  MODELS_DATA="${MODELS_DATA:-${NVME_MODELS}}"
  OLLAMA_BIN="${AGENTIC_OLLAMA_HOST_BIN:-/usr/local/bin/ollama}"
  OLLAMA_HOME_HOST="${AGENTIC_OLLAMA_HOST_HOME:-/usr/share/ollama}"
  OLLAMA_CTX_LEN="${AGENTIC_OLLAMA_CONTEXT_LENGTH:-16384}"
  python3 - "${TMP_DEPLOY}" "${NS}" "${OLLAMA_BIN}" "${OLLAMA_HOME_HOST}" "${MODELS_DATA}" "${OLLAMA_CTX_LEN}" "${BROKER_IMAGE}" "${SHARING}" "${TOOL_ROOT}" <<'PY'
import sys
out, ns, obin, ohome, models, ctx_len, broker_image, sharing, tool_root = sys.argv[1:10]
sharing = sharing == "1"
# Host-binary: busybox + nsenter runs host ollama with models via host mount namespace.
# With sharing on, the broker sidecar owns :11434 and the daemon stays on loopback
# :11435; with sharing off the daemon takes :11434 so the Service still resolves.
daemon_host = "127.0.0.1:11435" if sharing else "0.0.0.0:11434"
daemon_port = 11435 if sharing else 11434
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
              export OLLAMA_HOST={daemon_host}
              export OLLAMA_KEEP_ALIVE=120
              # Cap default context so 128k models (e.g. granite-code) do not
              # allocate a ~40 GiB KV cache on Jetson unified memory.
              export OLLAMA_CONTEXT_LENGTH={ctx_len}
              export HOME={ohome}
              # Prefer local NVMe (or configured) models hostPath when present.
              if [ -d "{models}" ]; then
                mkdir -p "{ohome}/.ollama"
                ln -sfn "{models}" "{ohome}/.ollama/models"
              fi
              exec {obin} serve
          ports:
            - name: daemon
              containerPort: {daemon_port}
          readinessProbe:
            httpGet:
              path: /api/tags
              port: daemon
              host: 127.0.0.1
            initialDelaySeconds: 3
            periodSeconds: 5
            timeoutSeconds: 5
            failureThreshold: 12
          livenessProbe:
            httpGet:
              path: /api/tags
              port: daemon
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

broker = f"""        - name: resource-broker
          image: {broker_image}
          imagePullPolicy: IfNotPresent
          workingDir: /app/tool
          command: ["/bin/bash", "-c"]
          args:
            - |
              set -euo pipefail
              # orchestration/ is mounted from the git checkout because the
              # broker modules are newer than the pinned coordinator image, and
              # fastapi ships only in requirements-serve.txt.
              if ! python -c "import fastapi" >/dev/null 2>&1; then
                echo "Installing fastapi for the Ollama resource broker ..."
                pip install -q "fastapi>=0.115.0,<1"
              fi
              exec python -m orchestration.ollama_resource_broker
          ports:
            - name: http
              containerPort: 11434
          env:
            - name: AGENTIC_OLLAMA_RESOURCE_SHARING
              value: "1"
            - name: AGENTIC_OLLAMA_UPSTREAM
              value: "http://127.0.0.1:11435"
            - name: AGENTIC_OLLAMA_BROKER_HOST
              value: "0.0.0.0"
            - name: AGENTIC_OLLAMA_BROKER_PORT
              value: "11434"
            - name: AGENTIC_OLLAMA_IDLE_UNLOAD_SECONDS
              value: "120"
            - name: AGENTIC_ASSUME_VRAM_GB
              value: "48"
            - name: AGENTIC_RESIDENT_HEADROOM_GB
              value: "2"
          readinessProbe:
            httpGet:
              path: /health
              port: http
              host: 127.0.0.1
            initialDelaySeconds: 3
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 12
          livenessProbe:
            httpGet:
              path: /health
              port: http
              host: 127.0.0.1
            initialDelaySeconds: 15
            periodSeconds: 20
            timeoutSeconds: 3
            failureThreshold: 6
          volumeMounts:
            - name: orchestration-src
              mountPath: /app/tool/orchestration
              readOnly: true
          resources:
            requests:
              cpu: "50m"
              memory: 128Mi
            limits:
              memory: 512Mi
      volumes:
        - name: orchestration-src
          hostPath:
            path: {tool_root}/orchestration
            type: Directory
"""

if sharing:
    doc += broker
open(out, "w", encoding="utf-8").write(doc)
print(
    f"mode=host-binary bin={obin} home={ohome} models={models} "
    f"sharing={'on' if sharing else 'off'} broker={broker_image if sharing else '-'}"
)
PY
else
  IMAGE="${AGENTIC_OLLAMA_IMAGE:-ollama/ollama:latest}"
  python3 - "${DEPLOY_YAML}" "${TMP_DEPLOY}" "${IMAGE}" "${MODELS_HOME}" "${MODELS_DATA}" "${RUNTIME_CLASS}" "${BROKER_IMAGE}" "${SHARING}" "${TOOL_ROOT}" <<'PY'
import sys
src, dst, image, home, models_data, runtime_class, broker_image, sharing, tool_root = sys.argv[1:10]
sharing = sharing == "1"
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
if sharing:
    text3, n2 = re.subn(
        r"(?m)^(\s*image:\s*)agentic-orchestrator-coordinator:\S+",
        rf"\1{broker_image}",
        text,
        count=1,
    )
    if n2 != 1:
        raise SystemExit(f"expected one broker image line in {src}")
    text = text3
else:
    # Drop the sidecar and hand :11434 back to the daemon, so the Service keeps
    # resolving even when the broker cannot run.
    start = text.find("        # BEGIN resource-broker")
    end = text.find("        # END resource-broker\n")
    if start < 0 or end < 0:
        raise SystemExit(f"resource-broker sentinels not found in {src}")
    text = text[:start] + text[end + len("        # END resource-broker\n") :]
    text = text.replace('value: "0.0.0.0:11435"', 'value: "0.0.0.0:11434"', 1)
    text = text.replace("containerPort: 11435", "containerPort: 11434", 1)
text = text.replace(
    "path: /var/projects/agentic-orchestration/var/ollama-models",
    f"path: {home}",
    1,
)
text = text.replace(
    "path: /var/projects/agentic-orchestration/agentic-orchestration-tool/orchestration",
    f"path: {tool_root}/orchestration",
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
    # Insert after ollama-home rather than rewriting the volumes list, which
    # would drop the NVIDIA device and orchestration-src volumes that other
    # containers still mount.
    home_vol = (
        "        - name: ollama-home\n"
        "          hostPath:\n"
        f"            path: {home}\n"
        "            type: DirectoryOrCreate\n"
    )
    if home_vol not in text:
        raise SystemExit("ollama-home volume block not found")
    models_vol = (
        "        - name: ollama-models-data\n"
        "          hostPath:\n"
        f"            path: {models_data}\n"
        "            type: Directory\n"
    )
    text = text.replace(home_vol, home_vol + models_vol, 1)
open(dst, "w", encoding="utf-8").write(text)
print(
    f"mode=image image={image} sharing={'on' if sharing else 'off'} "
    f"broker={broker_image if sharing else '-'} home={home} "
    f"models_data={models_data or '-'} runtimeClass={runtime_class or '-'}"
)
PY
fi

if [[ "${AGENTIC_OLLAMA_DRY_RUN:-0}" == "1" ]]; then
  echo "=== rendered manifest (dry run; nothing applied) ==="
  cat "${TMP_DEPLOY}"
  exit 0
fi

echo "=== apply agentic-ollama ==="
kubectl apply -f "${TMP_DEPLOY}"
kubectl apply -f "${SVC_YAML}"
if [[ "${AGENTIC_OLLAMA_NODEPORT:-1}" != "0" ]]; then
  kubectl apply -f "${NP_YAML}"
fi

echo "=== wait for agentic-ollama rollout ==="
if ! kubectl rollout status deployment/agentic-ollama -n "${NS}" --timeout=300s; then
  echo "--- rollout failed: pod / container detail ---" >&2
  kubectl get pods -n "${NS}" -l app.kubernetes.io/name=agentic-ollama >&2 || true
  kubectl get pods -n "${NS}" -l app.kubernetes.io/name=agentic-ollama \
    -o 'jsonpath={range .items[*]}{range .status.containerStatuses[*]}{.name}{" ready="}{.ready}{" "}{.state}{"\n"}{end}{end}' >&2 || true
  echo >&2
  echo "hint: rerun with AGENTIC_OLLAMA_RESOURCE_SHARING=0 to serve plain Ollama on :11434" >&2
  exit 1
fi

ENV_FILE="${TOOL_ROOT}/.env"
if [[ -f "${ENV_FILE}" ]]; then
  if ! grep -qE '^[[:space:]]*OLLAMA_API_BASE=' "${ENV_FILE}" 2>/dev/null; then
    echo "OLLAMA_API_BASE=http://agentic-ollama:11434" >>"${ENV_FILE}"
  fi
  if ! grep -qE '^[[:space:]]*AGENTIC_OLLAMA_MODE=' "${ENV_FILE}" 2>/dev/null; then
    echo "AGENTIC_OLLAMA_MODE=managed_k8s" >>"${ENV_FILE}"
  fi
  if ! grep -qE '^[[:space:]]*AGENTIC_OLLAMA_RESOURCE_SHARING=' "${ENV_FILE}" 2>/dev/null; then
    echo "AGENTIC_OLLAMA_RESOURCE_SHARING=1" >>"${ENV_FILE}"
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
