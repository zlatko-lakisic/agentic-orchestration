"""Home Assistant irrigation ``MINUTES: N`` contract helpers."""

from __future__ import annotations

import re

# Models routinely emphasise the final answer ("**MINUTES: 20**", "**MINUTES:** 12"),
# so decoration is stripped before matching.
_DECORATION_RE = re.compile(r"[*_`]+")
_LEADING_MARKUP_RE = re.compile(r"^[#>\s]+")
_MINUTES_RE = re.compile(r"(?i)^MINUTES\s*:\s*(\d{1,4})")


def _normalize_line(line: str) -> str:
    return _DECORATION_RE.sub("", _LEADING_MARKUP_RE.sub("", line)).strip()


def extract_irrigation_minutes(text: str) -> int | None:
    """Return the last parseable ``MINUTES: N`` integer (0-25) or None."""
    raw = str(text or "").replace("```json", "").replace("```", "").strip()
    for line in reversed(raw.splitlines()):
        m = _MINUTES_RE.match(_normalize_line(line))
        if not m:
            continue
        try:
            return max(0, min(25, int(m.group(1))))
        except ValueError:
            continue
    return None


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
