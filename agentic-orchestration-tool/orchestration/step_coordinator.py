from __future__ import annotations

import sys
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, as_completed

from orchestration.backends.base import RunOptions, StepResult, StepSpec, WorkflowExecutionResult
from orchestration.run_store import RunStore


class StepCoordinator:
    """Sequential step loop shared by subprocess and future Kubernetes backends."""

    def __init__(self, *, store: RunStore) -> None:
        self._store = store

    def run_dag(
        self,
        specs: list[StepSpec],
        *,
        execute_step: Callable[[StepSpec], StepResult],
        try_recover: Callable[[StepSpec, StepResult], bool] | None = None,
        options: RunOptions,
        max_attempts_per_step: int = 2,
        max_parallel: int | None = None,
    ) -> WorkflowExecutionResult:
        """Execute steps in parallel waves when the DAG allows."""
        if not specs:
            return WorkflowExecutionResult(
                exit_code=1,
                result_text=None,
                error=ValueError("no steps"),
            )
        waves = _dag_waves(specs)
        step_results: list[StepResult] = []
        results_by_id: dict[str, StepResult] = {}
        pool_size = max_parallel or max(1, min(8, len(specs)))

        for wave in waves:
            wave_specs = [s for s in specs if s.step_id in wave]
            if len(wave_specs) == 1:
                outcome = self._run_one_step(
                    wave_specs[0],
                    execute_step=execute_step,
                    try_recover=try_recover,
                    options=options,
                    max_attempts_per_step=max_attempts_per_step,
                )
                if outcome.exit_code != 0:
                    step_results.append(outcome)
                    return WorkflowExecutionResult(
                        exit_code=outcome.exit_code,
                        result_text=outcome.result_text,
                        error=RuntimeError(outcome.error or "step failed"),
                        step_results=[*step_results, outcome],
                    )
                if not self._store.has_step_result(wave_specs[0].run_id, wave_specs[0].step_id):
                    self._store.write_step_result(
                        wave_specs[0].run_id, wave_specs[0].step_id, outcome
                    )
                step_results.append(outcome)
                results_by_id[outcome.step_id] = outcome
                continue

            with ThreadPoolExecutor(max_workers=min(pool_size, len(wave_specs))) as pool:
                futures = {
                    pool.submit(
                        self._run_one_step,
                        spec,
                        execute_step=execute_step,
                        try_recover=try_recover,
                        options=options,
                        max_attempts_per_step=max_attempts_per_step,
                    ): spec
                    for spec in wave_specs
                }
                for fut in as_completed(futures):
                    spec = futures[fut]
                    outcome = fut.result()
                    if outcome.exit_code != 0:
                        return WorkflowExecutionResult(
                            exit_code=outcome.exit_code,
                            result_text=outcome.result_text,
                            error=RuntimeError(outcome.error or "step failed"),
                            step_results=[*step_results, outcome],
                        )
                    if not self._store.has_step_result(spec.run_id, spec.step_id):
                        self._store.write_step_result(spec.run_id, spec.step_id, outcome)
                    step_results.append(outcome)
                    results_by_id[outcome.step_id] = outcome

        ordered = [results_by_id[s.step_id] for s in specs if s.step_id in results_by_id]
        last_text = ordered[-1].result_text if ordered else None
        if options.emit_stdout_summary and last_text:
            if options.quiet:
                print(last_text, flush=True)
            else:
                print("\n=== Workflow Output ===\n")
                print(last_text)
        return WorkflowExecutionResult(
            exit_code=0,
            result_text=last_text,
            step_results=ordered,
        )

    def _run_one_step(
        self,
        spec: StepSpec,
        *,
        execute_step: Callable[[StepSpec], StepResult],
        try_recover: Callable[[StepSpec, StepResult], bool] | None,
        options: RunOptions,
        max_attempts_per_step: int,
    ) -> StepResult:
        if not options.quiet:
            _progress(f"starting {spec.step_id}")
        result: StepResult | None = None
        attempts = max(1, max_attempts_per_step)
        for attempt in range(attempts):
            from orchestration.execution_queue import acquire_step, step_sublease_enabled

            if step_sublease_enabled():
                with acquire_step(
                    run_id=spec.run_id,
                    step_id=spec.step_id,
                    spec=spec,
                ):
                    result = execute_step(spec)
            else:
                result = execute_step(spec)
            if result.exit_code == 0:
                break
            if attempt + 1 < attempts and try_recover is not None and try_recover(spec, result):
                if not options.quiet:
                    _progress(f"retrying {spec.step_id}")
                continue
            break
        assert result is not None
        if not options.quiet and result.exit_code == 0:
            _progress(f"completed {spec.step_id}")
        return result

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
            if not self._store.has_step_result(spec.run_id, spec.step_id):
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


def _dag_waves(specs: list[StepSpec]) -> list[list[str]]:
    """Topological sort into parallel waves (step_ids per wave)."""
    by_id = {s.step_id: s for s in specs}
    remaining = set(by_id.keys())
    done: set[str] = set()
    waves: list[list[str]] = []
    while remaining:
        ready = [
            sid
            for sid in remaining
            if all(dep in done for dep in (by_id[sid].depends_on or ()))
        ]
        if not ready:
            # Cycle or missing dep — fall back to sequential order.
            ready = [next(iter(remaining))]
        ready.sort(key=lambda sid: by_id[sid].step_index)
        waves.append(ready)
        for sid in ready:
            remaining.discard(sid)
            done.add(sid)
    return waves
