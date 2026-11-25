"""Planner LLM-output handling, env parsing, KB scoping and session/learning persistence."""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

import pytest

from orchestration import dynamic_planner
from orchestration.dynamic_planner import (
    _extract_json_object,
    build_dynamic_workflow_config,
    iterative_controller_decision,
    llm_bool,
)
from orchestration.env_values import env_float, env_int
from orchestration.orchestrator_session import (
    OrchestratorSessionFile,
    load_session,
    save_session,
    update_session,
    update_session_after_crew,
)

VALID_PLAN: dict[str, Any] = {
    "plan_summary": "answer",
    "steps": [
        {
            "agent_provider_id": "client.text_responder",
            "description": "{topic}",
            "expected_output": "answer",
        }
    ],
}


def _write_catalog(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    for agent_id, role in (
        ("client.text_responder", "Text responder"),
        ("client.voice_responder", "Voice responder"),
    ):
        (path / f"{agent_id}.yaml").write_text(
            "\n".join(
                [
                    f"id: {agent_id}",
                    "type: openai",
                    "model: gpt-4o-mini",
                    f"role: {role}",
                    "goal: Answer household questions",
                    "",
                ]
            ),
            encoding="utf-8",
        )
    return path


@pytest.fixture()
def planner_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> dict[str, Path]:
    catalog = _write_catalog(tmp_path / "agents")
    session = tmp_path / "sessions" / "sess.json"
    monkeypatch.setenv("AGENTIC_DISABLE_HARDWARE_FILTER", "1")
    monkeypatch.setenv("AGENTIC_DISABLE_OLLAMA_PULL_FILTER", "1")
    monkeypatch.setenv("AGENTIC_PLANNER_SOCIAL_SHORT_CIRCUIT", "0")
    monkeypatch.setenv("AGENTIC_PLANNER_CONTEXT_MODE", "always")
    monkeypatch.setenv("AGENTIC_KB_ENABLED", "0")
    monkeypatch.setenv("AGENTIC_LEARNING_ENABLED", "0")
    monkeypatch.delenv("AGENTIC_USER_ID", raising=False)

    def _passthrough(entries, **_kwargs):  # type: ignore[no-untyped-def]
        return entries, []

    monkeypatch.setattr(
        "orchestration.dynamic_planner.filter_entries_by_api_credentials", _passthrough
    )
    monkeypatch.setattr(
        "orchestration.catalog_credentials.filter_entries_by_api_credentials", _passthrough
    )
    return {"catalog": catalog, "session": session, "root": tmp_path}


def _planner_replies(monkeypatch: pytest.MonkeyPatch, replies: list[str]) -> list[list[dict]]:
    calls: list[list[dict]] = []
    queue = list(replies)

    def fake(messages, model, json_mode=None):  # type: ignore[no-untyped-def]
        calls.append(messages)
        return queue.pop(0)

    monkeypatch.setattr("orchestration.dynamic_planner._planner_chat_completion", fake)
    return calls


# ----------------------------------------------------------------- JSON extraction


@pytest.mark.unit
def test_extract_json_object_accepts_prose_wrapped_and_fenced_objects() -> None:
    assert _extract_json_object('{"a": 1}') == {"a": 1}
    assert _extract_json_object('```json\n{"a": 2}\n```') == {"a": 2}
    assert _extract_json_object('Here is the plan: {"a": {"b": [1, 2]}} Hope it helps!') == {
        "a": {"b": [1, 2]}
    }
    assert _extract_json_object('Notes {not json} then {"ok": true}') == {"ok": True}


@pytest.mark.unit
def test_extract_json_object_rejects_non_objects() -> None:
    with pytest.raises(ValueError):
        _extract_json_object("[1, 2, 3]")
    with pytest.raises(json.JSONDecodeError):
        _extract_json_object("not json at all")
    with pytest.raises(ValueError):
        _extract_json_object('{"steps": [{"agent_provider_id": "x"')  # truncated


@pytest.mark.unit
def test_llm_bool_does_not_treat_quoted_false_as_true() -> None:
    assert llm_bool("false") is False
    assert llm_bool("False ") is False
    assert llm_bool("no") is False
    assert llm_bool(None) is False
    assert llm_bool(0) is False
    assert llm_bool(True) is True
    assert llm_bool("true") is True
    assert llm_bool(1) is True


# ------------------------------------------------------------ planner repair path


@pytest.mark.unit
def test_prose_wrapped_plan_is_accepted_without_repair(
    planner_env: dict[str, Path], monkeypatch: pytest.MonkeyPatch
) -> None:
    calls = _planner_replies(monkeypatch, ["Here is the plan: " + json.dumps(VALID_PLAN)])
    cfg, plan = build_dynamic_workflow_config(
        user_prompt="what is the weather tomorrow?",
        catalog_path=planner_env["catalog"],
        quiet=True,
    )
    assert len(calls) == 1
    assert cfg.tasks[0].agent_provider_id == "client.text_responder"
    assert plan["plan_summary"] == "answer"


@pytest.mark.unit
def test_truncated_plan_json_goes_through_the_repair_retry(
    planner_env: dict[str, Path], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Extraction used to sit outside the ``try`` that triggers the repair."""
    calls = _planner_replies(
        monkeypatch,
        ['{"plan_summary": "x", "steps": [{"agent_provider_id": "client.text', json.dumps(VALID_PLAN)],
    )
    cfg, _plan = build_dynamic_workflow_config(
        user_prompt="what is the weather tomorrow?",
        catalog_path=planner_env["catalog"],
        quiet=True,
    )
    assert len(calls) == 2
    assert "previous response was invalid" in calls[1][-1]["content"]
    assert cfg.tasks[0].agent_provider_id == "client.text_responder"


@pytest.mark.unit
def test_empty_max_steps_env_does_not_break_planning(
    planner_env: dict[str, Path], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_PLANNER_MAX_STEPS", "")
    monkeypatch.setenv("AGENTIC_ORCHESTRATOR_TASK_DESC_CHARS", "abc")
    _planner_replies(monkeypatch, [json.dumps(VALID_PLAN)])
    cfg, _plan = build_dynamic_workflow_config(
        user_prompt="what is the weather tomorrow?",
        catalog_path=planner_env["catalog"],
        session_path=planner_env["session"],
        quiet=True,
    )
    assert len(cfg.tasks) == 1


@pytest.mark.unit
def test_strict_mcp_ids_are_enforced_in_quiet_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    """``AGENTIC_STRICT_MCP_IDS`` only raised inside ``if dropped and not quiet`` (daemon = quiet)."""
    plan = dict(VALID_PLAN, mcp_provider_ids=["does_not_exist"])
    catalog_entries = [
        {"id": "client.text_responder", "type": "openai", "model": "gpt-4o-mini", "role": "r", "goal": "g"}
    ]
    mcp_entries = [{"id": "fetch_url", "ref": "https://example.invalid/mcp"}]
    kwargs = dict(
        user_prompt="q",
        plan=plan,
        catalog_entries=catalog_entries,
        instance_key="k",
        max_steps=4,
        mcp_catalog_entries=mcp_entries,
        skill_catalog_entries=[],
        rag_catalog_entries=None,
    )
    monkeypatch.setenv("AGENTIC_STRICT_MCP_IDS", "1")
    with pytest.raises(ValueError, match="unknown mcp_provider_id"):
        dynamic_planner.workflow_config_from_plan(quiet=True, **kwargs)

    monkeypatch.setenv("AGENTIC_STRICT_MCP_IDS", "0")
    cfg = dynamic_planner.workflow_config_from_plan(quiet=True, **kwargs)
    assert cfg.tasks


# ------------------------------------------------------------------- controller


@pytest.mark.unit
def test_iterative_controller_survives_a_malformed_reply(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "orchestration.dynamic_planner._planner_chat_completion",
        lambda **_kw: "I think we should continue, sorry no JSON",
    )
    decision = iterative_controller_decision(
        original_goal="g", latest_excerpt="e", round_index=2, max_rounds=5, model="openai/x"
    )
    assert decision["done"] is False
    assert decision["estimated_rounds_remaining"] == 3
    assert "unparseable" in decision["reason"]


@pytest.mark.unit
def test_iterative_controller_parses_done_strictly(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "orchestration.dynamic_planner._planner_chat_completion",
        lambda **_kw: json.dumps({"done": "false", "reason": "more work", "next_goal": "n"}),
    )
    decision = iterative_controller_decision(
        original_goal="g", latest_excerpt="e", round_index=1, max_rounds=4, model="openai/x"
    )
    assert decision["done"] is False


# -------------------------------------------------------------- transport details


class _FakeLiteLLM:
    def __init__(self, failures: int) -> None:
        self.calls: list[dict[str, Any]] = []
        self._failures = failures

    def completion(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(kwargs)
        if len(self.calls) <= self._failures:
            raise RuntimeError("429 rate limit exceeded")
        return {"choices": [{"message": {"content": '{"ok": true}'}}], "usage": {}}


@pytest.mark.unit
def test_planner_429_retry_count_is_exact(monkeypatch: pytest.MonkeyPatch) -> None:
    """``AGENTIC_PLANNER_429_RETRIES=0`` used to retry once anyway."""
    import sys

    monkeypatch.setenv("AGENTIC_PLANNER_USE_LITELLM", "1")
    monkeypatch.setattr(dynamic_planner.time, "sleep", lambda _s: None)
    messages = [{"role": "user", "content": "hi"}]

    fake = _FakeLiteLLM(failures=5)
    monkeypatch.setitem(sys.modules, "litellm", fake)
    monkeypatch.setenv("AGENTIC_PLANNER_429_RETRIES", "0")
    with pytest.raises(RuntimeError, match="Planner LLM request failed"):
        dynamic_planner._planner_chat_completion(messages=messages, model="ollama/x")
    assert len(fake.calls) == 1

    fake2 = _FakeLiteLLM(failures=2)
    monkeypatch.setitem(sys.modules, "litellm", fake2)
    monkeypatch.setenv("AGENTIC_PLANNER_429_RETRIES", "2")
    assert dynamic_planner._planner_chat_completion(messages=messages, model="ollama/x")
    assert len(fake2.calls) == 3


@pytest.mark.unit
def test_planner_litellm_call_is_always_bounded(monkeypatch: pytest.MonkeyPatch) -> None:
    import sys

    fake = _FakeLiteLLM(failures=0)
    monkeypatch.setitem(sys.modules, "litellm", fake)
    monkeypatch.setenv("AGENTIC_PLANNER_USE_LITELLM", "1")
    messages = [{"role": "user", "content": "hi"}]

    monkeypatch.delenv("AGENTIC_PLANNER_TIMEOUT_SEC", raising=False)
    dynamic_planner._planner_chat_completion(messages=messages, model="ollama/x")
    assert fake.calls[-1]["timeout"] == 600.0

    monkeypatch.setenv("AGENTIC_PLANNER_TIMEOUT_SEC", "45")
    dynamic_planner._planner_chat_completion(messages=messages, model="ollama/x")
    assert fake.calls[-1]["timeout"] == 45.0

    monkeypatch.setenv("AGENTIC_PLANNER_TIMEOUT_SEC", "0")  # explicit opt-out
    dynamic_planner._planner_chat_completion(messages=messages, model="ollama/x")
    assert "timeout" not in fake.calls[-1]


# ------------------------------------------------------------------ env parsing


@pytest.mark.unit
def test_env_int_and_float_fall_back_instead_of_raising(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("B_ENV_INT", "")
    assert env_int("B_ENV_INT", 8) == 8
    monkeypatch.setenv("B_ENV_INT", "twelve")
    assert env_int("B_ENV_INT", 8) == 8
    monkeypatch.setenv("B_ENV_INT", " 12 ")
    assert env_int("B_ENV_INT", 8) == 12
    monkeypatch.setenv("B_ENV_INT", "-5")
    assert env_int("B_ENV_INT", 8, lo=1, hi=32) == 1
    monkeypatch.setenv("B_ENV_INT", "7.0")
    assert env_int("B_ENV_INT", 8) == 7
    monkeypatch.delenv("B_ENV_INT")
    assert env_int("B_ENV_INT", 8) == 8

    monkeypatch.setenv("B_ENV_FLOAT", "nan")
    assert env_float("B_ENV_FLOAT", 1.5) == 1.5
    monkeypatch.setenv("B_ENV_FLOAT", "2.5")
    assert env_float("B_ENV_FLOAT", 1.5, hi=2.0) == 2.0


@pytest.mark.unit
def test_bad_iterative_rounds_env_does_not_break_the_cli_parser(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """It is an argparse default, so a bad value used to break every invocation, even ``--help``."""
    import main

    monkeypatch.setenv("AGENTIC_DYNAMIC_ITERATIVE_ROUNDS", "")
    monkeypatch.setenv("AGENTIC_DYNAMIC_ITERATIVE_MAX_ROUNDS", "lots")
    monkeypatch.setattr("sys.argv", ["main.py", "--dynamic", "hello"])
    args = main.parse_args()
    assert args.dynamic_iterative_rounds == 4
    assert args.dynamic_iterative_max_rounds == 8


# ------------------------------------------------------------------- KB scoping


@pytest.mark.unit
def test_planner_kb_lookup_is_scoped_to_the_caller(
    planner_env: dict[str, Path], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_KB_ENABLED", "1")
    seen: list[dict[str, Any]] = []

    def fake_kb_context(*, tool_root, user_prompt, user_id=None, deal_id=None):  # type: ignore[no-untyped-def]
        seen.append({"user_id": user_id, "deal_id": deal_id})
        return ""

    monkeypatch.setattr("orchestration.knowledge_base.planner_kb_context", fake_kb_context)
    _planner_replies(monkeypatch, [json.dumps(VALID_PLAN), json.dumps(VALID_PLAN)])

    build_dynamic_workflow_config(
        user_prompt="what is the weather tomorrow?",
        catalog_path=planner_env["catalog"],
        tool_root=planner_env["root"],
        quiet=True,
        user_id="alice",
        deal_id="acme-2026",
    )
    assert seen == [{"user_id": "alice", "deal_id": "acme-2026"}]

    # No explicit id: falls back to the identity bound for this run's context.
    from orchestration.llm_usage import bind_usage_context, reset_usage_context

    tokens = bind_usage_context(tool_root=planner_env["root"], run_id="r", user_id="bob")
    try:
        build_dynamic_workflow_config(
            user_prompt="what is the weather tomorrow?",
            catalog_path=planner_env["catalog"],
            tool_root=planner_env["root"],
            quiet=True,
        )
    finally:
        reset_usage_context(tokens)
    assert seen[-1] == {"user_id": "bob", "deal_id": None}


@pytest.mark.unit
def test_unscoped_kb_helper_is_not_used_for_an_identified_caller(tmp_path: Path) -> None:
    """Older ``planner_kb_context(tool_root, user_prompt)``: no cross-user results."""
    calls: list[str] = []

    def legacy(*, tool_root, user_prompt):  # type: ignore[no-untyped-def]
        calls.append(user_prompt)
        return "## other users' answers"

    scoped = dynamic_planner._planner_kb_context_scoped
    assert scoped(legacy, tool_root=tmp_path, user_prompt="q", user_id="alice", deal_id=None) == ""
    assert calls == []
    # Local single-user CLI (no identity): unchanged behaviour.
    assert scoped(legacy, tool_root=tmp_path, user_prompt="q", user_id=None, deal_id=None)
    assert calls == ["q"]


# --------------------------------------------------------- session / learning I/O


@pytest.mark.unit
def test_planner_does_not_overwrite_a_turn_saved_during_its_llm_call(
    planner_env: dict[str, Path], monkeypatch: pytest.MonkeyPatch
) -> None:
    """The planner saved the copy it loaded before the LLM call (lost update)."""
    session = planner_env["session"]
    save_session(session, OrchestratorSessionFile())

    def fake(messages, model, json_mode=None):  # type: ignore[no-untyped-def]
        # Another turn / run finishes on the same session mid-planning.
        update_session_after_crew(session, "CONCURRENT RESULT", run_id="other-run", exit_code=0)

        def add_turn(fresh: OrchestratorSessionFile) -> None:
            fresh.planner_history = list(fresh.planner_history) + [
                {"role": "user", "content": "concurrent question"},
                {"role": "assistant", "content": "concurrent plan"},
            ]

        update_session(session, add_turn)
        return json.dumps(VALID_PLAN)

    monkeypatch.setattr("orchestration.dynamic_planner._planner_chat_completion", fake)
    build_dynamic_workflow_config(
        user_prompt="what is the weather tomorrow?",
        catalog_path=planner_env["catalog"],
        session_path=session,
        quiet=True,
    )
    data = load_session(session)
    contents = [m["content"] for m in data.planner_history]
    assert "concurrent question" in contents
    assert any("weather tomorrow" in c for c in contents)
    assert data.last_crew_output_excerpt == "CONCURRENT RESULT"
    assert data.last_run_id == "other-run"


@pytest.mark.unit
def test_corrupt_session_file_is_quarantined_not_fatal(tmp_path: Path) -> None:
    path = tmp_path / "sess.json"
    path.write_text('{"version": 1, "planner_history": [', encoding="utf-8")  # torn write
    data = load_session(path)
    assert data.planner_history == []
    assert not path.exists()
    assert [p.name.startswith("sess.json.corrupt-") for p in tmp_path.iterdir()] == [True]

    # The session keeps working afterwards.
    update_session_after_crew(path, "fresh output", run_id="r1", exit_code=0)
    assert load_session(path).last_crew_output_excerpt == "fresh output"


@pytest.mark.unit
def test_session_save_is_atomic(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """A crash mid-write must leave the previous file intact (never empty/partial)."""
    import orchestration.atomic_io as atomic_io

    path = tmp_path / "sess.json"
    save_session(path, OrchestratorSessionFile(last_user_goal="first"))

    def exploding_replace(src: str, dst: str) -> None:
        raise OSError("disk full")

    monkeypatch.setattr(atomic_io.os, "replace", exploding_replace)
    with pytest.raises(OSError):
        save_session(path, OrchestratorSessionFile(last_user_goal="second"))
    monkeypatch.undo()

    assert load_session(path).last_user_goal == "first"
    assert sorted(p.name for p in tmp_path.iterdir() if not p.name.endswith(".lock")) == [
        "sess.json"
    ]


@pytest.mark.unit
def test_concurrent_session_updates_are_not_lost(tmp_path: Path) -> None:
    path = tmp_path / "sess.json"
    save_session(path, OrchestratorSessionFile())
    workers, per_worker = 8, 15

    def bump(worker: int) -> None:
        for i in range(per_worker):
            def mutate(data: OrchestratorSessionFile, tag: str = f"{worker}-{i}") -> None:
                data.planner_history = list(data.planner_history) + [
                    {"role": "user", "content": tag}
                ]

            update_session(path, mutate)

    threads = [threading.Thread(target=bump, args=(w,)) for w in range(workers)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(30)
    assert len(load_session(path).planner_history) == workers * per_worker


@pytest.mark.unit
def test_pending_ratings_appended_during_consumption_are_kept(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """read-then-truncate dropped ratings appended in between."""
    from orchestration import learning_store as ls

    rating = {"provider_id": "p", "attachment_fingerprint": "none", "task_tag": "general", "rating": 1}
    ls.enqueue_user_rating(tmp_path, rating)

    original_normalize = ls.normalize_attachment_fingerprint
    injected: list[bool] = []

    def normalize_and_inject(*args: Any, **kwargs: Any) -> str:
        if not injected:
            injected.append(True)
            ls.enqueue_user_rating(tmp_path, dict(rating, rating=-1))  # arrives mid-merge
        return original_normalize(*args, **kwargs)

    monkeypatch.setattr(ls, "normalize_attachment_fingerprint", normalize_and_inject)
    stats = ls.consume_pending_ratings(tmp_path, {})
    bucket = next(iter(stats["provider_stats"].values()))
    assert bucket["user_votes"] == 1

    pending = ls.pending_ratings_path(tmp_path).read_text(encoding="utf-8").strip().splitlines()
    assert len(pending) == 1
    assert json.loads(pending[0])["rating"] == -1

    stats = ls.consume_pending_ratings(tmp_path, stats)
    bucket = next(iter(stats["provider_stats"].values()))
    assert bucket["user_votes"] == 2
    assert bucket["user_vote_sum"] == 0


@pytest.mark.unit
def test_torn_stats_file_is_not_silently_replaced_by_empty_stats(tmp_path: Path) -> None:
    from orchestration import learning_store as ls

    ls.save_stats(tmp_path, {"provider_stats": {"k": {"runs": 3}}})
    assert ls.load_stats(tmp_path)["provider_stats"]["k"]["runs"] == 3

    ls.stats_path(tmp_path).write_text('{"provider_stats": {"k": {"ru', encoding="utf-8")
    assert ls.load_stats(tmp_path) == {}
    backups = [p for p in ls.learning_dir(tmp_path).iterdir() if ".corrupt-" in p.name]
    assert len(backups) == 1  # kept for recovery instead of being overwritten

    with ls.stats_lock(tmp_path):
        with ls.stats_lock(tmp_path):  # re-entrant in-thread
            ls.save_stats(tmp_path, {"provider_stats": {}})
    assert ls.load_stats(tmp_path) == {"provider_stats": {}}
