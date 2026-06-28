from __future__ import annotations

import os

STEP_CONTEXT_MARKER = "\n\n---\n## Previous step output (for continuity)\n"


def step_context_cap_chars() -> int:
    try:
        cap = int(os.getenv("AGENTIC_STEP_CONTEXT_CHARS", "4000"))
    except ValueError:
        cap = 4000
    return max(500, min(20000, cap))


def step_context_inject_enabled() -> bool:
    return os.getenv("AGENTIC_STEP_CONTEXT_INJECT", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def prepare_step_description(description: str, prior_output: str) -> str:
    """Append capped prior-step output for sequential handoff (shared by all backends)."""
    if not prior_output or not step_context_inject_enabled():
        return description
    if STEP_CONTEXT_MARKER in description:
        return description
    cap = step_context_cap_chars()
    snippet = prior_output.strip()
    if len(snippet) > cap:
        snippet = snippet[: cap - 1] + "…"
    return description + STEP_CONTEXT_MARKER + snippet + "\n"
