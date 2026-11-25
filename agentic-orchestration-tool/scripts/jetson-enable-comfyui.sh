#!/usr/bin/env bash
# Publish in-cluster ComfyUI (Ada / x86 only). Opt-in via AGENTIC_JETSON_ENABLE_COMFYUI=1.
#
# Refuses on aarch64/arm64 (Jetson) — ComfyUI image + Wan/LTX weights are Ada-only.
# Never default-on; jetson-deploy.sh calls this only when ENABLE_COMFYUI=1.
#
#   bash agentic-orchestration-tool/scripts/jetson-enable-comfyui.sh
#
# Env:
#   AGENTIC_COMFYUI_IMAGE           — full image ref (default ghcr.io/.../agentic-comfyui:v<VERSION>,
#                                     i.e. the release this checkout is on; was :latest)
#   AGENTIC_IMAGE_TAG               — tag only (e.g. latest to restore the old default)
#   AGENTIC_COMFYUI_MODELS_HOSTPATH — models hostPath (default PROJECT/var/comfyui/models)
#   AGENTIC_COMFYUI_DRY_RUN=1       — print manifest, apply nothing
set -euo pipefail
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

COMFY_DIR="${TOOL_ROOT}/deploy/k8s/comfyui"
DEPLOY_YAML="${COMFY_DIR}/deployment.yaml"
SVC_YAML="${COMFY_DIR}/service.yaml"
OUTPUT_PATCH="${TOOL_ROOT}/deploy/k8s/engine/comfyui-output-hostpath-patch.yaml"
MODELS_HOME="${PROJECT_ROOT}/var/comfyui/models"
OUTPUT_HOME="${PROJECT_ROOT}/var/comfyui/output"
INPUT_HOME="${PROJECT_ROOT}/var/comfyui/input"

if [[ ! -f "${DEPLOY_YAML}" ]]; then
  echo "error: missing ${DEPLOY_YAML}" >&2
  exit 1
fi

ARCH="$(uname -m)"
if [[ "${ARCH}" == "aarch64" || "${ARCH}" == "arm64" ]]; then
  echo "error: agentic-comfyui is Ada/x86 only (refusing on ${ARCH})." >&2
  echo "  Set AGENTIC_JETSON_ENABLE_COMFYUI=0 on Jetson." >&2
  exit 1
fi

MODELS_DATA="${AGENTIC_COMFYUI_MODELS_HOSTPATH:-${MODELS_HOME}}"
mkdir -p "${MODELS_DATA}" "${OUTPUT_HOME}" "${INPUT_HOME}" \
  "${MODELS_DATA}/checkpoints" \
  "${MODELS_DATA}/diffusion_models" \
  "${MODELS_DATA}/loras" \
  "${MODELS_DATA}/text_encoders" \
  "${MODELS_DATA}/vae" \
  "${MODELS_DATA}/clip_vision" 2>/dev/null || true
chmod -R a+rwX "${PROJECT_ROOT}/var/comfyui" 2>/dev/null || true

IMAGE="${AGENTIC_COMFYUI_IMAGE:-}"
if [[ -z "${IMAGE}" ]]; then
  OWNER_LC="$(echo "${AGENTIC_GHCR_OWNER:-zlatko-lakisic}" | tr '[:upper:]' '[:lower:]')"
  REG="${AGENTIC_GHCR_REGISTRY:-ghcr.io}"
  # Default to the release this checkout is on (VERSION → vX.Y.Z, published by
  # .github/workflows/publish-images.yml) instead of the mutable :latest tag, which
  # on a privileged GPU pod means "whatever was pushed last". Override with
  # AGENTIC_IMAGE_TAG or a full AGENTIC_COMFYUI_IMAGE (a digest pins it exactly).
  TAG="${AGENTIC_IMAGE_TAG:-}"
  if [[ -z "${TAG}" && -f "${PROJECT_ROOT}/VERSION" ]]; then
    VERSION_TEXT="$(tr -d '[:space:]' < "${PROJECT_ROOT}/VERSION")"
    if [[ "${VERSION_TEXT}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ && "${VERSION_TEXT}" != "0.0.0" ]]; then
      TAG="v${VERSION_TEXT}"
    fi
  fi
  TAG="${TAG:-latest}"
  IMAGE="${REG}/${OWNER_LC}/agentic-comfyui:${TAG}"
fi

TMP_DEPLOY="$(mktemp)"
trap 'rm -f "${TMP_DEPLOY}"' EXIT

python3 - "${TMP_DEPLOY}" "${DEPLOY_YAML}" "${NS}" "${IMAGE}" "${MODELS_DATA}" "${OUTPUT_HOME}" "${INPUT_HOME}" <<'PY'
import pathlib
import sys

import yaml

out, src, ns, image, models, output, input_dir = sys.argv[1:8]
doc = yaml.safe_load(pathlib.Path(src).read_text(encoding="utf-8"))
doc["metadata"]["namespace"] = ns
spec = doc["spec"]["template"]["spec"]
for c in spec["containers"]:
    if c.get("name") == "comfyui":
        c["image"] = image
vols = {v["name"]: v for v in spec.get("volumes") or []}
if "comfyui-models" in vols:
    vols["comfyui-models"]["hostPath"]["path"] = models
if "comfyui-output" in vols:
    vols["comfyui-output"]["hostPath"]["path"] = output
if "comfyui-input" in vols:
    vols["comfyui-input"]["hostPath"]["path"] = input_dir
spec["volumes"] = list(vols.values())
pathlib.Path(out).write_text(yaml.safe_dump(doc, sort_keys=False), encoding="utf-8")
PY

if [[ "${AGENTIC_COMFYUI_DRY_RUN:-0}" == "1" ]]; then
  echo "=== dry-run deployment ==="
  cat "${TMP_DEPLOY}"
  exit 0
fi

echo "=== apply agentic-comfyui (${IMAGE}) ==="
kubectl apply -n "${NS}" -f "${TMP_DEPLOY}"
kubectl apply -n "${NS}" -f "${SVC_YAML}"
if [[ -f "${OUTPUT_PATCH}" ]]; then
  kubectl patch deployment agentic-engine -n "${NS}" --type strategic \
    -f "${OUTPUT_PATCH}" 2>/dev/null \
    || echo "warn: could not patch agentic-engine for comfyui-output mount" >&2
fi

kubectl rollout status deployment/agentic-comfyui -n "${NS}" --timeout=300s || true

ENV_FILE="${TOOL_ROOT}/.env"
touch "${ENV_FILE}"
_upsert_env() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    # portable in-place replace
    python3 - "${ENV_FILE}" "${key}" "${val}" <<'PY'
import pathlib, sys
path, key, val = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
lines = path.read_text(encoding="utf-8").splitlines()
out = []
found = False
for line in lines:
    if line.startswith(f"{key}="):
        out.append(f"{key}={val}")
        found = True
    else:
        out.append(line)
if not found:
    out.append(f"{key}={val}")
path.write_text("\n".join(out) + "\n", encoding="utf-8")
PY
  else
    printf '%s=%s\n' "${key}" "${val}" >> "${ENV_FILE}"
  fi
}

_upsert_env "AGENTIC_VIDEO_COMFYUI_URL" "http://agentic-comfyui:8188"
_upsert_env "AGENTIC_COMFYUI_MODE" "managed_k8s"
_upsert_env "AGENTIC_COMFYUI_MODELS_HOSTPATH" "${MODELS_DATA}"
_upsert_env "AGENTIC_COMFYUI_OUTPUT_HOSTPATH" "/host/comfyui-output"
_upsert_env "AGENTIC_JETSON_ENABLE_COMFYUI" "1"

if [[ -x "${TOOL_ROOT}/scripts/jetson-sync-k8s-secret.sh" ]]; then
  bash "${TOOL_ROOT}/scripts/jetson-sync-k8s-secret.sh"
fi

if kubectl get deployment agentic-engine -n "${NS}" >/dev/null 2>&1; then
  kubectl rollout restart deployment/agentic-engine -n "${NS}" || true
fi

echo "ComfyUI enabled: AGENTIC_VIDEO_COMFYUI_URL=http://agentic-comfyui:8188"
echo "Models: ${MODELS_DATA}"
echo "Download weights: bash ${TOOL_ROOT}/scripts/download-comfyui-weights.sh"
