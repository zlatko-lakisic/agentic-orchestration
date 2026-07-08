#!/usr/bin/env bash
# Smoke: POST /v1/chat/completions with HA East Lawn MINUTES contract.
set -euo pipefail
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
URL="${1:-http://127.0.0.1:30487/v1/chat/completions}"
KEY="$(kubectl get secret agentic-orchestrator-env -n "${NS}" -o jsonpath='{.data.AGENTIC_CHAT_COMPLETIONS_API_KEY}' 2>/dev/null | base64 -d || true)"
BODY="$(python3 - <<'PY'
import json
print(json.dumps({
  "model": "ollama_llama3_2_3b",
  "temperature": 0,
  "max_tokens": 500,
  "stream": False,
  "messages": [
    {
      "role": "system",
      "content": (
        "You are the irrigation decision-maker for a residential garden zone. "
        "Your goal: keep the zone's plants healthy while never applying more water than they need.\n\n"
        "Missing or unknown facts are provided with defaults like 0 or unknown. "
        "Use plant knowledge you already have for water requirements; "
        "Home Assistant only supplies sensor and zone facts.\n\n"
        "Reason step by step:\n"
        "1. Estimate weekly need and deficit.\n"
        "2. Total recent rainfall.\n"
        "3. Soil probe overrides if present.\n"
        "4. Check forecast.\n"
        "5. Convert to minutes.\n\n"
        "Zero is normal.\n\n"
        "Output format: your reasoning in at most 120 words, then a final line exactly:\n"
        "MINUTES: <integer 0-25>"
      ),
    },
    {
      "role": "user",
      "content": (
        "Zone: East Lawn\n"
        'Zone profile: {"label":"East Lawn","plant_profile":"Tall fescue lawn grass",'
        '"area_sqm":60,"irrigation_hardware":"two gear-drive sprinklers","estimated_flow_gpm":"4"}\n'
        "Days since last irrigation: 2\n"
        "Last run duration minutes: 10\n"
        "Garden temp now: 72\n"
        "Garden 24h peak: 75\n"
        'Soil moisture context: {"has_soil_probe": false}\n'
        "Open-Meteo past 72h precip: mostly 0 mm\n"
        "Weather/forecast: dry, no rain expected"
      ),
    },
  ],
}))
PY
)"
AUTH_ARGS=()
if [[ -n "${KEY}" ]]; then
  AUTH_ARGS=(-H "Authorization: Bearer ${KEY}")
fi
RESP="$(curl -sS -m 300 -H "Content-Type: application/json" "${AUTH_ARGS[@]}" -d "${BODY}" "${URL}")"
python3 - <<PY
import json, re, sys
raw = """${RESP}"""
# Fallback if embedding breaks: read from env not used; parse stdin instead
PY
printf '%s' "${RESP}" | python3 -c '
import sys, json, re
raw = sys.stdin.read()
try:
    d = json.loads(raw)
except Exception as e:
    print("RAW:", raw[:2000])
    raise SystemExit(f"json decode failed: {e}")
c = ((d.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
print("CONTENT:")
print(c)
print("---")
tool = bool(re.search(r"plant_knowledge|\"name\"\s*:|^\s*parameters\s*:", c, re.I | re.M))
mins = bool(re.search(r"(?im)^MINUTES:\s*\d+\s*$", c))
print("HAS_TOOL_JSON", tool)
print("HAS_MINUTES", mins)
sys.exit(0 if (mins and not tool) else 1)
'
