"""CrewAI template interpolation must not treat user text as placeholders."""

from __future__ import annotations

import re
from types import SimpleNamespace
from unittest.mock import MagicMock

from orchestration.crewai_template import (
    collect_template_placeholders,
    crew_kickoff,
    fill_unmatched_crewai_placeholders,
    prepare_crewai_kickoff_inputs,
)

# Mirrors crewai.utilities.string_utils.interpolate_only (identifier placeholders).
_CREWAI_VAR = re.compile(r"\{([A-Za-z_][A-Za-z0-9_\-]*)}")

CONTINUE_TOPIC = (
    "<system>\nYou are in workspace {workspaceName}.\n"
    "<user>\nUse {notAVar} and payload {\"a\": 1}."
)
PLAN_DESCRIPTION = (
    "{topic}\n\nAnswer the user's goal clearly, accurately, and concisely."
)


def _crewai_interpolate_only(text: str, inputs: dict[str, object]) -> str:
    variables = _CREWAI_VAR.findall(text)
    missing = [var for var in variables if var not in inputs]
    if missing:
        raise KeyError(
            f"Template variable '{missing[0]}' not found in inputs dictionary"
        )
    result = text
    for var in variables:
        result = result.replace("{" + var + "}", str(inputs[var]))
    return result


def test_collect_placeholders_skips_json_objects() -> None:
    found = collect_template_placeholders(CONTINUE_TOPIC, PLAN_DESCRIPTION)
    assert found == {"workspaceName", "notAVar", "topic"}


def test_unfilled_description_raises_like_crewai() -> None:
    inlined = CONTINUE_TOPIC + "\n\nAnswer the user's goal clearly."
    try:
        _crewai_interpolate_only(inlined, {"topic": CONTINUE_TOPIC})
    except KeyError as exc:
        assert "workspaceName" in str(exc)
    else:
        raise AssertionError("expected interpolate_only to reject {workspaceName}")


def test_identity_fill_lets_interpolate_keep_literals() -> None:
    inlined = CONTINUE_TOPIC + "\n\nAnswer."
    filled = fill_unmatched_crewai_placeholders({"topic": CONTINUE_TOPIC}, inlined)
    rendered = _crewai_interpolate_only(inlined, filled)
    assert "{workspaceName}" in rendered
    assert "{notAVar}" in rendered
    assert '{"a": 1}' in rendered
    assert filled["workspaceName"] == "{workspaceName}"
    assert filled["notAVar"] == "{notAVar}"


def test_topic_only_description_still_shows_literals_after_replace() -> None:
    filled = fill_unmatched_crewai_placeholders(
        {"topic": CONTINUE_TOPIC},
        PLAN_DESCRIPTION,
    )
    rendered = _crewai_interpolate_only(PLAN_DESCRIPTION, filled)
    assert "{workspaceName}" in rendered
    assert "{notAVar}" in rendered
    assert '{"a": 1}' in rendered


def test_prepare_kickoff_inputs_reads_crew_templates() -> None:
    task = SimpleNamespace(
        description="{topic}\n\nSee {workspaceName}",
        expected_output="JSON {\"ok\": true} for {topic}",
    )
    agent = SimpleNamespace(
        role="Coder for {topic}",
        goal="Help with {notAVar}",
        backstory="Lives in {workspaceName}",
    )
    crew = SimpleNamespace(tasks=[task], agents=[agent])
    prepared = prepare_crewai_kickoff_inputs({"topic": "goal"}, crew=crew)
    assert prepared["topic"] == "goal"
    assert prepared["workspaceName"] == "{workspaceName}"
    assert prepared["notAVar"] == "{notAVar}"
    assert _crewai_interpolate_only(task.description, prepared).endswith(
        "See {workspaceName}"
    )


def test_crew_kickoff_fills_topic_placeholders_before_calling_crew() -> None:
    kickoff = MagicMock(return_value="ok")
    crew = SimpleNamespace(kickoff=kickoff, tasks=[], agents=[])
    result = crew_kickoff(crew, inputs={"topic": CONTINUE_TOPIC})
    assert result == "ok"
    kickoff.assert_called_once()
    passed = kickoff.call_args.kwargs["inputs"]
    assert passed["topic"] == CONTINUE_TOPIC
    assert passed["workspaceName"] == "{workspaceName}"
    assert passed["notAVar"] == "{notAVar}"
