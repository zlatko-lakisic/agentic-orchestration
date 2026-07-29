"""Deal-membership authorization — the only authorization the engine owns."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from orchestration.deal_auth import (
    DealAccessDenied,
    ROLE_EDITOR,
    ROLE_OWNER,
    ROLE_VIEWER,
    add_member,
    check_deal_access,
    list_deals_for_user,
    load_members,
    member_role,
    members_path,
    remove_member,
    safe_id,
)

pytestmark = pytest.mark.unit


@pytest.fixture
def server_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_REQUIRE_IDENTITY", "1")
    monkeypatch.delenv("AGENTIC_DEAL_AUTH", raising=False)


@pytest.fixture(autouse=True)
def local_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_REQUIRE_IDENTITY", raising=False)
    monkeypatch.delenv("AGENTIC_DEAL_AUTH", raising=False)


def test_local_mode_allows_everything(tmp_path: Path) -> None:
    assert check_deal_access(tool_root=tmp_path, user_id=None, deal_id="acme") is True
    assert check_deal_access(tool_root=tmp_path, user_id="stranger", deal_id="acme") is True


def test_requests_without_a_deal_id_are_never_gated(
    tmp_path: Path,
    server_mode: None,
) -> None:
    assert check_deal_access(tool_root=tmp_path, user_id=None, deal_id=None) is True
    assert check_deal_access(tool_root=tmp_path, user_id="stranger", deal_id="  ") is True


def test_server_mode_denies_non_members(tmp_path: Path, server_mode: None) -> None:
    add_member(tool_root=tmp_path, deal_id="acme", user_id="ada")
    assert check_deal_access(tool_root=tmp_path, user_id="ada", deal_id="acme") is True
    with pytest.raises(DealAccessDenied):
        check_deal_access(tool_root=tmp_path, user_id="mallory", deal_id="acme")


def test_empty_membership_file_denies_in_server_mode(tmp_path: Path, server_mode: None) -> None:
    with pytest.raises(DealAccessDenied):
        check_deal_access(tool_root=tmp_path, user_id="ada", deal_id="acme")


def test_anonymous_caller_is_denied_a_deal(tmp_path: Path, server_mode: None) -> None:
    add_member(tool_root=tmp_path, deal_id="acme", user_id="ada")
    with pytest.raises(DealAccessDenied):
        check_deal_access(tool_root=tmp_path, user_id=None, deal_id="acme")


def test_role_ranking_satisfies_lower_requirements(tmp_path: Path, server_mode: None) -> None:
    add_member(tool_root=tmp_path, deal_id="acme", user_id="ada", role=ROLE_OWNER)
    add_member(tool_root=tmp_path, deal_id="acme", user_id="bob", role=ROLE_VIEWER)
    assert check_deal_access(tool_root=tmp_path, user_id="ada", deal_id="acme", role=ROLE_EDITOR)
    assert check_deal_access(tool_root=tmp_path, user_id="bob", deal_id="acme", role=ROLE_VIEWER)
    with pytest.raises(DealAccessDenied):
        check_deal_access(tool_root=tmp_path, user_id="bob", deal_id="acme", role=ROLE_EDITOR)


def test_deal_auth_env_forces_checks_without_require_identity(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_DEAL_AUTH", "1")
    with pytest.raises(DealAccessDenied):
        check_deal_access(tool_root=tmp_path, user_id="ada", deal_id="acme")


def test_membership_store_round_trips_and_normalizes_ids(tmp_path: Path) -> None:
    add_member(tool_root=tmp_path, deal_id="Acme 2026", user_id="Ada Lovelace", role=ROLE_OWNER)
    assert member_role(tool_root=tmp_path, deal_id="acme-2026", user_id="ada-lovelace") == ROLE_OWNER
    stored = json.loads(members_path(tmp_path).read_text(encoding="utf-8"))
    assert stored["deals"]["acme-2026"]["members"]["ada-lovelace"] == ROLE_OWNER
    assert [m.deal_id for m in list_deals_for_user(tool_root=tmp_path, user_id="ada-lovelace")] == [
        "acme-2026"
    ]
    assert remove_member(tool_root=tmp_path, deal_id="acme-2026", user_id="ada-lovelace") is True
    assert remove_member(tool_root=tmp_path, deal_id="acme-2026", user_id="ada-lovelace") is False
    assert member_role(tool_root=tmp_path, deal_id="acme-2026", user_id="ada-lovelace") is None


def test_unknown_role_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        add_member(tool_root=tmp_path, deal_id="acme", user_id="ada", role="admin")


def test_corrupt_membership_file_degrades_to_empty(tmp_path: Path) -> None:
    path = members_path(tmp_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("{not json", encoding="utf-8")
    assert load_members(tmp_path) == {"version": 1, "deals": {}}


def test_safe_id_strips_path_segments() -> None:
    assert safe_id("../../etc/passwd") == "etc-passwd"
    assert safe_id("") == ""
