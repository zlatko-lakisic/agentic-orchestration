from __future__ import annotations

import pytest

from orchestration.goal_format_hints import goal_requires_machine_readable_only


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
