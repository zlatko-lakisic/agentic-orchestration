from __future__ import annotations

import pytest

from orchestration.provider_goal_match import (
    best_lexical_provider_id,
    extract_goal_terms,
    lexical_domain_score,
    maybe_remap_planner_provider_missing_from_catalog,
    suppress_general_providers_when_domains_align,
    user_prompt_for_goal_matching,
)


@pytest.mark.unit
def test_user_prompt_for_goal_matching_strips_openclaw_preamble() -> None:
    raw = (
        "[OpenClaw context]\n"
        "browser filesystem shell openclaw_bridge\n"
        "[/OpenClaw context]\n\n"
        "User message:\n"
        "Who are you?"
    )
    assert user_prompt_for_goal_matching(raw) == "Who are you?"


@pytest.mark.unit
def test_user_prompt_for_goal_matching_passthrough() -> None:
    assert user_prompt_for_goal_matching("plain question") == "plain question"


@pytest.mark.unit
def test_user_prompt_for_goal_matching_strips_comstar_current_request() -> None:
    raw = (
        "Known facts about this resident (durable memory across terminals).\n"
        "- (preference) Resident loves it infra yeah\n"
        "- (preference) Do not know what to say\n\n"
        "Prior conversation with this resident across COMSTAR terminals (oldest first).\n"
        "COMSTAR [hallway]: Sorry, I could not get an answer in time.\n"
        "COMSTAR [hallway]: Hey there, just passing through or stopping by?\n\n"
        "Current request:\n"
        "Do some research on private networks."
    )
    assert user_prompt_for_goal_matching(raw) == "Do some research on private networks."


@pytest.mark.unit
def test_user_prompt_for_goal_matching_last_marker_wins() -> None:
    raw = (
        "User message:\n"
        "older openclaw turn\n\n"
        "Current request:\n"
        "Do some research on private networks."
    )
    assert user_prompt_for_goal_matching(raw) == "Do some research on private networks."


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


@pytest.mark.unit
def test_domain_suppression_uses_current_request_not_comstar_preamble(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reproduce Ada: full Comstar blob drops research agents; match text keeps them."""
    monkeypatch.delenv("AGENTIC_DISABLE_DOMAIN_PROVIDER_SUPPRESSION", raising=False)
    monkeypatch.setenv("AGENTIC_DOMAIN_PROVIDER_MATCH_MIN", "4")

    gpt = {
        "id": "gpt_research",
        "general_purpose": True,
        "role": "Research Analyst",
        "goal": "Produce accurate research",
        "planner_hint": "OpenAI API research comparisons grounded summaries",
    }
    claude = {
        "id": "claude_research",
        "general_purpose": True,
        "role": "Research Analyst",
        "goal": "Produce accurate research",
        "planner_hint": "Anthropic Claude research comparisons grounded summaries",
    }
    specialist = {
        "id": "ollama_command_r",
        "general_purpose": False,
        "role": "Local assistant",
        "goal": "Help with hallway terminals and resident preferences",
        "planner_hint": (
            "hallway terminal resident preference conversation answer time "
            "passing stopping lunch clock notification"
        ),
    }
    entries = [gpt, claude, specialist]
    full = (
        "Known facts about this resident (durable memory across terminals).\n"
        "- (preference) Resident loves it infra yeah\n"
        "- (preference) Do not know what to say\n\n"
        "Prior conversation with this resident across COMSTAR terminals (oldest first).\n"
        "COMSTAR [hallway]: Sorry, I could not get an answer in time.\n"
        "Resident [hallway]: Alright, well I'm gonna go grab some lunch.\n"
        "COMSTAR [hallway]: Feeling good out there today?\n"
        "COMSTAR [hallway]: Hey there, just passing through or stopping by?\n\n"
        "Current request:\n"
        "Do some research on private networks."
    )
    match = user_prompt_for_goal_matching(full)
    assert match == "Do some research on private networks."

    dropped = suppress_general_providers_when_domains_align(entries, full, quiet=True)
    dropped_ids = {str(e["id"]) for e in dropped}
    assert "gpt_research" not in dropped_ids
    assert "claude_research" not in dropped_ids

    kept = suppress_general_providers_when_domains_align(entries, match, quiet=True)
    kept_ids = {str(e["id"]) for e in kept}
    assert "gpt_research" in kept_ids
    assert "claude_research" in kept_ids

