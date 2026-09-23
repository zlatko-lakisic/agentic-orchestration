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
        "No, I'm good for now.",
        "I'm good",
        "no thanks",
        "nothing else",
        "that's all",
    ):
        assert is_social_turn(t), t
        assert is_social_turn(t + COMSTAR_GUARD), f"guarded {t}"


def test_closing_ack_and_reply_to_question() -> None:
    from orchestration.social_turn import (
        is_closing_ack,
        is_reply_to_assistant_question,
        should_short_circuit_turn,
    )

    assert is_closing_ack("No, I'm good for now.")
    assert should_short_circuit_turn("No, I'm good for now.")
    prior = "I'm doing well, thank you for asking! How about you?"
    assert is_reply_to_assistant_question("I'm fine", prior)
    assert should_short_circuit_turn("I'm fine", prior_assistant=prior)
    assert not is_reply_to_assistant_question(
        "turn on the porch light",
        prior,
    )


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
