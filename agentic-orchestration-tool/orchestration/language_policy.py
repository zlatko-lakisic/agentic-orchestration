"""Reply-locale policy: keep English-default answers free of unexpected CJK script leaks."""

from __future__ import annotations

import os
import re
from typing import Any

# Hiragana/Katakana, CJK ext-A, Unified Ideographs, Compatibility Ideographs, Hangul syllables.
CJK_CHAR_CLASS = (
    r"\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af"
)
CJK_FORBIDS_PATTERN = rf"[{CJK_CHAR_CLASS}]"
_CJK_RUN_RE = re.compile(rf"[{CJK_CHAR_CLASS}]+")
_LATIN_LETTER_RE = re.compile(r"[A-Za-z]")
_TRAILING_GLUE_RE = re.compile(
    r"\s+(?:among|and|or|the|a|an|to|of|in|for|with|from|into|onto|as|is|are|was|were)\s*$",
    re.IGNORECASE,
)

LANGUAGE_LEAK_FALLBACK = (
    "I couldn't produce a clear English answer. Please ask again."
)

FORBIDDEN_CJK_ASSERTION: dict[str, Any] = {
    "type": "forbids_regex",
    "pattern": CJK_FORBIDS_PATTERN,
}


def reply_locale() -> str:
    """Normalized ``AGENTIC_REPLY_LOCALE`` (default ``en``)."""
    return (os.getenv("AGENTIC_REPLY_LOCALE") or "en").strip().lower() or "en"


def unexpected_cjk_guard_enabled() -> bool:
    """
    True when unexpected East-Asian script should be stripped / asserted against.

    Disable with ``AGENTIC_REPLY_LOCALE=auto|any|off`` or a ``zh`` / ``ja`` / ``ko`` locale.
    """
    loc = reply_locale()
    if loc in ("auto", "any", "off", "0", "false", "no"):
        return False
    if loc.startswith(("zh", "ja", "ko", "cjk")):
        return False
    return True


def text_has_cjk(text: str) -> bool:
    return bool(_CJK_RUN_RE.search(str(text or "")))


def default_locale_assertions() -> list[dict[str, Any]]:
    """Harness-style assertions applied when the reply locale forbids unexpected CJK."""
    if not unexpected_cjk_guard_enabled():
        return []
    return [dict(FORBIDDEN_CJK_ASSERTION)]


def strip_unexpected_cjk(text: str) -> str:
    """
    When the reply locale is Latin-default, remove unexpected CJK runs.

    Mid-answer leaks keep the Latin prefix (trimmed). Entirely-CJK answers become the
    English fallback so chat UIs never show a Chinese wall of text after an English ask.
    """
    t = str(text or "").strip()
    if not t or not unexpected_cjk_guard_enabled() or not text_has_cjk(t):
        return t

    match = _CJK_RUN_RE.search(t)
    if not match:
        return t

    prefix = t[: match.start()].rstrip()
    prefix = _TRAILING_GLUE_RE.sub("", prefix).rstrip(" ,;:-")
    if len(prefix) >= 12 and _LATIN_LETTER_RE.search(prefix):
        return prefix.strip()
    return LANGUAGE_LEAK_FALLBACK
