"""Society charter loading and validation (K6.1).

A charter is declarative YAML validated against
``config/schemas/society_charter.schema.json``: who is in the room, which turn protocol
runs, what the budgets are, and when to stop.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

import yaml

# Charter interaction modes (see docs/adr/0001-agent-societies-v1.md).
INTERACTION_MODES: tuple[str, ...] = (
    "handoff",
    "crew_delegation",
    "hierarchical",
    "blackboard",
    "delegate_rpc",
)
DEFAULT_INTERACTION_MODE = "blackboard"

# Turn protocols the runtime accepts (see orchestration/society_protocols.py). ``hierarchical``
# is an alias that still takes round-robin turns; a real CrewAI hierarchical crew ships as a
# reference workflow. ``moderator_picks`` and ``reactive`` (K6.2) read the message bus.
PROTOCOLS: tuple[str, ...] = (
    "round_robin",
    "hierarchical",
    "moderator_picks",
    "reactive",
)
DEFAULT_PROTOCOL = "round_robin"

KNOWN_SOCIETY_TOOLS: frozenset[str] = frozenset(
    {
        "delegate_task",
        "k8s_delegate_task",
        "society_post",
        "society_read_thread",
        "society_list_agents",
    }
)

DEFAULT_MAX_TURNS = 12
DEFAULT_MAX_DELEGATIONS = 3
MAX_TURNS_CEILING = 200
MAX_DELEGATIONS_CEILING = 50
MAX_MEMBERS = 12

FACILITATOR_ROLE = "facilitator"
ANY_ROLE = "any"

_MAX_TURNS_ENV = "AGENTIC_SOCIETY_MAX_TURNS"
_MAX_DELEGATIONS_ENV = "AGENTIC_SOCIETY_MAX_DELEGATIONS"
_REQUIRE_CAPABLE_ENV = "AGENTIC_SOCIETY_REQUIRE_CAPABLE"


class SocietyCharterError(ValueError):
    """Raised when a charter file is missing, malformed, or exceeds guardrails."""


@dataclass(frozen=True)
class StopCondition:
    """A phrase that ends the run when a member posts it."""

    role: str
    phrase: str

    def matches(self, *, role: str, text: str) -> bool:
        if not self.phrase:
            return False
        if self.role != ANY_ROLE and self.role != str(role or "").strip().lower():
            return False
        return self.phrase.lower() in str(text or "").lower()

    def to_dict(self) -> dict[str, str]:
        return {"role": self.role, "posts": self.phrase}


@dataclass(frozen=True)
class SocietyMember:
    """One seat in the society, bound to an agent-provider catalog id."""

    agent_provider_id: str
    role: str
    charge: str = ""
    can_delegate: bool = False
    mcp_providers: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "agent_provider_id": self.agent_provider_id,
            "role": self.role,
            "charge": self.charge,
            "can_delegate": self.can_delegate,
            "mcp_providers": list(self.mcp_providers),
        }


@dataclass(frozen=True)
class SocietyCharter:
    """Validated charter: roster, protocol, budgets, and stop conditions."""

    society_id: str
    members: list[SocietyMember]
    protocol: str = DEFAULT_PROTOCOL
    interaction_mode: str = DEFAULT_INTERACTION_MODE
    max_turns: int = DEFAULT_MAX_TURNS
    max_delegations: int = DEFAULT_MAX_DELEGATIONS
    min_turns: int = 1
    stop_when: list[StopCondition] = field(default_factory=list)
    tools: list[str] = field(default_factory=list)
    mcp_providers: list[str] = field(default_factory=list)
    goal: str = ""
    description: str = ""
    source_path: str = ""

    @property
    def agent_provider_ids(self) -> list[str]:
        return [m.agent_provider_id for m in self.members]

    def member_for_turn(self, turn_index: int) -> SocietyMember:
        """Round-robin seat for a 1-based turn index."""
        if turn_index < 1:
            raise ValueError("turn_index is 1-based")
        return self.members[(turn_index - 1) % len(self.members)]

    def delegation_allowed(self) -> bool:
        return self.max_delegations > 0 and any(m.can_delegate for m in self.members)

    def matched_stop_condition(self, *, role: str, text: str) -> StopCondition | None:
        for cond in self.stop_when:
            if cond.matches(role=role, text=text):
                return cond
        return None

    def roster_summary(self) -> str:
        return ", ".join(f"{m.role}={m.agent_provider_id}" for m in self.members)

    def to_dict(self) -> dict[str, Any]:
        return {
            "society_id": self.society_id,
            "protocol": self.protocol,
            "interaction_mode": self.interaction_mode,
            "max_turns": self.max_turns,
            "max_delegations": self.max_delegations,
            "min_turns": self.min_turns,
            "members": [m.to_dict() for m in self.members],
            "stop_when": [c.to_dict() for c in self.stop_when],
            "tools": list(self.tools),
            "mcp_providers": list(self.mcp_providers),
            "goal": self.goal,
            "description": self.description,
            "source_path": self.source_path,
        }


def _env_int(key: str, default: int, *, ceiling: int, floor: int = 0) -> int:
    raw = os.getenv(key, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return max(floor, min(ceiling, value))


def default_max_turns() -> int:
    return _env_int(_MAX_TURNS_ENV, DEFAULT_MAX_TURNS, ceiling=MAX_TURNS_CEILING, floor=1)


def default_max_delegations() -> int:
    return _env_int(
        _MAX_DELEGATIONS_ENV,
        DEFAULT_MAX_DELEGATIONS,
        ceiling=MAX_DELEGATIONS_CEILING,
    )


def society_capable_required() -> bool:
    """Whether members must carry ``society_capable: true`` in the catalog (default yes)."""
    return os.getenv(_REQUIRE_CAPABLE_ENV, "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def _str_list(value: Any, *, where: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise SocietyCharterError(f"{where} must be a list when set")
    out: list[str] = []
    for i, item in enumerate(value):
        text = str(item or "").strip()
        if not text:
            raise SocietyCharterError(f"{where}[{i}] must be a non-empty string")
        if text not in out:
            out.append(text)
    return out


def _parse_stop_condition(raw: Any, *, index: int) -> StopCondition:
    where = f"society.stop_when[{index}]"
    if not isinstance(raw, dict) or not raw:
        raise SocietyCharterError(f"{where} must be a non-empty mapping")

    if "posts" in raw:
        unknown = sorted(set(raw) - {"posts", "role"})
        if unknown:
            raise SocietyCharterError(f"{where} has unsupported keys: {unknown!r}")
        phrase = str(raw.get("posts") or "").strip()
        if not phrase:
            raise SocietyCharterError(f"{where}.posts must be a non-empty string")
        role = str(raw.get("role") or ANY_ROLE).strip().lower() or ANY_ROLE
        return StopCondition(role=role, phrase=phrase)

    if len(raw) != 1:
        raise SocietyCharterError(
            f"{where} shorthand must hold exactly one '<role>_posts' key"
        )
    key, value = next(iter(raw.items()))
    key_text = str(key or "").strip().lower()
    if not key_text.endswith("_posts"):
        raise SocietyCharterError(
            f"{where} key {key!r} must be '<role>_posts' (e.g. facilitator_posts) or use "
            "the explicit {role, posts} form"
        )
    phrase = str(value or "").strip()
    if not phrase:
        raise SocietyCharterError(f"{where}.{key_text} must be a non-empty string")
    role = key_text[: -len("_posts")] or ANY_ROLE
    return StopCondition(role=role, phrase=phrase)


def _parse_member(raw: Any, *, index: int) -> SocietyMember:
    where = f"society.members[{index}]"
    if not isinstance(raw, dict):
        raise SocietyCharterError(f"{where} must be a mapping")
    unknown = sorted(
        set(raw) - {"agent_provider_id", "role", "charge", "can_delegate", "mcp_providers"}
    )
    if unknown:
        raise SocietyCharterError(f"{where} has unsupported keys: {unknown!r}")

    agent_provider_id = str(raw.get("agent_provider_id") or "").strip()
    if not agent_provider_id:
        raise SocietyCharterError(f"{where} is missing 'agent_provider_id'")
    role = str(raw.get("role") or "").strip().lower()
    if not role:
        raise SocietyCharterError(f"{where} is missing 'role'")

    return SocietyMember(
        agent_provider_id=agent_provider_id,
        role=role,
        charge=str(raw.get("charge") or "").strip(),
        can_delegate=bool(raw.get("can_delegate", False)),
        mcp_providers=_str_list(raw.get("mcp_providers"), where=f"{where}.mcp_providers"),
    )


def parse_society_charter(
    raw: Any,
    *,
    source_path: Path | str = "",
) -> SocietyCharter:
    """Validate an already-parsed charter mapping."""
    if not isinstance(raw, dict):
        raise SocietyCharterError("charter root must be a mapping")
    society = raw.get("society")
    if not isinstance(society, dict):
        raise SocietyCharterError("charter must contain a 'society' mapping")

    unknown = sorted(
        set(society)
        - {
            "id",
            "description",
            "goal",
            "protocol",
            "interaction_mode",
            "max_turns",
            "max_delegations",
            "min_turns",
            "members",
            "stop_when",
            "tools",
            "mcp_providers",
        }
    )
    if unknown:
        raise SocietyCharterError(f"society has unsupported keys: {unknown!r}")

    society_id = str(society.get("id") or "").strip()
    if not society_id:
        raise SocietyCharterError("society.id must be a non-empty string")

    protocol = str(society.get("protocol") or DEFAULT_PROTOCOL).strip().lower()
    if protocol not in PROTOCOLS:
        raise SocietyCharterError(
            f"society.protocol {protocol!r} must be one of {list(PROTOCOLS)!r}"
        )

    mode = str(society.get("interaction_mode") or DEFAULT_INTERACTION_MODE).strip().lower()
    if mode not in INTERACTION_MODES:
        raise SocietyCharterError(
            f"society.interaction_mode {mode!r} must be one of {list(INTERACTION_MODES)!r}"
        )

    members_raw = society.get("members")
    if not isinstance(members_raw, list) or not members_raw:
        raise SocietyCharterError("society.members must be a non-empty list")
    if len(members_raw) > MAX_MEMBERS:
        raise SocietyCharterError(
            f"society.members holds {len(members_raw)} entries (max {MAX_MEMBERS})"
        )
    members = [_parse_member(item, index=i) for i, item in enumerate(members_raw)]

    seen_ids: set[str] = set()
    for m in members:
        if m.agent_provider_id in seen_ids:
            raise SocietyCharterError(
                f"society.members has duplicate agent_provider_id {m.agent_provider_id!r}"
            )
        seen_ids.add(m.agent_provider_id)

    stop_raw = society.get("stop_when") or []
    if not isinstance(stop_raw, list):
        raise SocietyCharterError("society.stop_when must be a list when set")
    stop_when = [_parse_stop_condition(item, index=i) for i, item in enumerate(stop_raw)]

    roles = {m.role for m in members}
    for cond in stop_when:
        if cond.role != ANY_ROLE and cond.role not in roles:
            raise SocietyCharterError(
                f"society.stop_when references role {cond.role!r} which no member holds "
                f"(roles: {sorted(roles)!r})"
            )

    max_turns = society.get("max_turns")
    if max_turns is None:
        turns = default_max_turns()
    else:
        try:
            turns = int(max_turns)
        except (TypeError, ValueError) as exc:
            raise SocietyCharterError("society.max_turns must be an integer") from exc
        if turns < 1:
            raise SocietyCharterError("society.max_turns must be >= 1")
        turns = min(MAX_TURNS_CEILING, turns)

    max_delegations = society.get("max_delegations")
    if max_delegations is None:
        delegations = default_max_delegations()
    else:
        try:
            delegations = int(max_delegations)
        except (TypeError, ValueError) as exc:
            raise SocietyCharterError("society.max_delegations must be an integer") from exc
        if delegations < 0:
            raise SocietyCharterError("society.max_delegations must be >= 0")
        delegations = min(MAX_DELEGATIONS_CEILING, delegations)

    min_turns_raw = society.get("min_turns")
    if min_turns_raw is None:
        min_turns = min(len(members), turns)
    else:
        try:
            min_turns = int(min_turns_raw)
        except (TypeError, ValueError) as exc:
            raise SocietyCharterError("society.min_turns must be an integer") from exc
        if min_turns < 1:
            raise SocietyCharterError("society.min_turns must be >= 1")
        min_turns = min(min_turns, turns)

    # Unknown tool ids stay allowed (they are simply not attached); see KNOWN_SOCIETY_TOOLS.
    tools = _str_list(society.get("tools"), where="society.tools")

    return SocietyCharter(
        society_id=society_id,
        members=members,
        protocol=protocol,
        interaction_mode=mode,
        max_turns=turns,
        max_delegations=delegations,
        min_turns=min_turns,
        stop_when=stop_when,
        tools=tools,
        mcp_providers=_str_list(society.get("mcp_providers"), where="society.mcp_providers"),
        goal=str(society.get("goal") or "").strip(),
        description=str(society.get("description") or "").strip(),
        source_path=str(source_path or ""),
    )


def load_society_charter(
    charter_path: Path,
    *,
    agent_catalog: Iterable[dict[str, Any]] | None = None,
    require_society_capable: bool | None = None,
) -> SocietyCharter:
    """
    Load and validate a charter YAML file.

    When ``agent_catalog`` is provided, every member id must resolve to a catalog entry, and
    (unless disabled) that entry must carry ``society_capable: true``.
    """
    path = Path(charter_path)
    if not path.is_file():
        raise SocietyCharterError(f"society charter not found: {path}")
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8-sig"))
    except yaml.YAMLError as exc:
        raise SocietyCharterError(f"invalid YAML in {path}: {exc}") from exc

    charter = parse_society_charter(raw, source_path=path)
    if agent_catalog is not None:
        validate_members_against_catalog(
            charter,
            agent_catalog,
            require_society_capable=require_society_capable,
        )
    return charter


def validate_members_against_catalog(
    charter: SocietyCharter,
    agent_catalog: Iterable[dict[str, Any]],
    *,
    require_society_capable: bool | None = None,
) -> None:
    """Ensure every member resolves to a catalog entry that opted into societies."""
    by_id: dict[str, dict[str, Any]] = {}
    for entry in agent_catalog:
        if not isinstance(entry, dict):
            continue
        entry_id = str(entry.get("id") or "").strip()
        if entry_id:
            by_id[entry_id] = entry

    missing = [m.agent_provider_id for m in charter.members if m.agent_provider_id not in by_id]
    if missing:
        raise SocietyCharterError(
            f"society {charter.society_id!r} references unknown agent_provider_id(s): "
            f"{missing!r}. Available ids come from --agent-providers-catalog "
            "(plus AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS)."
        )

    strict = society_capable_required() if require_society_capable is None else require_society_capable
    if not strict:
        return
    not_capable = [
        m.agent_provider_id
        for m in charter.members
        if not bool(by_id[m.agent_provider_id].get("society_capable", False))
    ]
    if not_capable:
        raise SocietyCharterError(
            f"society {charter.society_id!r} seats agent provider(s) without "
            f"`society_capable: true`: {not_capable!r}. Add the flag to the catalog entry, or set "
            f"{_REQUIRE_CAPABLE_ENV}=0 to bypass."
        )


def resolve_member_catalog_entries(
    charter: SocietyCharter,
    agent_catalog: Iterable[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Map member ids to (copies of) their catalog entries, applying charter delegation flags."""
    from copy import deepcopy

    by_id = {
        str(e.get("id") or "").strip(): e
        for e in agent_catalog
        if isinstance(e, dict) and str(e.get("id") or "").strip()
    }
    out: dict[str, dict[str, Any]] = {}
    for member in charter.members:
        entry = by_id.get(member.agent_provider_id)
        if entry is None:
            raise SocietyCharterError(
                f"unknown agent_provider_id {member.agent_provider_id!r} for society "
                f"{charter.society_id!r}"
            )
        out[member.agent_provider_id] = deepcopy(entry)
    return out
