# Ada: ComfyUI + LTX-2.3 for `video_ltx23_distilled` (#116)

Run ComfyUI on the **same GPU host as the engine** (Ada). The engine talks to it over loopback; do not expose `:8188` on the LAN without auth.

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
# Plus Video Helper Suite if SaveVideo / CreateVideo nodes require it
```

Place distilled weights under `ComfyUI/models/` as named in `config/agent_providers/video_ltx23_distilled.yaml` (`models_note`).

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

- Provider `residency: on_demand` — runtime calls ComfyUI `/free` after each job.
- LTX distilled needs ~20 GB VRAM (`min_vram_gb: 20`). On Ada (~20 GB), unload Ollama models and prefer stopping STT/TTS sidecars before a long clip (#118 will manage this inside AO).
- Record wall time for 97 and 241 frames after first successful `direct_agent` smoke and note them on #116.
