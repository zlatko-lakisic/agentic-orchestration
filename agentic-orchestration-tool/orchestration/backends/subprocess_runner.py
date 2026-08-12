from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from orchestration.backends.base import RunOptions, StepResult, StepSpec, WorkflowExecutionResult
from orchestration.config_loader import WorkflowConfig
from orchestration.run_store import new_run_id, run_store_session, write_step_spec
from orchestration.step_coordinator import StepCoordinator
from orchestration.step_recovery import make_step_recovery_callback
from orchestration.structured_logging import emit_log
from orchestration.workflow_materializer import build_step_specs


def run_config_via_subprocess(
    config: WorkflowConfig,
    *,
    options: RunOptions,
) -> WorkflowExecutionResult:
    """Run each step in an isolated ``python main.py --execute-step`` subprocess."""
    run_id = options.run_id.strip() or new_run_id()
    tool_root = Path(__file__).resolve().parents[2]
    config_box = [config]
    emit_log("subprocess run start", run_id=run_id, component="coordinator")

    with run_store_session(run_id) as (store, workspace):
        coordinator = StepCoordinator(store=store)
        store_mount = str(store.local_root)
        prior_outputs: dict[str, str] = {}

        def _run_one(active_config: WorkflowConfig, spec_index: int) -> StepResult:
            specs = build_step_specs(
                active_config,
                run_id=run_id,
                mcp_catalog_path=options.mcp_catalog_path,
                agent_skills_catalog_path=options.agent_skills_catalog_path,
                rag_sources_catalog_path=options.rag_sources_catalog_path,
                quiet=options.quiet,
                prior_outputs=prior_outputs,
                run_store_path=store_mount,
                artifacts_dir=str(workspace / "artifacts"),
            )
            spec = specs[spec_index]
            spec_path = workspace / f"{spec.step_id}-spec.json"
            write_step_spec(spec_path, spec.to_dict())

            emit_log(
                f"subprocess step spawn {spec.step_id}",
                run_id=run_id,
                step_id=spec.step_id,
                component="coordinator",
            )
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
                if saved.exit_code != 0:
                    emit_log(
                        f"subprocess step fail {spec.step_id}: {saved.error or saved.exit_code}",
                        level="error",
                        run_id=run_id,
                        step_id=spec.step_id,
                        component="coordinator",
                    )
                return saved
            err = proc.stderr.strip() or proc.stdout.strip() or f"exit {proc.returncode}"
            if proc.returncode != 0:
                emit_log(
                    f"subprocess step fail {spec.step_id}: {err}",
                    level="error",
                    run_id=run_id,
                    step_id=spec.step_id,
                    component="coordinator",
                )
            return StepResult(
                run_id=run_id,
                step_id=spec.step_id,
                exit_code=proc.returncode,
                result_text=proc.stdout.strip() or None,
                error=err if proc.returncode != 0 else None,
            )

        all_specs = build_step_specs(
            config_box[0],
            run_id=run_id,
            mcp_catalog_path=options.mcp_catalog_path,
            agent_skills_catalog_path=options.agent_skills_catalog_path,
            rag_sources_catalog_path=options.rag_sources_catalog_path,
            quiet=options.quiet,
            run_store_path=store_mount,
            artifacts_dir=str(workspace / "artifacts"),
        )

        def execute_step(spec: StepSpec) -> StepResult:
            index = next(i for i, s in enumerate(all_specs) if s.step_id == spec.step_id)
            return _run_one(config_box[0], index)

        result = coordinator.run_sequential(
            all_specs,
            execute_step=execute_step,
            try_recover=make_step_recovery_callback(
                config_box,
                catalog_path=options.mcp_catalog_path,
                quiet=options.quiet,
            ),
            options=options,
        )
        emit_log(
            f"subprocess run end exit={result.exit_code}",
            level="error" if result.exit_code else "info",
            run_id=run_id,
            component="coordinator",
        )
        return result
