"""Home Assistant irrigation ``MINUTES: N`` contract helpers."""

from __future__ import annotations

import re

_MINUTES_LINE_RE = re.compile(r"(?im)^\s*MINUTES:\s*(\d+)\s*$")


def extract_irrigation_minutes(text: str) -> int | None:
    """Return the last parseable ``MINUTES: N`` integer (0-25) or None."""
    found: int | None = None
    for m in _MINUTES_LINE_RE.finditer(str(text or "")):
        try:
            n = int(m.group(1))
        except ValueError:
            continue
        found = max(0, min(25, n))
    return found


def has_irrigation_minutes_line(text: str) -> bool:
    return extract_irrigation_minutes(text) is not None


def irrigation_minutes_recovery_description(user_question: str) -> str:
    return (
        f"{user_question.strip()}\n\n"
        "[agentic: MINUTES recovery]\n"
        "Your previous answer was missing the required final line. "
        "Reply with brief reasoning (≤80 words) and end with exactly one line of the form "
        "MINUTES: <integer 0-25>. Example last line: MINUTES: 0. "
        "Do not emit tools, JSON, or name/parameters."
    )
