"""Tests for social / phatic turn detection."""

from orchestration.social_turn import is_social_turn

COMSTAR_GUARD = (
    "\n\nAnswer ONLY the Current request. Do not recite world news, headlines, "
    "or current events unless that request explicitly asks for them."
)


def test_social_positives() -> None:
    for t in (
        "how are you today?",
        "hey",
        "good morning",
        "what are you up to",
        "do you want to play",
        "thanks",
        "are you there",
        "hi",
        "hello",
    ):
        assert is_social_turn(t), t
        assert is_social_turn(t + COMSTAR_GUARD), f"guarded {t}"


def test_social_negatives() -> None:
    for t in (
        "play some jazz",
        "how is the irrigation",
        "what's the weather",
        "turn off the lights",
        "how are the cameras",
        "remind me at 5",
        "who are you and what can you do for my project today",
        "Tell me about my home.",
    ):
        assert not is_social_turn(t), t
