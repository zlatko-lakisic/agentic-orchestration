"""Small text cleanup helpers for user-facing orchestration output."""

from __future__ import annotations


def strip_wrapping_quotes(text: str) -> str:
    """Remove one layer of matching quote characters wrapped around the whole string."""
    t = str(text or "").strip()
    if len(t) < 2:
        return t
    pairs = (
        ('"', '"'),
        ("'", "'"),
        ("\u201c", "\u201d"),
        ("\u2018", "\u2019"),
    )
    for open_ch, close_ch in pairs:
        if t.startswith(open_ch) and t.endswith(close_ch):
            return t[len(open_ch) : -len(close_ch)].strip()
    return t
