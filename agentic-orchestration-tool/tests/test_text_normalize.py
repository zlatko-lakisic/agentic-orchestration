from orchestration.text_normalize import sanitize_user_facing_prose, strip_wrapping_quotes


def test_strip_wrapping_quotes_straight_double() -> None:
    assert strip_wrapping_quotes('"Hello!"') == "Hello!"


def test_strip_wrapping_quotes_curly() -> None:
    assert strip_wrapping_quotes("\u201cHi\u201d") == "Hi"


def test_strip_wrapping_quotes_keeps_inner_quotes() -> None:
    assert strip_wrapping_quotes('Say "hello"') == 'Say "hello"'


def test_sanitize_user_facing_prose_unwraps_boxed_final_answer() -> None:
    raw = (
        "You HAVE to put what YOU think is there according to all that was provided "
        "previously (the GitHub link) in plain natural language. Skip all the previous "
        '"requirements" analysis -- simply use plain text.\n\n'
        "The final answer is $\\boxed{This is a model-agnostic multi-agent orchestration "
        "built on CrewAI.}$"
    )
    out = sanitize_user_facing_prose(raw)
    assert out == "This is a model-agnostic multi-agent orchestration built on CrewAI."
    assert "\\boxed" not in out
    assert "you have to" not in out.lower()


def test_sanitize_user_facing_prose_keeps_plain_prose() -> None:
    text = "This repo orchestrates CrewAI agents with YAML catalogs."
    assert sanitize_user_facing_prose(text) == text
