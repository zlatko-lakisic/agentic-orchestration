"""Concurrent-resident model planning (Slice D): pack by VRAM, degrade gracefully."""

from __future__ import annotations

from typing import Any

import pytest

from orchestration.hardware_profile import detect_vram_gb_available, plan_resident_models

pytestmark = pytest.mark.unit


def entry(provider_id: str, *, min_vram_gb: float | None = None, typ: str = "ollama") -> dict[str, Any]:
    out: dict[str, Any] = {"id": provider_id, "type": typ, "model": f"model-{provider_id}"}
    if min_vram_gb is not None:
        out["min_vram_gb"] = min_vram_gb
    return out


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "AGENTIC_VRAM_GB",
        "AGENTIC_ASSUME_VRAM_GB",
        "AGENTIC_MAX_VRAM_GB",
        "AGENTIC_MAX_VRAM_FRACTION",
        "AGENTIC_RESIDENT_HEADROOM_GB",
        "AGENTIC_MAX_RESIDENT_MODELS",
        "AGENTIC_VRAM_HEURISTICS",
    ):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("AGENTIC_RESIDENT_HEADROOM_GB", "0")


def test_packs_smallest_models_first_within_budget() -> None:
    plan = plan_resident_models(
        [
            entry("big", min_vram_gb=20.0),
            entry("small", min_vram_gb=2.0),
            entry("medium", min_vram_gb=6.0),
        ],
        vram_gb_available=8.0,
    )
    assert plan["selected"] == ["small", "medium"]
    assert plan["usedGb"] == 8.0
    assert [s["id"] for s in plan["skipped"]] == ["big"]
    assert "20.0 GiB" in plan["skipped"][0]["reason"]


def test_headroom_is_reserved_before_packing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_RESIDENT_HEADROOM_GB", "2")
    plan = plan_resident_models(
        [entry("a", min_vram_gb=4.0), entry("b", min_vram_gb=4.0)],
        vram_gb_available=8.0,
    )
    assert plan["headroomGb"] == 2.0
    assert plan["budgetGb"] == 6.0
    assert plan["selected"] == ["a"]


def test_providers_without_a_vram_requirement_are_always_resident() -> None:
    plan = plan_resident_models(
        [entry("cloud", typ="openai"), entry("local", min_vram_gb=4.0)],
        vram_gb_available=1.0,
    )
    assert "cloud" in plan["selected"]
    assert "local" not in plan["selected"]


def test_unknown_budget_degrades_to_one_local_model() -> None:
    plan = plan_resident_models(
        [entry("a", min_vram_gb=4.0), entry("b", min_vram_gb=4.0), entry("cloud", typ="openai")],
        vram_gb_available=None,
    )
    assert plan["budgetGb"] is None
    assert plan["degraded"] is True
    assert plan["selected"] == ["cloud", "a"]
    assert "budget unknown" in plan["skipped"][0]["reason"]


def test_budget_too_small_selects_nothing_without_raising() -> None:
    plan = plan_resident_models([entry("a", min_vram_gb=16.0)], vram_gb_available=4.0)
    assert plan["selected"] == []
    assert plan["degraded"] is True
    assert plan["skipped"][0]["requiredGb"] == 16.0


def test_resident_model_cap_is_enforced(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_MAX_RESIDENT_MODELS", "2")
    plan = plan_resident_models(
        [entry(f"m{i}", min_vram_gb=1.0) for i in range(5)],
        vram_gb_available=64.0,
    )
    assert len(plan["selected"]) == 2
    assert all("cap reached" in s["reason"] for s in plan["skipped"])


def test_a_full_fit_is_not_reported_as_degraded() -> None:
    plan = plan_resident_models(
        [entry("a", min_vram_gb=2.0), entry("b", min_vram_gb=2.0)],
        vram_gb_available=16.0,
    )
    assert plan["selected"] == ["a", "b"]
    assert plan["skipped"] == []
    assert plan["degraded"] is False
    assert plan["fit"] is True


def test_required_ids_must_all_fit() -> None:
    plan = plan_resident_models(
        [
            entry("tiny", min_vram_gb=2.0),
            entry("huge", min_vram_gb=20.0),
        ],
        vram_gb_available=8.0,
        required_ids=["tiny", "huge"],
    )
    assert plan["fit"] is False
    assert "huge" in (plan["reason"] or "")
    assert "tiny" in plan["selected"]


def test_required_ids_sharing_one_ollama_model_charge_once() -> None:
    """Meeting SE + BizDev on the same 3b weights only need one VRAM slot."""
    se = {
        "id": "kb_se",
        "type": "ollama",
        "model": "qwen2.5:3b",
        "min_vram_gb": 4.0,
    }
    biz = {
        "id": "kb_biz",
        "type": "ollama",
        "model": "qwen2.5:3b",
        "min_vram_gb": 4.0,
    }
    plan = plan_resident_models(
        [se, biz],
        vram_gb_available=8.0,
        required_ids=["kb_se", "kb_biz"],
    )
    assert plan["fit"] is True
    assert set(plan["selected"]) == {"kb_se", "kb_biz"}
    assert plan["usedGb"] == 4.0


def test_required_missing_catalog_id_is_unfit() -> None:
    plan = plan_resident_models(
        [entry("a", min_vram_gb=2.0)],
        vram_gb_available=8.0,
        required_ids=["a", "missing"],
    )
    assert plan["fit"] is False
    assert "missing" in (plan["reason"] or "")


def test_entries_without_an_id_are_ignored() -> None:
    plan = plan_resident_models([{"type": "ollama", "model": "x"}], vram_gb_available=8.0)
    assert plan["selected"] == []


def test_empty_catalog_is_a_valid_empty_plan() -> None:
    plan = plan_resident_models([], vram_gb_available=8.0)
    assert plan["selected"] == []
    assert plan["skipped"] == []


def test_heuristic_requirement_is_used_when_yaml_omits_it(monkeypatch: pytest.MonkeyPatch) -> None:
    plan = plan_resident_models(
        [{"id": "tiny", "type": "ollama", "model": "tinyllama:1b"}],
        vram_gb_available=8.0,
    )
    assert plan["selected"] == ["tiny"]
    assert plan["usedGb"] == 4.0


def test_detect_vram_prefers_the_explicit_env_budget(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_VRAM_GB", "12")
    assert detect_vram_gb_available() == 12.0


def test_detect_vram_applies_the_usual_caps(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_VRAM_GB", "16")
    monkeypatch.setenv("AGENTIC_MAX_VRAM_FRACTION", "0.5")
    assert detect_vram_gb_available() == 8.0
    monkeypatch.setenv("AGENTIC_MAX_VRAM_GB", "6")
    assert detect_vram_gb_available() == 6.0


def test_detect_vram_ignores_a_bad_env_value(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_VRAM_GB", "not-a-number")
    monkeypatch.setenv("AGENTIC_ASSUME_VRAM_GB", "10")
    assert detect_vram_gb_available() == 10.0


def test_filter_catalog_uses_non_nvidia_vram(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.hardware_profile import filter_catalog_by_vram

    monkeypatch.setattr(
        "orchestration.hardware_profile.detect_vram_gb_available",
        lambda: 4.0,
    )
    kept, excluded, vram = filter_catalog_by_vram(
        [
            entry("tiny", min_vram_gb=3.0),
            entry("huge", min_vram_gb=16.0),
            {"id": "cloud", "type": "openai", "model": "gpt"},
        ]
    )
    assert vram == 4.0
    assert [e["id"] for e in kept] == ["tiny", "cloud"]
    assert excluded == ["huge"]


def test_hardware_snapshot_includes_gpu_identity(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.hardware_profile import hardware_snapshot

    monkeypatch.setattr(
        "orchestration.host_metrics.sample_gpu",
        lambda: {
            "percent": None,
            "vramTotalGb": 4.0,
            "vramUsedGb": 0.5,
            "vramFreeGb": 3.5,
            "vramSource": "system_profiler+ioreg",
            "name": "AMD Radeon Pro 5500M",
        },
    )
    monkeypatch.setattr(
        "orchestration.hardware_profile.detect_vram_gb_available",
        lambda: 4.0,
    )
    monkeypatch.setattr(
        "orchestration.hardware_profile.detect_available_architectures",
        lambda: {"cpu", "gpu"},
    )
    snap = hardware_snapshot()
    assert snap["vramGbAvailable"] == 4.0
    assert "gpu" in snap["architectures"]
    assert snap["gpu"]["name"] == "AMD Radeon Pro 5500M"
    assert snap["gpu"]["vendor"] == "amd"
    assert snap["gpu"]["vramTotalGb"] == 4.0
