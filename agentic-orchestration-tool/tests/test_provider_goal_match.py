from __future__ import annotations

import pytest

from orchestration.provider_goal_match import (
    best_lexical_provider_id,
    extract_goal_terms,
    lexical_domain_score,
    maybe_remap_planner_provider_missing_from_catalog,
)


@pytest.mark.unit
def test_extract_goal_terms_strips_stopwords() -> None:
    terms = extract_goal_terms("Healthcare medtech FDA clearance briefing")
    assert "healthcare" in terms
    assert "medtech" in terms
    assert "the" not in terms


@pytest.mark.unit
def test_lexical_domain_score_prefers_specialist() -> None:
    prompt = "healthcare medtech commercial brief evidence"
    general = {
        "id": "gpt_research",
        "role": "General research",
        "goal": "Research anything",
        "planner_hint": "general purpose",
    }
    specialist = {
        "id": "healthcare_brief",
        "role": "Healthcare analyst",
        "goal": "Medtech commercial evidence briefs",
        "planner_hint": "healthcare medtech FDA",
    }
    assert lexical_domain_score(prompt, specialist) > lexical_domain_score(prompt, general)


@pytest.mark.unit
def test_best_lexical_provider_id_tiebreak() -> None:
    prompt = "warehouse inventory labor"
    entries = [
        {"id": "b_special", "planner_hint": "warehouse inventory labor"},
        {"id": "a_special", "planner_hint": "warehouse inventory labor"},
    ]
    pid, score = best_lexical_provider_id(prompt, entries)
    assert score > 0
    assert pid == "a_special"


@pytest.mark.unit
def test_remap_unknown_id_when_sole_catalog() -> None:
    sole = [{"id": "ollama_llama3_2_3b", "planner_hint": "edge generalist"}]
    assert (
        maybe_remap_planner_provider_missing_from_catalog(
            "fetch_url",
            user_prompt="who are you?",
            catalog_entries=sole,
            quiet=True,
        )
        == "ollama_llama3_2_3b"
    )
