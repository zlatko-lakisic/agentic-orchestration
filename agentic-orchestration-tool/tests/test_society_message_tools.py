from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from orchestration.society_message_tools import (
    SOCIETY_TOOL_NAMES,
    SocietyListAgentsTool,
    SocietyPostTool,
    SocietyReadThreadTool,
    attach_society_message_tools,
    message_tools_enabled_from_env,
)
from orchestration.society_messages import list_messages, post_message

ROSTER = [
    {"agent_provider_id": "a_facilitator", "role": "facilitator"},
    {"agent_provider_id": "a_critic", "role": "critic"},
    {"agent_provider_id": "a_writer", "role": "writer"},
]


class _FakeAgent:
    def __init__(self, tools: list[Any] | None = None) -> None:
        self.tools = list(tools or [])


class _FakeCrew:
    def __init__(self, agents: list[_FakeAgent]) -> None:
        self.agents = agents


class _FakeBuilt:
    def __init__(self, agents: list[_FakeAgent]) -> None:
        self.crew = _FakeCrew(agents)


class _FakeMeta:
    def __init__(self) -> None:
        self.roster = [dict(r) for r in ROSTER]


class _FakeSession:
    def __init__(self, directory: Path) -> None:
        self.directory = directory
        self.meta = _FakeMeta()


class _FakeMember:
    agent_provider_id = "a_facilitator"
    role = "facilitator"


def _post_tool(tmp_path: Path, **kwargs: Any) -> SocietyPostTool:
    kwargs.setdefault("session_dir", tmp_path)
    kwargs.setdefault("from_agent", "a_facilitator")
    kwargs.setdefault("role", "facilitator")
    kwargs.setdefault("turn", 1)
    kwargs.setdefault("known_agent_ids", [r["agent_provider_id"] for r in ROSTER])
    return SocietyPostTool(**kwargs)


def test_tool_names_are_the_documented_three() -> None:
    assert SOCIETY_TOOL_NAMES == ("society_post", "society_read_thread", "society_list_agents")
    assert SocietyPostTool(session_dir=Path("."), from_agent="a").name == "society_post"
    assert SocietyReadThreadTool(session_dir=Path(".")).name == "society_read_thread"
    assert SocietyListAgentsTool(roster=[]).name == "society_list_agents"


def test_post_writes_a_message_with_thread_and_refs(tmp_path: Path) -> None:
    out = _post_tool(tmp_path)._run(
        content="Critic, defend the latency claim.",
        to_agent="a_critic",
        thread_id="latency",
        refs="m0001-a_writer",
    )
    assert "Posted" in out and "latency" in out

    messages = list_messages(tmp_path)
    assert len(messages) == 1
    assert messages[0].from_agent == "a_facilitator"
    assert messages[0].to_agent == "a_critic"
    assert messages[0].thread_id == "latency"
    assert messages[0].refs == ["m0001-a_writer"]
    assert messages[0].turn == 1
    assert messages[0].role == "facilitator"


def test_post_defaults_to_broadcast_on_the_main_thread(tmp_path: Path) -> None:
    _post_tool(tmp_path)._run(content="Opening the panel.")
    message = list_messages(tmp_path)[0]
    assert message.to_agent == "broadcast"
    assert message.thread_id == "main"


def test_post_refuses_an_unknown_recipient(tmp_path: Path) -> None:
    out = _post_tool(tmp_path)._run(content="hi", to_agent="a_ghost")
    assert "refused" in out.lower()
    assert "a_ghost" in out
    assert list_messages(tmp_path) == []


def test_post_refuses_empty_content(tmp_path: Path) -> None:
    assert "refused" in _post_tool(tmp_path)._run(content="   ").lower()
    assert list_messages(tmp_path) == []


def test_post_allows_any_recipient_when_no_roster_is_known(tmp_path: Path) -> None:
    tool = SocietyPostTool(session_dir=tmp_path, from_agent="a", known_agent_ids=[])
    assert "Posted" in tool._run(content="hi", to_agent="whoever")


def test_read_thread_returns_recent_messages_oldest_first(tmp_path: Path) -> None:
    for i in range(3):
        post_message(tmp_path, from_agent="a_critic", content=f"critique {i}", thread_id="risk")

    out = SocietyReadThreadTool(session_dir=tmp_path)._run(thread_id="risk", limit=2)
    assert "critique 0" not in out
    assert out.index("critique 1") < out.index("critique 2")
    assert "2 recent message(s)" in out


def test_read_thread_reports_known_threads_when_empty(tmp_path: Path) -> None:
    post_message(tmp_path, from_agent="a", content="x", thread_id="risk")
    out = SocietyReadThreadTool(session_dir=tmp_path)._run(thread_id="absent")
    assert "has no messages" in out
    assert "risk" in out

    empty = SocietyReadThreadTool(session_dir=tmp_path / "nope")._run()
    assert "No messages posted yet" in empty


def test_read_thread_tolerates_a_bogus_limit(tmp_path: Path) -> None:
    post_message(tmp_path, from_agent="a", content="x")
    tool = SocietyReadThreadTool(session_dir=tmp_path)
    assert "x" in tool._run(thread_id="main", limit="many")  # type: ignore[arg-type]
    assert "x" in tool._run(thread_id="main", limit=-5)


def test_list_agents_renders_the_roster() -> None:
    out = SocietyListAgentsTool(roster=ROSTER)._run()
    assert "`a_critic`" in out and "critic" in out
    assert "`a_writer`" in out
    assert SocietyListAgentsTool(roster=[])._run() == "Roster unavailable."


def test_attach_adds_all_three_tools_to_every_agent(tmp_path: Path) -> None:
    built = _FakeBuilt([_FakeAgent(), _FakeAgent(["existing"])])
    assert attach_society_message_tools(
        built,
        session=_FakeSession(tmp_path),
        member=_FakeMember(),
        turn=2,
    )
    for agent in built.crew.agents:
        names = [getattr(t, "name", t) for t in agent.tools]
        assert names[-3:] == list(SOCIETY_TOOL_NAMES)
    assert "existing" in built.crew.agents[1].tools


def test_attached_post_tool_is_bound_to_the_member_and_turn(tmp_path: Path) -> None:
    built = _FakeBuilt([_FakeAgent()])
    attach_society_message_tools(
        built,
        session=_FakeSession(tmp_path),
        member=_FakeMember(),
        turn=4,
    )
    post = built.crew.agents[0].tools[0]
    post._run(content="a note")
    message = list_messages(tmp_path)[0]
    assert message.from_agent == "a_facilitator"
    assert message.role == "facilitator"
    assert message.turn == 4


def test_attach_can_be_disabled(tmp_path: Path) -> None:
    built = _FakeBuilt([_FakeAgent()])
    assert (
        attach_society_message_tools(
            built,
            session=_FakeSession(tmp_path),
            member=_FakeMember(),
            enabled=False,
        )
        is False
    )
    assert built.crew.agents[0].tools == []


def test_attach_needs_a_session_directory() -> None:
    built = _FakeBuilt([_FakeAgent()])
    assert attach_society_message_tools(built, session=object(), member=_FakeMember()) is False


def test_message_tools_default_on_and_opt_out(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_SOCIETY_MESSAGE_TOOLS", raising=False)
    assert message_tools_enabled_from_env() is True
    monkeypatch.setenv("AGENTIC_SOCIETY_MESSAGE_TOOLS", "0")
    assert message_tools_enabled_from_env() is False
    monkeypatch.setenv("AGENTIC_SOCIETY_MESSAGE_TOOLS", "off")
    assert message_tools_enabled_from_env() is False
    monkeypatch.setenv("AGENTIC_SOCIETY_MESSAGE_TOOLS", "1")
    assert message_tools_enabled_from_env() is True
