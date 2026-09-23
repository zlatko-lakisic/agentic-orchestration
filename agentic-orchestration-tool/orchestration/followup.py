"""Heuristic: does this turn refer to prior results (follow-up)?"""

from __future__ import annotations

import re

from orchestration.current_turn import extract_current_turn

_FOLLOWUP_CUES = re.compile(
    r"\b(?:"
    r"that|those|them|again|more|continue|go on|same|"
    r"previous|last (?:one|answer)|as before|what about|"
    r"and (?:also|then)|also|instead|redo|expand|shorter|longer|"
    r"this|it"
    r")\b",
    re.IGNORECASE,
)

_BARE_CONTINUE = re.compile(
    r"^(?:yes|no|sure|yep|yeah|nah|ok(?:ay)?|do it|go ahead|please)\W*$",
    re.IGNORECASE,
)

_STARTS_CONJUNCTION = re.compile(
    r"^(?:and|but|or|so|also|then)\b",
    re.IGNORECASE,
)


def is_followup_turn(text: str) -> bool:
    """True when the turn likely refers to prior results or continues a task."""
    t = extract_current_turn(text)
    if not t:
        return False
    if _BARE_CONTINUE.match(t.strip()):
        return True
    if _STARTS_CONJUNCTION.match(t.strip()):
        return True
    # Short "what about X" / "and the garage?" style.
    if _FOLLOWUP_CUES.search(t):
        # Avoid treating "how are you" / "what are you" as follow-ups via "are".
        # The cue list uses "it/this/that" carefully; "what about" is intentional.
        lower = t.lower()
        if re.match(r"^how are you\b", lower):
            return False
        if re.match(r"^what are you\b", lower):
            return False
        if re.match(r"^who are you\b", lower):
            return False
        return True
    return False
