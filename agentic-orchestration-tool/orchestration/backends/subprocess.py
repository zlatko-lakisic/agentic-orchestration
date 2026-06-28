from __future__ import annotations

from orchestration.backends.base import RunOptions, WorkflowExecutionResult
from orchestration.backends.crewai import CrewAIExecutionBackend
from orchestration.config_loader import WorkflowConfig
from orchestration.runner import BuiltWorkflow


def subprocess_workers_enabled() -> bool:
    import os

    return os.getenv("AGENTIC_SUBPROCESS_WORKERS", "0").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


class SubprocessExecutionBackend:
    """Distributed step execution via local worker subprocess (F4 — partial stub)."""

    def __init__(self) -> None:
        self._crewai = CrewAIExecutionBackend()

    @property
    def name(self) -> str:
        return "subprocess"

    @property
    def supports_distributed_steps(self) -> bool:
        return True

    def execute_config(
        self,
        config: WorkflowConfig,
        *,
        options: RunOptions,
    ) -> WorkflowExecutionResult:
        if subprocess_workers_enabled():
            from orchestration.backends.subprocess_runner import run_config_via_subprocess

            return run_config_via_subprocess(config, options=options)
        return self._crewai.execute_config(config, options=options)

    def execute_built(
        self,
        built: BuiltWorkflow,
        *,
        options: RunOptions,
    ) -> WorkflowExecutionResult:
        return self._crewai.execute_built(built, options=options)


def _subprocess_workers_enabled() -> bool:
    """Deprecated alias for ``subprocess_workers_enabled``."""
    return subprocess_workers_enabled()
