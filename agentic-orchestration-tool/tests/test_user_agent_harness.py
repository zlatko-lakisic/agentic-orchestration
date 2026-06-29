"""User agent harness — unit tests (mocked kickoff, no API keys)."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from orchestration.agent_harness import run_assertions
from orchestration.user_agent_harness import (
    discover_user_harness_packs,
    load_user_harness_pack,
    resolve_user_harness_dirs,
    run_user_harness_packs,
    run_user_scenario,
)

pytestmark = pytest.mark.unit

REPO_ROOT = Path(__file__).resolve().parents[2]
HEALTHCARE_HARNESS_ROOT = REPO_ROOT / "examples" / "verticals" / "healthcare" / "harnesses"


def test_load_healthcare_gpt_research_pack() -> None:
    pack_dir = HEALTHCARE_HARNESS_ROOT / "gpt_research"
    pack = load_user_harness_pack(pack_dir)
    assert pack is not None
    assert pack.agent_provider_id == "gpt_research"
    assert len(pack.scenarios) >= 3
    ids = {s.id for s in pack.scenarios}
    assert "rpm_council_brief" in ids
    assert "regulatory_outline" in ids


def test_discover_duplicate_pack_raises(tmp_path: Path) -> None:
    root1 = tmp_path / "dir1"
    root2 = tmp_path / "dir2"
    for root in (root1, root2):
        pack = root / "dup_agent"
        (pack / "scenarios").mkdir(parents=True)
        (pack / "harness.yaml").write_text("agent_provider_id: dup_agent\n", encoding="utf-8")
        (pack / "scenarios" / "one.yaml").write_text(
            "id: one\ndescription: test\nassertions: []\n",
            encoding="utf-8",
        )
    with pytest.raises(ValueError, match="Duplicate user harness pack"):
        discover_user_harness_packs([root1, root2])


def test_resolve_user_harness_dirs_merges_env(tool_root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_EXTRA_AGENT_HARNESS_DIRS", str(HEALTHCARE_HARNESS_ROOT))
    dirs = resolve_user_harness_dirs(None, tool_root=tool_root)
    assert any(d.resolve() == HEALTHCARE_HARNESS_ROOT.resolve() for d in dirs)


def test_run_assertions_forbids_regex() -> None:
    ok, results = run_assertions("clean text", [{"type": "forbids_regex", "pattern": r"NCT\d{8}"}])
    assert ok is True
    ok2, _ = run_assertions("bad NCT12345678 id", [{"type": "forbids_regex", "pattern": r"NCT\d{8}"}])
    assert ok2 is False


@pytest.mark.user_harness
def test_run_user_scenario_mocked_kickoff(tool_root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-for-user-harness")
    monkeypatch.setenv("AGENTIC_HARNESS_EVAL", "0")
    pack = load_user_harness_pack(HEALTHCARE_HARNESS_ROOT / "gpt_research")
    assert pack is not None
    scenario = next(s for s in pack.scenarios if s.id == "rpm_council_brief")
    entry = {
        "id": "gpt_research",
        "type": "openai",
        "role": "Research Analyst",
        "goal": "Research",
        "backstory": "Healthcare research harness test.",
        "model": "gpt-4o-mini",
    }
    fake_text = (
        "Executive summary for the innovation council on RPM for heart failure.\n\n"
        "Story A emphasizes hardware plus analytics; Story B emphasizes service-led onboarding.\n"
        "Clinical prerequisites include order workflows and escalation paths; operational prerequisites "
        "include connectivity SLAs and staff training.\n\n"
        "Evidence checklist: verify FDA labeling claims with public databases; confirm trial registry "
        "entries before citing outcomes; engage legal and regulatory counsel — this is not legal advice.\n"
        + ("Additional planning context. " * 20)
    )
    with patch(
        "orchestration.user_agent_harness.run_harness_kickoff",
        return_value=(fake_text, None),
    ):
        result = run_user_scenario(
            pack=pack,
            scenario=scenario,
            entry=entry,
            tool_root=tool_root,
            quiet=True,
        )
    assert result.status == "pass"
    assert result.assertion_results


@pytest.mark.user_harness
def test_run_user_harness_packs_static_skip_without_creds(
    tool_root: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    pack = load_user_harness_pack(HEALTHCARE_HARNESS_ROOT / "gpt_research")
    assert pack is not None
    entry = {
        "id": "gpt_research",
        "type": "openai",
        "role": "Research Analyst",
        "goal": "Research",
        "backstory": "Test.",
        "model": "gpt-4o-mini",
    }
    results = run_user_harness_packs(
        [pack],
        catalog_entries={"gpt_research": entry},
        tool_root=tool_root,
        agent_filter="gpt_research",
        quiet=True,
    )
    assert len(results) == len(pack.scenarios)
    assert all(r.status == "skip" for r in results)
