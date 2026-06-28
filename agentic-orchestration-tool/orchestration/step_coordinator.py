from __future__ import annotations

import sys
from collections.abc import Callable

from orchestration.backends.base import RunOptions, StepResult, StepSpec, WorkflowExecutionResult
from orchestration.run_store import RunStore


class StepCoordinator:
    """Sequential step loop shared by subprocess and future Kubernetes backends."""

    def __init__(self, *, store: RunStore) -> None:
        self._store = store

    def run_sequential(
        self,
        specs: list[StepSpec],
        *,
        execute_step: Callable[[StepSpec], StepResult],
        options: RunOptions,
    ) -> WorkflowExecutionResult:
        if not specs:
            return WorkflowExecutionResult(
                exit_code=1,
                result_text=None,
                error=ValueError("no steps"),
            )

        step_results: list[StepResult] = []

        for spec in specs:
            if not options.quiet:
                _progress(f"starting {spec.step_id}")

            result = execute_step(spec)
            self._store.write_step_result(spec.run_id, spec.step_id, result)
            step_results.append(result)

            if result.exit_code != 0:
                return WorkflowExecutionResult(
                    exit_code=result.exit_code,
                    result_text=result.result_text,
                    error=RuntimeError(result.error or "step failed"),
                    step_results=step_results,
                )

            if not options.quiet:
                _progress(f"completed {spec.step_id}")

        last_text = step_results[-1].result_text if step_results else None
        if options.emit_stdout_summary and last_text:
            if options.quiet:
                print(last_text, flush=True)
            else:
                print("\n=== Workflow Output ===\n")
                print(last_text)

        return WorkflowExecutionResult(
            exit_code=0,
            result_text=last_text,
            step_results=step_results,
        )


def _progress(msg: str) -> None:
    try:
        sys.__stdout__.write(f"(progress) {msg}\n")
        sys.__stdout__.flush()
    except Exception:  # noqa: BLE001
        return
