# AO speech sidecars

Optional OpenAI-compatible **STT** and **TTS** processes co-located with `python -m orchestration.serve`. The engine does not load Whisper/Piper itself; it advertises URLs on WebSocket `hello` when `AGENTIC_SPEECH_ENABLED=1` so [AO Reach](https://github.com/zlatko-lakisic/agentic-orchestration-reach) clients can call speech over HTTP.

## Endpoints

| Service | Default | API |
|---------|---------|-----|
| STT | `http://127.0.0.1:8090` | `POST /v1/audio/transcriptions` (multipart `file`) → `{"text":"..."}` |
| TTS | `http://127.0.0.1:8091` | `POST /v1/audio/speech` JSON `{"text":"..."}` → `audio/wav` |

Both expose `GET /health`.

## Bring-up (AI server)

```bash
cd agentic-orchestration-tool

# STT
python3 -m venv .venv-stt && source .venv-stt/bin/activate
pip install -r speech/requirements-stt.txt
python speech/stt_server.py --host 0.0.0.0 --port 8090 --model base --device cuda

# TTS (separate venv / terminal)
python3 -m venv .venv-tts && source .venv-tts/bin/activate
pip install -r speech/requirements-tts.txt
export AGENTIC_SPEECH_TTS_MODEL_DIR=/path/to/piper-vits   # *.onnx + tokens.txt + espeak-ng-data/
python speech/tts_server.py --host 0.0.0.0 --port 8091
```

## Engine env

```bash
AGENTIC_SPEECH_ENABLED=1
# URLs Reach clients will call (LAN hostname/IP of this host):
AGENTIC_SPEECH_ADVERTISE_STT_URL=http://192.168.x.x:8090
AGENTIC_SPEECH_ADVERTISE_TTS_URL=http://192.168.x.x:8091
# Optional shared bearer (sidecars + Reach SpeechClient):
# AGENTIC_SPEECH_TOKEN=...
```

Restart `orchestration.serve` after setting env. `hello` then includes a `speech` object; Reach `SessionBridge.speechClient` becomes non-null.
