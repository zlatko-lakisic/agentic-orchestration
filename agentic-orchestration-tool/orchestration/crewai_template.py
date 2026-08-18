"""Prevent CrewAI kickoff from treating user text as template variables.

CrewAI ``interpolate_only`` (see crewai.utilities.string_utils) finds every
``{identifier}`` in Task.description / expected_output and Agent role / goal /
backstory, then raises:

    Missing required template variable 'Template variable 'X' not found in inputs dictionary' in description

Continue dumps whole chat transcripts into ``{topic}``, including literals like
``{workspaceName}``. If that text is in a template field (or inlined into one),
kickoff aborts. JSON ``{"key": ...}`` is left alone — the pattern requires an
identifier after ``{``.

``{{double}}`` braces do **not** hide placeholders from CrewAI's regex. Instead
we add any unmatched name to ``inputs`` with identity value ``{name}`` so the
LLM still sees ``{workspaceName}`` literally.
"""

from __future__ import annotations

import re
from typing import Any, Mapping

# Same shape as crewai.utilities.string_utils._VARIABLE_PATTERN (hyphen allowed).
_PLACEHOLDER_RE = re.compile(r"\{([A-Za-z_][A-Za-z0-9_\-]*)}")


def collect_template_placeholders(*texts: str) -> set[str]:
    """Return CrewAI ``{identifier}`` names found in *texts*."""
    found: set[str] = set()
    for text in texts:
        if not text:
            continue
        found.update(_PLACEHOLDER_RE.findall(str(text)))
    return found


def _template_strings_from_crew(crew: Any) -> list[str]:
    """Interpolatable CrewAI agent/task strings (skip MagicMock attributes)."""
    found: list[str] = []
    tasks = getattr(crew, "tasks", None)
    if isinstance(tasks, (list, tuple)):
        for task in tasks:
            for attr in ("description", "expected_output"):
                val = getattr(task, attr, None)
                if isinstance(val, str):
                    found.append(val)
    agents = getattr(crew, "agents", None)
    if isinstance(agents, (list, tuple)):
        for agent in agents:
            for attr in ("role", "goal", "backstory"):
                val = getattr(agent, attr, None)
                if isinstance(val, str):
                    found.append(val)
    return found


def fill_unmatched_crewai_placeholders(
    inputs: Mapping[str, Any] | None,
    *texts: str,
) -> dict[str, Any]:
    """Copy *inputs* and identity-fill ``{name}`` placeholders missing from keys."""
    prepared: dict[str, Any] = dict(inputs or {})
    blobs = [str(v) for v in prepared.values() if isinstance(v, str)]
    blobs.extend(str(t) for t in texts if t)
    extras = collect_template_placeholders(*blobs) - set(prepared)
    for name in extras:
        prepared[name] = "{" + name + "}"
    return prepared


def prepare_crewai_kickoff_inputs(
    inputs: Mapping[str, Any] | None,
    crew: Any = None,
) -> dict[str, Any]:
    """Kickoff inputs with unmatched CrewAI placeholders identity-filled."""
    texts = _template_strings_from_crew(crew) if crew is not None else []
    return fill_unmatched_crewai_placeholders(inputs, *texts)


def crew_kickoff(crew: Any, inputs: Mapping[str, Any] | None = None) -> Any:
    """``crew.kickoff`` after filling unmatched ``{placeholders}`` in inputs."""
    prepared = prepare_crewai_kickoff_inputs(inputs, crew=crew)
    return crew.kickoff(inputs=prepared)
