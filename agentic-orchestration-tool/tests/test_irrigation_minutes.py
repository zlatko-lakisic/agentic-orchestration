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
