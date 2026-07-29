"""CrewAI tools over the society message bus (K6.2).

Attached to every member turn by ``society_runtime`` (mirroring ``attach_delegate_task_tool``)
so a member can post to a thread, pull a thread it has not seen, and look up who else is in
the room — instead of relying on the whole blackboard being pasted into its prompt.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from crewai.tools import BaseTool

from orchestration.society_messages import (
    BROADCAST,
    DEFAULT_THREAD_ID,
    SocietyMessageError,
    list_threads,
    post_message,
    read_thread,
)

MESSAGE_TOOLS_ENV = "AGENTIC_SOCIETY_MESSAGE_TOOLS"
SOCIETY_TOOL_NAMES: tuple[str, ...] = (
    "society_post",
    "society_read_thread",
    "society_list_agents",
)

_MAX_READ_LIMIT = 50


def message_tools_enabled_from_env() -> bool:
    """Message tools default ON for societies; ``AGENTIC_SOCIETY_MESSAGE_TOOLS=0`` opts out."""
    return os.getenv(MESSAGE_TOOLS_ENV, "1").strip().lower() not in ("0", "false", "no", "off")


class SocietyPostTool(BaseTool):
    name: str = "society_post"
    description: str = (
        "Post a message to the panel's threaded message bus so other members can read it "
        "later. Use to answer someone directly, raise a question, or hand work over. "
        "Arguments: content (your message), to_agent (an agent_provider_id, or 'broadcast' "
        "for everyone), thread_id (reuse an existing thread id to keep a conversation "
        "together), refs (comma-separated message ids you are replying to). "
        "Your final answer is broadcast automatically, so use this tool for directed or "
        "threaded messages, not to repeat your whole turn."
    )

    def __init__(
        self,
        *,
        session_dir: Path,
        from_agent: str,
        role: str = "",
        turn: int = 0,
        known_agent_ids: list[str] | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self._session_dir = Path(session_dir)
        self._from_agent = str(from_agent or "").strip()
        self._role = str(role or "").strip()
        self._turn = int(turn or 0)
        self._known_ids = [str(x).strip() for x in (known_agent_ids or []) if str(x).strip()]

    def _run(
        self,
        content: str,
        to_agent: str = BROADCAST,
        thread_id: str = "",
        refs: str = "",
    ) -> str:
        target = str(to_agent or BROADCAST).strip() or BROADCAST
        if target != BROADCAST and self._known_ids and target not in self._known_ids:
            return (
                f"Post refused: unknown to_agent {target!r}. Panel members are "
                f"{self._known_ids!r}, or use 'broadcast'."
            )
        try:
            message = post_message(
                self._session_dir,
                from_agent=self._from_agent,
                content=content,
                to_agent=target,
                thread_id=str(thread_id or "").strip() or DEFAULT_THREAD_ID,
                refs=refs,
                turn=self._turn,
                role=self._role,
            )
        except SocietyMessageError as exc:
            return f"Post refused: {exc}"
        except Exception as exc:  # noqa: BLE001
            return f"Post failed: {exc}"
        return (
            f"Posted {message.msg_id} to thread `{message.thread_id}` "
            f"(to {message.to_agent})."
        )


class SocietyReadThreadTool(BaseTool):
    name: str = "society_read_thread"
    description: str = (
        "Read the recent messages on one panel thread, oldest first. Arguments: thread_id "
        "(use 'main' for the default thread) and limit (how many recent messages, default "
        "20). Read a thread before replying to it so you build on what was said instead of "
        "repeating it."
    )

    def __init__(self, *, session_dir: Path, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self._session_dir = Path(session_dir)

    def _run(self, thread_id: str = DEFAULT_THREAD_ID, limit: int = 20) -> str:
        try:
            count = max(1, min(_MAX_READ_LIMIT, int(limit)))
        except (TypeError, ValueError):
            count = 20
        thread = str(thread_id or "").strip() or DEFAULT_THREAD_ID
        messages = read_thread(self._session_dir, thread, limit=count)
        if not messages:
            known = list_threads(self._session_dir)
            hint = f" Known threads: {known!r}." if known else " No messages posted yet."
            return f"Thread `{thread}` has no messages.{hint}"
        rendered = "\n\n".join(m.render() for m in messages)
        return f"Thread `{thread}` — {len(messages)} recent message(s):\n\n{rendered}"


class SocietyListAgentsTool(BaseTool):
    name: str = "society_list_agents"
    description: str = (
        "List the panel roster: each member's agent_provider_id and role. Use it to find the "
        "right to_agent value before posting a directed message with society_post."
    )

    def __init__(self, *, roster: list[dict[str, str]], **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self._roster = [dict(x) for x in (roster or [])]

    def _run(self) -> str:
        if not self._roster:
            return "Roster unavailable."
        lines = [
            f"- `{r.get('agent_provider_id', '')}` — {r.get('role', 'member')}"
            for r in self._roster
        ]
        return "Panel roster:\n" + "\n".join(lines)


def build_society_message_tools(
    *,
    session_dir: Path,
    from_agent: str,
    role: str = "",
    turn: int = 0,
    roster: list[dict[str, str]] | None = None,
) -> list[BaseTool]:
    entries = [dict(x) for x in (roster or [])]
    known_ids = [str(r.get("agent_provider_id") or "").strip() for r in entries]
    return [
        SocietyPostTool(
            session_dir=session_dir,
            from_agent=from_agent,
            role=role,
            turn=turn,
            known_agent_ids=[x for x in known_ids if x],
        ),
        SocietyReadThreadTool(session_dir=session_dir),
        SocietyListAgentsTool(roster=entries),
    ]


def attach_society_message_tools(
    built: Any,
    *,
    session: Any,
    member: Any,
    turn: int = 0,
    enabled: bool | None = None,
) -> bool:
    """
    Add ``society_post`` / ``society_read_thread`` / ``society_list_agents`` to every agent
    in a built single-step crew. Returns whether the tools were attached.
    """
    active = message_tools_enabled_from_env() if enabled is None else bool(enabled)
    if not active:
        return False

    session_dir = getattr(session, "directory", None)
    if session_dir is None:
        return False

    roster = [dict(x) for x in (getattr(getattr(session, "meta", None), "roster", None) or [])]
    tools = build_society_message_tools(
        session_dir=Path(session_dir),
        from_agent=str(getattr(member, "agent_provider_id", "") or ""),
        role=str(getattr(member, "role", "") or ""),
        turn=turn,
        roster=roster,
    )
    for agent in built.crew.agents:
        existing = list(getattr(agent, "tools", None) or [])
        agent.tools = [*existing, *tools]
    return True
