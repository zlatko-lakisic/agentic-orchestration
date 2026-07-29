from __future__ import annotations

import json
from typing import Any

import pytest

from orchestration import society_controller
from orchestration.society_controller import (
    society_controller_decision,
    society_controller_enabled,
    society_controller_model,
)


@pytest.fixture
def capture_llm(monkeypatch: pytest.MonkeyPatch):
    """Replace the planner LLM call with a canned reply and record what was sent."""
    calls: list[dict[str, Any]] = []
    state: dict[str, Any] = {"reply": json.dumps({"done": True, "reason": "converged"})}

    def fake_completion(*, messages: list[dict[str, str]], model: str, **_: Any) -> str:
        calls.append({"messages": messages, "model": model})
        reply = state["reply"]
        if isinstance(reply, BaseException):
            raise reply
        return str(reply)

    monkeypatch.setattr(society_controller, "_planner_chat_completion", fake_completion)
    return calls, state


def test_decision_parses_done_and_clamps_budget(capture_llm) -> None:
    calls, state = capture_llm
    state["reply"] = json.dumps(
        {"done": True, "reason": "critic objections answered", "budget_remaining": 99}
    )

    decision = society_controller_decision(
        original_goal="Where should the index live?",
        latest_excerpt="## Turn 1 …",
        turn_index=3,
        max_turns=12,
    )

    assert decision["done"] is True
    assert decision["reason"] == "critic objections answered"
    # Clamped to max_turns - turn_index.
    assert decision["budget_remaining"] == 9
    assert decision["next_goal"] == ""
    assert len(calls) == 1


def test_decision_keeps_next_goal_when_continuing(capture_llm) -> None:
    _calls, state = capture_llm
    state["reply"] = json.dumps(
        {
            "done": False,
            "reason": "critic has not answered the cost question",
            "budget_remaining": 2,
            "next_goal": "Focus on the cost of edge inference",
        }
    )

    decision = society_controller_decision(
        original_goal="Where should the index live?",
        latest_excerpt="…",
        turn_index=6,
        max_turns=12,
    )
    assert decision["done"] is False
    assert decision["budget_remaining"] == 2
    assert decision["next_goal"] == "Focus on the cost of edge inference"


def test_budget_defaults_to_remaining_when_missing_or_junk(capture_llm) -> None:
    _calls, state = capture_llm

    state["reply"] = json.dumps({"done": False, "reason": "keep going"})
    assert (
        society_controller_decision(
            original_goal="g", latest_excerpt="", turn_index=4, max_turns=10
        )["budget_remaining"]
        == 6
    )

    state["reply"] = json.dumps({"done": False, "reason": "keep going", "budget_remaining": "many"})
    assert (
        society_controller_decision(
            original_goal="g", latest_excerpt="", turn_index=4, max_turns=10
        )["budget_remaining"]
        == 6
    )

    state["reply"] = json.dumps({"done": False, "reason": "x", "budget_remaining": -5})
    assert (
        society_controller_decision(
            original_goal="g", latest_excerpt="", turn_index=4, max_turns=10
        )["budget_remaining"]
        == 0
    )


def test_missing_reason_gets_a_placeholder(capture_llm) -> None:
    _calls, state = capture_llm
    state["reply"] = json.dumps({"done": False})
    decision = society_controller_decision(
        original_goal="g", latest_excerpt="", turn_index=1, max_turns=4
    )
    assert decision["reason"] == "no reason given"
    assert decision["done"] is False


def test_fenced_json_is_extracted(capture_llm) -> None:
    _calls, state = capture_llm
    state["reply"] = "```json\n{\"done\": true, \"reason\": \"fenced\"}\n```"
    decision = society_controller_decision(
        original_goal="g", latest_excerpt="", turn_index=2, max_turns=4
    )
    assert decision["done"] is True
    assert decision["reason"] == "fenced"


def test_non_object_reply_raises_for_the_caller_to_handle(capture_llm) -> None:
    _calls, state = capture_llm
    state["reply"] = "not json at all"
    with pytest.raises(json.JSONDecodeError):
        society_controller_decision(
            original_goal="g", latest_excerpt="", turn_index=1, max_turns=4
        )


def test_prompt_carries_goal_turn_and_excerpt(capture_llm) -> None:
    calls, _state = capture_llm
    society_controller_decision(
        original_goal="Decide edge vs cluster",
        latest_excerpt="## Turn 2 — critic",
        turn_index=2,
        max_turns=8,
    )
    system, user = calls[0]["messages"]
    assert system["role"] == "system"
    assert "society turn controller" in system["content"]
    assert "at most 8 turns" in system["content"]
    assert "6 turn(s) left" in system["content"]
    assert "Decide edge vs cluster" in user["content"]
    assert "## Turn 2 — critic" in user["content"]
    assert "2 of 8" in user["content"]


def test_excerpt_is_truncated(capture_llm, monkeypatch: pytest.MonkeyPatch) -> None:
    calls, _state = capture_llm
    monkeypatch.setenv("AGENTIC_SOCIETY_CONTROLLER_EXCERPT_CHARS", "600")
    society_controller_decision(
        original_goal="g", latest_excerpt="Z" * 5000, turn_index=1, max_turns=4
    )
    assert calls[0]["messages"][1]["content"].count("Z") == 600


def test_vertical_context_is_appended(capture_llm, monkeypatch: pytest.MonkeyPatch) -> None:
    calls, _state = capture_llm
    monkeypatch.setenv("AGENTIC_ORCHESTRATOR_CONTEXT", "Panel rule: never invent citations.")
    society_controller_decision(
        original_goal="g", latest_excerpt="", turn_index=1, max_turns=4
    )
    assert "never invent citations" in calls[0]["messages"][0]["content"]


def test_model_precedence(capture_llm, monkeypatch: pytest.MonkeyPatch) -> None:
    calls, _state = capture_llm
    monkeypatch.delenv("AGENTIC_SOCIETY_CONTROLLER_MODEL", raising=False)
    monkeypatch.delenv("AGENTIC_ITERATIVE_CONTROLLER_MODEL", raising=False)
    monkeypatch.setenv("AGENTIC_PLANNER_MODEL", "ollama/llama3.2")
    assert society_controller_model() == "ollama/llama3.2"

    monkeypatch.setenv("AGENTIC_ITERATIVE_CONTROLLER_MODEL", "openai/gpt-4o-mini")
    assert society_controller_model() == "openai/gpt-4o-mini"

    monkeypatch.setenv("AGENTIC_SOCIETY_CONTROLLER_MODEL", "ollama/hermes3")
    assert society_controller_model() == "ollama/hermes3"

    society_controller_decision(
        original_goal="g", latest_excerpt="", turn_index=1, max_turns=4
    )
    assert calls[-1]["model"] == "ollama/hermes3"


def test_explicit_model_argument_wins(capture_llm, monkeypatch: pytest.MonkeyPatch) -> None:
    calls, _state = capture_llm
    monkeypatch.setenv("AGENTIC_SOCIETY_CONTROLLER_MODEL", "ollama/hermes3")
    society_controller_decision(
        original_goal="g",
        latest_excerpt="",
        turn_index=1,
        max_turns=4,
        model="openai/gpt-4o",
    )
    assert calls[-1]["model"] == "openai/gpt-4o"


@pytest.mark.parametrize(
    "value, expected",
    [("1", True), ("", True), ("0", False), ("false", False), ("OFF", False), ("yes", True)],
)
def test_controller_enable_flag(monkeypatch: pytest.MonkeyPatch, value: str, expected: bool) -> None:
    monkeypatch.setenv("AGENTIC_SOCIETY_CONTROLLER", value)
    assert society_controller_enabled() is expected
