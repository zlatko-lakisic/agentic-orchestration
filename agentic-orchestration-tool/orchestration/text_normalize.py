"""Small text cleanup helpers for user-facing orchestration output."""

from __future__ import annotations

import json
import re
from typing import Any

from orchestration.language_policy import strip_unexpected_cjk

# Prefer these keys when a model dumps a JSON object as the Final Answer (voice/TTS).
_SPOKEN_JSON_KEYS = (
    "spoken",
    "spoken_hint",
    "speech",
    "say",
    "utterance",
    "answer",
    "reply",
    "message",
    "text",
    "content",
    "response",
    "output",
    "final_answer",
    "Final Answer",
    "result",
    "summary",
)

# Presence of these keys usually means machine / HA dumps, not a speakable wrapper.
_MACHINE_JSON_KEYS = frozenset(
    {
        "entity_id",
        "attributes",
        "context",
        "last_changed",
        "last_updated",
        "unique_id",
        "device_id",
        "parameters",
        "arguments",
        "tool_calls",
        "function_call",
    }
)

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
    "plain text",
    "please provide your answer",
    "short paragraphs",
    "bullet lists",
    "according to all that was provided",
    "simply use plain text",
    "the final answer is",
    "write the user-facing",
    "do not use json",
    "no meta-commentary",
    "[agentic:",
)


def looks_like_format_instruction_only(text: str) -> bool:
    """True when the model echoed formatting rules instead of answering."""
    t = str(text or "").strip().lower()
    if not t or len(t) > 320:
        return False
    format_cues = (
        "please provide your answer",
        "plain text",
        "short paragraphs",
        "bullet lists",
        "delivery format",
        "natural language",
        "do not use json",
        "formatting rules",
    )
    hits = sum(1 for cue in format_cues if cue in t)
    if hits < 2:
        return False
    substance = (
        "crewai",
        "orchestration",
        "github",
        "yaml",
        "mcp",
        "agent",
        "repository",
        "project",
        "multi-agent",
    )
    return not any(word in t for word in substance)


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


def _strip_markdown_json_fence(text: str) -> str:
    t = str(text or "").strip()
    if not t.startswith("```"):
        return t
    lines = t.splitlines()
    if not lines:
        return t
    # Drop opening ``` / ```json and closing ```
    body = lines[1:]
    if body and body[-1].strip().startswith("```"):
        body = body[:-1]
    return "\n".join(body).strip()


def _extract_spoken_from_json_value(value: Any, *, depth: int = 0) -> str:
    """Pull the best speakable string out of a decoded JSON value."""
    if depth > 6:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, list):
        parts = [
            _extract_spoken_from_json_value(item, depth=depth + 1) for item in value
        ]
        parts = [p for p in parts if p]
        return " ".join(parts)
    if not isinstance(value, dict) or not value:
        return ""

    lower_map = {str(k).strip().lower(): k for k in value.keys()}
    for want in _SPOKEN_JSON_KEYS:
        key = lower_map.get(want.lower())
        if key is None:
            continue
        got = _extract_spoken_from_json_value(value[key], depth=depth + 1)
        if got:
            return got

    # Single stringish field (common accidental wrappers).
    str_vals = [
        v.strip()
        for v in value.values()
        if isinstance(v, str) and v.strip() and not v.strip().startswith("{")
    ]
    machineish = any(str(k).strip().lower() in _MACHINE_JSON_KEYS for k in value.keys())
    if machineish and not any(
        str(k).strip().lower() in {s.lower() for s in _SPOKEN_JSON_KEYS}
        for k in value.keys()
    ):
        return ""
    if len(str_vals) == 1:
        return str_vals[0]
    if str_vals and not machineish:
        return max(str_vals, key=len)

    # Recurse into nested objects/arrays as a last resort.
    for nested in value.values():
        if isinstance(nested, (dict, list)):
            got = _extract_spoken_from_json_value(nested, depth=depth + 1)
            if got:
                return got
    return ""


def unwrap_json_speakable(text: str) -> str:
    """
    If the whole reply is a JSON object/array (optionally fenced), extract prose
    suitable for chat / TTS. Leaves non-JSON text unchanged.

    Tool-call stubs (``name`` + ``parameters``) are left intact so the existing
    leak detector can still blank them.
    """
    t = _strip_markdown_json_fence(str(text or "").strip())
    if not t:
        return t
    if not (
        (t.startswith("{") and t.endswith("}"))
        or (t.startswith("[") and t.endswith("]"))
    ):
        return str(text or "").strip()
    try:
        obj = json.loads(t)
    except (json.JSONDecodeError, TypeError, ValueError):
        return str(text or "").strip()

    # Preserve tool-invocation stubs for looks_like_mcp_tool_call_leak.
    if isinstance(obj, dict):
        keys = {str(k).strip().lower() for k in obj.keys()}
        if keys & {"name", "tool", "tool_name"} and keys & {
            "parameters",
            "arguments",
            "args",
            "input",
        }:
            return str(text or "").strip()

    spoken = _extract_spoken_from_json_value(obj)
    if spoken:
        return spoken
    # Unreadable machine JSON — do not feed braces to TTS.
    return ""


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
    t = strip_wrapping_quotes(t)
    from orchestration.mcp_task_hints import looks_like_mcp_tool_call_leak

    if looks_like_mcp_tool_call_leak(t):
        return ""
    # Models (esp. voice + tools) often dump a JSON object as the Final Answer;
    # unwrap speakable fields before TTS / Assist reads the braces aloud.
    t = unwrap_json_speakable(t)
    if not t:
        return ""
    if looks_like_mcp_tool_call_leak(t):
        return ""
    if looks_like_format_instruction_only(t):
        return ""
    from orchestration.media_grounding import strip_skill_echo_tokens

    t = strip_skill_echo_tokens(t)
    return strip_unexpected_cjk(t)
