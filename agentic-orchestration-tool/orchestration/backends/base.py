from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any, Protocol

from orchestration.config_loader import WorkflowConfig

if TYPE_CHECKING:
    from orchestration.runner import BuiltWorkflow


@dataclass(frozen=True)
class RunOptions:
    quiet: bool = False
    emit_stdout_summary: bool = True
    emit_progress_lines: bool = True
    execution_error_sink: list[str] | None = None
    log_terminal_execution_failure: bool = True
    crew_verbose: bool = True
    mcp_catalog_path: Path | None = None
    agent_skills_catalog_path: Path | None = None
    rag_sources_catalog_path: Path | None = None
    run_id: str = ""


@dataclass(frozen=True)
class StepSpec:
    schema_version: str
    run_id: str
    step_id: str
    step_index: int
    workflow_name: str
    topic: str
    task_description: str
    task_expected_output: str
    agent_provider: dict[str, Any]
    mcp_providers: list[dict[str, Any]]
    skills: list[str]
    prior_output: str
    inputs: dict[str, Any]
    run_store_path: str = ""
    artifacts_dir: str = ""
    agent_skills_catalog_path: str = ""
    rag_sources: list[str] = field(default_factory=list)
    rag_query: str = ""
    rag_sources_catalog_path: str = ""
    rag_audit: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        paths: dict[str, str] = {
            "run_store": self.run_store_path,
            "artifacts_dir": self.artifacts_dir,
        }
        if self.agent_skills_catalog_path:
            paths["agent_skills_catalog"] = self.agent_skills_catalog_path
        if self.rag_sources_catalog_path:
            paths["rag_sources_catalog"] = self.rag_sources_catalog_path
        return {
            "schema_version": self.schema_version,
            "run_id": self.run_id,
            "step_id": self.step_id,
            "step_index": self.step_index,
            "workflow_name": self.workflow_name,
            "topic": self.topic,
            "task": {
                "description": self.task_description,
                "expected_output": self.task_expected_output,
                "rag_query": self.rag_query,
            },
            "agent_provider": dict(self.agent_provider),
            "mcp_providers": list(self.mcp_providers),
            "skills": list(self.skills),
            "rag_sources": list(self.rag_sources),
            "rag_audit": dict(self.rag_audit),
            "prior_output": self.prior_output,
            "inputs": dict(self.inputs),
            "paths": paths,
        }


@dataclass
class StepResult:
    run_id: str
    step_id: str
    exit_code: int
    result_text: str | None = None
    error: str | None = None
    recoverable: bool = False
    recovery_hint: str | None = None
    rag_audit: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "schema_version": "0.1",
            "run_id": self.run_id,
            "step_id": self.step_id,
            "exit_code": self.exit_code,
            "result_text": self.result_text,
            "result_format": "plain",
            "error": self.error,
            "recoverable": self.recoverable,
            "recovery_hint": self.recovery_hint,
            "artifacts": [],
        }
        if self.rag_audit is not None:
            out["rag_audit"] = dict(self.rag_audit)
        return out



@dataclass
class WorkflowExecutionResult:
    exit_code: int
    result_text: str | None
    error: BaseException | None = None
    workflow_result: object | None = None
    step_results: list[StepResult] = field(default_factory=list)
    built: BuiltWorkflow | None = None
    k8s_jobs: list[dict[str, Any]] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.exit_code == 0


class ExecutionBackend(Protocol):
    @property
    def name(self) -> str: ...

    @property
    def supports_distributed_steps(self) -> bool: ...

    def execute_built(
        self,
        built: BuiltWorkflow,
        *,
        options: RunOptions,
    ) -> WorkflowExecutionResult: ...

    def execute_config(
        self,
        config: WorkflowConfig,
        *,
        options: RunOptions,
    ) -> WorkflowExecutionResult: ...
