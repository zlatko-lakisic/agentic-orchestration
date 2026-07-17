"""Planner placeholder agent_provider_id remapping (tiny local models)."""

from __future__ import annotations

from orchestration.provider_goal_match import maybe_remap_planner_provider_missing_from_catalog


def test_placeholder_id_remaps_to_sole_catalog_entry() -> None:
    catalog = [{"id": "ollama_llama3_2_1b", "role": "assistant", "goal": "help"}]
    out = maybe_remap_planner_provider_missing_from_catalog(
        "<id from catalog>",
        user_prompt="Who are you?",
        catalog_entries=catalog,
        quiet=True,
    )
    assert out == "ollama_llama3_2_1b"


def test_known_id_not_remapped() -> None:
    catalog = [{"id": "ollama_llama3_2_1b", "role": "assistant", "goal": "help"}]
    out = maybe_remap_planner_provider_missing_from_catalog(
        "ollama_llama3_2_1b",
        user_prompt="Who are you?",
        catalog_entries=catalog,
        quiet=True,
    )
    assert out is None
