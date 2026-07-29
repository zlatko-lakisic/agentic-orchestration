from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
import yaml

from orchestration import society_runtime
from orchestration.society_charter import parse_society_charter
from orchestration.society_runtime import build_turn_description, run_society
from orchestration.society_session import load_society_session

CATALOG: list[dict[str, Any]] = [
    {
        "id": "a_facilitator",
        "type": "ollama",
        "role": "Facilitator",
        "goal": "chair",
        "backstory": "b",
        "model": "hermes3",
        "society_capable": True,
    },
    {
        "id": "a_expert",
        "type": "ollama",
        "role": "Expert",
        "goal": "substance",
        "backstory": "b",
        "model": "llama3.3",
        "society_capable": True,
    },
    {
        "id": "a_critic",
        "type": "ollama",
        "role": "Critic",
        "goal": "object",
        "backstory": "b",
        "model": "qwen2.5-coder",
        "society_capable": True,
    },
    {
        "id": "a_writer",
        "type": "ollama",
        "role": "Writer",
        "goal": "draft",
        "backstory": "b",
        "model": "llama3.3",
        "society_capable": True,
    },
]


def _charter_dict(**overrides: Any) -> dict[str, Any]:
    society: dict[str, Any] = {
        "id": "panel",
        "protocol": "round_robin",
        "max_turns": 6,
        "max_delegations": 1,
        "members": [
            {"agent_provider_id": "a_facilitator", "role": "facilitator", "can_delegate": True},
            {"agent_provider_id": "a_expert", "role": "domain_expert"},
            {"agent_provider_id": "a_critic", "role": "critic"},
        ],
        "stop_when": [{"facilitator_posts": "FINAL_RECOMMENDATION"}],
        "tools": ["delegate_task"],
    }
    society.update(overrides)
    return {"society": society}


@pytest.fixture
def charter_file(tmp_path: Path):
    def _write(**overrides: Any) -> Path:
        path = tmp_path / "charter.yaml"
        path.write_text(yaml.safe_dump(_charter_dict(**overrides)), encoding="utf-8")
        return path

    return _write


@pytest.fixture
def stub_runtime(monkeypatch: pytest.MonkeyPatch):
    """
    Replace catalog loading, turn execution, and the controller so run_society is exercised
    end to end without any LLM call.
    """
    turns: list[dict[str, Any]] = []
    controller_calls: list[dict[str, Any]] = []
    state: dict[str, Any] = {
        # Called with the 1-based turn index; return the member's post (or raise).
        "reply": lambda turn: f"post for turn {turn}",
        "controller": None,
    }

    monkeypatch.setattr(
        society_runtime,
        "_load_agent_catalog",
        lambda path, *, quiet: list(CATALOG),
    )

    def fake_turn(**kwargs: Any) -> str:
        turns.append(kwargs)
        reply = state["reply"](kwargs["turn_index"])
        if isinstance(reply, BaseException):
            raise reply
        return str(reply)

    monkeypatch.setattr(society_runtime, "_execute_member_turn", fake_turn)

    def fake_controller(**kwargs: Any) -> dict[str, Any]:
        controller_calls.append(kwargs)
        decision = state["controller"]
        if decision is None:
            return {"done": False, "reason": "keep going", "budget_remaining": 1, "next_goal": ""}
        if isinstance(decision, BaseException):
            raise decision
        return dict(decision)

    monkeypatch.setattr(society_runtime, "society_controller_decision", fake_controller)
    return {"turns": turns, "controller_calls": controller_calls, "state": state}


def test_runs_all_turns_and_persists_the_session(
    tmp_path: Path,
    charter_file,
    stub_runtime,
    capsys: pytest.CaptureFixture[str],
) -> None:
    code = run_society(
        tool_root=tmp_path,
        charter_path=charter_file(),
        goal="Edge or cluster?",
        quiet=True,
        use_controller=False,
    )
    assert code == 0

    assert [t["turn_index"] for t in stub_runtime["turns"]] == [1, 2, 3, 4, 5, 6]
    assert [t["member"].role for t in stub_runtime["turns"]] == [
        "facilitator",
        "domain_expert",
        "critic",
        "facilitator",
        "domain_expert",
        "critic",
    ]

    session = load_society_session(tmp_path, "panel")
    assert session.meta.turn == 6
    assert session.meta.status == "stopped"
    assert session.meta.stop_reason == "max_turns:6"
    assert session.meta.goal == "Edge or cluster?"

    board = session.blackboard_path.read_text(encoding="utf-8")
    for i in range(1, 7):
        assert f"post for turn {i}" in board

    # Last turn is echoed on stdout for the caller.
    assert "post for turn 6" in capsys.readouterr().out


def test_stop_when_phrase_ends_the_run_early(tmp_path: Path, charter_file, stub_runtime) -> None:
    stub_runtime["state"]["reply"] = (
        lambda turn: "FINAL_RECOMMENDATION: run it in the cluster." if turn == 4 else f"turn {turn}"
    )

    assert (
        run_society(
            tool_root=tmp_path,
            charter_path=charter_file(),
            goal="Edge or cluster?",
            quiet=True,
            use_controller=False,
        )
        == 0
    )

    assert len(stub_runtime["turns"]) == 4
    session = load_society_session(tmp_path, "panel")
    assert session.meta.status == "done"
    assert session.meta.stop_reason == "stop_when:facilitator:FINAL_RECOMMENDATION"


def test_stop_phrase_from_the_wrong_role_does_not_stop(tmp_path: Path, charter_file, stub_runtime) -> None:
    stub_runtime["state"]["reply"] = (
        lambda turn: "FINAL_RECOMMENDATION now" if turn == 3 else f"turn {turn}"
    )
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(),
        goal="g",
        quiet=True,
        use_controller=False,
    )
    # Turn 3 is the critic, so the marker is ignored and the panel runs to the cap.
    assert len(stub_runtime["turns"]) == 6


def test_controller_stops_after_a_completed_round(tmp_path: Path, charter_file, stub_runtime) -> None:
    stub_runtime["state"]["controller"] = {
        "done": True,
        "reason": "objections answered",
        "budget_remaining": 3,
        "next_goal": "",
    }

    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(),
        goal="g",
        quiet=True,
        use_controller=True,
    )

    # Consulted only at the end of a full round (3 members), so after turn 3.
    assert len(stub_runtime["turns"]) == 3
    assert [c["turn_index"] for c in stub_runtime["controller_calls"]] == [3]
    assert stub_runtime["controller_calls"][0]["max_turns"] == 6

    session = load_society_session(tmp_path, "panel")
    assert session.meta.status == "done"
    assert session.meta.stop_reason == "controller:objections answered"
    controller_entries = [e for e in session.transcript_entries() if e["kind"] == "controller"]
    assert controller_entries[0]["done"] is True
    assert controller_entries[0]["reason"] == "objections answered"


def test_controller_next_goal_refocuses_later_turns(tmp_path: Path, charter_file, stub_runtime) -> None:
    stub_runtime["state"]["controller"] = {
        "done": False,
        "reason": "cost unanswered",
        "budget_remaining": 3,
        "next_goal": "Only discuss cost",
    }

    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(),
        goal="Original goal",
        quiet=True,
        use_controller=True,
    )

    goals = [t["goal"] for t in stub_runtime["turns"]]
    assert goals[:3] == ["Original goal"] * 3
    assert goals[3:] == ["Only discuss cost"] * 3
    # The controller always judges against the original goal, not the refocused one.
    assert all(c["original_goal"] == "Original goal" for c in stub_runtime["controller_calls"])


def test_controller_failure_does_not_end_the_run(tmp_path: Path, charter_file, stub_runtime) -> None:
    stub_runtime["state"]["controller"] = RuntimeError("no planner key")
    assert (
        run_society(
            tool_root=tmp_path,
            charter_path=charter_file(),
            goal="g",
            quiet=True,
            use_controller=True,
        )
        == 0
    )
    assert len(stub_runtime["turns"]) == 6


def test_min_turns_delays_the_controller(tmp_path: Path, charter_file, stub_runtime) -> None:
    stub_runtime["state"]["controller"] = {"done": True, "reason": "early", "budget_remaining": 0}
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(min_turns=6, max_turns=9),
        goal="g",
        quiet=True,
        use_controller=True,
    )
    assert [c["turn_index"] for c in stub_runtime["controller_calls"]] == [6]
    assert len(stub_runtime["turns"]) == 6


def test_failed_turn_marks_the_session_and_returns_nonzero(
    tmp_path: Path,
    charter_file,
    stub_runtime,
) -> None:
    stub_runtime["state"]["reply"] = (
        lambda turn: RuntimeError("ollama unreachable") if turn == 2 else f"turn {turn}"
    )

    assert (
        run_society(
            tool_root=tmp_path,
            charter_path=charter_file(),
            goal="g",
            quiet=True,
            use_controller=False,
        )
        == 1
    )

    session = load_society_session(tmp_path, "panel")
    assert session.meta.status == "failed"
    assert "ollama unreachable" in session.meta.stop_reason
    failures = [e for e in session.transcript_entries() if e["kind"] == "turn_failed"]
    assert failures[0]["turn"] == 2


def test_cli_max_turns_lowers_but_never_raises_the_charter_cap(
    tmp_path: Path,
    charter_file,
    stub_runtime,
) -> None:
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(),
        goal="g",
        quiet=True,
        use_controller=False,
        max_turns=2,
    )
    assert len(stub_runtime["turns"]) == 2
    assert load_society_session(tmp_path, "panel").meta.max_turns == 2

    stub_runtime["turns"].clear()
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(),
        goal="g",
        quiet=True,
        use_controller=False,
        max_turns=99,
    )
    assert len(stub_runtime["turns"]) == 6


def test_charter_goal_is_used_when_no_goal_is_passed(tmp_path: Path, charter_file, stub_runtime) -> None:
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(goal="Charter default goal", max_turns=1),
        goal="",
        quiet=True,
        use_controller=False,
    )
    assert stub_runtime["turns"][0]["goal"] == "Charter default goal"


def test_missing_goal_is_a_usage_error(tmp_path: Path, charter_file, stub_runtime) -> None:
    assert (
        run_society(
            tool_root=tmp_path,
            charter_path=charter_file(),
            goal="",
            quiet=True,
        )
        == 2
    )
    assert stub_runtime["turns"] == []


def test_missing_charter_file_is_a_usage_error(tmp_path: Path, stub_runtime) -> None:
    assert (
        run_society(
            tool_root=tmp_path,
            charter_path=tmp_path / "absent.yaml",
            goal="g",
            quiet=True,
        )
        == 2
    )


def test_member_not_in_catalog_is_a_usage_error(tmp_path: Path, charter_file, stub_runtime) -> None:
    path = charter_file(
        members=[{"agent_provider_id": "a_ghost", "role": "facilitator"}],
        stop_when=[],
    )
    assert run_society(tool_root=tmp_path, charter_path=path, goal="g", quiet=True) == 2


def test_session_slug_override(tmp_path: Path, charter_file, stub_runtime) -> None:
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(max_turns=1),
        goal="g",
        session_slug="Panel Run 2",
        quiet=True,
        use_controller=False,
    )
    assert load_society_session(tmp_path, "panel-run-2").meta.slug == "panel-run-2"


def test_delegation_budget_is_reserved_through_the_session(
    tmp_path: Path,
    charter_file,
    stub_runtime,
) -> None:
    """The reserve callback handed to the tool must debit the session's delegation budget."""

    def reply(turn: int) -> str:
        if turn == 1:
            kwargs = stub_runtime["turns"][-1]
            kwargs["reserve_delegation"]("a_expert", "look up the cost")
        return f"turn {turn}"

    stub_runtime["state"]["reply"] = reply
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(max_turns=3),
        goal="g",
        quiet=True,
        use_controller=False,
    )

    session = load_society_session(tmp_path, "panel")
    assert session.meta.delegations_used == 1
    delegations = [e for e in session.transcript_entries() if e["kind"] == "delegation"]
    assert delegations[0]["requested_by"] == "a_facilitator"
    assert delegations[0]["agent_provider_id"] == "a_expert"

    # Budget is 1, so a second reservation is refused as a tool-visible error.
    turn_kwargs = stub_runtime["turns"][0]
    with pytest.raises(ValueError, match="budget exhausted"):
        turn_kwargs["reserve_delegation"]("a_expert", "again")


def test_only_delegating_members_get_a_remaining_budget(tmp_path: Path, charter_file, stub_runtime) -> None:
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(max_turns=3),
        goal="g",
        quiet=True,
        use_controller=False,
    )
    by_role = {t["member"].role: t for t in stub_runtime["turns"]}
    assert by_role["facilitator"]["member"].can_delegate is True
    assert by_role["critic"]["member"].can_delegate is False
    assert "delegate_task" in by_role["facilitator"]["task_description"]
    assert "delegate_task" not in by_role["critic"]["task_description"]


def test_hierarchical_protocol_still_takes_round_robin_turns(
    tmp_path: Path,
    charter_file,
    stub_runtime,
) -> None:
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(protocol="hierarchical", max_turns=4),
        goal="g",
        quiet=True,
        use_controller=False,
    )
    assert [t["member"].role for t in stub_runtime["turns"]] == [
        "facilitator",
        "domain_expert",
        "critic",
        "facilitator",
    ]
    assert load_society_session(tmp_path, "panel").meta.protocol == "hierarchical"


def test_turn_description_carries_goal_prior_context_and_stop_rule() -> None:
    charter = parse_society_charter(_charter_dict())
    member = charter.member_for_turn(1)

    description = build_turn_description(
        charter=charter,
        member=member,
        goal="Edge or cluster?",
        blackboard="## Turn 0 — seed\n\nprior context",
        turn_index=1,
        delegable_ids=["a_expert", "a_critic"],
        delegations_remaining=1,
    )

    assert "**facilitator**" in description
    assert "turn 1 of 6" in description
    assert "Edge or cluster?" in description
    assert "prior context" in description
    assert "FINAL_RECOMMENDATION" in description
    assert "delegate_task" in description
    assert "`a_expert`" in description
    # Roster is visible so members can address each other.
    assert "domain_expert" in description


def test_turn_description_without_blackboard_or_delegation() -> None:
    charter = parse_society_charter(_charter_dict())
    critic = charter.member_for_turn(3)

    description = build_turn_description(
        charter=charter,
        member=critic,
        goal="g",
        blackboard="",
        turn_index=3,
        delegations_remaining=0,
    )
    assert "you are opening the panel" in description.lower()
    assert "delegate_task" not in description
    # A non-facilitator gets no stop marker instruction.
    assert "FINAL_RECOMMENDATION" not in description


def test_member_charge_from_charter_overrides_the_role_default() -> None:
    charter = parse_society_charter(
        _charter_dict(
            members=[
                {
                    "agent_provider_id": "a_facilitator",
                    "role": "facilitator",
                    "charge": "Only ask questions.",
                }
            ],
        )
    )
    description = build_turn_description(
        charter=charter,
        member=charter.member_for_turn(1),
        goal="g",
        blackboard="",
        turn_index=1,
    )
    assert "Only ask questions." in description
    assert "You chair this panel." not in description


def test_final_recommendation_prefers_the_marked_turn(tmp_path: Path, charter_file, stub_runtime) -> None:
    stub_runtime["state"]["reply"] = (
        lambda turn: "FINAL_RECOMMENDATION: cluster" if turn == 4 else f"turn {turn}"
    )
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(),
        goal="g",
        quiet=True,
        use_controller=False,
    )
    session = load_society_session(tmp_path, "panel")
    charter = parse_society_charter(_charter_dict())
    assert (
        society_runtime.final_recommendation_text(session, charter)
        == "FINAL_RECOMMENDATION: cluster"
    )


def test_meta_json_is_valid_after_a_run(tmp_path: Path, charter_file, stub_runtime) -> None:
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(max_turns=2),
        goal="g",
        quiet=True,
        use_controller=False,
    )
    meta_path = tmp_path / "__orchestrator_sessions__" / "societies" / "panel" / "meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    assert meta["max_turns"] == 2
    assert meta["turn"] == 2
    assert meta["charter_path"].endswith("charter.yaml")
    assert meta["updated_at"]
    assert meta["messages_path"].endswith("messages")


# --- K6.2: message bus, protocols, ready_for_draft -----------------------------------------


def test_every_turn_is_broadcast_to_the_message_bus(tmp_path: Path, charter_file, stub_runtime) -> None:
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(max_turns=3),
        goal="g",
        quiet=True,
        use_controller=False,
    )
    session = load_society_session(tmp_path, "panel")
    messages = session.messages()
    assert [m.content for m in messages] == ["post for turn 1", "post for turn 2", "post for turn 3"]
    assert [m.from_agent for m in messages] == ["a_facilitator", "a_expert", "a_critic"]
    assert {m.thread_id for m in messages} == {"main"}
    assert all(m.is_broadcast for m in messages)
    assert [m.turn for m in messages] == [1, 2, 3]
    # Mirrored on the transcript for audit, and the blackboard still holds every turn.
    mirrored = [e for e in session.transcript_entries() if e["kind"] == "message"]
    assert len(mirrored) == 3
    assert "post for turn 3" in session.blackboard_path.read_text(encoding="utf-8")


def test_an_empty_turn_is_not_posted_to_the_bus(tmp_path: Path, charter_file, stub_runtime) -> None:
    stub_runtime["state"]["reply"] = lambda turn: "" if turn == 1 else f"turn {turn}"
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(max_turns=2),
        goal="g",
        quiet=True,
        use_controller=False,
    )
    session = load_society_session(tmp_path, "panel")
    assert [m.content for m in session.messages()] == ["turn 2"]


def test_turns_get_the_message_digest_instead_of_the_whole_blackboard(
    tmp_path: Path,
    charter_file,
    stub_runtime,
) -> None:
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(max_turns=3),
        goal="g",
        quiet=True,
        use_controller=False,
    )
    third = stub_runtime["turns"][2]["task_description"]
    assert "## Recent panel messages" in third
    assert "## Blackboard so far" not in third
    assert "post for turn 2" in third
    assert "society_read_thread" in third
    # The bus tools are attached to every turn.
    assert stub_runtime["turns"][0]["message_tools"] is True
    assert stub_runtime["turns"][0]["session"].directory.name == "panel"


def test_disabling_the_message_tools_restores_the_blackboard_excerpt(
    tmp_path: Path,
    charter_file,
    stub_runtime,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_SOCIETY_MESSAGE_TOOLS", "0")
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(max_turns=2),
        goal="g",
        quiet=True,
        use_controller=False,
    )
    second = stub_runtime["turns"][1]["task_description"]
    assert "## Blackboard so far" in second
    assert "society_read_thread" not in second
    assert stub_runtime["turns"][1]["message_tools"] is False


def test_reactive_protocol_follows_directed_mail(tmp_path: Path, charter_file, stub_runtime) -> None:
    def reply(turn: int) -> str:
        if turn == 1:
            session = stub_runtime["turns"][-1]["session"]
            session.post_message(
                from_agent="a_facilitator",
                content="Critic, is the latency claim defensible?",
                to_agent="a_critic",
                thread_id="latency",
                turn=turn,
                role="facilitator",
            )
        return f"turn {turn}"

    stub_runtime["state"]["reply"] = reply
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(protocol="reactive", max_turns=3),
        goal="g",
        quiet=True,
        use_controller=False,
    )
    roles = [t["member"].role for t in stub_runtime["turns"]]
    # Round-robin would run facilitator → domain_expert → critic; the directed message pulls
    # the critic forward on turn 2.
    assert roles == ["facilitator", "critic", "domain_expert"]
    assert load_society_session(tmp_path, "panel").meta.protocol == "reactive"


def test_moderator_picks_protocol_honours_the_chair(tmp_path: Path, charter_file, stub_runtime) -> None:
    stub_runtime["state"]["reply"] = (
        lambda turn: "Critic, take it from here." if turn == 1 else f"turn {turn}"
    )
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(protocol="moderator_picks", max_turns=4),
        goal="g",
        quiet=True,
        use_controller=False,
    )
    # Chair opens, hands off to the member it named, takes the floor back once the nomination
    # is spent, then — naming nobody — passes it on rather than speaking twice in a row.
    assert [t["member"].role for t in stub_runtime["turns"]] == [
        "facilitator",
        "critic",
        "facilitator",
        "domain_expert",
    ]


def test_writer_runs_only_after_ready_for_draft(tmp_path: Path, charter_file, stub_runtime) -> None:
    """K6.2 exit criteria: research posts, critic replies in-thread, then the writer drafts."""
    members = [
        {"agent_provider_id": "a_facilitator", "role": "facilitator"},
        {"agent_provider_id": "a_expert", "role": "researcher"},
        {"agent_provider_id": "a_critic", "role": "critic"},
        {"agent_provider_id": "a_writer", "role": "writer"},
    ]

    def reply(turn: int) -> str:
        session = stub_runtime["turns"][-1]["session"]
        if turn == 2:
            session.post_message(
                from_agent="a_expert",
                content="Two benchmarks disagree on edge latency; here is the spread.",
                to_agent="a_critic",
                thread_id="evidence",
                turn=turn,
                role="researcher",
            )
            return "evidence posted"
        if turn == 3:
            prior = session.read_thread("evidence")[-1]
            session.post_message(
                from_agent="a_critic",
                content="Spread is wide but the conclusion holds. ready_for_draft",
                thread_id="evidence",
                refs=[prior.msg_id],
                turn=turn,
                role="critic",
            )
            return "objections answered"
        return f"turn {turn}"

    stub_runtime["state"]["reply"] = reply
    assert (
        run_society(
            tool_root=tmp_path,
            charter_path=charter_file(protocol="reactive", members=members, max_turns=4),
            goal="Write up where the index should live",
            quiet=True,
            use_controller=False,
        )
        == 0
    )

    assert [t["member"].role for t in stub_runtime["turns"]] == [
        "facilitator",
        "researcher",
        "critic",
        "writer",
    ]

    session = load_society_session(tmp_path, "panel")
    thread = session.read_thread("evidence")
    assert [m.from_agent for m in thread] == ["a_expert", "a_critic"]
    assert thread[1].refs == [thread[0].msg_id]
    assert thread[1].ready_for_draft is True
    # The writer's turn description tells it the draft is expected.
    assert "ready_for_draft" in stub_runtime["turns"][3]["task_description"]


def test_unread_mail_is_surfaced_to_the_member_it_targets(
    tmp_path: Path,
    charter_file,
    stub_runtime,
) -> None:
    def reply(turn: int) -> str:
        if turn == 1:
            stub_runtime["turns"][-1]["session"].post_message(
                from_agent="a_facilitator",
                content="Expert, give me numbers.",
                to_agent="a_expert",
                turn=turn,
                role="facilitator",
            )
        return f"turn {turn}"

    stub_runtime["state"]["reply"] = reply
    run_society(
        tool_root=tmp_path,
        charter_path=charter_file(max_turns=2),
        goal="g",
        quiet=True,
        use_controller=False,
    )
    second = stub_runtime["turns"][1]["task_description"]
    assert "## Addressed to you" in second
    assert "`a_facilitator`" in second


def test_turn_description_renders_the_message_digest_and_tools() -> None:
    charter = parse_society_charter(_charter_dict(protocol="reactive"))
    member = charter.member_for_turn(2)

    description = build_turn_description(
        charter=charter,
        member=member,
        goal="Edge or cluster?",
        turn_index=2,
        messages_summary="[m0001-a_facilitator] a_facilitator → all · thread `main`\nOpening.",
        unread=[],
    )
    assert "## Recent panel messages" in description
    assert "Opening." in description
    assert "society_post" in description
    assert "society_list_agents" in description
    assert "## Blackboard so far" not in description
