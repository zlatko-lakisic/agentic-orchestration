from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from orchestration.society_charter import PROTOCOLS, parse_society_charter
from orchestration.society_messages import mark_seen, post_message
from orchestration.society_protocols import (
    PROTOCOL_MODERATOR_PICKS,
    PROTOCOL_REACTIVE,
    PROTOCOL_ROUND_ROBIN,
    drafter_member,
    facilitator_member,
    last_speaker_id,
    pending_draft_member,
    select_next_member,
    unread_counts,
)
from orchestration.society_session import create_society_session

MEMBERS = [
    {"agent_provider_id": "a_facilitator", "role": "facilitator"},
    {"agent_provider_id": "a_critic", "role": "critic"},
    {"agent_provider_id": "a_writer", "role": "writer"},
]


def _charter(**overrides: Any):
    society: dict[str, Any] = {
        "id": "panel",
        "max_turns": 9,
        "members": [dict(m) for m in MEMBERS],
    }
    society.update(overrides)
    return parse_society_charter({"society": society})


def _session(tmp_path: Path, charter=None):
    return create_society_session(
        tool_root=tmp_path,
        charter=charter or _charter(),
        goal="Where does the index live?",
    )


def _roles(charter, session, protocol: str, turns: int, **kwargs: Any) -> list[str]:
    return [
        select_next_member(protocol, charter, session, i, **kwargs).role
        for i in range(1, turns + 1)
    ]


def test_round_robin_cycles_the_roster(tmp_path: Path) -> None:
    charter = _charter()
    session = _session(tmp_path, charter)
    assert _roles(charter, session, PROTOCOL_ROUND_ROBIN, 4) == [
        "facilitator",
        "critic",
        "writer",
        "facilitator",
    ]


def test_hierarchical_and_unknown_protocols_fall_back_to_round_robin(tmp_path: Path) -> None:
    charter = _charter()
    session = _session(tmp_path, charter)
    assert _roles(charter, session, "hierarchical", 3) == ["facilitator", "critic", "writer"]
    assert "sociocracy" not in PROTOCOLS
    assert _roles(charter, session, "sociocracy", 2) == ["facilitator", "critic"]


def test_turn_index_is_one_based(tmp_path: Path) -> None:
    charter = _charter()
    session = _session(tmp_path, charter)
    with pytest.raises(ValueError, match="1-based"):
        select_next_member(PROTOCOL_ROUND_ROBIN, charter, session, 0)


def test_moderator_opens_the_panel(tmp_path: Path) -> None:
    charter = _charter(protocol=PROTOCOL_MODERATOR_PICKS)
    session = _session(tmp_path, charter)
    picked = select_next_member(PROTOCOL_MODERATOR_PICKS, charter, session, 1)
    assert picked.agent_provider_id == "a_facilitator"


def test_moderator_hands_the_floor_to_the_role_it_names(tmp_path: Path) -> None:
    charter = _charter(protocol=PROTOCOL_MODERATOR_PICKS)
    session = _session(tmp_path, charter)
    session.post_message(
        from_agent="a_facilitator",
        content="We need the cost picture first. Writer, hold off — critic, your turn.",
        turn=1,
        role="facilitator",
    )
    picked = select_next_member(PROTOCOL_MODERATOR_PICKS, charter, session, 2)
    assert picked.agent_provider_id == "a_critic"


def test_moderator_hands_the_floor_by_catalog_id(tmp_path: Path) -> None:
    charter = _charter(protocol=PROTOCOL_MODERATOR_PICKS)
    session = _session(tmp_path, charter)
    session.post_message(
        from_agent="a_facilitator",
        content="`a_writer` please draft the summary.",
        turn=1,
        role="facilitator",
    )
    assert (
        select_next_member(PROTOCOL_MODERATOR_PICKS, charter, session, 2).agent_provider_id
        == "a_writer"
    )


def test_moderator_speaks_again_when_nobody_is_named(tmp_path: Path) -> None:
    charter = _charter(protocol=PROTOCOL_MODERATOR_PICKS)
    session = _session(tmp_path, charter)
    session.post_message(
        from_agent="a_critic",
        content="The latency number is unsupported.",
        turn=1,
        role="critic",
    )
    assert (
        select_next_member(PROTOCOL_MODERATOR_PICKS, charter, session, 2).role == "facilitator"
    )


def test_moderator_does_not_renominate_the_member_who_just_spoke(tmp_path: Path) -> None:
    charter = _charter(protocol=PROTOCOL_MODERATOR_PICKS)
    session = _session(tmp_path, charter)
    session.post_message(
        from_agent="a_facilitator", content="Critic, your turn.", turn=1, role="facilitator"
    )
    session.post_message(
        from_agent="a_critic", content="Here is my objection.", turn=2, role="critic"
    )
    # The facilitator's stale nomination still names the critic, so the chair speaks instead.
    assert select_next_member(PROTOCOL_MODERATOR_PICKS, charter, session, 3).role == "facilitator"


def test_moderator_falls_back_to_last_posts_when_the_bus_is_empty(tmp_path: Path) -> None:
    charter = _charter(protocol=PROTOCOL_MODERATOR_PICKS)
    session = _session(tmp_path, charter)
    picked = select_next_member(
        PROTOCOL_MODERATOR_PICKS,
        charter,
        session,
        2,
        last_posts={"a_facilitator": "Over to the writer for a draft."},
    )
    assert picked.agent_provider_id == "a_writer"


def test_moderator_without_a_facilitator_uses_round_robin(tmp_path: Path) -> None:
    charter = _charter(
        protocol=PROTOCOL_MODERATOR_PICKS,
        members=[
            {"agent_provider_id": "a_critic", "role": "critic"},
            {"agent_provider_id": "a_writer", "role": "writer"},
        ],
    )
    session = _session(tmp_path, charter)
    assert _roles(charter, session, PROTOCOL_MODERATOR_PICKS, 3) == ["critic", "writer", "critic"]


def test_reactive_prefers_a_directly_addressed_member(tmp_path: Path) -> None:
    charter = _charter(protocol=PROTOCOL_REACTIVE)
    session = _session(tmp_path, charter)
    session.post_message(
        from_agent="a_critic", content="Broadcast to everyone.", turn=1, role="critic"
    )
    session.post_message(
        from_agent="a_critic",
        content="Chair, rule on this.",
        to_agent="a_facilitator",
        turn=1,
        role="critic",
    )
    # Rotation would offer the writer first, but the facilitator has directed mail.
    picked = select_next_member(PROTOCOL_REACTIVE, charter, session, 2)
    assert picked.agent_provider_id == "a_facilitator"


def test_reactive_breaks_broadcast_ties_by_who_has_been_silent_longest(tmp_path: Path) -> None:
    charter = _charter(
        protocol=PROTOCOL_REACTIVE,
        members=[
            {"agent_provider_id": "a_facilitator", "role": "facilitator"},
            {"agent_provider_id": "a_writer", "role": "writer"},
            {"agent_provider_id": "a_critic", "role": "critic"},
        ],
    )
    session = _session(tmp_path, charter)
    session.post_message(from_agent="a_facilitator", content="Opening.", turn=1)
    session.post_message(from_agent="a_critic", content="An objection.", turn=2)

    # Only broadcasts are pending, and the writer has not spoken at all — round-robin would
    # have given turn 3 to the critic, who just spoke.
    assert charter.member_for_turn(3).agent_provider_id == "a_critic"
    assert select_next_member(PROTOCOL_REACTIVE, charter, session, 3).agent_provider_id == "a_writer"


def test_reactive_falls_back_to_the_facilitator_when_there_is_no_mail(tmp_path: Path) -> None:
    charter = _charter(protocol=PROTOCOL_REACTIVE)
    session = _session(tmp_path, charter)
    assert select_next_member(PROTOCOL_REACTIVE, charter, session, 2).role == "facilitator"


def test_reactive_passes_the_floor_on_when_the_chair_just_spoke(tmp_path: Path) -> None:
    charter = _charter(protocol=PROTOCOL_REACTIVE)
    session = _session(tmp_path, charter)
    session.post_message(
        from_agent="a_facilitator", content="Opening.", turn=1, role="facilitator"
    )
    for member in MEMBERS:
        session.mark_seen(member["agent_provider_id"])
    # Nothing unread and the chair cannot take two turns in a row, so the next seat speaks.
    assert select_next_member(PROTOCOL_REACTIVE, charter, session, 2).role == "critic"


def test_read_cursors_clear_unread_so_a_member_is_not_picked_twice(tmp_path: Path) -> None:
    charter = _charter(protocol=PROTOCOL_REACTIVE)
    session = _session(tmp_path, charter)
    session.post_message(
        from_agent="a_critic", content="Writer, draft this.", to_agent="a_writer", turn=1
    )
    assert select_next_member(PROTOCOL_REACTIVE, charter, session, 2).agent_provider_id == "a_writer"

    session.mark_seen("a_writer")
    assert unread_counts(session, charter)["a_writer"] == 0
    assert select_next_member(PROTOCOL_REACTIVE, charter, session, 2).agent_provider_id != "a_writer"


def test_ready_for_draft_promotes_the_writer(tmp_path: Path) -> None:
    charter = _charter(protocol=PROTOCOL_REACTIVE)
    session = _session(tmp_path, charter)
    session.post_message(
        from_agent="a_facilitator", content="Opening the panel.", turn=1, role="facilitator"
    )
    session.post_message(
        from_agent="a_critic",
        content="Objections answered — ready_for_draft.",
        turn=2,
        role="critic",
    )
    for protocol in (PROTOCOL_REACTIVE, PROTOCOL_MODERATOR_PICKS):
        picked = select_next_member(protocol, charter, session, 3)
        assert picked.agent_provider_id == "a_writer", protocol

    # Once the writer has posted, the marker no longer pins the floor.
    session.post_message(from_agent="a_writer", content="Here is the draft.", turn=3, role="writer")
    assert pending_draft_member(charter, session.directory) is None
    assert select_next_member(PROTOCOL_REACTIVE, charter, session, 4).agent_provider_id != "a_writer"


def test_ready_for_draft_from_the_writer_itself_is_ignored(tmp_path: Path) -> None:
    charter = _charter(protocol=PROTOCOL_REACTIVE)
    session = _session(tmp_path, charter)
    session.post_message(
        from_agent="a_writer", content="ready_for_draft I think", turn=1, role="writer"
    )
    assert pending_draft_member(charter, session.directory) is None


def test_ready_for_draft_needs_a_drafting_role_on_the_roster(tmp_path: Path) -> None:
    charter = _charter(
        protocol=PROTOCOL_REACTIVE,
        members=[
            {"agent_provider_id": "a_facilitator", "role": "facilitator"},
            {"agent_provider_id": "a_critic", "role": "critic"},
        ],
    )
    session = _session(tmp_path, charter)
    session.post_message(from_agent="a_critic", content="ready_for_draft", turn=1, role="critic")
    assert pending_draft_member(charter, session.directory) is None
    assert drafter_member(charter) is None


def test_domain_expert_holds_the_pen_when_no_writer_is_seated(tmp_path: Path) -> None:
    charter = _charter(
        members=[
            {"agent_provider_id": "a_facilitator", "role": "facilitator"},
            {"agent_provider_id": "a_expert", "role": "domain_expert"},
        ],
    )
    assert drafter_member(charter).agent_provider_id == "a_expert"
    assert facilitator_member(charter).agent_provider_id == "a_facilitator"
    # A seated writer wins over a domain expert.
    assert drafter_member(_charter()).role == "writer"


def test_last_speaker_id_reads_the_bus_then_the_transcript(tmp_path: Path) -> None:
    charter = _charter()
    session = _session(tmp_path, charter)
    assert last_speaker_id(session) == ""

    session.append_turn(
        turn_index=1, role="facilitator", agent_provider_id="a_facilitator", text="opening"
    )
    assert last_speaker_id(session) == "a_facilitator"

    session.post_message(from_agent="a_critic", content="objection", turn=2, role="critic")
    assert last_speaker_id(session) == "a_critic"


def test_unread_counts_per_member(tmp_path: Path) -> None:
    charter = _charter()
    session = _session(tmp_path, charter)
    post_message(session.directory, from_agent="a_facilitator", content="all", turn=1)
    post_message(
        session.directory, from_agent="a_facilitator", content="you", to_agent="a_critic", turn=1
    )
    counts = unread_counts(session, charter)
    assert counts == {"a_facilitator": 0, "a_critic": 2, "a_writer": 1}

    mark_seen(session.directory, "a_critic")
    assert unread_counts(session, charter)["a_critic"] == 0
