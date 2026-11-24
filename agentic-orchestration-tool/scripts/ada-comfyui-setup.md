# Ada: managed in-cluster ComfyUI (Ollama-style)

Primary path: always-on `agentic-comfyui` Deployment (ClusterIP `:8188`), AO-owned
image (pinned ComfyUI + ComfyUI-LTXVideo + RES4LYF for `ClownSampler_Beta`), models on
hostPath. Opt-in only — never default-on.

Providers:

| Provider | Role | Catalog tiers |
|---|---|---|
| `video_ltx23_distilled` | Fast distilled LTX | `quality_tier: fast`, `speed_tier: fast` |
| `video_wan22_i2v` | Higher-motion Wan 2.2 (native nodes) | `quality_tier: high`, `speed_tier: slow` |

## Enable (Ada)

```bash
# In agentic-orchestration-tool/.env (then deploy):
AGENTIC_JETSON_ENABLE_COMFYUI=1
# Optional overrides:
# AGENTIC_COMFYUI_IMAGE=ghcr.io/zlatko-lakisic/agentic-comfyui:v2.28.0
# AGENTIC_COMFYUI_MODELS_HOSTPATH=/var/projects/agentic-orchestration/var/comfyui/models

bash agentic-orchestration-tool/scripts/jetson-deploy.sh
# or: bash agentic-orchestration-tool/scripts/jetson-enable-comfyui.sh
```

The enable script:

- Refuses on `aarch64` / Jetson
- Applies ClusterIP Service only (no hostPort / Ingress)
- Sets `AGENTIC_VIDEO_COMFYUI_URL=http://agentic-comfyui:8188`
- Mounts output hostPath into `agentic-engine` for post-job delete

## Weights

```bash
# Check NVMe free space first; verifies SHA-256 from config/comfyui_weights_manifest.json
bash agentic-orchestration-tool/scripts/download-comfyui-weights.sh --profile ti2v5b
# LTX on Ada: distilled FP8 + Gemma FP4 (BF16+full Gemma OOMs ~32GB host RAM)
bash agentic-orchestration-tool/scripts/download-comfyui-weights.sh --profile ltx23
# Optional dual-expert A14B FP8 (for Ada bench):
bash agentic-orchestration-tool/scripts/download-comfyui-weights.sh --profile a14b
```

ComfyUI keeps FP8 LTX + Gemma FP4 on GPU (`device: default`, no `--lowvram`) and
is hard-capped at **24Gi** RAM (16Gi was too tight for Wan/LTX memcg — hybrid 6119).
Image base is **PyTorch 2.9.1 + CUDA 13.0** (`cu130`) so Ada sm_89 does not hit the
“performance terrible below 13.0” warning.

## Engine readiness under GPU load (#148)

Kube readiness/liveness use shallow `GET /ready` (HTTPS). Full `GET /health` still
probes Comfy/Ollama/hardware for Admin/Quill — do **not** leave temporary TCP
`:8765` probes in production YAML (that was only an Ada ops gate during hybrid 6119).

Hybrid 6119 ops notes (reverted on the host): temp TCP probes, temp Comfy 24Gi (now
permanent in deploy YAML), Comfy `/free` before retries, temp Quill
`AOQ_SHORTS_VIDEO_MAX_FRAMES` — see GitHub #148 machine changelog.

## Health (Quill)

`GET /health` → `videoGeneration`:

| Field | Meaning |
|-------|---------|
| `configured` | `AGENTIC_VIDEO_COMFYUI_URL` set |
| `ready` | Reachable **and** required nodes (`/object_info`) **and** required weights |
| `missing` | Explicit gaps (`node:…`, `weight:…`) |

Quill should gate on `ready`, not only `configured`.

## Wan default + Ada bench

Default catalog graph: **TI2V-5B** native API JSON
(`config/video_workflows/wan22_i2v_vertical.json`).

After first Ada smoke, run `scripts/bench-wan22-ada.sh` notes and compare
**A14B FP8** vs **TI2V-5B** (time per ~5 s clip, peak VRAM, peak RAM). Switch
`video_wan22_i2v.yaml` to `wan22_i2v_a14b_fp8.json` (+ seed binding) only if A14B wins.

**Quill per-clip timeout: 30 minutes.** Catalog Wan `timeout_s: 2400`. Record
A14B wall time against that budget.

## Smoke (Quill path)

Through `direct_agent` (not raw ComfyUI):

1. Upload start image → `file_id`
2. `direct_agent` `video_wan22_i2v` / `video_ltx23_distilled` with JSON prompt + `start_image_file_id`
3. Download clip via `/api/v1/files/{file_id}`
4. Confirm `/health.videoGeneration.ready` and idle CUDA row in `/api/v1/gpu-residents`

## GPU sharing

- `residency: on_demand` + `/free` after every job (`--disable-smart-memory` in the pod)
- Idle ComfyUI CUDA sample appears in gpu-residents even with no video lease
- ComfyUI output files are deleted from the shared hostPath after AO registers the clip

## Legacy (host systemd)

`deploy/systemd/agentic-comfyui.service` + host `~/ComfyUI` remain for debugging only.
Prefer managed k8s on Ada.
