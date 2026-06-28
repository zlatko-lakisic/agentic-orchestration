from __future__ import annotations

import os
import sys

from orchestration.backends.base import ExecutionBackend, RunOptions, WorkflowExecutionResult

_ALIASES = {
    "inprocess": "inprocess",
    "crewai": "inprocess",
    "process": "inprocess",
    "subprocess": "subprocess",
    "kubernetes": "kubernetes",
    "k8s": "kubernetes",
}


def execution_backend_from_env() -> ExecutionBackend:
    raw = os.getenv("AGENTIC_EXECUTION_BACKEND", "inprocess").strip().lower()
    name = _ALIASES.get(raw, raw)
    if name == "inprocess":
        from orchestration.backends.crewai import CrewAIExecutionBackend

        return CrewAIExecutionBackend()
    if name == "subprocess":
        from orchestration.backends.subprocess import SubprocessExecutionBackend

        return SubprocessExecutionBackend()
    if name == "kubernetes":
        from orchestration.backends.kubernetes import KubernetesExecutionBackend

        return KubernetesExecutionBackend()
    raise ValueError(
        f"Unknown AGENTIC_EXECUTION_BACKEND={raw!r}. "
        "Use inprocess, subprocess, or kubernetes."
    )


def execute_workflow_config(
    config,
    *,
    options: RunOptions,
) -> WorkflowExecutionResult:
    backend = execution_backend_from_env()
    if os.getenv("AGENTIC_EXECUTION_BACKEND", "").strip() and not options.quiet:
        print(f"(execution) backend={backend.name}", file=sys.stderr)
    return backend.execute_config(config, options=options)
