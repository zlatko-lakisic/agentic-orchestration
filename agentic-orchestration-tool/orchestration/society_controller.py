"""Society turn controller (K6.1).

Mirrors ``iterative_controller_decision``: a small LLM decides whether the society has
converged, using the latest blackboard excerpt. It can stop early; it can never extend the
run past ``max_turns``.
"""

from __future__ import annotations

import os
from typing import Any

from orchestration.dynamic_planner import (
    _extract_json_object,
    _planner_chat_completion,
    orchestrator_vertical_context_section,
)

_CONTROLLER_MODEL_ENV = "AGENTIC_SOCIETY_CONTROLLER_MODEL"
_EXCERPT_CHARS_ENV = "AGENTIC_SOCIETY_CONTROLLER_EXCERPT_CHARS"
_CONTROLLER_ENABLED_ENV = "AGENTIC_SOCIETY_CONTROLLER"
_DEFAULT_EXCERPT_CHARS = 12000


def society_controller_enabled() -> bool:
    """Whether to consult the controller LLM between rounds (default yes)."""
    return os.getenv(_CONTROLLER_ENABLED_ENV, "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def society_controller_model() -> str:
    """``AGENTIC_SOCIETY_CONTROLLER_MODEL`` → iterative controller model → planner model."""
    return (
        os.getenv(
            _CONTROLLER_MODEL_ENV,
            os.getenv(
                "AGENTIC_ITERATIVE_CONTROLLER_MODEL",
                os.getenv("AGENTIC_PLANNER_MODEL", "gpt-4o-mini").strip(),
            ),
        ).strip()
        or "gpt-4o-mini"
    )


def _excerpt_chars() -> int:
    raw = os.getenv(_EXCERPT_CHARS_ENV, "").strip()
    if not raw:
        return _DEFAULT_EXCERPT_CHARS
    try:
        return max(500, min(200_000, int(raw)))
    except ValueError:
        return _DEFAULT_EXCERPT_CHARS


def society_controller_decision(
    *,
    original_goal: str,
    latest_excerpt: str,
    turn_index: int,
    max_turns: int,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Decide whether the society should stop after ``turn_index``.

    Returns a dict with keys:
    - done: bool
    - reason: str
    - budget_remaining: int (turns left, clamped to 0..max_turns-turn_index)
    - next_goal: optional str (tighter focus for the remaining turns)
    """
    resolved_model = (model or "").strip() or society_controller_model()
    excerpt = (latest_excerpt or "").strip()[: _excerpt_chars()]
    remaining_max = max(0, int(max_turns) - int(turn_index))

    system = f"""You are a society turn controller for a panel of AI agents.

You decide whether the panel has converged and should stop taking turns.

Rules:
- Stop as soon as the panel has answered the user's goal with a clear recommendation; extra turns mostly repeat.
- Continue when members disagree on something material, a required perspective has not spoken yet, or the latest turns are shallow or off-topic.
- If you continue, you may set next_goal to focus the remaining turns on the single biggest open question.
- The panel can take at most {max_turns} turns in total and has {remaining_max} turn(s) left; never ask for more.
- In "reason", name the concrete signal (converged recommendation, unresolved disagreement, missing critic pass, repetition, drift), not vague phrases like "needs more work".
- Repetition is a stop signal: if the last turns restate earlier points without new substance, set done: true.
- Do not ask the panel to invent verifiable specifics (citations, identifiers, vendor names) it cannot look up; prefer stopping and letting synthesis mark them as open items.

Respond with a single JSON object only:
{{
  "done": true/false,
  "reason": "short justification",
  "budget_remaining": 0,
  "next_goal": "optional tighter focus for the remaining turns"
}}
"""
    system += orchestrator_vertical_context_section()

    user = (
        "## Original goal\n"
        f"{str(original_goal or '').strip()}\n\n"
        f"## Turn\n{turn_index} of {max_turns}\n\n"
        "## Blackboard so far (excerpt)\n"
        f"{excerpt}\n"
    )

    raw = _planner_chat_completion(
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=resolved_model,
    )
    data = _extract_json_object(raw)
    if not isinstance(data, dict):
        return {
            "done": False,
            "reason": "controller returned non-object",
            "budget_remaining": remaining_max,
            "next_goal": "",
        }

    out: dict[str, Any] = dict(data)
    out["done"] = bool(data.get("done", False))
    out["reason"] = str(data.get("reason", "")).strip() or "no reason given"

    try:
        budget = int(data.get("budget_remaining", remaining_max))
    except (TypeError, ValueError):
        budget = remaining_max
    out["budget_remaining"] = max(0, min(remaining_max, budget))

    next_goal = str(data.get("next_goal", "") or "").strip()
    out["next_goal"] = next_goal
    return out
