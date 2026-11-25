"""Unit tests for managed TTS/STT providers (#118/#119)."""

from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest

from agent_providers.factory import agent_provider_from_dict
from orchestration.agent_providers_catalog import entries_for_planner, load_agent_providers_catalog
from orchestration.answer_cache_policy import answer_cache_bypass_for_entries
from orchestration.catalog_credentials import catalog_entry_has_api_credentials
from orchestration.stt_runtime import SttError, is_stt_entry, run_stt
from orchestration.tts_runtime import TtsError, is_tts_entry, run_tts
from orchestration.user_context import Identity

pytestmark = pytest.mark.unit

TOOL_ROOT = Path(__file__).resolve().parents[1]


def _ident(uid: str = "alice") -> Identity:
    return Identity(
        user_name=uid.title(),
        session_id=f"s-{uid}",
        user_id=uid,
        local=False,
        mtls=True,
    )


def test_factory_loads_tts_stt_yaml() -> None:
    import yaml

    for rel in (
        "config/agent_providers/tts_piper_en.yaml",
        "config/agent_providers/tts_orpheus_en.yaml",
        "config/agent_providers/tts_kokoro_en.yaml",
        "config/agent_providers/stt_whisper.yaml",
    ):
        data = yaml.safe_load((TOOL_ROOT / rel).read_text(encoding="utf-8"))
        provider = agent_provider_from_dict(data, default_model="")
        assert provider.config.provider_type in ("tts", "stt")


def test_planner_omits_tts_stt() -> None:
    entries = load_agent_providers_catalog(TOOL_ROOT / "config/agent_providers")
    assert any(e.get("id") == "tts_piper_en" for e in entries)
    assert any(e.get("id") == "tts_orpheus_en" for e in entries)
    assert any(e.get("id") == "tts_kokoro_en" for e in entries)
    assert any(e.get("id") == "stt_whisper" for e in entries)
    kokoro = next(e for e in entries if e.get("id") == "tts_kokoro_en")
    assert kokoro.get("endpoint_env") == "AGENTIC_SPEECH_KOKORO_URL"
    assert kokoro.get("fallback_endpoint_env") == "AGENTIC_SPEECH_TTS_URL"
    planned = entries_for_planner(entries)
    assert all(
        e.get("id")
        not in ("tts_piper_en", "tts_orpheus_en", "tts_kokoro_en", "stt_whisper")
        for e in planned
    )


def test_answer_cache_bypass_speech() -> None:
    assert answer_cache_bypass_for_entries([{"type": "tts"}])
    assert answer_cache_bypass_for_entries([{"type": "stt"}])


def test_tts_endpoint_required(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_SPEECH_TTS_URL", raising=False)
    entry = {"id": "tts_piper_en", "type": "tts", "endpoint_env": "AGENTIC_SPEECH_TTS_URL"}
    assert catalog_entry_has_api_credentials(entry) is False
    monkeypatch.setenv("AGENTIC_SPEECH_TTS_URL", "http://127.0.0.1:8091")
    assert catalog_entry_has_api_credentials(entry) is True


def test_english_tts_rejects_qwen_engine() -> None:
    entry = {
        "id": "tts_piper_en",
        "type": "tts",
        "engine": "piper",
        "allowed_engines": ["piper", "kokoro"],
        "endpoint_env": "AGENTIC_SPEECH_TTS_URL",
    }
    with pytest.raises(TtsError, match="Qwen3-TTS"):
        run_tts(
            entry,
            text=json.dumps({"text": "Hello world", "engine": "qwen3-tts"}),
            tool_root=TOOL_ROOT,
            identity=_ident(),
        )


def test_run_tts_mocked(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("AGENTIC_SPEECH_TTS_URL", "http://tts.test")
    monkeypatch.setenv("AGENTIC_FILES_DIR", str(tmp_path / "files"))

    class _Transport(httpx.BaseTransport):
        def handle_request(self, request: httpx.Request) -> httpx.Response:  # noqa: ARG002
            return httpx.Response(200, content=b"RIFF....WAVEfmt ")

    entry = {
        "id": "tts_piper_en",
        "type": "tts",
        "engine": "piper",
        "allowed_engines": ["piper"],
        "endpoint_env": "AGENTIC_SPEECH_TTS_URL",
    }
    client = httpx.Client(transport=_Transport())
    result = run_tts(
        entry,
        text="Hello from Piper",
        tool_root=TOOL_ROOT,
        identity=_ident(),
        client=client,
    )
    assert result["ok"] is True
    assert result["engine"] == "piper"
    assert result["file_id"]
    assert is_tts_entry(entry)


def test_run_stt_mocked(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    from orchestration.client_files import save_client_file

    monkeypatch.setenv("AGENTIC_SPEECH_STT_URL", "http://stt.test")
    monkeypatch.setenv("AGENTIC_FILES_DIR", str(tmp_path / "files"))
    ident = _ident()
    meta = save_client_file(ident, b"fake-wav", "n.wav", "audio/wav")

    class _Transport(httpx.BaseTransport):
        def handle_request(self, request: httpx.Request) -> httpx.Response:  # noqa: ARG002
            return httpx.Response(
                200,
                json={
                    "text": "hello",
                    "words": [{"word": "hello", "start": 0.0, "end": 0.4}],
                },
            )

    entry = {
        "id": "stt_whisper",
        "type": "stt",
        "endpoint_env": "AGENTIC_SPEECH_STT_URL",
    }
    client = httpx.Client(transport=_Transport())
    result = run_stt(
        entry,
        text=json.dumps({"audio_file_id": meta["file_id"]}),
        tool_root=TOOL_ROOT,
        identity=ident,
        client=client,
    )
    assert result["ok"] is True
    assert result["text"] == "hello"
    assert result["words"]
    assert is_stt_entry(entry)


def test_stt_requires_json() -> None:
    with pytest.raises(SttError):
        run_stt(
            {"id": "stt_whisper", "type": "stt", "endpoint_env": "AGENTIC_SPEECH_STT_URL"},
            text="not-json",
            tool_root=TOOL_ROOT,
            identity=_ident(),
        )


def test_orpheus_falls_back_to_piper(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    from orchestration.tts_runtime import split_narration_sentences

    monkeypatch.delenv("AGENTIC_SPEECH_ORPHEUS_URL", raising=False)
    monkeypatch.setenv("AGENTIC_SPEECH_TTS_URL", "http://piper.test")
    monkeypatch.setenv("AGENTIC_FILES_DIR", str(tmp_path / "files"))
    monkeypatch.setenv("AGENTIC_GPU_RESIDENCY", "0")

    class _Transport(httpx.BaseTransport):
        def handle_request(self, request: httpx.Request) -> httpx.Response:  # noqa: ARG002
            return httpx.Response(200, content=b"RIFF....WAVEfmt ")

    entry = {
        "id": "tts_orpheus_en",
        "type": "tts",
        "engine": "orpheus",
        "allowed_engines": ["orpheus"],
        "endpoint_env": "AGENTIC_SPEECH_ORPHEUS_URL",
        "fallback_endpoint_env": "AGENTIC_SPEECH_TTS_URL",
        "fallback_engine": "piper",
    }
    client = httpx.Client(transport=_Transport())
    result = run_tts(
        entry,
        text="Hello from Orpheus fallback.",
        tool_root=TOOL_ROOT,
        identity=_ident(),
        client=client,
    )
    assert result["ok"] is True
    assert result["engine"] == "piper"
    assert len(split_narration_sentences("One. Two. Three sentences here!")) >= 2
