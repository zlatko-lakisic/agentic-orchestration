#!/usr/bin/env bash
# Build worker image and run a no-LLM smoke check (invalid spec -> exit 2).
set -euo pipefail

TOOL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$TOOL_ROOT"

IMAGE="${AGENTIC_WORKER_IMAGE:-agentic-orchestrator-worker:ci}"

echo "Building ${IMAGE} ..."
docker build -f docker/Dockerfile.worker -t "${IMAGE}" .

SMOKE_DIR="$(mktemp -d)"
trap 'rm -rf "${SMOKE_DIR}"' EXIT

printf '%s\n' \
  '{"schema_version":"0.1","run_id":"smoke","step_id":"s1","task":{},"agent_provider":{},"paths":{}}' \
  > "${SMOKE_DIR}/bad-spec.json"

echo "Running worker with invalid spec (expect exit 2) ..."
set +e
docker run --rm -v "${SMOKE_DIR}:/run/store:ro" "${IMAGE}" /run/store/bad-spec.json
code=$?
set -e

if [ "${code}" -ne 2 ]; then
  echo "Expected exit code 2, got ${code}" >&2
  exit 1
fi

echo "Worker smoke OK (exit ${code})."
