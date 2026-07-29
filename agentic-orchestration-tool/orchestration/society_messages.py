"""Threaded society message bus (K6.2).

Messages live next to the session under ``<session_dir>/messages/``::

    messages/{msg_id}.json   one message per file
    messages/_index.jsonl    append-only ordering + cheap listing
    messages/_cursors.json   per-agent "last message I have seen" cursors

This replaces stuffing the whole markdown blackboard into every turn: members read the
threads they care about and post replies, while ``blackboard.md`` stays as the audit trail.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

MESSAGES_DIR_NAME = "messages"
INDEX_FILENAME = "_index.jsonl"
CURSORS_FILENAME = "_cursors.json"

BROADCAST = "broadcast"
DEFAULT_THREAD_ID = "main"

READY_FOR_DRAFT_MARKER = "ready_for_draft"

_CONTENT_CHARS_ENV = "AGENTIC_SOCIETY_MESSAGE_CHARS"
_DEFAULT_CONTENT_CHARS = 8000
_SUMMARY_N_ENV = "AGENTIC_SOCIETY_MESSAGE_SUMMARY_N"
_DEFAULT_SUMMARY_N = 8
_SUMMARY_CHARS_ENV = "AGENTIC_SOCIETY_MESSAGE_SUMMARY_CHARS"
_DEFAULT_SUMMARY_CHARS = 700

_SAFE_ID_RE = re.compile(r"[^A-Za-z0-9._-]+")


class SocietyMessageError(ValueError):
    """Raised when a message cannot be written or a thread id is unusable."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _env_int(key: str, default: int, *, floor: int, ceiling: int) -> int:
    raw = os.getenv(key, "").strip()
    if not raw:
        return default
    try:
        return max(floor, min(ceiling, int(raw)))
    except ValueError:
        return default


def message_content_chars() -> int:
    """Per-message content cap, so one runaway post cannot fill the bus."""
    return _env_int(_CONTENT_CHARS_ENV, _DEFAULT_CONTENT_CHARS, floor=200, ceiling=200_000)


def message_summary_count() -> int:
    """How many recent messages are summarized into a turn description."""
    return _env_int(_SUMMARY_N_ENV, _DEFAULT_SUMMARY_N, floor=1, ceiling=200)


def message_summary_chars() -> int:
    """Per-message excerpt length inside the recent-messages summary."""
    return _env_int(_SUMMARY_CHARS_ENV, _DEFAULT_SUMMARY_CHARS, floor=80, ceiling=20_000)


def safe_message_component(raw: str, *, fallback: str = "") -> str:
    """Filesystem-safe thread / agent id component."""
    cleaned = _SAFE_ID_RE.sub("-", str(raw or "").strip()).strip("-._")
    return cleaned[:120] or fallback


@dataclass(frozen=True)
class SocietyMessage:
    """One post on the bus."""

    msg_id: str
    from_agent: str
    to_agent: str
    thread_id: str
    content: str
    refs: list[str] = field(default_factory=list)
    ts: str = ""
    seq: int = 0
    turn: int = 0
    role: str = ""

    @property
    def is_broadcast(self) -> bool:
        return self.to_agent == BROADCAST

    @property
    def ready_for_draft(self) -> bool:
        return READY_FOR_DRAFT_MARKER in self.content.lower()

    def addressed_to(self, agent_id: str) -> bool:
        target = str(agent_id or "").strip()
        return bool(target) and (self.is_broadcast or self.to_agent == target)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> SocietyMessage:
        refs = data.get("refs")
        if not isinstance(refs, list):
            refs = []
        return cls(
            msg_id=str(data.get("msg_id", "")),
            from_agent=str(data.get("from_agent", "")),
            to_agent=str(data.get("to_agent", BROADCAST) or BROADCAST),
            thread_id=str(data.get("thread_id", DEFAULT_THREAD_ID) or DEFAULT_THREAD_ID),
            content=str(data.get("content", "")),
            refs=[str(r) for r in refs if str(r).strip()],
            ts=str(data.get("ts", "")),
            seq=int(data.get("seq", 0) or 0),
            turn=int(data.get("turn", 0) or 0),
            role=str(data.get("role", "")),
        )

    def render(self, *, max_chars: int | None = None) -> str:
        """One-block human/LLM readable form."""
        cap = message_summary_chars() if max_chars is None else max(40, int(max_chars))
        body = self.content.strip()
        if len(body) > cap:
            body = body[:cap].rstrip() + " …(truncated; use society_read_thread for the full post)"
        target = "all" if self.is_broadcast else f"@{self.to_agent}"
        who = f"{self.from_agent}" + (f" ({self.role})" if self.role else "")
        head = f"[{self.msg_id}] {who} → {target} · thread `{self.thread_id}`"
        if self.refs:
            head += " · refs " + ", ".join(self.refs)
        return f"{head}\n{body or '(empty message)'}"


def messages_dir(session_dir: Path) -> Path:
    return Path(session_dir) / MESSAGES_DIR_NAME


def ensure_messages_dir(session_dir: Path) -> Path:
    target = messages_dir(session_dir)
    target.mkdir(parents=True, exist_ok=True)
    return target


def index_path(session_dir: Path) -> Path:
    return messages_dir(session_dir) / INDEX_FILENAME


def cursors_path(session_dir: Path) -> Path:
    return messages_dir(session_dir) / CURSORS_FILENAME


def _next_seq(session_dir: Path) -> int:
    path = index_path(session_dir)
    if not path.is_file():
        return 1
    count = 0
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            count += 1
    return count + 1


def _message_path(session_dir: Path, msg_id: str) -> Path:
    return messages_dir(session_dir) / f"{msg_id}.json"


def post_message(
    session_dir: Path,
    *,
    from_agent: str,
    content: str,
    to_agent: str = BROADCAST,
    thread_id: str = DEFAULT_THREAD_ID,
    refs: Iterable[str] | str | None = None,
    turn: int = 0,
    role: str = "",
) -> SocietyMessage:
    """Append one message to the bus and return it."""
    sender = str(from_agent or "").strip()
    if not sender:
        raise SocietyMessageError("from_agent must be non-empty")
    body = str(content or "").strip()
    if not body:
        raise SocietyMessageError("content must be non-empty")

    target = str(to_agent or BROADCAST).strip() or BROADCAST
    thread = safe_message_component(thread_id, fallback=DEFAULT_THREAD_ID)
    directory = ensure_messages_dir(session_dir)

    seq = _next_seq(session_dir)
    msg_id = f"m{seq:04d}-{safe_message_component(sender, fallback='agent')}"
    message = SocietyMessage(
        msg_id=msg_id,
        from_agent=sender,
        to_agent=target,
        thread_id=thread,
        content=body[: message_content_chars()],
        refs=_normalize_refs(refs),
        ts=_now(),
        seq=seq,
        turn=int(turn or 0),
        role=str(role or "").strip(),
    )

    (directory / f"{msg_id}.json").write_text(
        json.dumps(message.to_dict(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    with index_path(session_dir).open("a", encoding="utf-8") as handle:
        handle.write(
            json.dumps(
                {
                    "msg_id": msg_id,
                    "seq": seq,
                    "thread_id": thread,
                    "from_agent": sender,
                    "to_agent": target,
                    "ts": message.ts,
                },
                ensure_ascii=False,
            )
            + "\n"
        )
    return message


def _normalize_refs(refs: Iterable[str] | str | None) -> list[str]:
    if refs is None:
        return []
    if isinstance(refs, str):
        candidates = re.split(r"[,\s]+", refs)
    else:
        candidates = [str(r) for r in refs]
    out: list[str] = []
    for candidate in candidates:
        text = str(candidate or "").strip()
        if text and text not in out:
            out.append(text)
    return out[:20]


def list_messages(
    session_dir: Path,
    *,
    thread_id: str = "",
    to_agent: str = "",
    from_agent: str = "",
    since_seq: int = 0,
    limit: int = 0,
) -> list[SocietyMessage]:
    """All messages in post order, optionally filtered. ``limit`` keeps the newest N."""
    directory = messages_dir(session_dir)
    if not directory.is_dir():
        return []

    ordered_ids = _indexed_ids(session_dir)
    if not ordered_ids:
        ordered_ids = sorted(p.stem for p in directory.glob("*.json") if not p.name.startswith("_"))

    out: list[SocietyMessage] = []
    for msg_id in ordered_ids:
        message = read_message(session_dir, msg_id)
        if message is None:
            continue
        if thread_id and message.thread_id != safe_message_component(thread_id):
            continue
        if to_agent and message.to_agent != to_agent:
            continue
        if from_agent and message.from_agent != from_agent:
            continue
        if since_seq and message.seq <= int(since_seq):
            continue
        out.append(message)

    out.sort(key=lambda m: (m.seq, m.ts))
    if limit and limit > 0:
        return out[-int(limit) :]
    return out


def _indexed_ids(session_dir: Path) -> list[str]:
    path = index_path(session_dir)
    if not path.is_file():
        return []
    ids: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError:
            continue
        msg_id = str((parsed or {}).get("msg_id", "")).strip()
        if msg_id:
            ids.append(msg_id)
    return ids


def read_message(session_dir: Path, msg_id: str) -> SocietyMessage | None:
    path = _message_path(session_dir, safe_message_component(msg_id))
    if not path.is_file():
        return None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    if not isinstance(raw, dict):
        return None
    return SocietyMessage.from_dict(raw)


def read_thread(session_dir: Path, thread_id: str, *, limit: int = 20) -> list[SocietyMessage]:
    """Newest ``limit`` messages on one thread, oldest first."""
    return list_messages(session_dir, thread_id=thread_id, limit=max(1, int(limit or 1)))


def list_threads(session_dir: Path) -> list[str]:
    seen: list[str] = []
    for message in list_messages(session_dir):
        if message.thread_id not in seen:
            seen.append(message.thread_id)
    return seen


def unread_for(session_dir: Path, agent_id: str) -> list[SocietyMessage]:
    """Messages addressed to ``agent_id`` (directed or broadcast) after its cursor."""
    target = str(agent_id or "").strip()
    if not target:
        return []
    cursor = cursor_for(session_dir, target)
    return [
        m
        for m in list_messages(session_dir, since_seq=cursor)
        if m.from_agent != target and m.addressed_to(target)
    ]


def directed_unread_for(session_dir: Path, agent_id: str) -> list[SocietyMessage]:
    """Unread messages sent *specifically* to ``agent_id`` (no broadcasts)."""
    return [m for m in unread_for(session_dir, agent_id) if not m.is_broadcast]


def _read_cursors(session_dir: Path) -> dict[str, int]:
    path = cursors_path(session_dir)
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    if not isinstance(raw, dict):
        return {}
    out: dict[str, int] = {}
    for key, value in raw.items():
        try:
            out[str(key)] = int(value)
        except (TypeError, ValueError):
            continue
    return out


def cursor_for(session_dir: Path, agent_id: str) -> int:
    return _read_cursors(session_dir).get(str(agent_id or "").strip(), 0)


def mark_seen(session_dir: Path, agent_id: str, *, up_to_seq: int | None = None) -> int:
    """
    Advance one agent's read cursor. With no ``up_to_seq``, marks everything posted so far.

    Returns the new cursor value.
    """
    target = str(agent_id or "").strip()
    if not target:
        raise SocietyMessageError("agent_id must be non-empty")
    ensure_messages_dir(session_dir)
    cursors = _read_cursors(session_dir)
    if up_to_seq is None:
        messages = list_messages(session_dir)
        new_value = messages[-1].seq if messages else 0
    else:
        new_value = max(0, int(up_to_seq))
    cursors[target] = max(cursors.get(target, 0), new_value)
    cursors_path(session_dir).write_text(
        json.dumps(cursors, indent=2, sort_keys=True, ensure_ascii=False),
        encoding="utf-8",
    )
    return cursors[target]


def recent_messages_summary(
    session_dir: Path,
    *,
    limit: int | None = None,
    max_chars: int | None = None,
) -> str:
    """Rendered block of the last N messages, for injection into a turn description."""
    count = message_summary_count() if limit is None else max(1, int(limit))
    messages = list_messages(session_dir, limit=count)
    if not messages:
        return ""
    return "\n\n".join(m.render(max_chars=max_chars) for m in messages)


def latest_ready_for_draft(session_dir: Path) -> SocietyMessage | None:
    """Most recent message carrying the ``ready_for_draft`` marker."""
    for message in reversed(list_messages(session_dir)):
        if message.ready_for_draft:
            return message
    return None
