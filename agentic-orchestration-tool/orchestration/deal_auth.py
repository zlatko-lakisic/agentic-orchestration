"""
Deal-membership authorization — the only authorization the engine owns.

A deal is a durable object keyed by user identity plus deal id (never by proxy
session, which is transport). Membership lives in a small JSON file so no database
is required:

``__orchestrator_deals__/members.json``::

    {
      "version": 1,
      "deals": {
        "acme-2026": {"members": {"ada-lovelace": "owner", "alex": "viewer"}}
      }
    }

Local mode (no ``AGENTIC_REQUIRE_IDENTITY``) is trivially permissive: a desktop
sidecar has exactly one user and nothing to protect.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DEALS_DIR_NAME = "__orchestrator_deals__"
MEMBERS_FILE_NAME = "members.json"

ROLE_OWNER = "owner"
ROLE_EDITOR = "editor"
ROLE_VIEWER = "viewer"

#: Higher rank satisfies a lower required role.
_ROLE_RANK = {ROLE_VIEWER: 1, ROLE_EDITOR: 2, ROLE_OWNER: 3}

_ID_STRIP = re.compile(r"[^a-z0-9._-]+")


class DealAccessDenied(PermissionError):
    """Raised when a caller is not a member of the requested deal (or lacks the role)."""


def deals_dir(tool_root: Path) -> Path:
    return (tool_root / DEALS_DIR_NAME).resolve()


def members_path(tool_root: Path) -> Path:
    return deals_dir(tool_root) / MEMBERS_FILE_NAME


def local_mode() -> bool:
    """Local/desktop mode — permissive. Server mode sets ``AGENTIC_REQUIRE_IDENTITY=1``."""
    from orchestration.user_context import require_identity_enabled

    if os.getenv("AGENTIC_DEAL_AUTH", "").strip().lower() in ("1", "true", "yes", "on"):
        return False
    return not require_identity_enabled()


def safe_id(raw: str | None) -> str:
    text = str(raw or "").strip().lower()
    if not text:
        return ""
    cleaned = _ID_STRIP.sub("-", text).strip("-._")
    return cleaned[:96].rstrip("-._")


@dataclass(frozen=True)
class DealMembership:
    deal_id: str
    user_id: str
    role: str


def load_members(tool_root: Path) -> dict[str, Any]:
    path = members_path(tool_root)
    if not path.exists():
        return {"version": 1, "deals": {}}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"version": 1, "deals": {}}
    if not isinstance(raw, dict):
        return {"version": 1, "deals": {}}
    deals = raw.get("deals")
    return {"version": int(raw.get("version", 1)), "deals": deals if isinstance(deals, dict) else {}}


def save_members(tool_root: Path, data: dict[str, Any]) -> None:
    path = members_path(tool_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def add_member(
    *,
    tool_root: Path,
    deal_id: str,
    user_id: str,
    role: str = ROLE_EDITOR,
) -> DealMembership:
    did = safe_id(deal_id)
    uid = safe_id(user_id)
    if not did or not uid:
        raise ValueError("deal_id and user_id are required")
    normalized_role = str(role or ROLE_EDITOR).strip().lower()
    if normalized_role not in _ROLE_RANK:
        raise ValueError(f"unknown role {role!r}; expected one of {sorted(_ROLE_RANK)}")
    data = load_members(tool_root)
    deal = data["deals"].setdefault(did, {"members": {}})
    members = deal.setdefault("members", {})
    members[uid] = normalized_role
    save_members(tool_root, data)
    return DealMembership(deal_id=did, user_id=uid, role=normalized_role)


def remove_member(*, tool_root: Path, deal_id: str, user_id: str) -> bool:
    did = safe_id(deal_id)
    uid = safe_id(user_id)
    data = load_members(tool_root)
    members = (data["deals"].get(did) or {}).get("members") or {}
    if uid not in members:
        return False
    members.pop(uid, None)
    save_members(tool_root, data)
    return True


def member_role(*, tool_root: Path, deal_id: str, user_id: str) -> str | None:
    did = safe_id(deal_id)
    uid = safe_id(user_id)
    if not did or not uid:
        return None
    members = (load_members(tool_root)["deals"].get(did) or {}).get("members") or {}
    role = members.get(uid)
    return str(role).strip().lower() if isinstance(role, str) else None


def list_deals_for_user(*, tool_root: Path, user_id: str) -> list[DealMembership]:
    uid = safe_id(user_id)
    out: list[DealMembership] = []
    for did, deal in load_members(tool_root)["deals"].items():
        members = (deal or {}).get("members") or {}
        role = members.get(uid)
        if isinstance(role, str):
            out.append(DealMembership(deal_id=str(did), user_id=uid, role=role.strip().lower()))
    return out


def check_deal_access(
    *,
    tool_root: Path,
    user_id: str | None,
    deal_id: str | None,
    role: str | None = None,
) -> bool:
    """
    Return True when the caller may act on ``deal_id``; raise :class:`DealAccessDenied` otherwise.

    Local mode always allows. Requests without a deal id are not deal-scoped and pass
    through. An empty membership file in server mode denies everything, which is the safe
    default for a fresh deployment.
    """
    did = safe_id(deal_id)
    if not did:
        return True
    if local_mode():
        return True
    uid = safe_id(user_id)
    if not uid:
        raise DealAccessDenied(f"deal {did!r} requires an identified caller")
    actual = member_role(tool_root=tool_root, deal_id=did, user_id=uid)
    if actual is None:
        raise DealAccessDenied(f"user {uid!r} is not a member of deal {did!r}")
    required = str(role or "").strip().lower()
    if not required:
        return True
    if required not in _ROLE_RANK:
        raise ValueError(f"unknown role {role!r}; expected one of {sorted(_ROLE_RANK)}")
    if _ROLE_RANK.get(actual, 0) < _ROLE_RANK[required]:
        raise DealAccessDenied(
            f"user {uid!r} has role {actual!r} on deal {did!r}; {required!r} required"
        )
    return True
