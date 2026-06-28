"""Per-step recovery for distributed backends (K3.4 HF fallback, K3.5 provider recovery)."""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from agent_providers.factory import agent_provider_from_dict
from agent_providers.ollama_provider import _looks_like_ollama_runner_crash
from orchestration.backends.base import StepResult, StepSpec
from orchestration.config_loader import WorkflowConfig
from orchestration.execution_fallback import (
    _hf_litellm_execution_failure,
    workflow_config_after_hf_litellm_fallback,
)

RECOVERY_HF_LITELLM = "hf_litellm_fallback"
RECOVERY_PROVIDER = "provider_recovery"


def recovery_hint_for_exception(
    exc: BaseException,
    agent_provider: dict,
) -> tuple[bool, str | None]:
    """Classify a worker kickoff failure for ``result.json`` recovery fields."""
    msg = str(exc)
    if _hf_litellm_execution_failure(msg):
        return True, RECOVERY_HF_LITELLM

    provider_type = str(agent_provider.get("type", "")).strip().lower()
    if provider_type == "ollama" and _looks_like_ollama_runner_crash(exc):
        return True, RECOVERY_PROVIDER

    return False, None


def try_provider_recovery(spec: StepSpec, error_text: str) -> bool:
    """Invoke ``recover_from_workflow_error`` for the step's agent provider."""
    provider_data = spec.agent_provider
    default_model = str(provider_data.get("model", "gpt-4o-mini")).strip() or "gpt-4o-mini"
    ap = None
    try:
        ap = agent_provider_from_dict(provider_data, default_model=default_model)
        ap.initialize()
        return ap.recover_from_workflow_error(RuntimeError(error_text))
    except Exception as exc:  # noqa: BLE001
        print(f"(step recovery) provider recovery failed: {exc}", file=sys.stderr)
        return False
    finally:
        if ap is not None:
            try:
                ap.cleanup()
            except Exception:  # noqa: BLE001
                pass


@dataclass(frozen=True)
class StepRecoveryAttempt:
    should_retry: bool
    config: WorkflowConfig


def attempt_step_recovery(
    config: WorkflowConfig,
    *,
    spec: StepSpec,
    result: StepResult,
    catalog_path: Path | None,
    quiet: bool,
) -> StepRecoveryAttempt:
    """Map ``recovery_hint`` to HF config rebuild or provider recovery (one retry)."""
    if result.exit_code == 0 or not result.recoverable:
        return StepRecoveryAttempt(False, config)

    hint = (result.recovery_hint or "").strip()
    if hint == RECOVERY_HF_LITELLM:
        catalog = catalog_path or Path("config/agent_providers")
        fb = workflow_config_after_hf_litellm_fallback(
            config,
            result.error or "",
            catalog_path=catalog,
            quiet=quiet,
        )
        if fb is not None:
            if not quiet:
                print(
                    f"(step recovery) HF fallback for step {spec.step_id!r}; retrying once.",
                    file=sys.stderr,
                )
            return StepRecoveryAttempt(True, fb)
        return StepRecoveryAttempt(False, config)

    if hint == RECOVERY_PROVIDER:
        if try_provider_recovery(spec, result.error or ""):
            if not quiet:
                print(
                    f"(step recovery) provider recovery for step {spec.step_id!r}; retrying once.",
                    file=sys.stderr,
                )
            return StepRecoveryAttempt(True, config)
        return StepRecoveryAttempt(False, config)

    return StepRecoveryAttempt(False, config)


def make_step_recovery_callback(
    config_box: list[WorkflowConfig],
    *,
    catalog_path: Path | None,
    quiet: bool,
) -> Callable[[StepSpec, StepResult], bool]:
    def try_recover(spec: StepSpec, result: StepResult) -> bool:
        attempt = attempt_step_recovery(
            config_box[0],
            spec=spec,
            result=result,
            catalog_path=catalog_path,
            quiet=quiet,
        )
        if attempt.should_retry:
            config_box[0] = attempt.config
            return True
        return False

    return try_recover
