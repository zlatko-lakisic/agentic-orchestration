"""Tests for canonical current-turn extraction."""

from orchestration.current_turn import extract_current_turn
from orchestration.goal_format_hints import WEB_PROSE_GOAL_SUFFIX


COMSTAR_GUARD = (
    "\n\nAnswer ONLY the Current request. Do not recite world news, headlines, "
    "or current events unless that request explicitly asks for them."
)


def test_strips_comstar_guard_suffix() -> None:
    assert (
        extract_current_turn(f"How are you today?{COMSTAR_GUARD}")
        == "How are you today?"
    )


def test_current_request_marker() -> None:
    text = (
        "Prior chatter about irrigation.\n"
        "Current request: turn on the porch light"
    )
    assert extract_current_turn(text) == "turn on the porch light"


def test_user_block_extraction() -> None:
    topic = (
        "…[truncated earlier context]\n"
        "<system>\nYou may read README.md and package.json.\n"
        "<user>\nanalyze my workspace"
    )
    assert extract_current_turn(topic) == "analyze my workspace"


def test_web_prose_suffix_stripped() -> None:
    wrapped = "who are you?" + WEB_PROSE_GOAL_SUFFIX
    assert extract_current_turn(wrapped) == "who are you?"
