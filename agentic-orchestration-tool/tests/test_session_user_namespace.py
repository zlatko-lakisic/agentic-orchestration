"""Session user dimension: opt-in namespacing with dual-read of legacy files."""

from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.orchestrator_session import (
    OrchestratorSessionFile,
    SESSION_DIR_NAME,
    legacy_session_file_path,
    load_session,
    save_session,
    session_file_path,
    session_user_namespace_enabled,
)
from orchestration.run_store import allocate_run_store_root, run_store_user_namespace_enabled

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_SESSION_USER_NAMESPACE", raising=False)
    monkeypatch.delenv("AGENTIC_RUN_STORE_USER_NAMESPACE", raising=False)
    monkeypatch.delenv("AGENTIC_RUN_STORE_PATH", raising=False)


def test_legacy_layout_is_the_default(tmp_path: Path) -> None:
    assert session_user_namespace_enabled() is False
    assert session_file_path(tmp_path, "default") == legacy_session_file_path(tmp_path, "default")
    # A user id alone changes nothing until the namespace is enabled.
    assert session_file_path(tmp_path, "default", user_id="ada") == legacy_session_file_path(
        tmp_path, "default"
    )


def test_namespaced_layout_when_enabled(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SESSION_USER_NAMESPACE", "1")
    path = session_file_path(tmp_path, "chat", user_id="Ada Lovelace")
    assert path.parent.name == "ada-lovelace"
    assert path.parent.parent.name == "users"
    assert path.name == "chat.json"
    # Without a user id there is nothing to namespace by.
    assert session_file_path(tmp_path, "chat") == legacy_session_file_path(tmp_path, "chat")


def test_existing_legacy_file_still_wins(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    legacy = legacy_session_file_path(tmp_path, "chat")
    save_session(legacy, OrchestratorSessionFile(last_user_goal="legacy goal"))
    monkeypatch.setenv("AGENTIC_SESSION_USER_NAMESPACE", "1")
    assert session_file_path(tmp_path, "chat", user_id="ada") == legacy
    assert load_session(session_file_path(tmp_path, "chat", user_id="ada")).last_user_goal == (
        "legacy goal"
    )


def test_dual_read_falls_back_from_namespaced_to_legacy(tmp_path: Path) -> None:
    legacy = tmp_path / SESSION_DIR_NAME / "chat.json"
    save_session(legacy, OrchestratorSessionFile(last_user_goal="from legacy"))
    namespaced = tmp_path / SESSION_DIR_NAME / "users" / "ada" / "chat.json"
    assert not namespaced.exists()
    assert load_session(namespaced).last_user_goal == "from legacy"


def test_namespaced_write_then_read_round_trips(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_SESSION_USER_NAMESPACE", "1")
    path = session_file_path(tmp_path, "chat", user_id="ada")
    save_session(path, OrchestratorSessionFile(last_user_goal="namespaced goal"))
    assert path.exists()
    assert load_session(path).last_user_goal == "namespaced goal"
    # Two users with the same slug do not collide.
    other = session_file_path(tmp_path, "chat", user_id="bob")
    save_session(other, OrchestratorSessionFile(last_user_goal="bob goal"))
    assert load_session(path).last_user_goal == "namespaced goal"
    assert load_session(other).last_user_goal == "bob goal"


def test_unknown_session_returns_empty_state(tmp_path: Path) -> None:
    assert load_session(tmp_path / "nope.json").planner_history == []


def test_run_store_user_namespace_is_opt_in(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(tmp_path))
    assert run_store_user_namespace_enabled() is False
    root, ephemeral = allocate_run_store_root(run_id="run1", user_id="ada")
    assert ephemeral is False
    assert root == tmp_path / "run1"

    monkeypatch.setenv("AGENTIC_RUN_STORE_USER_NAMESPACE", "1")
    root, _ = allocate_run_store_root(run_id="run2", user_id="Ada Lovelace")
    assert root == tmp_path / "users" / "ada-lovelace" / "run2"
    # No user id means no prefix even when the namespace is on.
    root, _ = allocate_run_store_root(run_id="run3")
    assert root == tmp_path / "run3"


def test_learning_store_user_attribution_is_optional(tmp_path: Path) -> None:
    from orchestration.learning_store import (
        append_trace_event,
        enqueue_user_rating,
        pending_ratings_path,
        traces_path,
    )

    append_trace_event(tmp_path, {"kind": "run_result"})
    append_trace_event(tmp_path, {"kind": "run_result"}, user_id="ada")
    lines = traces_path(tmp_path).read_text(encoding="utf-8").strip().splitlines()
    assert "user_id" not in lines[0]
    assert '"user_id": "ada"' in lines[1]

    enqueue_user_rating(tmp_path, {"provider_id": "p", "rating": 1})
    enqueue_user_rating(tmp_path, {"provider_id": "p", "rating": 1}, user_id="ada")
    rating_lines = pending_ratings_path(tmp_path).read_text(encoding="utf-8").strip().splitlines()
    assert "user_id" not in rating_lines[0]
    assert '"user_id": "ada"' in rating_lines[1]
