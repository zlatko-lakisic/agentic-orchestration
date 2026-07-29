from __future__ import annotations

import json
from pathlib import Path

import pytest

from orchestration.society_charter import parse_society_charter
from orchestration.society_session import (
    STATUS_DONE,
    STATUS_RUNNING,
    SocietySessionError,
    create_society_session,
    list_society_sessions,
    load_society_session,
    society_session_dir,
)


def _charter(**overrides):
    society = {
        "id": "panel",
        "max_turns": 4,
        "max_delegations": 2,
        "members": [
            {"agent_provider_id": "a_facilitator", "role": "facilitator", "can_delegate": True},
            {"agent_provider_id": "a_critic", "role": "critic"},
        ],
        "stop_when": [{"facilitator_posts": "FINAL_RECOMMENDATION"}],
    }
    society.update(overrides)
    return parse_society_charter({"society": society}, source_path="/charters/panel.yaml")


def _new_session(tmp_path: Path, **kwargs):
    return create_society_session(
        tool_root=tmp_path,
        charter=kwargs.pop("charter", _charter()),
        goal=kwargs.pop("goal", "Decide where the index lives"),
        **kwargs,
    )


def test_create_session_writes_expected_layout(tmp_path: Path) -> None:
    session = _new_session(tmp_path)

    assert session.directory == society_session_dir(tmp_path, "panel")
    assert session.directory.is_relative_to(tmp_path / "__orchestrator_sessions__" / "societies")
    assert session.meta_path.is_file()
    assert session.blackboard_path.is_file()
    assert session.transcript_path.is_file()

    meta = json.loads(session.meta_path.read_text(encoding="utf-8"))
    assert meta["society_id"] == "panel"
    assert meta["slug"] == "panel"
    assert meta["goal"] == "Decide where the index lives"
    assert meta["turn"] == 0
    assert meta["max_turns"] == 4
    assert meta["max_delegations"] == 2
    assert meta["delegations_used"] == 0
    assert meta["status"] == STATUS_RUNNING
    assert meta["charter_path"] == "/charters/panel.yaml"
    assert meta["blackboard_path"].endswith("blackboard.md")
    assert [r["role"] for r in meta["roster"]] == ["facilitator", "critic"]

    header = session.blackboard_path.read_text(encoding="utf-8")
    assert "Decide where the index lives" in header
    assert "facilitator=a_facilitator" in header

    start = session.transcript_entries()
    assert len(start) == 1
    assert start[0]["kind"] == "society_start"
    assert start[0]["ts"]


def test_custom_slug_is_sanitized(tmp_path: Path) -> None:
    session = _new_session(tmp_path, session_slug="My Panel!")
    assert session.directory.name == "my-panel"
    assert list_society_sessions(tmp_path) == ["my-panel"]


def test_path_traversal_slug_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        _new_session(tmp_path, session_slug="../escape")


def test_append_turn_updates_blackboard_transcript_and_counter(tmp_path: Path) -> None:
    session = _new_session(tmp_path)

    session.append_turn(
        turn_index=1,
        role="facilitator",
        agent_provider_id="a_facilitator",
        text="Opening the panel: the decision is edge vs cluster.",
    )
    session.append_turn(
        turn_index=2,
        role="critic",
        agent_provider_id="a_critic",
        text="The latency claim is unsupported.",
    )

    board = session.blackboard_path.read_text(encoding="utf-8")
    assert "## Turn 1 — facilitator (a_facilitator)" in board
    assert "Opening the panel" in board
    assert board.index("Opening the panel") < board.index("latency claim")

    turns = [e for e in session.transcript_entries() if e["kind"] == "turn"]
    assert [t["turn"] for t in turns] == [1, 2]
    assert turns[1]["role"] == "critic"

    assert session.meta.turn == 2
    assert session.meta.turns_remaining == 2
    assert json.loads(session.meta_path.read_text(encoding="utf-8"))["turn"] == 2


def test_append_turn_records_stop_reason(tmp_path: Path) -> None:
    session = _new_session(tmp_path)
    session.append_turn(
        turn_index=1,
        role="facilitator",
        agent_provider_id="a_facilitator",
        text="FINAL_RECOMMENDATION: cluster",
        stop_reason="stop_when:facilitator:FINAL_RECOMMENDATION",
    )
    assert session.meta.stop_reason == "stop_when:facilitator:FINAL_RECOMMENDATION"


def test_empty_turn_is_still_posted(tmp_path: Path) -> None:
    session = _new_session(tmp_path)
    session.append_turn(turn_index=1, role="critic", agent_provider_id="a_critic", text="   ")
    assert "(empty turn)" in session.blackboard_path.read_text(encoding="utf-8")


def test_increment_delegation_enforces_budget(tmp_path: Path) -> None:
    session = _new_session(tmp_path)

    assert session.increment_delegation(agent_provider_id="a_critic", requested_by="a_facilitator") == 1
    assert session.increment_delegation(agent_provider_id="a_critic") == 2
    assert session.meta.delegations_remaining == 0

    with pytest.raises(SocietySessionError, match="budget exhausted"):
        session.increment_delegation(agent_provider_id="a_critic")

    delegations = [e for e in session.transcript_entries() if e["kind"] == "delegation"]
    assert len(delegations) == 2
    assert delegations[0]["requested_by"] == "a_facilitator"
    assert json.loads(session.meta_path.read_text(encoding="utf-8"))["delegations_used"] == 2


def test_zero_delegation_budget_blocks_immediately(tmp_path: Path) -> None:
    session = _new_session(tmp_path, charter=_charter(max_delegations=0))
    with pytest.raises(SocietySessionError):
        session.increment_delegation(agent_provider_id="a_critic")


def test_delegation_task_description_is_truncated(tmp_path: Path) -> None:
    session = _new_session(tmp_path)
    session.increment_delegation(agent_provider_id="a_critic", task_description="x" * 5000)
    entry = [e for e in session.transcript_entries() if e["kind"] == "delegation"][0]
    assert len(entry["task_description"]) == 2000


def test_blackboard_excerpt_is_trimmed_from_the_front(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    session = _new_session(tmp_path)
    session.append_turn(turn_index=1, role="critic", agent_provider_id="a_critic", text="A" * 4000)
    session.append_turn(turn_index=2, role="critic", agent_provider_id="a_critic", text="ZEBRA")

    monkeypatch.setenv("AGENTIC_SOCIETY_BLACKBOARD_CHARS", "600")
    excerpt = session.blackboard_text()
    assert "ZEBRA" in excerpt
    assert excerpt.startswith("…(earlier posts trimmed)…")
    assert len(excerpt) < 700
    # The oldest content (the header) is what gets dropped.
    assert "Society blackboard" not in excerpt


def test_blackboard_excerpt_respects_explicit_cap(tmp_path: Path) -> None:
    session = _new_session(tmp_path)
    session.append_turn(turn_index=1, role="critic", agent_provider_id="a_critic", text="B" * 2000)
    assert len(session.blackboard_text(max_chars=500)) < 700


def test_finish_and_reload_roundtrip(tmp_path: Path) -> None:
    session = _new_session(tmp_path)
    session.append_turn(turn_index=1, role="critic", agent_provider_id="a_critic", text="hi")
    session.finish(status=STATUS_DONE, stop_reason="controller:converged")

    reloaded = load_society_session(tmp_path, "panel")
    assert reloaded.meta.status == STATUS_DONE
    assert reloaded.meta.stop_reason == "controller:converged"
    assert reloaded.meta.turn == 1
    assert reloaded.meta.goal == "Decide where the index lives"
    assert [r["agent_provider_id"] for r in reloaded.meta.roster] == ["a_facilitator", "a_critic"]


def test_load_missing_session_raises(tmp_path: Path) -> None:
    with pytest.raises(SocietySessionError, match="not found"):
        load_society_session(tmp_path, "absent")


def test_recreate_resets_history_by_default(tmp_path: Path) -> None:
    session = _new_session(tmp_path)
    session.append_turn(turn_index=1, role="critic", agent_provider_id="a_critic", text="stale")
    session.increment_delegation(agent_provider_id="a_critic")

    fresh = _new_session(tmp_path)
    assert "stale" not in fresh.blackboard_path.read_text(encoding="utf-8")
    assert [e["kind"] for e in fresh.transcript_entries()] == ["society_start"]
    assert fresh.meta.turn == 0
    assert fresh.meta.delegations_used == 0


def test_list_sessions_ignores_directories_without_meta(tmp_path: Path) -> None:
    _new_session(tmp_path)
    (tmp_path / "__orchestrator_sessions__" / "societies" / "junk").mkdir(parents=True)
    assert list_society_sessions(tmp_path) == ["panel"]
    assert list_society_sessions(tmp_path / "nowhere") == []


def test_transcript_skips_corrupt_lines(tmp_path: Path) -> None:
    session = _new_session(tmp_path)
    with session.transcript_path.open("a", encoding="utf-8") as handle:
        handle.write("not json\n\n")
    session.append_turn(turn_index=1, role="critic", agent_provider_id="a_critic", text="ok")
    kinds = [e["kind"] for e in session.transcript_entries()]
    assert kinds == ["society_start", "turn"]
