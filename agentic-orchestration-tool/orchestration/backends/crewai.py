from __future__ import annotations

import contextlib
import os
import sys
from pathlib import Path
from typing import Any

from orchestration.backends.base import RunOptions, WorkflowExecutionResult
from orchestration.config_loader import WorkflowConfig
from orchestration.output_artifacts import workflow_result_display_text, workflow_result_to_extractable_text
from orchestration.runner import BuiltWorkflow, build_workflow, crew_kickoff_context
from orchestration.run_store import new_run_id
from orchestration.structured_logging import emit_log


def _workflow_context(built: BuiltWorkflow) -> dict[str, Any]:
    return {**built.workflow_context, "inputs": dict(built.inputs)}


def _on_workflow_start(built: BuiltWorkflow) -> None:
    ctx = _workflow_context(built)
    for ap in built.agent_providers.values():
        try:
            ap.on_workflow_start(ctx)
        except Exception as exc:  # noqa: BLE001
            print(
                f"Warning: agent provider '{ap.config.id}' on_workflow_start failed: {exc}",
                file=sys.stderr,
            )


def _on_workflow_end(
    built: BuiltWorkflow,
    result: object | None,
    error: BaseException | None,
) -> None:
    ctx = _workflow_context(built)
    for ap in built.agent_providers.values():
        try:
            ap.on_workflow_end(ctx, result, error)
        except Exception as exc:  # noqa: BLE001
            print(
                f"Warning: agent provider '{ap.config.id}' on_workflow_end failed: {exc}",
                file=sys.stderr,
            )


def _cleanup_agent_providers(built: BuiltWorkflow) -> None:
    for ap in built.agent_providers.values():
        try:
            ap.cleanup()
        except Exception as exc:  # noqa: BLE001
            print(
                f"Warning: agent provider '{ap.config.id}' cleanup failed: {exc}",
                file=sys.stderr,
            )


class CrewAIExecutionBackend:
    """In-process CrewAI ``crew.kickoff()`` — default execution path."""

    @property
    def name(self) -> str:
        return "inprocess"

    @property
    def supports_distributed_steps(self) -> bool:
        return False

    def execute_config(
        self,
        config: WorkflowConfig,
        *,
        options: RunOptions,
    ) -> WorkflowExecutionResult:
        built = build_workflow(
            config,
            crew_verbose=options.crew_verbose,
            quiet=options.quiet,
            mcp_catalog_path=options.mcp_catalog_path,
            agent_skills_catalog_path=options.agent_skills_catalog_path,
            rag_sources_catalog_path=options.rag_sources_catalog_path,
            emit_progress_lines=options.emit_progress_lines,
        )
        return self.execute_built(built, options=options)

    def execute_built(
        self,
        built: BuiltWorkflow,
        *,
        options: RunOptions,
    ) -> WorkflowExecutionResult:
        run_id = str(options.run_id or "").strip() or new_run_id()
        emit_log("inprocess kickoff start", run_id=run_id, component="inprocess")
        tool_root = Path(__file__).resolve().parents[2]
        try:
            from orchestration.run_trace import append_run_event
            from orchestration.llm_usage import install_litellm_usage_callback
            from orchestration.tool_trace import apply_tool_call_trace_wrap

            apply_tool_call_trace_wrap()
            install_litellm_usage_callback()
            agents = list(built.agent_providers.keys()) if built.agent_providers else []
            append_run_event(
                tool_root,
                run_id,
                "step_start",
                actor="inprocess",
                message=str(built.workflow_context.get("workflow_name") or "kickoff"),
                detail={"agents": agents},
            )
        except Exception:  # noqa: BLE001
            agents = []
            pass
        _on_workflow_start(built)

        exit_code = 0
        workflow_result: object | None = None
        workflow_error: BaseException | None = None
        result_text: str | None = None

        suppress_stderr_probe = (
            options.execution_error_sink is not None and not options.log_terminal_execution_failure
        )

        def _kickoff_once() -> object:
            with crew_kickoff_context(built):
                if options.quiet:
                    with open(os.devnull, "w", encoding="utf-8") as _quiet_sink:
                        with contextlib.redirect_stdout(_quiet_sink), contextlib.redirect_stderr(
                            _quiet_sink
                        ):
                            return built.crew.kickoff(inputs=built.inputs)
                if suppress_stderr_probe:
                    with open(os.devnull, "w", encoding="utf-8") as _dn:
                        with contextlib.redirect_stderr(_dn):
                            return built.crew.kickoff(inputs=built.inputs)
                return built.crew.kickoff(inputs=built.inputs)

        def _try_provider_recovery(exc: BaseException) -> bool:
            recovered = False
            for ap in built.agent_providers.values():
                try:
                    if ap.recover_from_workflow_error(exc):
                        recovered = True
                except Exception as rec_exc:  # noqa: BLE001
                    print(
                        f"Warning: provider '{ap.config.id}' recovery failed: {rec_exc}",
                        file=sys.stderr,
                    )
            return recovered

        try:
            try:
                workflow_result = _kickoff_once()
            except Exception as exc:
                retried = False
                if _try_provider_recovery(exc):
                    retried = True
                    print(
                        "\nWorkflow execution failed once; provider recovery succeeded. "
                        "Retrying kickoff once...",
                        file=sys.stderr,
                    )
                    try:
                        workflow_result = _kickoff_once()
                    except Exception as retry_exc:
                        workflow_error = retry_exc
                        if options.log_terminal_execution_failure:
                            print("\nWorkflow execution failed.", file=sys.stderr)
                            print(
                                "Check your YAML config and OPENAI settings in .env, then retry.",
                                file=sys.stderr,
                            )
                            print(f"Error: {retry_exc}", file=sys.stderr)
                        exit_code = 1
                if not retried:
                    workflow_error = exc
                    if options.log_terminal_execution_failure:
                        print("\nWorkflow execution failed.", file=sys.stderr)
                        print(
                            "Check your YAML config and OPENAI settings in .env, then retry.",
                            file=sys.stderr,
                        )
                        print(f"Error: {exc}", file=sys.stderr)
                    exit_code = 1
            else:
                if options.emit_stdout_summary:
                    if options.quiet:
                        if workflow_result is not None:
                            _disp = workflow_result_display_text(workflow_result)
                            if _disp:
                                print(_disp, flush=True)
                    else:
                        print("\n=== Workflow Output ===\n")
                        print(workflow_result)
                if workflow_result is not None:
                    result_text = workflow_result_to_extractable_text(workflow_result)
                    try:
                        from orchestration.llm_usage import record_crew_result_usage

                        record_crew_result_usage(
                            workflow_result,
                            source="crew_kickoff",
                            model=None,
                        )
                    except Exception:  # noqa: BLE001
                        pass
        finally:
            _on_workflow_end(built, workflow_result, workflow_error)
            _cleanup_agent_providers(built)

        if options.execution_error_sink is not None and workflow_error is not None:
            options.execution_error_sink.append(str(workflow_error))

        if exit_code != 0:
            emit_log(
                f"inprocess kickoff fail: {workflow_error}",
                level="error",
                run_id=run_id,
                component="inprocess",
            )
            try:
                from orchestration.run_trace import append_run_event

                append_run_event(
                    tool_root,
                    run_id,
                    "step_fail",
                    actor="inprocess",
                    message=str(workflow_error or "fail")[:500],
                    detail={"agents": agents},
                )
            except Exception:  # noqa: BLE001
                pass
        else:
            emit_log("inprocess kickoff end", run_id=run_id, component="inprocess")
            try:
                from orchestration.run_trace import append_run_event

                append_run_event(
                    tool_root,
                    run_id,
                    "step_end",
                    actor="inprocess",
                    message=str(built.workflow_context.get("workflow_name") or "kickoff"),
                    detail={"agents": agents},
                )
            except Exception:  # noqa: BLE001
                pass

        return WorkflowExecutionResult(
            exit_code=exit_code,
            result_text=result_text,
            error=workflow_error,
            workflow_result=workflow_result,
            built=built,
        )


def run_options_from_legacy(
    *,
    quiet: bool = False,
    emit_stdout_summary: bool = True,
    execution_error_sink: list[str] | None = None,
    log_terminal_execution_failure: bool = True,
    crew_verbose: bool = True,
    mcp_catalog_path: Path | None = None,
    agent_skills_catalog_path: Path | None = None,
    rag_sources_catalog_path: Path | None = None,
    emit_progress_lines: bool = True,
    run_id: str = "",
) -> RunOptions:
    return RunOptions(
        quiet=quiet,
        emit_stdout_summary=emit_stdout_summary,
        execution_error_sink=execution_error_sink,
        log_terminal_execution_failure=log_terminal_execution_failure,
        crew_verbose=crew_verbose,
        mcp_catalog_path=mcp_catalog_path,
        agent_skills_catalog_path=agent_skills_catalog_path,
        rag_sources_catalog_path=rag_sources_catalog_path,
        emit_progress_lines=emit_progress_lines,
        run_id=str(run_id or "").strip() or os.getenv("AGENTIC_RUN_ID", "").strip(),
    )
