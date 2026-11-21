# AO speech sidecars

Optional OpenAI-compatible **STT** and **TTS** processes co-located with `python -m orchestration.serve`. The engine does not load Whisper/Piper itself; it advertises URLs on WebSocket `hello` when `AGENTIC_SPEECH_ENABLED=1` so [AO Reach](https://github.com/zlatko-lakisic/agentic-orchestration-reach) clients can call speech over HTTP.

## Endpoints

| Service | Default | API |
|---------|---------|-----|
| STT | `http://127.0.0.1:8090` | `POST /v1/audio/transcriptions` (multipart `file`) → `{"text":"..."}` |
| TTS | `http://127.0.0.1:8091` | `POST /v1/audio/speech` JSON `{"text":"..."}` → `audio/wav` |
| TTS voices | same | `GET /v1/audio/voices` → `{"voices":[{"id","sample_rate"}],"default"}` |

Both expose `GET /health`.

### STT word timestamps (optional)

Default requests stay OpenAI-compat `{"text":"..."}`. For caption timing (AO Quill), send OpenAI-style form fields:

- `response_format=verbose_json`
- `timestamp_granularities=word` (also accepts `timestamp_granularities[]`)

Response shape:

```json
{
  "text": "full text",
  "language": "en",
  "duration": 41.8,
  "words": [{"word": "Mostar", "start": 0.42, "end": 0.91, "probability": 0.98}]
}
```

```bash
curl -sS -X POST "http://127.0.0.1:8090/v1/audio/transcriptions" \
  -F "file=@narration.wav" \
  -F "response_format=verbose_json" \
  -F "timestamp_granularities=word"
```

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
# Optional multi-voice tree (subfolder name = voice id):
# export AGENTIC_SPEECH_TTS_VOICES_DIR=/path/to/voices
python speech/tts_server.py --host 0.0.0.0 --port 8091
```

### TTS voice + speed (optional)

`AGENTIC_SPEECH_TTS_MODEL_DIR` remains the default voice (`id: default`). Extra Piper VITS folders under `AGENTIC_SPEECH_TTS_VOICES_DIR` are registered by folder name. Voices load on first use and stay cached.

```bash
curl -sS http://127.0.0.1:8091/v1/audio/voices
curl -sS -X POST http://127.0.0.1:8091/v1/audio/speech \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hello from Quill","voice":"en_US-lessac","speed":1.1}' \
  --output out.wav
```

`speed` must be between `0.5` and `2.0` (default `1.0`). Unknown `voice` → HTTP 400 with the known voice ids. Clients that send only `text` keep the previous default-voice behavior.

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
