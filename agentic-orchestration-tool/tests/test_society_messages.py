from __future__ import annotations

import json
from pathlib import Path

import pytest

from orchestration.society_messages import (
    BROADCAST,
    DEFAULT_THREAD_ID,
    SocietyMessage,
    SocietyMessageError,
    cursor_for,
    directed_unread_for,
    latest_ready_for_draft,
    list_messages,
    list_threads,
    mark_seen,
    message_summary_count,
    messages_dir,
    post_message,
    read_message,
    read_thread,
    recent_messages_summary,
    safe_message_component,
    unread_for,
)


def test_post_message_writes_a_file_and_indexes_it(tmp_path: Path) -> None:
    message = post_message(
        tmp_path,
        from_agent="a_research",
        content="Two papers disagree on latency.",
        to_agent="a_critic",
        thread_id="latency",
        refs="m0001-a_facilitator, m0002-a_expert",
        turn=2,
        role="researcher",
    )

    assert message.seq == 1
    assert message.msg_id == "m0001-a_research"
    assert message.thread_id == "latency"
    assert message.to_agent == "a_critic"
    assert message.refs == ["m0001-a_facilitator", "m0002-a_expert"]
    assert message.ts

    path = messages_dir(tmp_path) / f"{message.msg_id}.json"
    stored = json.loads(path.read_text(encoding="utf-8"))
    assert stored["content"] == "Two papers disagree on latency."
    assert stored["turn"] == 2
    assert stored["role"] == "researcher"

    index = (messages_dir(tmp_path) / "_index.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(index) == 1
    assert json.loads(index[0])["msg_id"] == message.msg_id


def test_sequence_numbers_and_order_survive_reload(tmp_path: Path) -> None:
    for i in range(3):
        post_message(tmp_path, from_agent=f"agent_{i}", content=f"post {i}")

    messages = list_messages(tmp_path)
    assert [m.seq for m in messages] == [1, 2, 3]
    assert [m.content for m in messages] == ["post 0", "post 1", "post 2"]
    assert read_message(tmp_path, messages[1].msg_id).content == "post 1"
    assert read_message(tmp_path, "nope") is None


def test_defaults_are_broadcast_on_the_main_thread(tmp_path: Path) -> None:
    message = post_message(tmp_path, from_agent="a", content="hello")
    assert message.to_agent == BROADCAST
    assert message.thread_id == DEFAULT_THREAD_ID
    assert message.is_broadcast is True
    assert message.refs == []


def test_empty_sender_or_content_is_refused(tmp_path: Path) -> None:
    with pytest.raises(SocietyMessageError):
        post_message(tmp_path, from_agent="", content="x")
    with pytest.raises(SocietyMessageError):
        post_message(tmp_path, from_agent="a", content="   ")


def test_content_is_capped(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SOCIETY_MESSAGE_CHARS", "300")
    message = post_message(tmp_path, from_agent="a", content="x" * 5000)
    assert len(message.content) == 300


def test_thread_ids_are_filesystem_safe(tmp_path: Path) -> None:
    message = post_message(tmp_path, from_agent="a", content="c", thread_id="../../etc/passwd")
    assert "/" not in message.thread_id
    assert (messages_dir(tmp_path) / f"{message.msg_id}.json").is_file()
    assert safe_message_component("  ") == ""
    assert safe_message_component("", fallback="main") == "main"


def test_read_thread_filters_and_keeps_the_newest(tmp_path: Path) -> None:
    post_message(tmp_path, from_agent="a", content="main 1")
    post_message(tmp_path, from_agent="b", content="side 1", thread_id="side")
    post_message(tmp_path, from_agent="a", content="main 2")
    post_message(tmp_path, from_agent="b", content="main 3")

    assert [m.content for m in read_thread(tmp_path, "main")] == ["main 1", "main 2", "main 3"]
    assert [m.content for m in read_thread(tmp_path, "main", limit=2)] == ["main 2", "main 3"]
    assert [m.content for m in read_thread(tmp_path, "side")] == ["side 1"]
    assert read_thread(tmp_path, "absent") == []
    assert list_threads(tmp_path) == ["main", "side"]


def test_unread_covers_broadcast_and_directed_but_not_your_own(tmp_path: Path) -> None:
    post_message(tmp_path, from_agent="a_facilitator", content="opening")
    post_message(tmp_path, from_agent="a_critic", content="for the writer", to_agent="a_writer")
    post_message(tmp_path, from_agent="a_writer", content="my own post")

    unread = unread_for(tmp_path, "a_writer")
    assert [m.content for m in unread] == ["opening", "for the writer"]
    assert [m.content for m in directed_unread_for(tmp_path, "a_writer")] == ["for the writer"]
    # The directed message is invisible to a third party.
    assert [m.content for m in unread_for(tmp_path, "a_expert")] == ["opening", "my own post"]
    assert unread_for(tmp_path, "") == []


def test_mark_seen_advances_a_cursor_and_never_moves_backwards(tmp_path: Path) -> None:
    post_message(tmp_path, from_agent="a", content="1")
    post_message(tmp_path, from_agent="a", content="2")

    assert cursor_for(tmp_path, "b") == 0
    assert mark_seen(tmp_path, "b", up_to_seq=1) == 1
    assert [m.content for m in unread_for(tmp_path, "b")] == ["2"]

    assert mark_seen(tmp_path, "b") == 2
    assert unread_for(tmp_path, "b") == []

    assert mark_seen(tmp_path, "b", up_to_seq=1) == 2
    with pytest.raises(SocietyMessageError):
        mark_seen(tmp_path, "")


def test_mark_seen_on_an_empty_bus_is_zero(tmp_path: Path) -> None:
    assert mark_seen(tmp_path, "a") == 0
    assert list_messages(tmp_path) == []
    assert recent_messages_summary(tmp_path) == ""


def test_recent_summary_renders_the_last_n_messages(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_SOCIETY_MESSAGE_SUMMARY_N", "2")
    assert message_summary_count() == 2

    post_message(tmp_path, from_agent="a", content="oldest")
    post_message(tmp_path, from_agent="b", content="middle", to_agent="a", thread_id="side")
    post_message(tmp_path, from_agent="c", content="newest", role="critic")

    summary = recent_messages_summary(tmp_path)
    assert "oldest" not in summary
    assert "middle" in summary and "newest" in summary
    assert "thread `side`" in summary
    assert "c (critic)" in summary
    assert "→ all" in summary


def test_render_truncates_long_content(tmp_path: Path) -> None:
    message = post_message(tmp_path, from_agent="a", content="y" * 4000)
    rendered = message.render(max_chars=100)
    assert "truncated" in rendered
    assert len(rendered) < 400


def test_ready_for_draft_marker(tmp_path: Path) -> None:
    assert latest_ready_for_draft(tmp_path) is None
    post_message(tmp_path, from_agent="a_critic", content="Still one gap open.")
    assert latest_ready_for_draft(tmp_path) is None

    post_message(tmp_path, from_agent="a_critic", content="Objections answered — READY_FOR_DRAFT")
    marker = latest_ready_for_draft(tmp_path)
    assert marker is not None
    assert marker.from_agent == "a_critic"
    assert marker.ready_for_draft is True


def test_message_round_trip_through_dicts() -> None:
    original = SocietyMessage(
        msg_id="m0001-a",
        from_agent="a",
        to_agent="b",
        thread_id="t",
        content="c",
        refs=["m0000-x"],
        ts="2026-07-29T00:00:00+00:00",
        seq=1,
        turn=3,
        role="critic",
    )
    assert SocietyMessage.from_dict(original.to_dict()) == original
    # Missing fields fall back to sane defaults.
    recovered = SocietyMessage.from_dict({"msg_id": "m", "from_agent": "a", "content": "x"})
    assert recovered.to_agent == BROADCAST
    assert recovered.thread_id == DEFAULT_THREAD_ID
    assert recovered.refs == []


def test_addressed_to(tmp_path: Path) -> None:
    broadcast = post_message(tmp_path, from_agent="a", content="all")
    directed = post_message(tmp_path, from_agent="a", content="you", to_agent="b")
    assert broadcast.addressed_to("anyone") is True
    assert directed.addressed_to("b") is True
    assert directed.addressed_to("c") is False
    assert directed.addressed_to("") is False


def test_corrupt_index_line_is_skipped(tmp_path: Path) -> None:
    post_message(tmp_path, from_agent="a", content="good")
    with (messages_dir(tmp_path) / "_index.jsonl").open("a", encoding="utf-8") as handle:
        handle.write("not json\n")
    assert [m.content for m in list_messages(tmp_path)] == ["good"]
