from __future__ import annotations

import sys

from orchestration.backends.base import RunOptions, WorkflowExecutionResult
from orchestration.backends.crewai import CrewAIExecutionBackend
from orchestration.config_loader import WorkflowConfig
from orchestration.runner import BuiltWorkflow


class KubernetesExecutionBackend:
    """Kubernetes Job per step (F5 / K8s Phase 3)."""

    def __init__(self) -> None:
        self._crewai = CrewAIExecutionBackend()

    @property
    def name(self) -> str:
        return "kubernetes"

    @property
    def supports_distributed_steps(self) -> bool:
        return True

    def execute_config(
        self,
        config: WorkflowConfig,
        *,
        options: RunOptions,
    ) -> WorkflowExecutionResult:
        from orchestration.backends.kubernetes_runner import run_config_via_kubernetes

        return run_config_via_kubernetes(config, options=options)

    def execute_built(
        self,
        built: BuiltWorkflow,
        *,
        options: RunOptions,
    ) -> WorkflowExecutionResult:
        print(
            "(execution) kubernetes backend uses execute_config; rebuild from WorkflowConfig",
            file=sys.stderr,
        )
        return WorkflowExecutionResult(
            exit_code=1,
            result_text=None,
            error=ValueError("kubernetes backend requires WorkflowConfig via execute_config"),
        )
