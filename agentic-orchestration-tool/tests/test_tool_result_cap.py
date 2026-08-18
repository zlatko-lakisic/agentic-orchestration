from orchestration.orchestrator_session import clip_user_prompt_for_edge
from orchestration.tool_trace import cap_tool_result


def test_cap_long_string() -> None:
    body = "a" * 9000
    out = cap_tool_result(body, max_chars=8000)
    assert isinstance(out, str)
    assert out.endswith("… truncated")
    assert len(out) <= 8000


def test_cap_leaves_short_string() -> None:
    assert cap_tool_result("hello", max_chars=8000) == "hello"


def test_clip_prompt_keeps_tail() -> None:
    text = "old " * 4000 + "CURRENT USER TURN"
    out = clip_user_prompt_for_edge(text, max_chars=2000)
    assert out.startswith("…[truncated earlier context]")
    assert out.endswith("CURRENT USER TURN")
    assert len(out) < len(text)
