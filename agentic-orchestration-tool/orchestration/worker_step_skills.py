from __future__ import annotations

import os
from copy import deepcopy
from pathlib import Path
from typing import Any

from orchestration.agent_skills_context import (
    strip_skills_from_backstory,
    strip_skills_from_description,
)

_DEFAULT_AGENT_SKILLS_CATALOG = "config/agent_skills"


def skill_ids_from_step_spec(data: dict[str, Any]) -> list[str]:
    return [str(x).strip() for x in (data.get("skills") or []) if str(x).strip()]


def resolve_agent_skills_catalog_path_for_worker(
    data: dict[str, Any],
    *,
    tool_root: Path,
) -> Path | None:
    """Resolve skills catalog path from StepSpec ``paths`` or env (worker re-resolve)."""
    paths = data.get("paths") or {}
    raw = str(paths.get("agent_skills_catalog") or "").strip()
    if not raw:
        raw = os.getenv("AGENTIC_AGENT_SKILLS_CATALOG", "").strip()
    if raw:
        candidate = Path(raw).expanduser()
        if not candidate.is_absolute():
            candidate = (tool_root / candidate).resolve()
        return candidate if candidate.exists() else None

    default = (tool_root / _DEFAULT_AGENT_SKILLS_CATALOG).resolve()
    return default if default.exists() else None


def prepare_worker_agent_provider_for_skills(
    agent_provider: dict[str, Any],
    *,
    skill_ids: list[str],
) -> dict[str, Any]:
    """Strip baked backstory skills when worker will re-resolve from catalog ids."""
    provider = deepcopy(agent_provider)
    if skill_ids:
        provider["backstory"] = strip_skills_from_backstory(str(provider.get("backstory", "")))
    return provider


def prepare_worker_task_description_for_skills(
    description: str,
    *,
    skill_ids: list[str],
) -> str:
    """Strip baked task skills when worker will re-resolve from catalog ids."""
    if not skill_ids:
        return description
    return strip_skills_from_description(description)
