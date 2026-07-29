"""Turn protocol engine (K6.2).

``select_next_member`` decides who speaks next. ``round_robin`` (and its ``hierarchical``
alias) is pure arithmetic; ``moderator_picks`` and ``reactive`` read the message bus, so the
panel can follow the facilitator's hand-offs or whoever has unread mail. Every protocol falls
back to round-robin rather than stalling, and no protocol can hand the floor to the member who
just spoke twice in a row.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from orchestration.society_charter import (
    FACILITATOR_ROLE,
    SocietyCharter,
    SocietyMember,
)
from orchestration.society_messages import (
    latest_ready_for_draft,
    list_messages,
    unread_for,
)

PROTOCOL_ROUND_ROBIN = "round_robin"
PROTOCOL_HIERARCHICAL = "hierarchical"
PROTOCOL_MODERATOR_PICKS = "moderator_picks"
PROTOCOL_REACTIVE = "reactive"

# Roles that pick up the pen once someone marks the discussion ``ready_for_draft``.
DRAFTER_ROLES: tuple[str, ...] = ("writer", "author", "editor", "scribe", "domain_expert")


def select_next_member(
    protocol: str,
    charter: SocietyCharter,
    session: Any,
    turn_index: int,
    *,
    last_posts: dict[str, str] | None = None,
) -> SocietyMember:
    """
    Pick the member who speaks on 1-based ``turn_index``.

    ``last_posts`` maps ``agent_provider_id`` to that member's most recent turn text; it lets
    ``moderator_picks`` honour a hand-off even when the model never called ``society_post``.
    """
    if turn_index < 1:
        raise ValueError("turn_index is 1-based")

    name = str(protocol or "").strip().lower()
    session_dir = _session_dir(session)

    if name == PROTOCOL_MODERATOR_PICKS:
        picked = _moderator_pick(charter, session_dir, turn_index, last_posts or {})
    elif name == PROTOCOL_REACTIVE:
        picked = _reactive_pick(charter, session_dir)
    else:
        # round_robin, the hierarchical alias, and anything unrecognized.
        picked = None

    if picked is None:
        return charter.member_for_turn(turn_index)
    return picked


def _session_dir(session: Any) -> Path | None:
    directory = getattr(session, "directory", None)
    return Path(directory) if directory else None


def _member_by_role(charter: SocietyCharter, role: str) -> SocietyMember | None:
    target = str(role or "").strip().lower()
    for member in charter.members:
        if member.role == target:
            return member
    return None


def facilitator_member(charter: SocietyCharter) -> SocietyMember | None:
    return _member_by_role(charter, FACILITATOR_ROLE)


def drafter_member(charter: SocietyCharter) -> SocietyMember | None:
    """First roster member holding a drafting role, in ``DRAFTER_ROLES`` preference order."""
    for role in DRAFTER_ROLES:
        member = _member_by_role(charter, role)
        if member is not None:
            return member
    return None


def last_speaker_id(session: Any, last_posts: dict[str, str] | None = None) -> str:
    """Who spoke on the previous turn, from the bus first and the transcript second."""
    from_bus = _last_speaker_from_dir(_session_dir(session))
    if from_bus:
        return from_bus
    entries = getattr(session, "transcript_entries", None)
    if callable(entries):
        for entry in reversed(entries() or []):
            if isinstance(entry, dict) and entry.get("kind") == "turn":
                return str(entry.get("agent_provider_id", ""))
    if last_posts:
        return list(last_posts)[-1]
    return ""


def _last_speaker_from_dir(session_dir: Path | None) -> str:
    """Sender of the newest turn-output broadcast, i.e. whoever held the floor last."""
    if session_dir is None:
        return ""
    for message in reversed(list_messages(session_dir)):
        if message.turn > 0:
            return message.from_agent
    return ""


def pending_draft_member(
    charter: SocietyCharter,
    session_dir: Path | None,
) -> SocietyMember | None:
    """
    The drafter, when someone has marked the discussion ``ready_for_draft`` and the drafter
    has not posted since. This is the K6.2 exit criterion: the writer runs only after the
    critic says the draft can start.
    """
    if session_dir is None:
        return None
    marker = latest_ready_for_draft(session_dir)
    if marker is None:
        return None
    drafter = drafter_member(charter)
    if drafter is None or drafter.agent_provider_id == marker.from_agent:
        return None
    spoken_since = [
        m
        for m in list_messages(session_dir, since_seq=marker.seq)
        if m.from_agent == drafter.agent_provider_id
    ]
    return None if spoken_since else drafter


def _moderator_pick(
    charter: SocietyCharter,
    session_dir: Path | None,
    turn_index: int,
    last_posts: dict[str, str],
) -> SocietyMember | None:
    facilitator = facilitator_member(charter)
    if facilitator is None:
        return None
    if turn_index == 1:
        return facilitator

    drafting = pending_draft_member(charter, session_dir)
    if drafting is not None:
        return drafting

    previous = _last_speaker_from_dir(session_dir) or (
        list(last_posts)[-1] if last_posts else ""
    )
    text = _latest_facilitator_text(facilitator, session_dir, last_posts)
    nominee = _parse_nomination(charter, text, speaker=facilitator)
    # A stale nomination (the named member already spoke) hands the floor back to the chair.
    if nominee is None or nominee.agent_provider_id == previous:
        if facilitator.agent_provider_id != previous:
            return facilitator
        return _next_after(charter, previous)
    return nominee


def _latest_facilitator_text(
    facilitator: SocietyMember,
    session_dir: Path | None,
    last_posts: dict[str, str],
) -> str:
    if session_dir is not None:
        posts = list_messages(session_dir, from_agent=facilitator.agent_provider_id)
        if posts:
            return posts[-1].content
    return str(last_posts.get(facilitator.agent_provider_id, "") or "")


def _parse_nomination(
    charter: SocietyCharter,
    text: str,
    *,
    speaker: SocietyMember,
) -> SocietyMember | None:
    """
    Last member named in the facilitator's post, by catalog id or role.

    Deliberately shallow: facilitators tend to close with the hand-off ("Critic, your turn"),
    so the last mention that is not the facilitator itself wins.
    """
    body = str(text or "")
    if not body:
        return None

    hits: list[tuple[int, SocietyMember]] = []
    for member in charter.members:
        if member.agent_provider_id == speaker.agent_provider_id:
            continue
        for needle in (member.agent_provider_id, member.role, member.role.replace("_", " ")):
            if not needle:
                continue
            for match in re.finditer(re.escape(needle), body, flags=re.IGNORECASE):
                hits.append((match.start(), member))
    if not hits:
        return None
    hits.sort(key=lambda pair: pair[0])
    return hits[-1][1]


def _reactive_pick(
    charter: SocietyCharter,
    session_dir: Path | None,
) -> SocietyMember | None:
    if session_dir is None:
        return None

    drafting = pending_draft_member(charter, session_dir)
    if drafting is not None:
        return drafting

    previous = _last_speaker_from_dir(session_dir)
    candidates = [m for m in charter.members if m.agent_provider_id != previous]

    directed: list[SocietyMember] = []
    broadcast: list[SocietyMember] = []
    for member in candidates:
        pending = unread_for(session_dir, member.agent_provider_id)
        if not pending:
            continue
        if any(not m.is_broadcast for m in pending):
            directed.append(member)
        else:
            broadcast.append(member)

    waiting = _by_silence(charter, session_dir, directed or broadcast)
    if waiting:
        return waiting[0]

    facilitator = facilitator_member(charter)
    if facilitator is not None and facilitator.agent_provider_id != previous:
        return facilitator
    return _next_after(charter, previous)


def _by_silence(
    charter: SocietyCharter,
    session_dir: Path,
    members: list[SocietyMember],
) -> list[SocietyMember]:
    """Order members by how long they have been silent (never spoken first)."""
    recency = _speaking_recency(session_dir)
    seats = {m.agent_provider_id: i for i, m in enumerate(charter.members)}
    return sorted(
        members,
        key=lambda m: (recency.get(m.agent_provider_id, -1), seats.get(m.agent_provider_id, 0)),
    )


def _speaking_recency(session_dir: Path) -> dict[str, int]:
    """Map agent id to the position of its most recent turn output on the bus."""
    order: dict[str, int] = {}
    for i, message in enumerate(list_messages(session_dir)):
        if message.turn > 0:
            order[message.from_agent] = i
    return order


def _next_after(charter: SocietyCharter, previous_id: str) -> SocietyMember | None:
    """
    The seat after ``previous_id``, so no protocol hands the same member two turns in a row.

    ``None`` means "no opinion" and lets the caller fall back to plain round-robin.
    """
    members = list(charter.members)
    for i, member in enumerate(members):
        if member.agent_provider_id == previous_id:
            return members[(i + 1) % len(members)]
    return None


def unread_counts(session: Any, charter: SocietyCharter) -> dict[str, int]:
    """Per-member unread count — how much mail each seat is sitting on right now."""
    session_dir = _session_dir(session)
    if session_dir is None:
        return {m.agent_provider_id: 0 for m in charter.members}
    return {
        m.agent_provider_id: len(unread_for(session_dir, m.agent_provider_id))
        for m in charter.members
    }
