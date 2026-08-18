"""In-process ``delegate_task`` tool (K6.1.3).

Same argument surface as ``k8s_delegate_task`` (``agent_provider_id``, ``task_description``,
``expected_output``), but the child runs inline: a one-task ``WorkflowConfig`` is built and
kicked off in this process instead of being submitted to the delegation broker.

Every call must be reserved through ``reserve_delegation`` first so the charter's
``max_delegations`` budget is enforced outside the LLM's control.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Callable

from crewai.tools import BaseTool

DELEGATE_ENV = "AGENTIC_SOCIETY_DELEGATE"
_DEFAULT_EXPECTED_OUTPUT = "A concise answer to the delegated sub-task."
_RESULT_CHARS_ENV = "AGENTIC_SOCIETY_DELEGATE_RESULT_CHARS"
_DEFAULT_RESULT_CHARS = 6000


def delegation_enabled_from_env() -> bool:
    """Inline delegation is opt-in outside society runs (society mode passes ``enabled=True``)."""
    return os.getenv(DELEGATE_ENV, "").strip().lower() in ("1", "true", "yes", "on")


def _result_chars() -> int:
    raw = os.getenv(_RESULT_CHARS_ENV, "").strip()
    if not raw:
        return _DEFAULT_RESULT_CHARS
    try:
        return max(500, min(100_000, int(raw)))
    except ValueError:
        return _DEFAULT_RESULT_CHARS


class DelegateTaskTool(BaseTool):
    name: str = "delegate_task"
    description: str = (
        "Delegate a sub-task to another agent from the catalog and run it inline, then read its "
        "answer. Use when the sub-task needs a different specialist than you. "
        "Provide agent_provider_id from the catalog, a self-contained task_description "
        "(the specialist cannot see this conversation), and expected_output describing success. "
        "Delegations are budgeted: if the budget is spent, do the work yourself."
    )

    def __init__(
        self,
        *,
        agent_catalog: list[dict[str, Any]],
        topic: str = "",
        reserve_delegation: Callable[[str, str], None] | None = None,
        allowed_agent_provider_ids: list[str] | None = None,
        quiet: bool = True,
        mcp_catalog_path: Path | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self._agent_catalog = agent_catalog
        self._topic = topic
        self._reserve_delegation = reserve_delegation
        self._allowed_ids = [str(x).strip() for x in (allowed_agent_provider_ids or []) if str(x).strip()]
        self._quiet = quiet
        self._mcp_catalog_path = mcp_catalog_path

    def _resolve_agent_provider(self, agent_provider_id: str) -> dict[str, Any]:
        agent_id = str(agent_provider_id or "").strip()
        if not agent_id:
            raise ValueError("agent_provider_id must be non-empty")
        if self._allowed_ids and agent_id not in self._allowed_ids:
            raise ValueError(
                f"agent_provider_id {agent_id!r} is not delegable here "
                f"(allowed: {self._allowed_ids!r})"
            )
        for entry in self._agent_catalog:
            if str(entry.get("id") or "").strip() == agent_id:
                return dict(entry)
        raise ValueError(f"unknown agent_provider_id {agent_id!r}")

    def _run(
        self,
        agent_provider_id: str,
        task_description: str,
        expected_output: str = _DEFAULT_EXPECTED_OUTPUT,
    ) -> str:
        try:
            provider = self._resolve_agent_provider(agent_provider_id)
        except ValueError as exc:
            return f"Delegation refused: {exc}"

        description = str(task_description or "").strip()
        if not description:
            return "Delegation refused: task_description must be non-empty."

        if self._reserve_delegation is not None:
            try:
                self._reserve_delegation(str(provider.get("id") or ""), description)
            except Exception as exc:  # noqa: BLE001
                return f"Delegation refused: {exc}"

        try:
            return run_inline_delegation(
                agent_provider=provider,
                task_description=description,
                expected_output=str(expected_output or "").strip() or _DEFAULT_EXPECTED_OUTPUT,
                topic=self._topic or description,
                quiet=self._quiet,
                mcp_catalog_path=self._mcp_catalog_path,
            )
        except Exception as exc:  # noqa: BLE001
            return f"Delegation failed: {exc}"


def run_inline_delegation(
    *,
    agent_provider: dict[str, Any],
    task_description: str,
    expected_output: str = _DEFAULT_EXPECTED_OUTPUT,
    topic: str = "",
    quiet: bool = True,
    mcp_catalog_path: Path | None = None,
) -> str:
    """Run one delegated task as a single-agent crew in this process."""
    from orchestration.config_loader import TaskDefinition, WorkflowConfig
    from orchestration.output_artifacts import workflow_result_to_extractable_text
    from orchestration.crewai_template import crew_kickoff
    from orchestration.runner import build_workflow, crew_kickoff_context
    from orchestration.text_normalize import sanitize_user_facing_prose

    provider_id = str(agent_provider.get("id") or "").strip()
    step_id = f"delegate-{provider_id or 'agent'}"
    cfg = WorkflowConfig(
        name="society-delegation",
        process="sequential",
        topic=topic or task_description,
        instance_key="society-delegation",
        agent_providers=[dict(agent_provider)],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id=step_id,
                agent_provider_id=provider_id,
                description=task_description,
                expected_output=expected_output,
                mcp_providers=[],
                skills=[],
            )
        ],
        task_sequence=[step_id],
    )
    built = build_workflow(
        cfg,
        crew_verbose=False,
        quiet=True,
        emit_progress_lines=False,
        mcp_catalog_path=mcp_catalog_path,
    )
    if not quiet:
        print(f"(society) delegating to {provider_id}", file=sys.stderr)
    with crew_kickoff_context(built):
        result = crew_kickoff(built.crew, inputs={"topic": cfg.topic})
    text = sanitize_user_facing_prose(workflow_result_to_extractable_text(result))
    cleaned = str(text or "").strip()
    if not cleaned:
        return "(empty delegation result)"
    return cleaned[: _result_chars()]


def attach_delegate_task_tool(
    built: Any,
    *,
    agent_catalog: list[dict[str, Any]] | None = None,
    topic: str = "",
    reserve_delegation: Callable[[str, str], None] | None = None,
    allowed_agent_provider_ids: list[str] | None = None,
    enabled: bool | None = None,
    quiet: bool = True,
    mcp_catalog_path: Path | None = None,
) -> bool:
    """
    Add ``delegate_task`` to every agent in a built single-step crew.

    ``enabled`` is passed as True by the society runtime; outside societies the tool stays off
    unless ``AGENTIC_SOCIETY_DELEGATE=1``. Returns whether the tool was attached.
    """
    active = delegation_enabled_from_env() if enabled is None else bool(enabled)
    if not active:
        return False

    entries = agent_catalog
    if entries is None:
        entries = _load_default_agent_catalog(quiet=quiet)
    if not entries:
        return False

    tool = DelegateTaskTool(
        agent_catalog=entries,
        topic=topic,
        reserve_delegation=reserve_delegation,
        allowed_agent_provider_ids=allowed_agent_provider_ids,
        quiet=quiet,
        mcp_catalog_path=mcp_catalog_path,
    )
    for agent in built.crew.agents:
        existing = list(getattr(agent, "tools", None) or [])
        agent.tools = [*existing, tool]
    return True


def _load_default_agent_catalog(*, quiet: bool = True) -> list[dict[str, Any]]:
    from orchestration.agent_providers_catalog import load_agent_providers_catalog_merged
    from orchestration.catalog_credentials import filter_entries_by_api_credentials

    catalog_path = os.getenv("AGENTIC_AGENT_PROVIDERS_CATALOG", "config/agent_providers")
    root = Path(__file__).resolve().parents[1]
    path = Path(catalog_path)
    if not path.is_absolute():
        path = root / catalog_path
    if not path.exists():
        return []
    entries = load_agent_providers_catalog_merged(path)
    usable, _skipped = filter_entries_by_api_credentials(
        entries,
        verbose=not quiet,
        log_prefix="delegate_task tool",
    )
    return usable
