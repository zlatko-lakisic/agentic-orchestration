# Ada: ComfyUI + LTX-2.3 + Wan 2.2 for video providers (#116 / #123)

Run ComfyUI on the **same GPU host as the engine** (Ada). The engine talks to it over loopback; do not expose `:8188` on the LAN without auth.

Providers:

| Provider | Role | Catalog tiers |
|---|---|---|
| `video_ltx23_distilled` | Fast distilled LTX | `quality_tier: fast`, `speed_tier: fast` |
| `video_wan22_i2v` | Higher-motion Wan 2.2 I2V | `quality_tier: high`, `speed_tier: slow` |

## Install (once)

```bash
cd ~
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cd custom_nodes
git clone https://github.com/Lightricks/ComfyUI-LTXVideo.git
# Wan 2.2 (#123) — pick one maintained wrapper, e.g.:
# git clone https://github.com/kijai/ComfyUI-WanVideoWrapper.git
# Plus Video Helper Suite if SaveVideo / CreateVideo nodes require it
```

Place distilled LTX weights under `ComfyUI/models/` as named in `config/agent_providers/video_ltx23_distilled.yaml` (`models_note`).

For Wan 2.2, install TI2V-5B or A14B I2V FP8/GGUF (+ offload) so peak VRAM fits Ada (~20 GB) with nothing else resident. Export the working UI graph to API JSON, replace `config/video_workflows/wan22_i2v_vertical.json`, and update node bindings in `video_wan22_i2v.yaml`. Record **seconds per 5 s clip** and **peak VRAM** after the first Ada smoke.

## systemd user unit

```bash
mkdir -p ~/.config/systemd/user
cp /var/projects/agentic-orchestration/agentic-orchestration-tool/deploy/systemd/agentic-comfyui.service \
  ~/.config/systemd/user/agentic-comfyui.service
# Edit WorkingDirectory / ExecStart if ComfyUI is not ~/ComfyUI
systemctl --user daemon-reload
systemctl --user enable --now agentic-comfyui.service
curl -sf http://127.0.0.1:8188/system_stats | head
```

## Engine env

In `agentic-orchestration-tool/.env` (synced into the k8s secret):

```bash
AGENTIC_VIDEO_COMFYUI_URL=http://127.0.0.1:8188
# AGENTIC_VIDEO_COMFYUI_TOKEN=   # if you put a reverse proxy in front
```

From the engine pod, ComfyUI on the host is often `http://host.k3s.internal:8188` (or the node IP). Prefer hostNetwork/hostPath patterns already used for Ollama if loopback from the pod fails.

## GPU sharing

- Providers use `residency: on_demand`. The shared GPU residency manager (#121) admits against `min_vram_gb`, evicts idle Ollama/TTS/STT first, never steals an active lease, and reports via `/api/v1/gpu-residents`.
- Runtime still calls ComfyUI `/free` after each job so weights leave VRAM immediately; idle leases drop from the report after the idle timeout.
- LTX distilled ~20 GB (`min_vram_gb: 20`); Wan ~18 GB (`min_vram_gb: 18`). On Ada, only one of LLM / speech / video should be resident at a time.
- Record wall time for 97 and 241 LTX frames and for a 5 s Wan clip after first successful `direct_agent` smoke.
