from __future__ import annotations

import os
import re
import sys
from dataclasses import replace
from pathlib import Path

from orchestration.agent_providers_catalog import deepcopy_agent_provider, load_agent_providers_catalog_merged
from orchestration.catalog_credentials import filter_entries_by_api_credentials
from orchestration.config_loader import TaskDefinition, WorkflowConfig

# Default execution fallback when HF inference fails at crew runtime and neither YAML nor env
# specifies another catalog agent_provider id (typically local Ollama).
DEFAULT_EXEC_FALLBACK_PROVIDER_ID = "ollama_llava"


def _hf_litellm_execution_failure(msg: str) -> bool:
    m = (msg or "").lower()
    return (
        "huggingfaceexception" in m
        or "huggingface" in m
        or "model_not_supported" in m
        or "not supported by any provider you have enabled" in m
    )


def _provider_payload_by_id(cfg: WorkflowConfig) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for p in cfg.agent_providers:
        if not isinstance(p, dict):
            continue
        pid = str(p.get("id", "")).strip()
        if pid:
            out[pid] = p
    return out


def _resolve_exec_fallback_provider_id(payload: dict) -> str:
    """YAML ``exec_fallback_provider`` / ``execution_fallback_provider_id``, then env, then default."""
    for key in ("exec_fallback_provider", "execution_fallback_provider_id"):
        raw = str(payload.get(key) or "").strip()
        if raw:
            return raw
    env_v = (os.getenv("AGENTIC_EXEC_FALLBACK_PROVIDER_ID") or "").strip()
    if env_v:
        return env_v
    return DEFAULT_EXEC_FALLBACK_PROVIDER_ID


def workflow_config_after_hf_litellm_fallback(
    cfg: WorkflowConfig,
    error_text: str,
    *,
    catalog_path: Path,
    quiet: bool,
) -> WorkflowConfig | None:
    """
    After LiteLLM/Hugging Face rejects an inference model at crew runtime, rebuild the workflow
    by swapping matching Hugging Face tasks to a fallback catalog agent.

    **Fallback target** (per HF task), first match wins:

    1. Provider YAML ``exec_fallback_provider`` or ``execution_fallback_provider_id``
    2. Env ``AGENTIC_EXEC_FALLBACK_PROVIDER_ID``
    3. Default ``ollama_llava`` (override default only via env/YAML above)

    Matching HF tasks:

    - Default: substitute only when the Hub ``model`` string appears in the error text (or equals
      ``The requested model '…'`` extraction).
    - If ``AGENTIC_EXEC_FALLBACK_REPLACE_ANY_HF=1``: substitute every HF-backed task in this plan.

    Requires mergeable catalog entries for every distinct fallback id (credential/hardware
    filtering applies).
    """
    if not _hf_litellm_execution_failure(error_text):
        return None

    entries = load_agent_providers_catalog_merged(catalog_path)
    entries, _skipped = filter_entries_by_api_credentials(
        entries,
        verbose=not quiet,
        log_prefix="(exec fallback) catalog",
    )
    catalog_by_id = {
        str(e.get("id", "")).strip(): e for e in entries if str(e.get("id", "")).strip()
    }

    replace_any = os.getenv("AGENTIC_EXEC_FALLBACK_REPLACE_ANY_HF", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )

    by_payload = _provider_payload_by_id(cfg)
    requested_model: str | None = None
    mm = re.search(r"The requested model '([^']+)'", error_text)
    if mm:
        requested_model = mm.group(1).strip()

    # (task, fallback_catalog_id)
    substitutions: list[tuple[TaskDefinition, str]] = []
    for t in cfg.tasks:
        pid = t.agent_provider_id
        payload = by_payload.get(pid)
        if payload is None:
            continue
        typ = str(payload.get("type", "")).strip().lower()
        if typ != "huggingface":
            continue

        model = str(payload.get("model", "")).strip()
        use_fallback = False
        if replace_any:
            use_fallback = True
        elif model and model in error_text:
            use_fallback = True
        elif requested_model and model and requested_model == model:
            use_fallback = True

        if not use_fallback:
            continue

        fb_id = _resolve_exec_fallback_provider_id(payload)
        if not fb_id or fb_id == pid:
            continue

        substitutions.append((t, fb_id))

    if not substitutions:
        return None

    needed_ids = {fb for _, fb in substitutions}
    missing = sorted(fid for fid in needed_ids if fid not in catalog_by_id)
    if missing:
        if not quiet:
            print(
                f"(exec fallback) fallback provider id(s) not in filtered catalog {missing!r}; skipping.",
                file=sys.stderr,
            )
        return None

    sub_by_task_id = {t.id: fb_id for t, fb_id in substitutions}
    new_tasks: list[TaskDefinition] = []
    changed = False
    for t in cfg.tasks:
        fb_id = sub_by_task_id.get(t.id)
        if fb_id is None:
            new_tasks.append(t)
            continue
        new_tasks.append(replace(t, agent_provider_id=fb_id))
        changed = True

    if not changed:
        return None

    providers: list[dict] = [deepcopy_agent_provider(dict(p)) for p in cfg.agent_providers if isinstance(p, dict)]
    present = {str(p.get("id", "")).strip() for p in providers}
    for fid in needed_ids:
        if fid not in present:
            providers.append(deepcopy_agent_provider(catalog_by_id[fid]))
            present.add(fid)

    return replace(cfg, tasks=new_tasks, agent_providers=providers)
