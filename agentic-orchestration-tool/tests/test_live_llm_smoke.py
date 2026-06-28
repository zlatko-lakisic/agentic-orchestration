"""Live LLM smoke tests — real API calls. Excluded from default pytest (see pytest.ini).

Run locally:
  .venv\\Scripts\\python.exe -m pytest -m live_llm -o addopts="-ra"

Requires OPENAI_API_KEY (and optional AGENTIC_PLANNER_MODEL) in the environment or .env.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.live_llm


def _require_openai_key() -> None:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key or key == "your_openai_api_key_here":
        pytest.skip("OPENAI_API_KEY not configured")


@pytest.mark.timeout(180)
def test_live_static_workflow_inprocess(
    default_workflow_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pytest.importorskip("crewai")
    _require_openai_key()
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "inprocess")

    from main import run_workflow

    code, text = run_workflow(default_workflow_path, quiet=True)
    assert code == 0
    assert text and len(text.strip()) > 20


@pytest.mark.timeout(300)
def test_live_dynamic_inprocess(tool_root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    pytest.importorskip("crewai")
    _require_openai_key()
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "inprocess")
    monkeypatch.setenv("AGENTIC_PLANNER_MAX_STEPS", os.getenv("AGENTIC_PLANNER_MAX_STEPS", "2"))
    monkeypatch.setenv("AGENTIC_FINAL_QA", "0")
    monkeypatch.setenv("AGENTIC_LEARNING", "0")
    monkeypatch.setenv("AGENTIC_LEARNING_EVAL", "0")

    proc = subprocess.run(
        [
            sys.executable,
            "main.py",
            "--dynamic",
            "Explain YAML-driven CrewAI workflows in three bullet points.",
            "--quiet",
            "--no-save",
        ],
        cwd=str(tool_root),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=280,
    )
    if proc.returncode != 0:
        pytest.fail(
            f"dynamic live smoke failed (exit {proc.returncode})\n"
            f"--- stderr ---\n{proc.stderr[-4000:]}\n"
            f"--- stdout ---\n{proc.stdout[-2000:]}"
        )
    assert proc.stdout.strip()
