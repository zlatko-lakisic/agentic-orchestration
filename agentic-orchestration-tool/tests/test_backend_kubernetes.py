from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from orchestration.backends.base import RunOptions, WorkflowExecutionResult
from orchestration.backends.k8s_settings import K8sSettings
from orchestration.backends.kubernetes_jobs import (
    K8sJobRecord,
    K8sJobWaitResult,
    job_name_for_step,
    sanitize_k8s_name,
    spec_path_in_container,
)
from orchestration.config_loader import TaskDefinition, WorkflowConfig, load_workflow_config
from orchestration.execution_dispatch import (
    execute_workflow_config_resolved,
    use_distributed_execute_config,
)


@pytest.mark.unit
def test_sanitize_k8s_name() -> None:
    assert sanitize_k8s_name("Research_Topic!!") == "research-topic"


@pytest.mark.unit
def test_spec_path_in_container() -> None:
    assert spec_path_in_container(mount="/run/store", run_id="abc", step_id="step1") == (
        "/run/store/abc/step1-spec.json"
    )


@pytest.mark.unit
def test_use_distributed_execute_config_kubernetes() -> None:
    backend = MagicMock(name="kubernetes", supports_distributed_steps=True)
    backend.name = "kubernetes"
    assert use_distributed_execute_config(backend) is True


@pytest.mark.unit
def test_dispatch_uses_execute_config_for_kubernetes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.delenv("AGENTIC_SUBPROCESS_WORKERS", raising=False)

    calls: list[str] = []

    class FakeBackend:
        name = "kubernetes"
        supports_distributed_steps = True

        def execute_config(self, config, *, options) -> WorkflowExecutionResult:
            calls.append("config")
            return WorkflowExecutionResult(exit_code=0, result_text="via-k8s")

        def execute_built(self, built, *, options) -> WorkflowExecutionResult:
            calls.append("built")
            return WorkflowExecutionResult(exit_code=0, result_text="via-built")

    monkeypatch.setattr(
        "orchestration.execution_dispatch.execution_backend_from_env",
        lambda: FakeBackend(),
    )
    monkeypatch.setattr(
        "orchestration.execution_dispatch.build_workflow",
        lambda *a, **k: (_ for _ in ()).throw(AssertionError("build_workflow should not run")),
    )

    from orchestration.config_loader import TaskDefinition, WorkflowConfig

    cfg = WorkflowConfig(
        name="t",
        process="sequential",
        topic="x",
        instance_key="k",
        agent_providers=[{"id": "p", "type": "ollama", "model": "m"}],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id="s",
                agent_provider_id="p",
                description="d",
                expected_output="o",
            )
        ],
        task_sequence=["s"],
    )
    result = execute_workflow_config_resolved(cfg, options=RunOptions(quiet=True))
    assert result.result_text == "via-k8s"
    assert calls == ["config"]


@pytest.mark.unit
def test_k8s_settings_validate_requires_image_and_pvc() -> None:
    settings = K8sSettings(
        namespace="ns",
        worker_image="",
        run_store_pvc="pvc",
        run_store_mount="/run/store",
        job_ttl_seconds=3600,
        job_timeout_seconds=60,
        env_secret_name=None,
    )
    with pytest.raises(ValueError, match="AGENTIC_K8S_WORKER_IMAGE"):
        settings.validate_for_run()


@pytest.mark.integration
@pytest.mark.backend_kubernetes
def test_two_step_kubernetes_workflow_mocked_jobs(
    default_workflow_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """K3.8: coordinator runs two steps via mocked K8s Jobs (no cluster)."""
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(tmp_path / "store"))
    monkeypatch.setenv("AGENTIC_K8S_WORKER_IMAGE", "agentic-orchestrator-worker:ci")
    monkeypatch.setenv("AGENTIC_K8S_RUN_STORE_PVC", "agentic-run-store")
    monkeypatch.setenv("AGENTIC_K8S_RUN_STORE_MOUNT", "/run/store")

    step_outputs = {
        "research_topic": "bullet one\nbullet two",
        "write_brief": "Final briefing with action items.",
    }

    store_root = tmp_path / "store"

    class FakeJobRunner:
        def __init__(self) -> None:
            self._settings = K8sSettings.from_env()
            self.jobs: list[str] = []

        def run_step_job(
            self,
            *,
            run_id,
            step_id,
            spec_container_path,
            agent_provider_id,
            sidecar_mcp_ids=None,
        ):
            spec_host_path = Path(
                spec_container_path.replace("/run/store", str(store_root))
            )
            data = json.loads(spec_host_path.read_text(encoding="utf-8-sig"))
            text = step_outputs[step_id]
            result_path = store_root / run_id / step_id / "result.json"
            result_path.parent.mkdir(parents=True, exist_ok=True)
            result_path.write_text(
                json.dumps(
                    {
                        "schema_version": "0.1",
                        "run_id": run_id,
                        "step_id": step_id,
                        "exit_code": 0,
                        "result_text": text,
                        "result_format": "plain",
                        "error": None,
                        "recoverable": False,
                        "recovery_hint": None,
                        "artifacts": [],
                    }
                ),
                encoding="utf-8",
            )
            self.jobs.append(step_id)
            record = K8sJobRecord(
                job_name=job_name_for_step(run_id=run_id, step_id=step_id),
                namespace="agentic-orchestration",
                pod_name=f"pod-{step_id}",
            )
            wait = K8sJobWaitResult(succeeded=True, failed=False, pod_name=record.pod_name, message=None)
            return record, wait

    fake = FakeJobRunner()
    monkeypatch.setattr(
        "orchestration.backends.kubernetes_runner.KubernetesJobRunner.from_env",
        lambda: fake,
    )

    cfg = load_workflow_config(default_workflow_path)
    result = execute_workflow_config_resolved(cfg, options=RunOptions(quiet=True))

    assert result.exit_code == 0
    assert result.result_text == step_outputs["write_brief"]
    assert len(result.step_results) == 2
    assert len(result.k8s_jobs) == 2
    assert fake.jobs == ["research_topic", "write_brief"]


@pytest.mark.integration
@pytest.mark.backend_kubernetes
def test_kubernetes_hf_recovery_retries_failed_step(
    tool_root: Path,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """K3.4: recoverable HF failure triggers one Job retry with rebuilt config."""
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(tmp_path / "store"))
    monkeypatch.setenv("AGENTIC_K8S_WORKER_IMAGE", "agentic-orchestrator-worker:ci")
    monkeypatch.setenv("AGENTIC_K8S_RUN_STORE_PVC", "agentic-run-store")
    monkeypatch.setenv("AGENTIC_K8S_RUN_STORE_MOUNT", "/run/store")

    cfg = WorkflowConfig(
        name="hf-step",
        process="sequential",
        topic="t",
        instance_key="k",
        agent_providers=[
            {
                "id": "hf_agent",
                "type": "huggingface",
                "model": "org/model-a",
                "role": "r",
                "goal": "g",
                "backstory": "b",
                "exec_fallback_provider": "ollama_llava",
            },
            {
                "id": "ollama_llava",
                "type": "ollama",
                "model": "ollama/llava",
                "role": "r",
                "goal": "g",
                "backstory": "b",
            },
        ],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id="only_step",
                agent_provider_id="hf_agent",
                description="d",
                expected_output="o",
            )
        ],
        task_sequence=["only_step"],
    )

    attempts: dict[str, int] = {}
    store_root = tmp_path / "store"

    class FakeJobRunner:
        def __init__(self) -> None:
            self._settings = K8sSettings.from_env()
            self.jobs: list[str] = []

        def run_step_job(
            self,
            *,
            run_id,
            step_id,
            spec_container_path,
            agent_provider_id,
            sidecar_mcp_ids=None,
        ):
            attempts[step_id] = attempts.get(step_id, 0) + 1
            spec_host_path = Path(
                spec_container_path.replace("/run/store", str(store_root))
            )
            run_store = store_root
            result_path = run_store / run_id / step_id / "result.json"
            result_path.parent.mkdir(parents=True, exist_ok=True)

            if attempts[step_id] == 1:
                result_path.write_text(
                    json.dumps(
                        {
                            "schema_version": "0.1",
                            "run_id": run_id,
                            "step_id": step_id,
                            "exit_code": 1,
                            "result_text": None,
                            "result_format": "plain",
                            "error": "HuggingFaceException: org/model-a not supported",
                            "recoverable": True,
                            "recovery_hint": "hf_litellm_fallback",
                            "artifacts": [],
                        }
                    ),
                    encoding="utf-8",
                )
            else:
                assert agent_provider_id == "ollama_llava"
                result_path.write_text(
                    json.dumps(
                        {
                            "schema_version": "0.1",
                            "run_id": run_id,
                            "step_id": step_id,
                            "exit_code": 0,
                            "result_text": "recovered output",
                            "result_format": "plain",
                            "error": None,
                            "recoverable": False,
                            "recovery_hint": None,
                            "artifacts": [],
                        }
                    ),
                    encoding="utf-8",
                )

            self.jobs.append(step_id)
            record = K8sJobRecord(
                job_name=job_name_for_step(run_id=run_id, step_id=step_id),
                namespace="agentic-orchestration",
                pod_name=f"pod-{step_id}-{attempts[step_id]}",
            )
            wait = K8sJobWaitResult(
                succeeded=attempts[step_id] > 1,
                failed=attempts[step_id] == 1,
                pod_name=record.pod_name,
                message=None if attempts[step_id] > 1 else "job failed",
            )
            return record, wait

    monkeypatch.setattr(
        "orchestration.backends.kubernetes_runner.KubernetesJobRunner.from_env",
        lambda: FakeJobRunner(),
    )

    result = execute_workflow_config_resolved(
        cfg,
        options=RunOptions(quiet=True, mcp_catalog_path=tool_root / "config" / "agent_providers"),
    )

    assert result.exit_code == 0
    assert result.result_text == "recovered output"
    assert attempts["only_step"] == 2
    assert len(result.k8s_jobs) == 2
