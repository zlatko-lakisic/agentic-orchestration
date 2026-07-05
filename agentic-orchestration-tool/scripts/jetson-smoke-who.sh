#!/usr/bin/env bash
set -eu
python3 <<'PY'
import json
import urllib.request

body = json.dumps(
    {"model": "dynamic", "messages": [{"role": "user", "content": "who are you?"}]}
).encode()
req = urllib.request.Request(
    "http://127.0.0.1/v1/chat/completions",
    data=body,
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(req, timeout=120) as resp:
    print(resp.read().decode())
PY
