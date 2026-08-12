from orchestration.language_policy import (
    LANGUAGE_LEAK_FALLBACK,
    CJK_FORBIDS_PATTERN,
    default_locale_assertions,
    strip_unexpected_cjk,
    text_has_cjk,
)
from orchestration.text_normalize import sanitize_user_facing_prose


def test_strip_unexpected_cjk_keeps_latin_prefix() -> None:
    raw = (
        "I do not have information on whether your lights are currently on based on "
        "the functions provided. However, no such direct query function is listed here "
        "among服务能力不足，当前API函数列表中没有提供查询灯状态的功能。"
    )
    out = strip_unexpected_cjk(raw)
    assert "服务" not in out
    assert "lights are currently on" in out
    assert "listed here" in out


def test_strip_unexpected_cjk_full_chinese_falls_back() -> None:
    raw = "我不能确定你的灯是否打开了，因为根据给定的信息和功能，我没有办法检查它们的状态。"
    assert text_has_cjk(raw)
    assert strip_unexpected_cjk(raw) == LANGUAGE_LEAK_FALLBACK


def test_sanitize_user_facing_prose_strips_cjk_leak() -> None:
    raw = (
        "No light status tool is available among"
        "服务能力不足，当前API函数列表中没有提供查询灯状态的功能。"
    )
    out = sanitize_user_facing_prose(raw)
    assert "服务" not in out
    assert "No light status tool is available" in out


def test_harness_forbids_cjk_assertion(monkeypatch) -> None:
    import re

    monkeypatch.delenv("AGENTIC_REPLY_LOCALE", raising=False)
    asserts = default_locale_assertions()
    assert asserts and asserts[0]["pattern"] == CJK_FORBIDS_PATTERN
    pattern = asserts[0]["pattern"]
    assert not re.search(pattern, "clean English only")
    assert re.search(pattern, "bad 服务能力不足 leak")


def test_locale_auto_disables_guard(monkeypatch) -> None:
    monkeypatch.setenv("AGENTIC_REPLY_LOCALE", "auto")
    chinese = "服务能力不足"
    assert strip_unexpected_cjk(chinese) == chinese
    assert default_locale_assertions() == []
