from __future__ import annotations

import os
from typing import Sequence

SKILLS_MARKER = "\n\n---\n## Attached skills\n"
BACKSTORY_SKILLS_MARKER = "[agentic: attached skills]"


def skills_max_chars_per_task() -> int:
    try:
        cap = int(os.getenv("AGENTIC_SKILLS_MAX_CHARS_PER_TASK", "24000"))
    except ValueError:
        cap = 24000
    return max(1000, min(100_000, cap))


def augment_description_for_skills(
    description: str,
    skill_blocks: Sequence[tuple[str, str]],
) -> str:
    """Append resolved skill markdown blocks to a task description."""
    if not skill_blocks:
        return description
    if SKILLS_MARKER in description:
        return description

    parts = _format_skill_blocks(skill_blocks, cap=skills_max_chars_per_task())
    if not parts:
        return description
    return description.rstrip() + SKILLS_MARKER + "\n\n".join(parts) + "\n"


def _format_skill_blocks(
    skill_blocks: Sequence[tuple[str, str]],
    *,
    cap: int,
) -> list[str]:
    parts: list[str] = []
    used = 0
    for heading, content in skill_blocks:
        text = str(content or "").strip()
        if not text:
            continue
        h = str(heading or "## Skill").strip() or "## Skill"
        block = f"{h}\n\n{text}"
        if used + len(block) > cap:
            remaining = cap - used
            if remaining <= len(h) + 4:
                break
            block = block[: remaining - 1] + "…"
        parts.append(block)
        used += len(block)
        if used >= cap:
            break
    return parts


def strip_skills_from_description(description: str) -> str:
    """Remove a prior task-description skill injection (materializer or earlier worker pass)."""
    idx = description.find(SKILLS_MARKER)
    if idx == -1:
        return description
    return description[:idx].rstrip()


def strip_skills_from_backstory(backstory: str) -> str:
    """Remove a prior backstory skill injection."""
    idx = backstory.find(BACKSTORY_SKILLS_MARKER)
    if idx == -1:
        return backstory
    return backstory[:idx].rstrip()


def augment_backstory_for_skills(
    backstory: str,
    skill_blocks: Sequence[tuple[str, str]],
) -> str:
    """Append resolved skill markdown blocks to an agent backstory."""
    if not skill_blocks:
        return backstory
    if BACKSTORY_SKILLS_MARKER in backstory:
        return backstory

    parts = _format_skill_blocks(skill_blocks, cap=skills_max_chars_per_task())
    if not parts:
        return backstory
    return (
        backstory.rstrip()
        + "\n\n"
        + BACKSTORY_SKILLS_MARKER
        + "\n\n"
        + SKILLS_MARKER.strip()
        + "\n\n"
        + "\n\n".join(parts)
        + "\n"
    )
