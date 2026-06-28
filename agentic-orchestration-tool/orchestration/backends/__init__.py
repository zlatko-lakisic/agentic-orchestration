"""Execution backend contracts and factory (lazy imports to keep unit tests crewai-free)."""

from orchestration.backends.base import (
    ExecutionBackend,
    RunOptions,
    StepResult,
    StepSpec,
    WorkflowExecutionResult,
)

__all__ = [
    "ExecutionBackend",
    "RunOptions",
    "StepResult",
    "StepSpec",
    "WorkflowExecutionResult",
    "execution_backend_from_env",
]


def __getattr__(name: str):
    if name == "execution_backend_from_env":
        from orchestration.backends.factory import execution_backend_from_env

        return execution_backend_from_env
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
