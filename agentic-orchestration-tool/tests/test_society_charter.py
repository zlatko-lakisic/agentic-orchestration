from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from orchestration.society_charter import (
    DEFAULT_MAX_DELEGATIONS,
    DEFAULT_MAX_TURNS,
    INTERACTION_MODES,
    MAX_TURNS_CEILING,
    SocietyCharterError,
    load_society_charter,
    parse_society_charter,
    resolve_member_catalog_entries,
    validate_members_against_catalog,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
SHIPPED_CHARTER = (
    REPO_ROOT / "examples" / "verticals" / "society_research_panel" / "society_research_panel.yaml"
)
SHIPPED_JETSON_CHARTER = (
    REPO_ROOT
    / "examples"
    / "verticals"
    / "society_research_panel"
    / "society_research_panel_jetson.yaml"
)


def _charter_dict(**society_overrides) -> dict:
    society = {
        "id": "panel",
        "protocol": "round_robin",
        "max_turns": 6,
        "max_delegations": 1,
        "members": [
            {"agent_provider_id": "a_facilitator", "role": "facilitator", "can_delegate": True},
            {"agent_provider_id": "a_expert", "role": "domain_expert"},
            {"agent_provider_id": "a_critic", "role": "critic"},
        ],
        "stop_when": [{"facilitator_posts": "FINAL_RECOMMENDATION"}],
        "tools": ["delegate_task"],
    }
    society.update(society_overrides)
    return {"society": society}


def _catalog(*, capable: bool = True) -> list[dict]:
    return [
        {"id": "a_facilitator", "type": "ollama", "society_capable": capable},
        {"id": "a_expert", "type": "ollama", "society_capable": capable},
        {"id": "a_critic", "type": "ollama", "society_capable": capable},
        {"id": "a_bystander", "type": "ollama"},
    ]


def test_parse_minimal_charter_applies_defaults() -> None:
    charter = parse_society_charter(
        {"society": {"id": "panel", "members": [{"agent_provider_id": "a", "role": "facilitator"}]}}
    )
    assert charter.society_id == "panel"
    assert charter.protocol == "round_robin"
    assert charter.interaction_mode == "blackboard"
    assert charter.max_turns == DEFAULT_MAX_TURNS
    assert charter.max_delegations == DEFAULT_MAX_DELEGATIONS
    # min_turns defaults to one full round.
    assert charter.min_turns == 1
    assert charter.stop_when == []


@pytest.mark.parametrize(
    "protocol",
    ["round_robin", "hierarchical", "moderator_picks", "reactive"],
)
def test_every_documented_protocol_parses(protocol: str) -> None:
    charter = parse_society_charter(_charter_dict(protocol=protocol))
    assert charter.protocol == protocol


def test_message_bus_tools_are_known() -> None:
    from orchestration.society_charter import KNOWN_SOCIETY_TOOLS

    assert {"society_post", "society_read_thread", "society_list_agents"} <= KNOWN_SOCIETY_TOOLS
    charter = parse_society_charter(_charter_dict(tools=["society_post", "society_read_thread"]))
    assert charter.tools == ["society_post", "society_read_thread"]


def test_env_overrides_default_budgets(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SOCIETY_MAX_TURNS", "5")
    monkeypatch.setenv("AGENTIC_SOCIETY_MAX_DELEGATIONS", "0")
    charter = parse_society_charter(
        {"society": {"id": "panel", "members": [{"agent_provider_id": "a", "role": "critic"}]}}
    )
    assert charter.max_turns == 5
    assert charter.max_delegations == 0
    assert charter.delegation_allowed() is False


def test_max_turns_is_capped_at_ceiling() -> None:
    charter = parse_society_charter(_charter_dict(max_turns=10_000))
    assert charter.max_turns == MAX_TURNS_CEILING


def test_min_turns_defaults_to_roster_size_and_never_exceeds_max_turns() -> None:
    charter = parse_society_charter(_charter_dict())
    assert charter.min_turns == 3
    tight = parse_society_charter(_charter_dict(max_turns=2, min_turns=9))
    assert tight.min_turns == 2


def test_round_robin_member_selection_wraps() -> None:
    charter = parse_society_charter(_charter_dict())
    roles = [charter.member_for_turn(i).role for i in range(1, 8)]
    assert roles == [
        "facilitator",
        "domain_expert",
        "critic",
        "facilitator",
        "domain_expert",
        "critic",
        "facilitator",
    ]
    with pytest.raises(ValueError):
        charter.member_for_turn(0)


def test_stop_condition_shorthand_matches_role_and_phrase() -> None:
    charter = parse_society_charter(_charter_dict())
    matched = charter.matched_stop_condition(
        role="facilitator",
        text="…so FINAL_RECOMMENDATION: run it in the cluster.",
    )
    assert matched is not None and matched.phrase == "FINAL_RECOMMENDATION"
    # Same phrase from another role does not stop the run.
    assert charter.matched_stop_condition(role="critic", text="FINAL_RECOMMENDATION") is None
    assert charter.matched_stop_condition(role="facilitator", text="still debating") is None


def test_stop_condition_explicit_form_and_any_role() -> None:
    charter = parse_society_charter(
        _charter_dict(stop_when=[{"posts": "PANEL_DONE"}, {"role": "critic", "posts": "VETO"}])
    )
    assert charter.matched_stop_condition(role="critic", text="panel_done now") is not None
    assert charter.matched_stop_condition(role="critic", text="VETO this") is not None
    assert charter.matched_stop_condition(role="facilitator", text="VETO this") is None


def test_stop_condition_unknown_role_is_rejected() -> None:
    with pytest.raises(SocietyCharterError, match="no member holds"):
        parse_society_charter(_charter_dict(stop_when=[{"moderator_posts": "DONE"}]))


@pytest.mark.parametrize(
    "society, message",
    [
        ({"id": "", "members": [{"agent_provider_id": "a", "role": "r"}]}, "society.id"),
        ({"id": "p", "members": []}, "non-empty list"),
        ({"id": "p"}, "non-empty list"),
        (
            {"id": "p", "members": [{"role": "facilitator"}]},
            "agent_provider_id",
        ),
        (
            {"id": "p", "members": [{"agent_provider_id": "a"}]},
            "role",
        ),
        (
            {
                "id": "p",
                "protocol": "free_for_all",
                "members": [{"agent_provider_id": "a", "role": "r"}],
            },
            "society.protocol",
        ),
        (
            {
                "id": "p",
                "interaction_mode": "telepathy",
                "members": [{"agent_provider_id": "a", "role": "r"}],
            },
            "society.interaction_mode",
        ),
        (
            {
                "id": "p",
                "members": [
                    {"agent_provider_id": "a", "role": "r1"},
                    {"agent_provider_id": "a", "role": "r2"},
                ],
            },
            "duplicate agent_provider_id",
        ),
        (
            {"id": "p", "max_turns": 0, "members": [{"agent_provider_id": "a", "role": "r"}]},
            "max_turns",
        ),
        (
            {
                "id": "p",
                "max_delegations": -1,
                "members": [{"agent_provider_id": "a", "role": "r"}],
            },
            "max_delegations",
        ),
        (
            {
                "id": "p",
                "members": [{"agent_provider_id": "a", "role": "r", "nope": 1}],
            },
            "unsupported keys",
        ),
    ],
)
def test_invalid_charters_are_rejected(society: dict, message: str) -> None:
    with pytest.raises(SocietyCharterError, match=message):
        parse_society_charter({"society": society})


def test_non_mapping_roots_are_rejected() -> None:
    with pytest.raises(SocietyCharterError, match="root must be a mapping"):
        parse_society_charter(["society"])
    with pytest.raises(SocietyCharterError, match="'society' mapping"):
        parse_society_charter({"meta": {}})


def test_all_interaction_modes_parse() -> None:
    for mode in INTERACTION_MODES:
        charter = parse_society_charter(_charter_dict(interaction_mode=mode))
        assert charter.interaction_mode == mode


def test_catalog_validation_rejects_unknown_member() -> None:
    charter = parse_society_charter(_charter_dict())
    catalog = [e for e in _catalog() if e["id"] != "a_critic"]
    with pytest.raises(SocietyCharterError, match="unknown agent_provider_id"):
        validate_members_against_catalog(charter, catalog)


def test_catalog_validation_requires_society_capable() -> None:
    charter = parse_society_charter(_charter_dict())
    with pytest.raises(SocietyCharterError, match="society_capable"):
        validate_members_against_catalog(charter, _catalog(capable=False))
    # Explicit opt-out lets a plain catalog entry be seated.
    validate_members_against_catalog(
        charter,
        _catalog(capable=False),
        require_society_capable=False,
    )


def test_society_capable_requirement_respects_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SOCIETY_REQUIRE_CAPABLE", "0")
    charter = parse_society_charter(_charter_dict())
    validate_members_against_catalog(charter, _catalog(capable=False))


def test_resolve_member_catalog_entries_returns_copies() -> None:
    charter = parse_society_charter(_charter_dict())
    catalog = _catalog()
    entries = resolve_member_catalog_entries(charter, catalog)
    assert sorted(entries) == ["a_critic", "a_expert", "a_facilitator"]
    entries["a_critic"]["model"] = "mutated"
    assert "model" not in catalog[2]


def test_load_charter_from_file(tmp_path: Path) -> None:
    path = tmp_path / "charter.yaml"
    path.write_text(yaml.safe_dump(_charter_dict()), encoding="utf-8")
    charter = load_society_charter(path, agent_catalog=_catalog())
    assert charter.source_path == str(path)
    assert charter.agent_provider_ids == ["a_facilitator", "a_expert", "a_critic"]
    assert charter.delegation_allowed() is True


def test_load_charter_missing_file(tmp_path: Path) -> None:
    with pytest.raises(SocietyCharterError, match="not found"):
        load_society_charter(tmp_path / "nope.yaml")


def test_load_charter_invalid_yaml(tmp_path: Path) -> None:
    path = tmp_path / "charter.yaml"
    path.write_text("society: [unclosed\n", encoding="utf-8")
    with pytest.raises(SocietyCharterError, match="invalid YAML"):
        load_society_charter(path)


def test_shipped_research_panel_charter_is_valid() -> None:
    charter = load_society_charter(SHIPPED_CHARTER)
    assert charter.society_id == "research_panel"
    assert charter.protocol == "round_robin"
    assert charter.max_turns == 12
    assert [m.role for m in charter.members] == ["facilitator", "domain_expert", "critic"]
    assert charter.agent_provider_ids == [
        "ollama_hermes3",
        "ollama_llama3_3",
        "ollama_qwen2_5_coder",
    ]
    assert charter.tools == [
        "delegate_task",
        "society_post",
        "society_read_thread",
        "society_list_agents",
    ]
    facilitator = charter.member_for_turn(1)
    assert facilitator.can_delegate is True
    assert charter.matched_stop_condition(
        role="facilitator",
        text="FINAL_RECOMMENDATION: ship it",
    )


def test_shipped_charter_members_are_society_capable_in_catalog(tool_root: Path) -> None:
    from orchestration.agent_providers_catalog import load_agent_providers_catalog

    catalog = load_agent_providers_catalog(tool_root / "config" / "agent_providers")
    charter = load_society_charter(SHIPPED_CHARTER)
    validate_members_against_catalog(charter, catalog)


def test_shipped_jetson_charter_is_valid_against_overlay() -> None:
    from orchestration.agent_providers_catalog import load_agent_providers_catalog

    overlay = SHIPPED_JETSON_CHARTER.parent / "agent_providers"
    charter = load_society_charter(
        SHIPPED_JETSON_CHARTER,
        agent_catalog=load_agent_providers_catalog(overlay),
    )
    assert charter.society_id == "research_panel_jetson"
    assert charter.max_delegations == 0
    assert charter.delegation_allowed() is False
