from __future__ import annotations

import sys

from orchestration.backends.base import RunOptions, WorkflowExecutionResult
from orchestration.config_loader import WorkflowConfig
from orchestration.runner import BuiltWorkflow


class KubernetesExecutionBackend:
    """Kubernetes Job per step (F5 — stub until K8s plan Phase 3)."""

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
        raise NotImplementedError(
            "Kubernetes execution backend is not implemented yet. "
            "Use AGENTIC_EXECUTION_BACKEND=inprocess (default) or subprocess. "
            "See wiki Kubernetes-execution-upgrade."
        )

    def execute_built(
        self,
        built: BuiltWorkflow,
        *,
        options: RunOptions,
    ) -> WorkflowExecutionResult:
        print(
            "(execution) kubernetes backend requested but not available; "
            "set AGENTIC_EXECUTION_BACKEND=inprocess",
            file=sys.stderr,
        )
        return WorkflowExecutionResult(
            exit_code=1,
            result_text=None,
            error=NotImplementedError("kubernetes backend not implemented"),
        )
