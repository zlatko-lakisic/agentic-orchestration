# agentic-comfyui (managed k8s)

Always-on ComfyUI for Ada video generation. See
[`scripts/ada-comfyui-setup.md`](../../../scripts/ada-comfyui-setup.md).

```bash
# Opt-in only — never default on
AGENTIC_JETSON_ENABLE_COMFYUI=1 bash agentic-orchestration-tool/scripts/jetson-enable-comfyui.sh
```

- Service: ClusterIP `agentic-comfyui:8188` (no hostPort / Ingress)
- Models: hostPath `var/comfyui/models`
- Image: `ghcr.io/<owner>/agentic-comfyui:vX.Y.Z` from `docker/Dockerfile.comfyui`
