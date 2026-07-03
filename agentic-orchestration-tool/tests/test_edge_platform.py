"""Tests for edge platform detection."""

from __future__ import annotations

from orchestration import edge_platform as ep


def test_detect_edge_platform_env_override_jetson(monkeypatch):
    monkeypatch.setenv("AGENTIC_EDGE_PLATFORM", "jetson")
    assert ep.detect_edge_platform() == "jetson"


def test_detect_jetpack_major_from_text(monkeypatch):
    monkeypatch.setattr(
        ep,
        "_read_text",
        lambda path: "# R36 (release), REVISION: 4.7\n" if path.name == "nv_tegra_release" else "",
    )
    assert ep.detect_jetpack_major() == 36


def test_jetson_container_image_for_r36(monkeypatch):
    from orchestration import ollama_runtime as ort

    monkeypatch.setattr(ort, "detect_jetpack_major", lambda: 36)
    assert ort.jetson_ollama_container_image() == "dustynv/ollama:r36.2.0"
