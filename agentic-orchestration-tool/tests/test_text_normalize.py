from orchestration.text_normalize import strip_wrapping_quotes


def test_strip_wrapping_quotes_straight_double() -> None:
    assert strip_wrapping_quotes('"Hello!"') == "Hello!"


def test_strip_wrapping_quotes_curly() -> None:
    assert strip_wrapping_quotes("\u201cHi\u201d") == "Hi"


def test_strip_wrapping_quotes_keeps_inner_quotes() -> None:
    assert strip_wrapping_quotes('Say "hello"') == 'Say "hello"'
