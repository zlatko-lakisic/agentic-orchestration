"""Post-plan contamination check: step text must not import foreign context words."""

from __future__ import annotations

import os
import re
from typing import Any

from orchestration.provider_goal_match import _STOPWORDS, extract_goal_terms

_PLANNER_BOILERPLATE = frozenset(
    """
    topic provide providing provided summary summarize summarising summarizing answer
    user response reply brief clear concise written spoken report status current
    update include including expected criteria final complete content natural language
    short direct helpful request goal step plan
    """.split()
)


def contamination_min_foreign() -> int:
    try:
        return max(1, int(os.getenv("AGENTIC_PLAN_CONTAMINATION_MIN_FOREIGN", "3")))
    except ValueError:
        return 3


def _content_words(text: str) -> set[str]:
    terms = extract_goal_terms(text)
    # Also keep 3-letter domain tokens (e.g. not covered by extract_goal_terms min 4).
    short = {w for w in re.findall(r"[a-z]{3,}", text.lower()) if w not in _STOPWORDS}
    return {w for w in (terms | short) if w not in _PLANNER_BOILERPLATE}


def plan_contamination(
    plan: dict[str, Any],
    current_turn: str,
    context_texts: list[str],
) -> list[str]:
    """
    Return foreign words found in step description/expected_output.

    A word is foreign if absent from ``current_turn`` and present in ``context_texts``.
    Only flags short turns (≤ 12 words) to avoid false positives on multi-part requests.
    """
    turn = (current_turn or "").strip()
    if not turn or not isinstance(plan, dict):
        return []
    if len(turn.split()) > 12:
        return []
    turn_words = _content_words(turn)
    context_blob = "\n".join(str(x or "") for x in context_texts)
    context_words = _content_words(context_blob)
    if not context_words:
        return []

    step_blob_parts: list[str] = []
    for step in plan.get("steps") or []:
        if not isinstance(step, dict):
            continue
        step_blob_parts.append(str(step.get("description") or ""))
        step_blob_parts.append(str(step.get("expected_output") or ""))
    step_words = _content_words("\n".join(step_blob_parts))
    foreign = sorted(w for w in step_words if w not in turn_words and w in context_words)
    if len(foreign) < contamination_min_foreign():
        return []
    return foreign
