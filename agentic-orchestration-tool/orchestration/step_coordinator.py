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
        try_recover: Callable[[StepSpec, StepResult], bool] | None = None,
        options: RunOptions,
        max_attempts_per_step: int = 2,
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

            result: StepResult | None = None
            attempts = max(1, max_attempts_per_step)
            for attempt in range(attempts):
                result = execute_step(spec)
                if result.exit_code == 0:
                    break
                if attempt + 1 < attempts and try_recover is not None and try_recover(spec, result):
                    if not options.quiet:
                        _progress(f"retrying {spec.step_id}")
                    continue
                break

            assert result is not None
            result_path = self._store.step_result_path(spec.run_id, spec.step_id)
            if not result_path.is_file():
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
