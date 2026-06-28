"""Live kind cluster e2e — real Kubernetes Jobs, stub worker image (no LLM).

Run via scripts/k8s-kind-e2e.sh (CI) or locally after:
  AGENTIC_KIND_E2E=1 bash scripts/k8s-kind-up.sh && bash scripts/k8s-apply-run-store.sh
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from orchestration.backends.base import RunOptions
from orchestration.config_loader import load_workflow_config
from orchestration.execution_dispatch import execute_workflow_config_resolved


@pytest.mark.integration
@pytest.mark.backend_kubernetes
@pytest.mark.kind_e2e
def test_two_step_kind_kubernetes_workflow(
    tool_root: Path,
) -> None:
    """K3.8 live: coordinator runs two steps via real kind Jobs (stub worker, no LLM)."""
    if os.getenv("AGENTIC_KIND_E2E", "").strip() != "1":
        pytest.skip("Set AGENTIC_KIND_E2E=1 (see scripts/k8s-kind-e2e.sh)")

    if os.getenv("AGENTIC_EXECUTION_BACKEND", "").strip() != "kubernetes":
        pytest.skip("AGENTIC_EXECUTION_BACKEND must be kubernetes for kind e2e")

    workflow_path = tool_root / "config" / "workflows" / "workflow_brainstorm.yaml"
    cfg = load_workflow_config(workflow_path)
    result = execute_workflow_config_resolved(cfg, options=RunOptions(quiet=True))

    assert result.exit_code == 0, result.error
    assert result.result_text
    assert len(result.step_results) == 2
    assert [s.step_id for s in result.step_results] == ["diverge", "converge"]
    assert len(result.k8s_jobs) == 2
    assert all(job.get("succeeded") for job in result.k8s_jobs)
