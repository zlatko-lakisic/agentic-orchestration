from __future__ import annotations

import copy
from pathlib import Path
from typing import Any

from orchestration.catalog_credentials import filter_entries_by_api_credentials
from orchestration.cloud_anonymize import maybe_redact_for_cloud_provider
from orchestration.config_loader import WorkflowConfig, raw_mcp_spec_for_task, raw_skill_spec_for_task, raw_rag_spec_for_task
from orchestration.mcp_providers_catalog import (
    filter_mcp_entries_by_api_credentials,
    load_mcp_providers_catalog_merged,
    resolve_workflow_mcp_refs,
)
from orchestration.agent_skills_catalog import (
    partition_skill_entries,
    resolve_skill_blocks,
    resolve_task_skill_maps,
)
from orchestration.agent_skills_context import augment_backstory_for_skills, augment_description_for_skills
from orchestration.k8s_mcp_compat import apply_kubernetes_mcp_catalog_policy
from orchestration.backends.base import StepSpec
from orchestration.agent_provider_entries import resolve_agent_provider_entries
from orchestration.mcp_task_hints import augment_task_description_for_mcps, mcp_ids_from_raw_spec
from orchestration.step_context import prepare_step_description
from orchestration.rag_apply import apply_rag_for_task
from orchestration.rag_sources_catalog import load_rag_sources_catalog_merged


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
    agent_skills_catalog_path: Path | None = None,
    rag_sources_catalog_path: Path | None = None,
    quiet: bool = False,
    prior_outputs: dict[str, str] | None = None,
    run_store_path: str = "",
    artifacts_dir: str = "",
    tool_root: Path | None = None,
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
    task_skills = resolve_task_skill_maps(
        config,
        skills_catalog_path=agent_skills_catalog_path,
        quiet=quiet,
    )
    rag_catalog: list[dict[str, Any]] = (
        load_rag_sources_catalog_merged(rag_sources_catalog_path)
        if rag_sources_catalog_path is not None
        else []
    )
    root = tool_root or Path(__file__).resolve().parents[1]
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

        task_entries, backstory_entries = partition_skill_entries(task_skills.get(task_id, []))
        raw_mcps = raw_mcp_spec_for_task(task_def, config)
        raw_skills = raw_skill_spec_for_task(task_def, config)
        raw_rags = raw_rag_spec_for_task(task_def, config)
        description = augment_description_for_skills(
            task_def.description,
            resolve_skill_blocks(task_entries),
        )
        description = augment_task_description_for_mcps(
            description,
            mcp_ids_from_raw_spec(raw_mcps),
        )
        description, rag_audit, _rag_ids = apply_rag_for_task(
            task_def,
            config,
            description=description,
            catalog_entries=rag_catalog,
            tool_root=root,
        )
        description = prepare_step_description(description, prior_output)
        ptype = str(provider.get("type") or "").strip().lower()
        description = maybe_redact_for_cloud_provider(description, provider_type=ptype)
        expected = maybe_redact_for_cloud_provider(
            str(task_def.expected_output or ""),
            provider_type=ptype,
        )
        step_topic = maybe_redact_for_cloud_provider(topic, provider_type=ptype)
        prior_scrubbed = maybe_redact_for_cloud_provider(prior_output, provider_type=ptype)
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

        provider_payload = copy.deepcopy(provider)
        backstory_blocks = resolve_skill_blocks(backstory_entries)
        if backstory_blocks:
            provider_payload["backstory"] = augment_backstory_for_skills(
                str(provider_payload.get("backstory", "")),
                backstory_blocks,
            )

        specs.append(
            StepSpec(
                schema_version="0.1",
                run_id=run_id,
                step_id=task_id,
                step_index=index,
                workflow_name=config.name,
                topic=step_topic,
                task_description=description,
                task_expected_output=expected,
                agent_provider=provider_payload,
                mcp_providers=mcp_payload,
                skills=list(raw_skills),
                prior_output=prior_scrubbed,
                inputs={"topic": step_topic},
                run_store_path=run_store_path,
                artifacts_dir=artifacts_dir,
                agent_skills_catalog_path=(
                    str(agent_skills_catalog_path.resolve())
                    if agent_skills_catalog_path is not None
                    else ""
                ),
                rag_sources=list(raw_rags),
                rag_query=str(task_def.rag_query or ""),
                rag_sources_catalog_path=(
                    str(rag_sources_catalog_path.resolve())
                    if rag_sources_catalog_path is not None
                    else ""
                ),
                rag_audit=rag_audit.to_dict(),
            )
        )
    return specs


def step_specs_resolution_fingerprint(
    specs: list[StepSpec],
) -> tuple[tuple[str, str, int, tuple[str, ...], tuple[str, ...]], ...]:
    """Stable per-step catalog resolution fingerprint (G4 parity; ignores ``run_id`` / prior inject)."""
    rows: list[tuple[str, str, int, tuple[str, ...], tuple[str, ...]]] = []
    for spec in specs:
        mcp_ids = tuple(str(m.get("id", "")) for m in spec.mcp_providers)
        skill_ids = tuple(spec.skills)
        rows.append(
            (
                spec.step_id,
                str(spec.agent_provider.get("id", "")),
                len(spec.mcp_providers),
                mcp_ids,
                skill_ids,
            )
        )
    return tuple(rows)

