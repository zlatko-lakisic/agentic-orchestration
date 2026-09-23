"""Tests for plan contamination detection."""

from orchestration.plan_validation import plan_contamination


def test_trace_style_contamination_flagged() -> None:
    plan = {
        "steps": [
            {
                "description": (
                    "{topic} Provide a written summary of the current status of the "
                    "relationship between different ethnic groups, including security "
                    "systems, climate controls, appliances, home network, and irrigation systems."
                ),
                "expected_output": (
                    "A clear and concise written report summarizing the current status "
                    "of the relationship between different ethnic groups."
                ),
            }
        ]
    }
    context = [
        (
            '{"plan_summary":"home status including security systems, climate controls, '
            'appliances, home network, and irrigation systems"}'
        ),
        "relationship between different ethnic groups",
    ]
    foreign = plan_contamination(plan, "How are you today?", context)
    assert "irrigation" in foreign
    assert "ethnic" in foreign


def test_legit_irrigation_request_not_flagged() -> None:
    plan = {
        "steps": [
            {
                "description": "{topic} Decide irrigation minutes for the backyard zone.",
                "expected_output": "MINUTES: N",
            }
        ]
    }
    foreign = plan_contamination(
        plan,
        "Should I run irrigation on the backyard zone for 10 minutes?",
        ["prior home status with irrigation systems"],
    )
    assert foreign == []
