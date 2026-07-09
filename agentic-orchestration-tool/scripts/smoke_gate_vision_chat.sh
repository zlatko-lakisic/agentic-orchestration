#!/usr/bin/env bash
# Smoke: POST /v1/chat/completions with HA gate PEOPLE/NOPEOPLE vision contract.
# Usage: bash scripts/smoke_gate_vision_chat.sh [url] [jpeg_path] [api_key]
set -euo pipefail
URL="${1:-http://127.0.0.1:30487/v1/chat/completions}"
IMG="${2:-}"
KEY="${3:-${AGENTIC_CHAT_COMPLETIONS_API_KEY:-fl!ntst0n3}}"

if [[ -z "${IMG}" || ! -f "${IMG}" ]]; then
  echo "usage: $0 [url] <jpeg_path> [api_key]" >&2
  exit 2
fi

IMG_B64=$(base64 < "${IMG}" | tr -d '\n')
PROMPT='Do NOT call tools. Do NOT output JSON. Reply with exactly 3 lines:
NOPEOPLE or PEOPLE
short description
shorter alert'

BODY=$(python3 - <<PY
import json, os
print(json.dumps({
  "model": os.environ.get("SMOKE_MODEL", "gpt-4o-mini"),
  "temperature": 0.1,
  "max_tokens": 200,
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": """${PROMPT}"""},
      {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,${IMG_B64}"}},
    ],
  }],
}))
PY
)

RESP=$(curl -sS -m 180 \
  -H "Authorization: Bearer ${KEY}" \
  -H "Content-Type: application/json" \
  "${URL}" \
  -d "${BODY}")

CONTENT=$(python3 - <<'PY'
import json, sys, re
raw = sys.stdin.read()
try:
  data = json.loads(raw)
except Exception as e:
  print("FAIL: non-JSON response", e)
  print(raw[:800])
  sys.exit(1)
content = (((data.get("choices") or [{}])[0].get("message") or {}).get("content")) or ""
print(content)
if re.search(r'"name"\s*:\s*"(describe_image|python_m_mcp|media_understand)', content):
  print("FAIL: tool-call JSON in content", file=sys.stderr)
  sys.exit(1)
lines = [ln.strip() for ln in content.splitlines() if ln.strip()]
if not lines or lines[0].upper() not in {"PEOPLE", "NOPEOPLE"}:
  print("FAIL: expected PEOPLE/NOPEOPLE first line", file=sys.stderr)
  sys.exit(1)
print("PASS", file=sys.stderr)
PY
<<<"${RESP}")

echo "${CONTENT}"
