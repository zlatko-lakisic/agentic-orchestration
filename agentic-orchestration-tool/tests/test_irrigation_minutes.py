from orchestration.irrigation_minutes import (
    extract_irrigation_minutes,
    has_irrigation_minutes_line,
)


def test_extract_irrigation_minutes_last_line() -> None:
    text = "Some rain fell.\nMINUTES: 0\n"
    assert extract_irrigation_minutes(text) == 0
    assert has_irrigation_minutes_line(text)


def test_extract_irrigation_minutes_clamps() -> None:
    assert extract_irrigation_minutes("MINUTES: 99") == 25


def test_extract_irrigation_minutes_missing() -> None:
    assert extract_irrigation_minutes("I would water about 7 minutes.") is None
    assert not has_irrigation_minutes_line('{"name":"plant_knowledge"}')


def test_extract_irrigation_minutes_last_line_wins() -> None:
    text = "MINUTES: 9\nMore text\nMINUTES: 3"
    assert extract_irrigation_minutes(text) == 3


def test_extract_irrigation_minutes_bold_emphasis() -> None:
    assert extract_irrigation_minutes("Soil is critically low.\n\n**MINUTES: 20**") == 20


def test_extract_irrigation_minutes_bold_label() -> None:
    assert extract_irrigation_minutes("Rain tomorrow.\n\n**MINUTES:** 12") == 12


def test_extract_irrigation_minutes_heading() -> None:
    assert extract_irrigation_minutes("### MINUTES: 5") == 5


def test_extract_irrigation_minutes_trailing_unit() -> None:
    assert extract_irrigation_minutes("MINUTES: 20 minutes.") == 20


def test_extract_irrigation_minutes_backticks() -> None:
    assert extract_irrigation_minutes("`MINUTES: 9`") == 9


def test_extract_irrigation_minutes_prose_not_parsed() -> None:
    prose = "I would water for **20 minutes** given how dry it is."
    assert extract_irrigation_minutes(prose) is None
    assert not has_irrigation_minutes_line(prose)
