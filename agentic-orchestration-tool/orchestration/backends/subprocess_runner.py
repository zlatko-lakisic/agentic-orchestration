from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

from orchestration.backends.base import RunOptions, StepResult, StepSpec, WorkflowExecutionResult
from orchestration.config_loader import WorkflowConfig
from orchestration.run_store import FileSystemRunStore, new_run_id
from orchestration.step_coordinator import StepCoordinator
from orchestration.workflow_materializer import build_step_specs


def run_config_via_subprocess(
    config: WorkflowConfig,
    *,
    options: RunOptions,
) -> WorkflowExecutionResult:
    """Run each step in an isolated ``python main.py --execute-step`` subprocess."""
    run_id = options.run_id.strip() or new_run_id()
    tool_root = Path(__file__).resolve().parents[2]
    store_root = Path(tempfile.mkdtemp(prefix=f"agentic-run-{run_id}-"))
    store = FileSystemRunStore(store_root)
    coordinator = StepCoordinator(store=store)

    prior_outputs: dict[str, str] = {}

    def _run_one(spec_index: int) -> StepResult:
        specs = build_step_specs(
            config,
            run_id=run_id,
            mcp_catalog_path=options.mcp_catalog_path,
            quiet=options.quiet,
            prior_outputs=prior_outputs,
            run_store_path=str(store_root),
            artifacts_dir=str(store_root / "artifacts"),
        )
        spec = specs[spec_index]
        spec_path = store_root / f"{spec.step_id}-spec.json"
        spec_path.write_text(json.dumps(spec.to_dict(), indent=2), encoding="utf-8")

        cmd = [sys.executable, str(tool_root / "main.py"), "--execute-step", str(spec_path)]
        proc = subprocess.run(
            cmd,
            cwd=str(tool_root),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        saved = store.read_step_result(run_id, spec.step_id)
        if saved is not None:
            if saved.result_text:
                prior_outputs[spec.step_id] = saved.result_text
            return saved
        err = proc.stderr.strip() or proc.stdout.strip() or f"exit {proc.returncode}"
        return StepResult(
            run_id=run_id,
            step_id=spec.step_id,
            exit_code=proc.returncode,
            result_text=proc.stdout.strip() or None,
            error=err if proc.returncode != 0 else None,
        )

    # Build ordered specs once for step count / ids
    all_specs = build_step_specs(
        config,
        run_id=run_id,
        mcp_catalog_path=options.mcp_catalog_path,
        quiet=options.quiet,
        run_store_path=str(store_root),
        artifacts_dir=str(store_root / "artifacts"),
    )

    def execute_step(spec: StepSpec) -> StepResult:
        index = next(i for i, s in enumerate(all_specs) if s.step_id == spec.step_id)
        return _run_one(index)

    return coordinator.run_sequential(all_specs, execute_step=execute_step, options=options)
