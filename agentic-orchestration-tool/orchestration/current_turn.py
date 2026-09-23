"""Canonical extractor for the user's current turn (hosts may prepend context/guards)."""

from __future__ import annotations

import re

from orchestration.goal_format_hints import WEB_PROSE_GOAL_SUFFIX

# Host-appended instruction tails (COMSTAR / Reach / similar). Data-driven so
# additional products can extend without forking extractors.
HOST_GUARD_SUFFIX_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"\n+\s*Answer ONLY the Current request\..*\Z",
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r"\n+\s*Answer ONLY the current request\..*\Z",
        re.IGNORECASE | re.DOTALL,
    ),
)

_ROLE_TAG_RE = re.compile(r"\n<(system|assistant|user|tool)>", re.IGNORECASE)


def strip_web_prose_delivery_suffix(text: str) -> str:
    """Remove the web UI prose delivery suffix before classifying the user prompt."""
    t = str(text or "").strip()
    suffix = WEB_PROSE_GOAL_SUFFIX.strip()
    if suffix and t.endswith(suffix):
        return t[: -len(suffix)].strip()
    t = re.sub(r"\[Delivery format:[^\]]*\]", "", t, flags=re.IGNORECASE).strip()
    return t


def last_chat_role_block(text: str, role: str) -> str | None:
    """Last ``<role>…`` block from a COMSTAR/Reach assembled transcript, if any."""
    token = f"<{role}>"
    raw = str(text or "")
    idx = raw.lower().rfind(token)
    if idx < 0:
        return None
    rest = raw[idx + len(token) :]
    nxt = _ROLE_TAG_RE.search(rest)
    if nxt:
        rest = rest[: nxt.start()]
    return rest.strip() or None


def strip_host_guard_suffixes(text: str) -> str:
    """Drop known host guard suffixes (e.g. COMSTAR Answer ONLY …)."""
    t = str(text or "")
    for pat in HOST_GUARD_SUFFIX_PATTERNS:
        t = pat.sub("", t)
    return t.strip()


def extract_current_turn(text: str) -> str:
    """
    Isolate the user's current utterance from host wrappers.

    Order:
    1. Strip web delivery suffix
    2. Strip known host guard suffixes
    3. Prefer last ``<user>`` block
    4. Else tail after last ``Current request:`` / ``User message:``
    5. Collapse whitespace
    """
    t = strip_web_prose_delivery_suffix(text).strip()
    if not t:
        return ""
    t = strip_host_guard_suffixes(t)
    block = last_chat_role_block(t, "user")
    if block:
        t = strip_host_guard_suffixes(block)
    else:
        markers = ("Current request:", "User message:")
        last_pos = -1
        last_marker = ""
        for marker in markers:
            pos = t.rfind(marker)
            if pos > last_pos:
                last_pos = pos
                last_marker = marker
        if last_pos >= 0 and last_marker:
            tail = t[last_pos + len(last_marker) :].strip()
            # Drop parenthetical authority notes hosts sometimes prepend.
            tail = re.sub(
                r"^\(Authoritative[^)]*\)\s*",
                "",
                tail,
                flags=re.IGNORECASE,
            ).strip()
            if tail:
                t = strip_host_guard_suffixes(tail)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()
