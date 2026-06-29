from __future__ import annotations

import pytest

from orchestration.goal_format_hints import (
    apply_web_prose_goal_if_enabled,
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
    ],
)
def test_goal_requires_machine_readable_only(text: str, expected: bool) -> None:
    assert goal_requires_machine_readable_only(text) is expected


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
