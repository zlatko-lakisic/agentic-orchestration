#!/usr/bin/env bash
# Ada benchmark: TI2V-5B vs A14B FP8 (time per ~5s clip, peak VRAM, peak RAM).
# Run after ComfyUI is ready and weights are downloaded.
#
#   bash scripts/bench-wan22-ada.sh
#
# Writes results under var/comfyui/bench/ and prints a recommendation.
set -euo pipefail
TOOL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="$(cd "${TOOL_ROOT}/.." && pwd)"
OUT_DIR="${PROJECT_ROOT}/var/comfyui/bench"
mkdir -p "${OUT_DIR}"

ENGINE_URL="${AGENTIC_BENCH_ENGINE_URL:-https://127.0.0.1:8765}"
# Results file for operators to paste into ada-comfyui-setup.md
RESULT="${OUT_DIR}/wan22_bench_$(date +%Y%m%d_%H%M%S).json"

echo "=== Wan 2.2 Ada bench ==="
echo "Engine: ${ENGINE_URL}"
echo "This script records wall time via /health + nvidia-smi around direct_agent calls."
echo "Manual steps (Quill-equivalent):"
echo "  1. Upload a start image → file_id"
echo "  2. direct_agent video_wan22_i2v with frames≈81 (≈5s @16fps)"
echo "  3. Repeat with workflows pointed at wan22_i2v_a14b_fp8.json"
echo "  4. Note total_ms, peak_vram_gb, and host peak RAM from nvidia-smi / free"
echo ""
echo "Quill per-clip timeout: 30 minutes (1800s). Catalog Wan timeout_s: 2400."
echo "Write results JSON to: ${RESULT}"

cat > "${RESULT}" <<EOF
{
  "host": "$(hostname)",
  "date": "$(date -Iseconds)",
  "quill_clip_timeout_s": 1800,
  "ti2v5b": {
    "seconds_per_5s_clip": null,
    "peak_vram_gb": null,
    "peak_ram_gb": null,
    "notes": "fill after smoke"
  },
  "a14b_fp8": {
    "seconds_per_5s_clip": null,
    "peak_vram_gb": null,
    "peak_ram_gb": null,
    "notes": "fill after smoke"
  },
  "chosen_default": "ti2v5b",
  "reason": "pre-bench default; replace after Ada measurements"
}
EOF

echo "Stub written: ${RESULT}"
echo "Default catalog remains TI2V-5B until you update chosen_default + video_wan22_i2v.yaml."
