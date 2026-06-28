from __future__ import annotations

import copy
from pathlib import Path
from typing import Any

from orchestration.catalog_credentials import filter_entries_by_api_credentials
from orchestration.config_loader import WorkflowConfig, raw_mcp_spec_for_task
from orchestration.mcp_providers_catalog import (
    filter_mcp_entries_by_api_credentials,
    load_mcp_providers_catalog_merged,
    resolve_workflow_mcp_refs,
)
from orchestration.k8s_mcp_compat import apply_kubernetes_mcp_catalog_policy
from orchestration.backends.base import StepSpec
from orchestration.agent_provider_entries import resolve_agent_provider_entries
from orchestration.step_context import prepare_step_description


def resolve_task_mcp_maps(
    config: WorkflowConfig,
    *,
    mcp_catalog_path: Path | None,
    quiet: bool,
) -> dict[str, list[Any]]:
    mcp_catalog_entries: list[dict[str, Any]] = (
        load_mcp_providers_catalog_merged(mcp_catalog_path)
        if mcp_catalog_path is not None
        else []
    )
    if mcp_catalog_entries:
        mcp_catalog_entries, _skipped_mcp = filter_mcp_entries_by_api_credentials(
            mcp_catalog_entries,
            verbose=not quiet,
            log_prefix="workflow mcp catalog",
        )
        mcp_catalog_entries, _k8s_excluded = apply_kubernetes_mcp_catalog_policy(
            mcp_catalog_entries,
            verbose=not quiet,
            log_prefix="workflow mcp catalog",
        )

    task_mcps_resolved: dict[str, list[Any]] = {}
    for tdef in config.tasks:
        raw = raw_mcp_spec_for_task(tdef, config)
        task_mcps_resolved[tdef.id] = (
            resolve_workflow_mcp_refs(raw, mcp_catalog_entries) if raw else []
        )
    return task_mcps_resolved


def build_step_specs(
    config: WorkflowConfig,
    *,
    run_id: str,
    mcp_catalog_path: Path | None = None,
    quiet: bool = False,
    prior_outputs: dict[str, str] | None = None,
    run_store_path: str = "",
    artifacts_dir: str = "",
) -> list[StepSpec]:
    """Build backend-agnostic step specs using the same catalog resolution as ``build_workflow``."""
    resolved = resolve_agent_provider_entries(config)
    usable_payloads, _skipped = filter_entries_by_api_credentials(
        resolved,
        verbose=not quiet,
        log_prefix="workflow",
    )
    provider_by_id = {str(p["id"]): copy.deepcopy(p) for p in usable_payloads if p.get("id")}

    task_mcps = resolve_task_mcp_maps(
        config,
        mcp_catalog_path=mcp_catalog_path,
        quiet=quiet,
    )
    topic = config.topic or ""
    prior = prior_outputs or {}
    specs: list[StepSpec] = []

    for index, task_id in enumerate(config.task_sequence):
        task_def = next(t for t in config.tasks if t.id == task_id)
        apid = task_def.agent_provider_id
        provider = provider_by_id.get(apid)
        if provider is None:
            raise ValueError(
                f"Task '{task_id}' references unknown or credential-filtered agent provider '{apid}'."
            )

        prior_output = ""
        if index > 0:
            prev_id = config.task_sequence[index - 1]
            prior_output = prior.get(prev_id, "")

        description = prepare_step_description(task_def.description, prior_output)
        raw_mcps = raw_mcp_spec_for_task(task_def, config)
        mcp_resolved = task_mcps.get(task_id, [])
        mcp_payload: list[dict[str, Any]] = []
        for i, resolved_mcp in enumerate(mcp_resolved):
            entry: dict[str, Any] = {"resolved": resolved_mcp}
            if i < len(raw_mcps):
                raw_item = raw_mcps[i]
                if isinstance(raw_item, str):
                    entry["id"] = raw_item
                elif isinstance(raw_item, dict):
                    entry["id"] = str(raw_item.get("id") or raw_item.get("ref") or "")
            mcp_payload.append(entry)

        specs.append(
            StepSpec(
                schema_version="0.1",
                run_id=run_id,
                step_id=task_id,
                step_index=index,
                workflow_name=config.name,
                topic=topic,
                task_description=description,
                task_expected_output=task_def.expected_output,
                agent_provider=provider,
                mcp_providers=mcp_payload,
                prior_output=prior_output,
                inputs={"topic": topic},
                run_store_path=run_store_path,
                artifacts_dir=artifacts_dir,
            )
        )
    return specs


def step_specs_resolution_fingerprint(
    specs: list[StepSpec],
) -> tuple[tuple[str, str, int, tuple[str, ...]], ...]:
    """Stable per-step catalog resolution fingerprint (G4 parity; ignores ``run_id`` / prior inject)."""
    rows: list[tuple[str, str, int, tuple[str, ...]]] = []
    for spec in specs:
        mcp_ids = tuple(str(m.get("id", "")) for m in spec.mcp_providers)
        rows.append(
            (
                spec.step_id,
                str(spec.agent_provider.get("id", "")),
                len(spec.mcp_providers),
                mcp_ids,
            )
        )
    return tuple(rows)

