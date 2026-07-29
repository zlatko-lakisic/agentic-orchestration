"""Society session state on disk (K6.1, message bus in K6.2).

Layout under ``<tool_root>/__orchestrator_sessions__/societies/<slug>/``::

    meta.json        society_id, goal, roster, turn, budgets, blackboard path
    blackboard.md    append-only audit trail (also feeds the controller excerpt)
    transcript.jsonl one JSON object per turn (and per delegation / message)
    messages/        threaded message bus (K6.2, orchestration/society_messages.py)

Since K6.2 members read the bus rather than the whole blackboard; the blackboard stays as the
audit trail and the controller's input.
"""

from __future__ import annotations

import json
import os
import shutil
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from orchestration.orchestrator_session import (
    SESSION_DIR_NAME,
    safe_orchestrator_session_slug,
)
from orchestration.society_charter import SocietyCharter
from orchestration.society_messages import (
    BROADCAST,
    DEFAULT_THREAD_ID,
    MESSAGES_DIR_NAME,
    SocietyMessage,
    ensure_messages_dir,
    list_messages,
    mark_seen,
    post_message,
    read_thread,
    recent_messages_summary,
    unread_for,
)

SOCIETIES_DIR_NAME = "societies"
META_FILENAME = "meta.json"
BLACKBOARD_FILENAME = "blackboard.md"
TRANSCRIPT_FILENAME = "transcript.jsonl"

_BLACKBOARD_CHARS_ENV = "AGENTIC_SOCIETY_BLACKBOARD_CHARS"
_DEFAULT_BLACKBOARD_CHARS = 12000

STATUS_RUNNING = "running"
STATUS_DONE = "done"
STATUS_STOPPED = "stopped"
STATUS_FAILED = "failed"


class SocietySessionError(RuntimeError):
    """Raised when session state is missing or a budget is exhausted."""


def safe_society_slug(raw: str) -> str:
    """Filesystem-safe society session slug (same rules as orchestrator sessions)."""
    return safe_orchestrator_session_slug(raw)


def societies_root(tool_root: Path) -> Path:
    return (Path(tool_root) / SESSION_DIR_NAME / SOCIETIES_DIR_NAME).resolve()


def society_session_dir(tool_root: Path, slug: str) -> Path:
    return (societies_root(tool_root) / safe_society_slug(slug)).resolve()


def blackboard_excerpt_chars() -> int:
    raw = os.getenv(_BLACKBOARD_CHARS_ENV, "").strip()
    if not raw:
        return _DEFAULT_BLACKBOARD_CHARS
    try:
        return max(500, min(200_000, int(raw)))
    except ValueError:
        return _DEFAULT_BLACKBOARD_CHARS


@dataclass
class SocietySessionMeta:
    """On-disk ``meta.json`` for one society run."""

    version: int = 1
    society_id: str = ""
    slug: str = ""
    goal: str = ""
    protocol: str = "round_robin"
    interaction_mode: str = "blackboard"
    roster: list[dict[str, Any]] = field(default_factory=list)
    turn: int = 0
    max_turns: int = 0
    min_turns: int = 1
    delegations_used: int = 0
    max_delegations: int = 0
    status: str = STATUS_RUNNING
    stop_reason: str = ""
    blackboard_path: str = ""
    transcript_path: str = ""
    messages_path: str = ""
    charter_path: str = ""
    created_at: str = ""
    updated_at: str = ""

    def to_json_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_json_dict(cls, data: dict[str, Any]) -> SocietySessionMeta:
        roster = data.get("roster")
        if not isinstance(roster, list):
            roster = []
        return cls(
            version=int(data.get("version", 1) or 1),
            society_id=str(data.get("society_id", "")),
            slug=str(data.get("slug", "")),
            goal=str(data.get("goal", "")),
            protocol=str(data.get("protocol", "round_robin")),
            interaction_mode=str(data.get("interaction_mode", "blackboard")),
            roster=[dict(x) for x in roster if isinstance(x, dict)],
            turn=int(data.get("turn", 0) or 0),
            max_turns=int(data.get("max_turns", 0) or 0),
            min_turns=int(data.get("min_turns", 1) or 1),
            delegations_used=int(data.get("delegations_used", 0) or 0),
            max_delegations=int(data.get("max_delegations", 0) or 0),
            status=str(data.get("status", STATUS_RUNNING)),
            stop_reason=str(data.get("stop_reason", "")),
            blackboard_path=str(data.get("blackboard_path", "")),
            transcript_path=str(data.get("transcript_path", "")),
            messages_path=str(data.get("messages_path", "")),
            charter_path=str(data.get("charter_path", "")),
            created_at=str(data.get("created_at", "")),
            updated_at=str(data.get("updated_at", "")),
        )

    @property
    def turns_remaining(self) -> int:
        return max(0, int(self.max_turns) - int(self.turn))

    @property
    def delegations_remaining(self) -> int:
        return max(0, int(self.max_delegations) - int(self.delegations_used))


@dataclass
class SocietySession:
    """Handle for one society session directory."""

    directory: Path
    meta: SocietySessionMeta

    @property
    def meta_path(self) -> Path:
        return self.directory / META_FILENAME

    @property
    def blackboard_path(self) -> Path:
        return self.directory / BLACKBOARD_FILENAME

    @property
    def transcript_path(self) -> Path:
        return self.directory / TRANSCRIPT_FILENAME

    @property
    def messages_dir(self) -> Path:
        return self.directory / MESSAGES_DIR_NAME

    def post_message(
        self,
        *,
        from_agent: str,
        content: str,
        to_agent: str = BROADCAST,
        thread_id: str = DEFAULT_THREAD_ID,
        refs: list[str] | str | None = None,
        turn: int = 0,
        role: str = "",
    ) -> SocietyMessage:
        """Post to the session's message bus and mirror the post onto the transcript."""
        message = post_message(
            self.directory,
            from_agent=from_agent,
            content=content,
            to_agent=to_agent,
            thread_id=thread_id,
            refs=refs,
            turn=turn,
            role=role,
        )
        self.append_transcript(
            {
                "kind": "message",
                "turn": message.turn,
                "msg_id": message.msg_id,
                "from_agent": message.from_agent,
                "to_agent": message.to_agent,
                "thread_id": message.thread_id,
                "refs": list(message.refs),
            }
        )
        return message

    def messages(self, **kwargs: Any) -> list[SocietyMessage]:
        return list_messages(self.directory, **kwargs)

    def read_thread(self, thread_id: str, *, limit: int = 20) -> list[SocietyMessage]:
        return read_thread(self.directory, thread_id, limit=limit)

    def unread_for(self, agent_id: str) -> list[SocietyMessage]:
        return unread_for(self.directory, agent_id)

    def mark_seen(self, agent_id: str, *, up_to_seq: int | None = None) -> int:
        return mark_seen(self.directory, agent_id, up_to_seq=up_to_seq)

    def recent_messages_summary(self, *, limit: int | None = None) -> str:
        return recent_messages_summary(self.directory, limit=limit)

    def save(self) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        self.meta.updated_at = _now()
        self.meta_path.write_text(
            json.dumps(self.meta.to_json_dict(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def blackboard_text(self, *, max_chars: int | None = None) -> str:
        """Blackboard content, truncated from the front so the newest posts survive."""
        if not self.blackboard_path.is_file():
            return ""
        text = self.blackboard_path.read_text(encoding="utf-8")
        cap = blackboard_excerpt_chars() if max_chars is None else max(200, int(max_chars))
        if len(text) <= cap:
            return text
        return "…(earlier posts trimmed)…\n" + text[-cap:]

    def transcript_entries(self) -> list[dict[str, Any]]:
        if not self.transcript_path.is_file():
            return []
        out: list[dict[str, Any]] = []
        for line in self.transcript_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            try:
                parsed = json.loads(stripped)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                out.append(parsed)
        return out

    def append_transcript(self, entry: dict[str, Any]) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        payload = {"ts": _now(), **entry}
        with self.transcript_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, ensure_ascii=False) + "\n")

    def append_turn(
        self,
        *,
        turn_index: int,
        role: str,
        agent_provider_id: str,
        text: str,
        stop_reason: str = "",
    ) -> None:
        """Post a member's turn to the blackboard and transcript, then advance the turn counter."""
        body = str(text or "").strip()
        heading = f"## Turn {turn_index} — {role} ({agent_provider_id})"
        self.directory.mkdir(parents=True, exist_ok=True)
        with self.blackboard_path.open("a", encoding="utf-8") as handle:
            handle.write(f"{heading}\n\n{body or '(empty turn)'}\n\n")
        self.append_transcript(
            {
                "kind": "turn",
                "turn": int(turn_index),
                "role": role,
                "agent_provider_id": agent_provider_id,
                "text": body,
                "stop_reason": stop_reason,
            }
        )
        self.meta.turn = max(int(self.meta.turn), int(turn_index))
        if stop_reason:
            self.meta.stop_reason = stop_reason
        self.save()

    def increment_delegation(
        self,
        *,
        agent_provider_id: str = "",
        requested_by: str = "",
        task_description: str = "",
    ) -> int:
        """
        Reserve one delegation against the charter budget.

        Returns the new ``delegations_used``; raises ``SocietySessionError`` when the budget
        is exhausted so callers can surface a clean tool error instead of overspending.
        """
        if self.meta.delegations_remaining <= 0:
            raise SocietySessionError(
                f"delegation budget exhausted ({self.meta.delegations_used}/"
                f"{self.meta.max_delegations})"
            )
        self.meta.delegations_used += 1
        self.append_transcript(
            {
                "kind": "delegation",
                "turn": int(self.meta.turn),
                "requested_by": requested_by,
                "agent_provider_id": agent_provider_id,
                "task_description": str(task_description or "")[:2000],
                "delegations_used": self.meta.delegations_used,
                "max_delegations": self.meta.max_delegations,
            }
        )
        self.save()
        return self.meta.delegations_used

    def finish(self, *, status: str, stop_reason: str = "") -> None:
        self.meta.status = status
        if stop_reason:
            self.meta.stop_reason = stop_reason
        self.save()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_society_session(
    *,
    tool_root: Path,
    charter: SocietyCharter,
    goal: str,
    session_slug: str | None = None,
    reset: bool = True,
) -> SocietySession:
    """Create (or reset) the session directory for a society run."""
    slug = safe_society_slug(session_slug or charter.society_id)
    directory = society_session_dir(tool_root, slug)
    directory.mkdir(parents=True, exist_ok=True)

    if reset:
        for name in (BLACKBOARD_FILENAME, TRANSCRIPT_FILENAME):
            target = directory / name
            if target.exists():
                target.unlink()
        stale = directory / MESSAGES_DIR_NAME
        if stale.is_dir():
            shutil.rmtree(stale, ignore_errors=True)
    ensure_messages_dir(directory)

    meta = SocietySessionMeta(
        society_id=charter.society_id,
        slug=slug,
        goal=str(goal or "").strip(),
        protocol=charter.protocol,
        interaction_mode=charter.interaction_mode,
        roster=[m.to_dict() for m in charter.members],
        turn=0,
        max_turns=charter.max_turns,
        min_turns=charter.min_turns,
        delegations_used=0,
        max_delegations=charter.max_delegations,
        status=STATUS_RUNNING,
        blackboard_path=str(directory / BLACKBOARD_FILENAME),
        transcript_path=str(directory / TRANSCRIPT_FILENAME),
        messages_path=str(directory / MESSAGES_DIR_NAME),
        charter_path=charter.source_path,
        created_at=_now(),
    )
    session = SocietySession(directory=directory, meta=meta)
    session.save()

    header = (
        f"# Society blackboard — {charter.society_id}\n\n"
        f"**Goal:** {meta.goal or '(none)'}\n\n"
        f"**Roster:** {charter.roster_summary()}\n\n"
        f"**Budgets:** max_turns={charter.max_turns}, max_delegations={charter.max_delegations}\n\n"
    )
    if not session.blackboard_path.exists():
        session.blackboard_path.write_text(header, encoding="utf-8")
    session.append_transcript(
        {
            "kind": "society_start",
            "society_id": charter.society_id,
            "goal": meta.goal,
            "roster": meta.roster,
            "max_turns": charter.max_turns,
            "max_delegations": charter.max_delegations,
        }
    )
    return session


def load_society_session(tool_root: Path, slug: str) -> SocietySession:
    """Load an existing society session; raises when ``meta.json`` is missing."""
    directory = society_session_dir(tool_root, slug)
    meta_path = directory / META_FILENAME
    if not meta_path.is_file():
        raise SocietySessionError(f"society session not found: {meta_path}")
    raw = json.loads(meta_path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise SocietySessionError(f"invalid society meta.json: {meta_path}")
    return SocietySession(directory=directory, meta=SocietySessionMeta.from_json_dict(raw))


def list_society_sessions(tool_root: Path) -> list[str]:
    root = societies_root(tool_root)
    if not root.is_dir():
        return []
    return sorted(p.name for p in root.iterdir() if (p / META_FILENAME).is_file())
