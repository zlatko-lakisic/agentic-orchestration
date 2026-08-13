"""Tests for user-facing run status mapping."""

from __future__ import annotations

from orchestration.run_status import (
    PHASE_GENERATING,
    PHASE_PLANNING,
    PHASE_WARMING_AGENT,
    build_status_event,
    map_progress_line,
)


def test_map_progress_planning_and_agent() -> None:
    assert map_progress_line("planning")["phase"] == PHASE_PLANNING
    warm = map_progress_line("ensuring runtime for gpt_research")
    assert warm["phase"] == PHASE_WARMING_AGENT
    assert warm["agentProviderId"] == "gpt_research"
    assert "gpt research" in warm["message"].lower()
    gen = map_progress_line("generating")
    assert gen["phase"] == PHASE_GENERATING


def test_map_progress_plan_and_exec() -> None:
    planned = map_progress_line("plan: Research irrigation options")
    assert planned["phase"] == "planned"
    assert "irrigation" in planned["message"].lower()
    execing = map_progress_line("executing 3 step(s)")
    assert execing["phase"] == "executing"
    assert execing["stepCount"] == 3


def test_build_status_event_shape() -> None:
    ev = build_status_event(
        phase=PHASE_WARMING_AGENT,
        processing=True,
        agent_provider_id="gpt_research",
        question_id="q1",
        run_id="r1",
    )
    assert ev["type"] == "status"
    assert ev["processing"] is True
    assert ev["agentProviderId"] == "gpt_research"
    assert ev["question_id"] == "q1"
    assert ev["run_id"] == "r1"
    assert ev["message"]
