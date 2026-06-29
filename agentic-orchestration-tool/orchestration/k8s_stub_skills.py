from __future__ import annotations

from pathlib import Path
from typing import Any

# Keep in sync with orchestration/agent_skills_context.SKILLS_MARKER
SKILLS_MARKER = "\n\n---\n## Attached skills\n"


def skill_ids_from_step_spec(data: dict[str, Any]) -> list[str]:
    return [str(x).strip() for x in (data.get("skills") or []) if str(x).strip()]


def verify_agent_skills_step_spec(
    data: dict[str, Any],
    *,
    embedded_catalog_dir: Path | None = None,
) -> None:
    """
    Validate agent-skills fields on a worker StepSpec (kind stub e2e).

    Raises ValueError when the coordinator materializer did not hand off skills correctly.
    """
    skills = skill_ids_from_step_spec(data)
    if not skills:
        return

    paths = data.get("paths") or {}
    catalog_ref = str(paths.get("agent_skills_catalog") or "").strip()
    if not catalog_ref:
        raise ValueError("skills present but paths.agent_skills_catalog is missing")

    task = data.get("task") or {}
    description = str(task.get("description") or "")
    if SKILLS_MARKER not in description:
        raise ValueError("task.description missing coordinator-baked skills marker")

    # echo_skill smoke injects this token into the task body
    if "echo_skill" in skills and "SKILL_ECHO_OK" not in description:
        raise ValueError("echo_skill step missing SKILL_ECHO_OK in baked task.description")

    if embedded_catalog_dir is not None and embedded_catalog_dir.is_dir():
        for sid in skills:
            yaml_path = embedded_catalog_dir / f"{sid}.yaml"
            if not yaml_path.is_file():
                raise ValueError(f"embedded worker catalog missing {yaml_path.name}")
