"""Unit tests for shared GPU residency manager (#121)."""

from __future__ import annotations

import pytest

from orchestration import gpu_residency as gr

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _reset(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("AGENTIC_GPU_RESIDENCY", "1")
    monkeypatch.setenv("AGENTIC_GPU_RESIDENCY_IDLE_SECONDS", "5")
    monkeypatch.setenv("AGENTIC_GPU_RESIDENCY_QUEUE_WAIT_SECONDS", "2")
    gr.reset_gpu_residency_manager_for_tests()
    yield
    gr.reset_gpu_residency_manager_for_tests()


def test_report_shape_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_RESOURCE_SHARING", "0")
    mgr = gr.get_gpu_residency_manager()
    report = mgr.report()
    assert report["ok"] is True
    assert "models" in report
    assert isinstance(report["models"], list)
    assert "stats" in report
    assert set(report["stats"]) >= {"admits", "rejects", "evictions", "queueDepth"}


def test_admit_and_release_appear_in_report(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_RESOURCE_SHARING", "0")
    clock = {"t": 1000.0}

    def now() -> float:
        return clock["t"]

    mgr = gr.GpuResidencyManager(clock=now)
    lease = mgr.acquire(
        provider_id="tts_orpheus_en",
        kind="tts",
        min_vram_gb=2.0,
        model="orpheus",
    )
    report = mgr.report()
    entry = next(m for m in report["models"] if m["providerId"] == "tts_orpheus_en")
    assert entry["kind"] == "tts"
    assert entry["state"] == "active"
    assert entry["vramBytes"] is not None
    assert entry["loadedAt"]
    mgr.release(lease)
    report2 = mgr.report()
    entry2 = next(m for m in report2["models"] if m["providerId"] == "tts_orpheus_en")
    assert entry2["state"] == "idle"
    mgr.close()


def test_idle_unload(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_RESOURCE_SHARING", "0")
    clock = {"t": 0.0}
    unloaded: list[str] = []

    mgr = gr.GpuResidencyManager(clock=lambda: clock["t"])
    lease = mgr.acquire(
        provider_id="stt_whisper",
        kind="stt",
        min_vram_gb=1.0,
        unload=lambda: unloaded.append("stt_whisper"),
    )
    mgr.release(lease)
    clock["t"] = 100.0
    gone = mgr.reconcile_idle()
    assert "stt_whisper" in gone
    assert unloaded == ["stt_whisper"]
    assert all(m["providerId"] != "stt_whisper" for m in mgr.report()["models"])
    mgr.close()


def test_never_evict_active(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_RESOURCE_SHARING", "0")
    monkeypatch.setattr(
        "orchestration.hardware_profile.detect_vram_gb_available",
        lambda: 8.0,
    )
    monkeypatch.setattr(
        "orchestration.hardware_profile._resident_headroom_gb",
        lambda: 0.0,
    )
    unloaded: list[str] = []
    mgr = gr.GpuResidencyManager()
    active = mgr.acquire(
        provider_id="video_a",
        kind="video",
        min_vram_gb=7.0,
        unload=lambda: unloaded.append("video_a"),
    )
    # Pressure eviction must not unload an active lease.
    mgr._evict_idle_providers(need_gb=7.0)
    assert unloaded == []
    assert any(
        m["providerId"] == "video_a" and m["state"] == "active"
        for m in mgr.report()["models"]
    )
    mgr.release(active)
    mgr.close()


def test_evict_idle_before_admit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_RESOURCE_SHARING", "0")
    monkeypatch.setattr(
        "orchestration.hardware_profile.detect_vram_gb_available",
        lambda: 10.0,
    )
    monkeypatch.setattr(
        "orchestration.hardware_profile._resident_headroom_gb",
        lambda: 0.0,
    )
    unloaded: list[str] = []
    mgr = gr.GpuResidencyManager()
    lease = mgr.acquire(
        provider_id="tts_piper_en",
        kind="tts",
        min_vram_gb=4.0,
        unload=lambda: unloaded.append("tts_piper_en"),
    )
    mgr.release(lease)
    lease2 = mgr.acquire(
        provider_id="video_wan22_i2v",
        kind="video",
        min_vram_gb=8.0,
        unload=lambda: None,
    )
    assert "tts_piper_en" in unloaded
    assert lease2.provider_id == "video_wan22_i2v"
    mgr.release(lease2)
    mgr.close()


def test_residency_lease_for_entry(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_RESOURCE_SHARING", "0")
    monkeypatch.setattr(
        "orchestration.hardware_profile.detect_vram_gb_available",
        lambda: 20.0,
    )
    monkeypatch.setattr(
        "orchestration.hardware_profile._resident_headroom_gb",
        lambda: 1.0,
    )
    entry = {
        "id": "tts_piper_en",
        "type": "tts",
        "residency": "on_demand",
        "min_vram_gb": 1,
    }
    lease = gr.residency_lease_for_entry(entry, kind="tts")
    assert lease is not None
    gr.get_gpu_residency_manager().release(lease)
