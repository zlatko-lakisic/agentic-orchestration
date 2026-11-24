# agentic-comfyui image

AO-owned ComfyUI container for Ada (`AGENTIC_JETSON_ENABLE_COMFYUI=1`).

## Pins

| Arg | Default | Purpose |
|-----|---------|---------|
| `COMFYUI_GIT_COMMIT` | `10cdd12…` (tag v0.46.2) | ComfyUI commit (native Wan 2.2 nodes) |
| `LTXVIDEO_GIT_COMMIT` | `ced6bad…` (tag v1.1.1) | [ComfyUI-LTXVideo](https://github.com/Lightricks/ComfyUI-LTXVideo) commit |
| `RES4LYF_GIT_COMMIT` | `cb2c312…` (tag v1.2.2) | [RES4LYF](https://github.com/ClownsharkBatwing/RES4LYF) (`ClownSampler_Beta` for LTX graphs) |
| `CUDA_IMAGE` | `pytorch/pytorch:2.9.1-cuda13.0-cudnn9-runtime` | CUDA 13 / cu130 runtime (2.7+ required by comfy-kitchen; Ada sm_89 needs ≥13.0) |

Bump pins in `Dockerfile.comfyui` and re-run Ada smoke after changing them.

## Build / publish

```bash
# Local (amd64)
docker build -f agentic-orchestration-tool/docker/Dockerfile.comfyui \
  -t ghcr.io/zlatko-lakisic/agentic-comfyui:local \
  agentic-orchestration-tool

# Tag for Ada (after release)
docker tag ghcr.io/zlatko-lakisic/agentic-comfyui:local \
  ghcr.io/zlatko-lakisic/agentic-comfyui:v2.26.0
```

GHCR publish is wired in `.github/workflows/publish-images.yml` (linux/amd64 only).

## Runtime flags

Entrypoint always includes `--disable-smart-memory`. Models are hostPath-mounted by `deploy/k8s/comfyui/deployment.yaml`.
