# Ada: Orpheus 3B TTS for `tts_orpheus_en` (#122)

Orpheus is the preferred English narrator. Piper remains the fallback via
`AGENTIC_SPEECH_TTS_URL`.

## Sidecar (AO)

```bash
cd /var/projects/agentic-orchestration/agentic-orchestration-tool
# Wiring / CI without GPU weights:
AGENTIC_ORPHEUS_BACKEND=stub python speech/orpheus_server.py --port 8092

# Production: point at an OpenAI-compatible Orpheus process (or Ollama+SNAC front):
# AGENTIC_ORPHEUS_BACKEND=http
# AGENTIC_ORPHEUS_UPSTREAM_URL=http://127.0.0.1:8093
# python speech/orpheus_server.py --port 8092
```

Engine env (synced into the k8s secret):

```bash
AGENTIC_SPEECH_ORPHEUS_URL=http://host.k3s.internal:8092
# Fallback when Orpheus is down:
AGENTIC_SPEECH_TTS_URL=http://host.k3s.internal:8091
```

## Emotion tags

Allowed in narration text (use sparingly): `<laugh>` `<sigh>` `<chuckle>`
`<cough>` `<sniff>` `<groan>` `<yawn>` `<gasp>`.

## Residency (#121)

`tts_orpheus_en` uses `residency: on_demand` / `min_vram_gb: 6`. The engine
acquires a GPU lease before synthesis and calls `POST /v1/unload` after idle.
VRAM appears under `/health.gpuResidents` and `GET /api/v1/gpu-residents`.
