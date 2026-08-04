"""Platform agent harness — unit tests (mocked kickoff, no API keys)."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from orchestration.agent_harness import (
    HarnessProfileLoader,
    _run_assertions,
    filter_providers_by_glob,
    infer_harness_profile,
    resolve_harness_tier,
    run_harness,
    run_harness_batch,
)

pytestmark = pytest.mark.unit


def test_infer_harness_profile_explicit() -> None:
    entry = {"id": "x", "role": "Anything", "harness_profile": "coding"}
    assert infer_harness_profile(entry) == "coding"


def test_infer_harness_profile_research_role() -> None:
    entry = {"id": "foo", "role": "Research Analyst"}
    assert infer_harness_profile(entry) == "research"


def test_infer_harness_profile_coder_id() -> None:
    entry = {"id": "ollama_qwen2_5_coder", "role": "Assistant"}
    assert infer_harness_profile(entry) == "coding"


def test_voice_harness_profile_loads(tool_root: Path) -> None:
    profiles = HarnessProfileLoader(tool_root / "config" / "agent_harnesses")
    voice = profiles.get("voice")
    assert voice is not None
    assert voice.get("id") == "voice"
    assert infer_harness_profile({"id": "client.voice_responder", "harness_profile": "voice"}) == (
        "voice"
    )


def test_filter_providers_by_glob() -> None:
    entries = [{"id": "gpt_research"}, {"id": "ollama_llama3"}]
    out = filter_providers_by_glob(entries, "gpt_*")
    assert len(out) == 1
    assert out[0]["id"] == "gpt_research"


def test_resolve_harness_tier_aliases() -> None:
    assert resolve_harness_tier("l0") == "static"
    assert resolve_harness_tier("l2") == "smoke"


def test_run_assertions_min_chars_and_bullets() -> None:
    text = "- one\n- two\n- three\nEnough chars here for min."
    ok, results = _run_assertions(
        text,
        [{"type": "min_chars", "value": 10}, {"type": "bullet_count", "min": 2}],
    )
    assert ok is True
    assert all(r["pass"] for r in results)


def test_run_assertions_json_parse_fails_on_prose() -> None:
    ok, results = _run_assertions("not json", [{"type": "json_parse"}])
    assert ok is False
    assert results[0]["pass"] is False


@pytest.mark.agent_harness
def test_run_harness_static_tier(tool_root: Path) -> None:
    entry = {
        "id": "harness_static_test",
        "type": "openai",
        "role": "Tester",
        "goal": "Test",
        "backstory": "Test backstory for harness.",
        "model": "gpt-4o-mini",
    }
    profiles = HarnessProfileLoader(tool_root / "config" / "agent_harnesses")
    result = run_harness(entry, tier="static", profile_loader=profiles, tool_root=tool_root)
    assert result.status == "pass"
    assert result.tier == "static"


@pytest.mark.agent_harness
def test_run_harness_smoke_mocked_kickoff(tool_root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    pytest.importorskip("crewai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-for-harness-mock")
    entry = {
        "id": "harness_smoke_test",
        "type": "openai",
        "role": "Research Analyst",
        "goal": "Research",
        "backstory": "Test backstory for harness smoke.",
        "model": "gpt-4o-mini",
        "harness_profile": "research",
    }
    profiles = HarnessProfileLoader(tool_root / "config" / "agent_harnesses")
    fake_text = (
        "- REST is simple and widely supported for CRUD APIs.\n"
        "- GraphQL offers flexible queries but adds schema complexity.\n"
        "- Both have trade-offs depending on client needs and team skills."
    )
    with patch(
        "orchestration.agent_harness._run_smoke_kickoff",
        return_value=(fake_text, None),
    ):
        result = run_harness(
            entry,
            tier="smoke",
            profile_loader=profiles,
            tool_root=tool_root,
        )
    assert result.status == "pass"
    assert result.assertion_results


@pytest.mark.agent_harness
def test_run_harness_batch_static_catalog(tool_root: Path) -> None:
    from orchestration.agent_providers_catalog import load_agent_providers_catalog_merged

    catalog = tool_root / "config" / "agent_providers"
    entries = load_agent_providers_catalog_merged(catalog)
    profiles = HarnessProfileLoader(tool_root / "config" / "agent_harnesses")
    results = run_harness_batch(
        entries[:5],
        tier="static",
        profile_loader=profiles,
        tool_root=tool_root,
    )
    assert len(results) == 5
    assert all(r.status == "pass" for r in results)


@pytest.mark.agent_harness
def test_run_harness_skips_live_when_no_credentials(tool_root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_BASE_URL", raising=False)
    entry = {
        "id": "gpt_research",
        "type": "openai",
        "role": "Research Analyst",
        "goal": "Research",
        "backstory": "Test.",
        "model": "gpt-4o-mini",
    }
    profiles = HarnessProfileLoader(tool_root / "config" / "agent_harnesses")
    result = run_harness(entry, tier="smoke", profile_loader=profiles, tool_root=tool_root)
    assert result.status == "skip"
