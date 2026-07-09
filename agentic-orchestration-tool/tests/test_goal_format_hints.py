from __future__ import annotations

import pytest

from orchestration.goal_format_hints import (
    apply_web_prose_goal_if_enabled,
    goal_requests_direct_vision_completion,
    goal_requests_gate_people_lines,
    goal_requests_irrigation_minutes_line,
    goal_requires_machine_readable_only,
    web_prose_deliverable_enabled,
)


@pytest.mark.unit
@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Return only one JSON object. No markdown. No prose.", True),
        ('Respond with only a single json object. No explanation.', True),
        ("Summarize this topic for executives.", False),
        ("", False),
        (
            "You are the irrigation decision-maker.\n"
            "Output format: your reasoning then a final line exactly:\n"
            "MINUTES: <integer 0-25>\n"
            "Zone plant_profile: Tall fescue lawn grass",
            True,
        ),
    ],
)
def test_goal_requires_machine_readable_only(text: str, expected: bool) -> None:
    assert goal_requires_machine_readable_only(text) is expected


@pytest.mark.unit
def test_goal_requests_irrigation_minutes_line() -> None:
    assert goal_requests_irrigation_minutes_line(
        "final line exactly:\nMINUTES: <integer 0-25>"
    )
    assert not goal_requests_irrigation_minutes_line("How many minutes should I water?")


@pytest.mark.unit
def test_goal_requests_gate_people_and_direct_vision() -> None:
    gate = (
        "Do NOT call tools. Reply with exactly 3 lines:\n"
        "PEOPLE or NOPEOPLE\nshort description\nshorter alert"
    )
    assert goal_requests_gate_people_lines(gate)
    assert goal_requests_direct_vision_completion(gate)
    assert goal_requires_machine_readable_only(gate)
    assert not goal_requests_direct_vision_completion("Water the lawn for 10 minutes.")


@pytest.mark.unit
def test_apply_web_prose_goal_if_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_WEB_PROSE_DELIVERABLE", "1")
    out = apply_web_prose_goal_if_enabled("Tell me about Verizon.")
    assert "Delivery format" in out
    assert "Tell me about Verizon." in out


@pytest.mark.unit
def test_apply_web_prose_skips_strict_json_goal(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_WEB_PROSE_DELIVERABLE", "1")
    goal = "Return only one JSON object. No markdown. No prose."
    assert apply_web_prose_goal_if_enabled(goal) == goal


@pytest.mark.unit
def test_apply_web_prose_disabled_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_WEB_PROSE_DELIVERABLE", raising=False)
    goal = "Tell me about Verizon."
    assert apply_web_prose_goal_if_enabled(goal) == goal
