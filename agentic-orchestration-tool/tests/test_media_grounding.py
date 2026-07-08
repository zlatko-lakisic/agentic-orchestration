"""Tests for harness-level media grounding and skill echo stripping."""

from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.media_grounding import (
    MEDIA_GATE_RESPONSE,
    MediaFileEvidence,
    MediaGroundingBundle,
    answer_contradicts_media_evidence,
    augment_workflow_config_for_media_mcp,
    finalize_media_answer,
    strip_skill_echo_tokens,
)
from orchestration.text_normalize import sanitize_user_facing_prose


@pytest.mark.unit
def test_strip_skill_echo_tokens() -> None:
    raw = "SKILL_ECHO_OK\n\nBackyard is quiet.\n"
    assert "SKILL_ECHO_OK" not in strip_skill_echo_tokens(raw)
    assert "Backyard is quiet." in strip_skill_echo_tokens(raw)


@pytest.mark.unit
def test_sanitize_user_facing_prose_strips_skill_echo() -> None:
    out = sanitize_user_facing_prose("SKILL_ECHO_OK\n\nDone.")
    assert "SKILL_ECHO_OK" not in out
    assert "Done." in out


@pytest.mark.unit
def test_finalize_rejects_confabulated_movie_answer() -> None:
    bundle = MediaGroundingBundle(
        files=[
            MediaFileEvidence(
                path="/tmp/clip.mp4",
                name="clip.mp4",
                category="media",
                mime="video/mp4",
                facts={
                    "single_continuous_shot": True,
                    "scene_cut_count": 0,
                    "audio_near_silent": True,
                },
            )
        ],
        tool_invoked=True,
        evidence_injected=True,
        markdown_block="[agentic: media grounding evidence]\n## Media grounding evidence",
    )
    confab = (
        "SKILL_ECHO_OK\n"
        "This video appears to be a clip from a movie or TV show with rapid cuts "
        "and intense sound design."
    )
    text, accepted = finalize_media_answer(confab, bundle)
    assert not accepted
    assert MEDIA_GATE_RESPONSE in text
    assert "SKILL_ECHO_OK" not in text


@pytest.mark.unit
def test_finalize_accepts_grounded_answer() -> None:
    bundle = MediaGroundingBundle(
        files=[
            MediaFileEvidence(
                path="/tmp/clip.mp4",
                name="clip.mp4",
                category="media",
                mime="video/mp4",
                facts={"single_continuous_shot": True, "audio_near_silent": True},
            )
        ],
        tool_invoked=True,
        evidence_injected=True,
        markdown_block="[agentic: media grounding evidence]\nfacts",
    )
    grounded = (
        "SKILL_ECHO_OK\n"
        "Static backyard security footage in a single continuous shot; audio is effectively silent."
    )
    text, accepted = finalize_media_answer(grounded, bundle)
    assert accepted
    assert "SKILL_ECHO_OK" not in text
    assert "single continuous shot" in text.lower()


@pytest.mark.unit
def test_answer_contradicts_media_evidence_detects_cuts() -> None:
    bundle = MediaGroundingBundle(
        files=[
            MediaFileEvidence(
                path="/x.mp4",
                name="x.mp4",
                category="media",
                mime="video/mp4",
                facts={"single_continuous_shot": True, "scene_cut_count": 0},
            )
        ]
    )
    reason = answer_contradicts_media_evidence(
        "An action-packed movie with rapid cuts between scenes.",
        bundle,
    )
    assert reason is not None


@pytest.mark.unit
def test_augment_workflow_config_for_media_mcp(config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
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
        "## Attached files (local paths; analyzed by the orchestrator)\n"
        "1. **clip.mp4**\n"
        "   - **category:** **media**\n"
    )
    out = augment_workflow_config_for_media_mcp(cfg, user_prompt=prompt, mcp_catalog=catalog)
    assert "media_understand" in (out.mcp_providers or [])
    assert out.tasks[0].mcp_providers and "media_understand" in out.tasks[0].mcp_providers


@pytest.mark.unit
def test_finalize_gate_when_bundle_gated() -> None:
    bundle = MediaGroundingBundle(gate=True, files=[MediaFileEvidence(
        path="/x.mp4", name="x.mp4", category="media", mime="video/mp4",
    )])
    text, accepted = finalize_media_answer("A movie with explosions.", bundle)
    assert not accepted
    assert text == MEDIA_GATE_RESPONSE
