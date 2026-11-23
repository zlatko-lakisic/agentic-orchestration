#!/usr/bin/env bash
# Download Wan weights with SHA-256 checks. Refuses if NVMe (or dest filesystem)
# lacks free space for the profile.
#
#   bash scripts/download-comfyui-weights.sh --profile ti2v5b
#   bash scripts/download-comfyui-weights.sh --profile a14b
#   bash scripts/download-comfyui-weights.sh --profile ti2v5b,a14b
set -euo pipefail
TOOL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="$(cd "${TOOL_ROOT}/.." && pwd)"
MANIFEST="${TOOL_ROOT}/config/comfyui_weights_manifest.json"
DEST_ROOT="${AGENTIC_COMFYUI_MODELS_HOSTPATH:-${PROJECT_ROOT}/var/comfyui/models}"
PROFILES="ti2v5b"
HEADROOM_BYTES=$((5 * 1024 * 1024 * 1024))

usage() {
  echo "Usage: $0 [--profile ti2v5b|a14b|ti2v5b,a14b] [--dest DIR]" >&2
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILES="${2:-}"; shift 2 ;;
    --dest) DEST_ROOT="${2:-}"; shift 2 ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
done

if [[ ! -f "${MANIFEST}" ]]; then
  echo "error: missing ${MANIFEST}" >&2
  exit 1
fi

mkdir -p "${DEST_ROOT}"

python3 - "${MANIFEST}" "${DEST_ROOT}" "${PROFILES}" "${HEADROOM_BYTES}" <<'PY'
import hashlib
import json
import os
import shutil
import sys
import urllib.request
from pathlib import Path

manifest_path, dest_root, profiles_csv, headroom = sys.argv[1:5]
headroom = int(headroom)
doc = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
profiles = doc.get("profiles") or {}
wanted = [p.strip() for p in profiles_csv.split(",") if p.strip()]
files = []
seen = set()
for name in wanted:
    if name not in profiles:
        print(f"error: unknown profile {name!r}; known={sorted(profiles)}", file=sys.stderr)
        sys.exit(1)
    for item in profiles[name]["files"]:
        key = item["dest"]
        if key in seen:
            continue
        seen.add(key)
        files.append(item)

need = sum(int(f["bytes"]) for f in files)
# Only count bytes for files not already present with good checksum.
def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

to_fetch = []
for item in files:
    dest = Path(dest_root) / item["dest"]
    if dest.is_file() and dest.stat().st_size == int(item["bytes"]):
        digest = sha256_file(dest)
        if digest.lower() == str(item["sha256"]).lower():
            print(f"ok (cached): {item['dest']}")
            continue
        print(f"warn: checksum mismatch for {dest}; re-downloading")
    to_fetch.append(item)

need_fetch = sum(int(f["bytes"]) for f in to_fetch)
usage = shutil.disk_usage(dest_root)
free = int(usage.free)
if free < need_fetch + headroom:
    print(
        f"error: not enough free space under {dest_root}: "
        f"need {need_fetch + headroom} bytes "
        f"({need_fetch} download + {headroom} headroom), free={free}",
        file=sys.stderr,
    )
    sys.exit(1)

for item in to_fetch:
    dest = Path(dest_root) / item["dest"]
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".partial")
    print(f"download: {item['url']} -> {dest}")
    urllib.request.urlretrieve(item["url"], tmp)
    digest = sha256_file(tmp)
    if digest.lower() != str(item["sha256"]).lower():
        tmp.unlink(missing_ok=True)
        print(
            f"error: checksum failed for {item['dest']}: got {digest} want {item['sha256']}",
            file=sys.stderr,
        )
        sys.exit(1)
    size = tmp.stat().st_size
    if size != int(item["bytes"]):
        tmp.unlink(missing_ok=True)
        print(
            f"error: size mismatch for {item['dest']}: got {size} want {item['bytes']}",
            file=sys.stderr,
        )
        sys.exit(1)
    os.replace(tmp, dest)
    print(f"ok: {item['dest']}")

print("done")
PY
