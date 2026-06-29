from __future__ import annotations

from dataclasses import replace
from pathlib import Path

import pytest

from orchestration.backends.base import StepResult, StepSpec
from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.step_recovery import (
    RECOVERY_HF_LITELLM,
    RECOVERY_PROVIDER,
    attempt_step_recovery,
    recovery_hint_for_exception,
)


def _spec(*, step_id: str = "research") -> StepSpec:
    return StepSpec(
        schema_version="0.1",
        run_id="run-1",
        step_id=step_id,
        step_index=0,
        workflow_name="wf",
        topic="t",
        task_description="d",
        task_expected_output="o",
        agent_provider={"id": "hf_agent", "type": "huggingface", "model": "org/model-a"},
        mcp_providers=[],
        skills=[],
        prior_output="",
        inputs={"topic": "t"},
        run_store_path="/run/store",
    )


def _hf_config() -> WorkflowConfig:
    return WorkflowConfig(
        name="wf",
        process="sequential",
        topic="t",
        instance_key="k",
        agent_providers=[
            {
                "id": "hf_agent",
                "type": "huggingface",
                "model": "org/model-a",
                "role": "r",
                "goal": "g",
                "backstory": "b",
                "exec_fallback_provider": "ollama_llava",
            },
            {
                "id": "ollama_llava",
                "type": "ollama",
                "model": "ollama/llava",
                "role": "r",
                "goal": "g",
                "backstory": "b",
            },
        ],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id="research",
                agent_provider_id="hf_agent",
                description="d",
                expected_output="o",
            )
        ],
        task_sequence=["research"],
    )


@pytest.mark.unit
def test_recovery_hint_hf_litellm() -> None:
    exc = RuntimeError("LiteLLM HuggingFaceException: model org/model-a not supported")
    recoverable, hint = recovery_hint_for_exception(exc, {"type": "huggingface"})
    assert recoverable is True
    assert hint == RECOVERY_HF_LITELLM


@pytest.mark.unit
def test_attempt_step_recovery_hf_rebuilds_config(
    tool_root: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cfg = _hf_config()
    spec = _spec()
    result = StepResult(
        run_id="run-1",
        step_id="research",
        exit_code=1,
        error="HuggingFaceException: org/model-a",
        recoverable=True,
        recovery_hint=RECOVERY_HF_LITELLM,
    )
    catalog = tool_root / "config" / "agent_providers"
    attempt = attempt_step_recovery(
        cfg,
        spec=spec,
        result=result,
        catalog_path=catalog,
        quiet=True,
    )
    assert attempt.should_retry is True
    assert attempt.config.tasks[0].agent_provider_id == "ollama_llava"


@pytest.mark.unit
def test_attempt_step_recovery_provider_hint_without_recover_returns_no_retry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cfg = _hf_config()
    spec = replace(
        _spec(),
        agent_provider={"id": "ollama_llava", "type": "ollama", "model": "ollama/llava"},
    )
    result = StepResult(
        run_id="run-1",
        step_id="research",
        exit_code=1,
        error="connection refused",
        recoverable=True,
        recovery_hint=RECOVERY_PROVIDER,
    )
    monkeypatch.setattr(
        "orchestration.step_recovery.try_provider_recovery",
        lambda *_a, **_k: False,
    )
    attempt = attempt_step_recovery(
        cfg,
        spec=spec,
        result=result,
        catalog_path=None,
        quiet=True,
    )
    assert attempt.should_retry is False
