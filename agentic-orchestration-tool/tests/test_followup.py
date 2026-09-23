"""Tests for follow-up turn detection."""

from orchestration.followup import is_followup_turn


def test_followup_positives() -> None:
    for t in (
        "do that again",
        "what about tomorrow",
        "make it shorter",
        "yes",
        "and the garage?",
    ):
        assert is_followup_turn(t), t


def test_followup_negatives() -> None:
    for t in (
        "how are you today?",
        "what's the weather",
        "turn on the porch light",
    ):
        assert not is_followup_turn(t), t
