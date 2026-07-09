"""Regression: HA LLM Vision / gate PEOPLE prompts must not return tool-call JSON."""

from __future__ import annotations

from orchestration.goal_format_hints import (
    goal_requests_direct_vision_completion,
    goal_requests_gate_people_lines,
    goal_requires_machine_readable_only,
)
from orchestration.media_grounding import (
    MediaFileEvidence,
    MediaGroundingBundle,
    augment_workflow_config_for_media_mcp,
    synthesize_direct_vision_answer,
)
from orchestration.mcp_task_hints import looks_like_mcp_tool_call_leak
from orchestration.text_normalize import sanitize_user_facing_prose


_GATE_PROMPT = (
    "Do NOT call tools. Do NOT output JSON. Reply with exactly 3 lines:\n"
    "NOPEOPLE or PEOPLE\n"
    "short description\n"
    "shorter alert"
)

_GATE_PROMPT_PIPE = (
    "CRITICAL: Do NOT call tools. Exactly 3 plain text lines:\n"
    "Line1: PEOPLE|NOPEOPLE\n"
    "Line2: short description\n"
    "Line3: shorter alert"
)


def test_goal_requests_gate_people_lines() -> None:
    assert goal_requests_gate_people_lines(_GATE_PROMPT)
    assert goal_requests_gate_people_lines(_GATE_PROMPT_PIPE)
    assert goal_requests_direct_vision_completion(_GATE_PROMPT)
    assert goal_requires_machine_readable_only(_GATE_PROMPT)
    assert not goal_requests_gate_people_lines("Describe this photo of my garden.")


def test_looks_like_mcp_tool_call_leak_describe_image_json() -> None:
    leaked = (
        '{"name": "describe_image_file", "parameters": '
        '{"path": "/app/tool/_web_uploads/abc/0_openai_image_0.jpg"}}'
    )
    assert looks_like_mcp_tool_call_leak(leaked)
    assert sanitize_user_facing_prose(leaked) == ""

    leaked2 = (
        '{"name": "python_m_mcp_servers_media_understand_analyzer", '
        '"parameters": {"path":"/app/east_gate.jpg"}}'
    )
    assert looks_like_mcp_tool_call_leak(leaked2)


def test_synthesize_direct_vision_gate_nopeople() -> None:
    bundle = MediaGroundingBundle(
        files=[
            MediaFileEvidence(
                path="/tmp/gate.jpg",
                name="gate.jpg",
                category="image",
                mime="image/jpeg",
                tool_output={
                    "ok": True,
                    "description": (
                        "East gate driveway at night; empty paved area, no person visible."
                    ),
                },
            )
        ],
        tool_invoked=True,
        evidence_injected=True,
        markdown_block="[agentic: media grounding evidence]\nfacts",
    )
    out = synthesize_direct_vision_answer(_GATE_PROMPT, bundle)
    assert out is not None
    lines = out.splitlines()
    assert len(lines) == 3
    assert lines[0] in {"PEOPLE", "NOPEOPLE"}
    assert lines[0] == "NOPEOPLE"
    assert not looks_like_mcp_tool_call_leak(out)
    assert not re_match_tool_name(out)


def test_synthesize_direct_vision_gate_people() -> None:
    bundle = MediaGroundingBundle(
        files=[
            MediaFileEvidence(
                path="/tmp/gate.jpg",
                name="gate.jpg",
                category="image",
                mime="image/jpeg",
                tool_output={
                    "ok": True,
                    "description": "A person standing near the east gate fence.",
                },
            )
        ],
        tool_invoked=True,
        evidence_injected=True,
        markdown_block="[agentic: media grounding evidence]\nfacts",
    )
    out = synthesize_direct_vision_answer(_GATE_PROMPT_PIPE, bundle)
    assert out is not None
    assert out.splitlines()[0] == "PEOPLE"


def test_augment_skips_media_mcp_when_evidence_present(config_dir, monkeypatch) -> None:
    from orchestration.config_loader import TaskDefinition, WorkflowConfig
    from orchestration.mcp_providers_catalog import load_mcp_providers_catalog

    monkeypatch.setenv("AGENTIC_MCP_MEDIA_ENABLED", "1")
    catalog = load_mcp_providers_catalog(config_dir / "mcp_providers")
    cfg = WorkflowConfig(
        name="t",
        process="sequential",
        topic="x",
        instance_key="k",
        agent_providers=[],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id="step_1",
                agent_provider_id="ollama_llava",
                description="go",
                expected_output="out",
            )
        ],
        task_sequence=["step_1"],
    )
    prompt = (
        f"{_GATE_PROMPT}\n\n"
        "## Attached files (local paths; analyzed by the orchestrator)\n"
        "1. **gate.jpg**\n"
        "   - **category:** **image**\n\n"
        "[agentic: media grounding evidence]\n"
        "## Media grounding evidence\n"
    )
    out = augment_workflow_config_for_media_mcp(cfg, user_prompt=prompt, mcp_catalog=catalog)
    assert not (out.mcp_providers or [])
    assert not (out.tasks[0].mcp_providers or [])


def re_match_tool_name(text: str) -> bool:
    import re

    return bool(re.search(r'"name"\s*:\s*"(describe_image|python_m_mcp|media_understand)', text))
