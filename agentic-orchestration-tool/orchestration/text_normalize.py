"""Small text cleanup helpers for user-facing orchestration output."""

from __future__ import annotations

import re

# LaTeX-style wrappers small models often emit (e.g. "The final answer is $\\boxed{...}$").
_BOXED_RE = re.compile(
    r"(?:\$)?\\boxed\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}(?:\$)?",
    re.DOTALL,
)
_FINAL_ANSWER_PREFIX_RE = re.compile(
    r"^(?:the\s+)?final answer\s+is\s*:?\s*",
    re.IGNORECASE | re.MULTILINE,
)
_AGENTIC_MARKER_RE = re.compile(r"\[agentic:[^\]]*\]", re.IGNORECASE)
_DELIVERY_FORMAT_RE = re.compile(r"\[Delivery format:[^\]]*\]", re.IGNORECASE)

_INSTRUCTION_ECHO_CUES = (
    "you have to",
    "you must",
    "skip all the previous",
    "requirements",
    "delivery format",
    "plain natural language",
    "according to all that was provided",
    "simply use plain text",
    "the final answer is",
    "write the user-facing",
    "do not use json",
    "no meta-commentary",
    "[agentic:",
)


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


def _looks_like_instruction_echo(text: str) -> bool:
    t = str(text or "").strip().lower()
    if not t:
        return False
    hits = sum(1 for cue in _INSTRUCTION_ECHO_CUES if cue in t)
    if hits >= 2:
        return True
    if hits >= 1 and ("final answer" in t or len(t) < 420):
        return True
    return False


def _strip_leading_instruction_paragraphs(text: str) -> str:
    """Drop leading paragraphs that only restate formatting instructions."""
    parts = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    while parts and _looks_like_instruction_echo(parts[0]):
        parts.pop(0)
    return "\n\n".join(parts).strip()


def sanitize_user_facing_prose(text: str) -> str:
    """
    Normalize chat answers: unwrap LaTeX ``\\boxed{}``, drop instruction-echo preambles,
    and strip echoed delivery-format markers small local models repeat.
    """
    t = str(text or "").strip()
    if not t:
        return t

    boxed_matches = list(_BOXED_RE.finditer(t))
    if boxed_matches:
        last = boxed_matches[-1]
        inner = last.group(1).strip()
        prefix = t[: last.start()].strip()
        suffix = t[last.end() :].strip()
        if inner and (not suffix or _looks_like_instruction_echo(suffix)):
            if not prefix or _looks_like_instruction_echo(prefix) or _FINAL_ANSWER_PREFIX_RE.search(
                prefix
            ):
                t = inner
            else:
                t = f"{prefix}\n\n{inner}".strip()
        t = _BOXED_RE.sub(lambda m: m.group(1).strip(), t)

    t = _DELIVERY_FORMAT_RE.sub("", t)
    t = _AGENTIC_MARKER_RE.sub("", t)
    t = _FINAL_ANSWER_PREFIX_RE.sub("", t)
    t = _strip_leading_instruction_paragraphs(t)
    t = re.sub(r"\n{3,}", "\n\n", t).strip()
    return strip_wrapping_quotes(t)
