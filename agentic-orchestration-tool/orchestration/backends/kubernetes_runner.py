from __future__ import annotations

from pathlib import Path
from typing import Any

from orchestration.backends.base import RunOptions, StepResult, StepSpec, WorkflowExecutionResult
from orchestration.backends.k8s_settings import K8sSettings
from orchestration.backends.kubernetes_jobs import (
    K8sJobRecord,
    KubernetesJobRunner,
    spec_path_in_container,
)
from orchestration.config_loader import WorkflowConfig
from orchestration.run_store import new_run_id, run_store_base_from_env, run_store_session, write_step_spec
from orchestration.k8s_mcp_compat import (
    pod_sidecar_mcp_ids_for_step,
    rewrite_spec_mcps_for_pod_sidecars,
)
from orchestration.step_coordinator import StepCoordinator
from orchestration.step_recovery import make_step_recovery_callback
from orchestration.workflow_materializer import build_step_specs


def run_config_via_kubernetes(
    config: WorkflowConfig,
    *,
    options: RunOptions,
    job_runner: KubernetesJobRunner | None = None,
) -> WorkflowExecutionResult:
    """Run each step in an isolated Kubernetes Job (worker image ``--execute-step``)."""
    if run_store_base_from_env() is None:
        return WorkflowExecutionResult(
            exit_code=1,
            result_text=None,
            error=ValueError(
                "AGENTIC_RUN_STORE_PATH must be set for kubernetes backend "
                "(PVC mount shared with worker Jobs)"
            ),
        )

    settings = job_runner._settings if job_runner is not None else K8sSettings.from_env()
    try:
        settings.validate_for_run()
    except ValueError as exc:
        return WorkflowExecutionResult(exit_code=1, result_text=None, error=exc)

    run_id = options.run_id.strip() or new_run_id()
    runner = job_runner or KubernetesJobRunner.from_env()
    k8s_jobs: list[dict[str, Any]] = []
    config_box = [config]

    with run_store_session(run_id) as (store, workspace):
        store_mount = str(store._root)
        worker_run_store = settings.run_store_mount
        coordinator = StepCoordinator(store=store)
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
                run_store_path=worker_run_store,
                artifacts_dir=str(workspace / "artifacts"),
            )
            spec = specs[spec_index]
            spec_path = workspace / f"{spec.step_id}-spec.json"
            mcp_ids = [str(m.get("id") or "") for m in spec.mcp_providers if m.get("id")]
            sidecar_mcps = pod_sidecar_mcp_ids_for_step(mcp_ids)
            spec_dict = rewrite_spec_mcps_for_pod_sidecars(spec.to_dict(), sidecar_mcps)
            write_step_spec(spec_path, spec_dict)

            container_spec = spec_path_in_container(
                mount=settings.run_store_mount,
                run_id=run_id,
                step_id=spec.step_id,
            )
            provider_id = str(spec.agent_provider.get("id", "agent"))
            record, wait = runner.run_step_job(
                run_id=run_id,
                step_id=spec.step_id,
                spec_container_path=container_spec,
                agent_provider_id=provider_id,
                sidecar_mcp_ids=sidecar_mcps,
            )
            k8s_jobs.append(_job_record_to_dict(record, wait))

            saved = store.read_step_result(run_id, spec.step_id)
            if saved is not None:
                if saved.result_text:
                    prior_outputs[spec.step_id] = saved.result_text
                return saved

            err = wait.message or "kubernetes job failed without result.json"
            return StepResult(
                run_id=run_id,
                step_id=spec.step_id,
                exit_code=1 if wait.failed or not wait.succeeded else 0,
                error=err,
            )

        all_specs = build_step_specs(
            config_box[0],
            run_id=run_id,
            mcp_catalog_path=options.mcp_catalog_path,
            agent_skills_catalog_path=options.agent_skills_catalog_path,
                rag_sources_catalog_path=options.rag_sources_catalog_path,
            quiet=options.quiet,
            run_store_path=worker_run_store,
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
        if k8s_jobs:
            result = WorkflowExecutionResult(
                exit_code=result.exit_code,
                result_text=result.result_text,
                error=result.error,
                workflow_result=result.workflow_result,
                step_results=result.step_results,
                built=result.built,
                k8s_jobs=k8s_jobs,
            )
        return result


def _job_record_to_dict(record: K8sJobRecord, wait: Any) -> dict[str, Any]:
    return {
        "job_name": record.job_name,
        "namespace": record.namespace,
        "pod_name": record.pod_name,
        "succeeded": wait.succeeded,
        "failed": wait.failed,
        "message": wait.message,
    }
