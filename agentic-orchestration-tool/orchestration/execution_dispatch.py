from __future__ import annotations

import os
import sys

from orchestration.backends.base import RunOptions, WorkflowExecutionResult
from orchestration.backends.factory import execution_backend_from_env
from orchestration.backends.subprocess import subprocess_workers_enabled
from orchestration.config_loader import WorkflowConfig
from orchestration.runner import build_workflow


def execute_workflow_config_resolved(
    config: WorkflowConfig,
    *,
    options: RunOptions,
) -> WorkflowExecutionResult:
    """Run ``config`` via distributed ``execute_config`` or in-process ``execute_built``."""
    backend = execution_backend_from_env()
    if os.getenv("AGENTIC_EXECUTION_BACKEND", "").strip() and not options.quiet:
        print(f"(execution) backend={backend.name}", file=sys.stderr)
    if backend.supports_distributed_steps and subprocess_workers_enabled():
        return backend.execute_config(config, options=options)
    built = build_workflow(
        config,
        crew_verbose=options.crew_verbose,
        quiet=options.quiet,
        mcp_catalog_path=options.mcp_catalog_path,
        emit_progress_lines=options.emit_progress_lines,
    )
    return backend.execute_built(built, options=options)
