"""
Latency budgets for the direct-agent fast path (request → first token, request → complete).

A latency regression should be a failing test, not a note — but only on hardware that
was asked to measure it. Excluded from the default pytest run by the ``latency`` marker
and skipped unless ``AGENTIC_LATENCY_CI=1``::

  AGENTIC_LATENCY_CI=1 .venv/bin/python -m pytest tests/test_direct_agent_latency.py -m latency

By default the budgets are measured against a stubbed agent, which asserts the framing
overhead of the fast path itself (catalog load + config build + kickoff plumbing) with a
tight budget. Set ``AGENTIC_LATENCY_LIVE=1`` to measure a real model instead, in which
case the budgets default to generous values suited to edge hardware.

Budgets (milliseconds), overridable per reference profile:
  AGENTIC_LATENCY_TTFT_MS       first streamed token
  AGENTIC_LATENCY_COMPLETE_MS   full answer
"""

from __future__ import annotations

import os
import time
from importlib.util import find_spec
from pathlib import Path
from unittest.mock import MagicMock

import pytest
import yaml

pytestmark = [pytest.mark.latency, pytest.mark.unit]

LIVE = os.getenv("AGENTIC_LATENCY_LIVE", "").strip().lower() in ("1", "true", "yes", "on")

#: Stubbed runs measure our own overhead, so the default budget is tight. Live runs
#: include a real model on unknown hardware, so the defaults are deliberately generous.
DEFAULT_TTFT_MS = 60000.0 if LIVE else 2000.0
DEFAULT_COMPLETE_MS = 180000.0 if LIVE else 4000.0


def _budget_ms(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    try:
        return float(raw) if raw else default
    except ValueError:
        return default


pytestmark.append(
    pytest.mark.skipif(
        os.getenv("AGENTIC_LATENCY_CI", "").strip().lower() not in ("1", "true", "yes", "on"),
        reason="latency budgets run only with AGENTIC_LATENCY_CI=1",
    )
)


def _crewai_available() -> bool:
    try:
        spec = find_spec("crewai")
    except ValueError:
        return False
    return spec is not None and spec.loader is not None


pytestmark.append(
    pytest.mark.skipif(not _crewai_available(), reason="crewai not installed")
)


@pytest.fixture
def stub_catalog(tmp_path: Path) -> Path:
    path = tmp_path / "agent_providers.yaml"
    path.write_text(
        yaml.safe_dump(
            {
                "agent_providers": [
                    {
                        "id": "latency_probe",
                        "type": "ollama",
                        "model": os.getenv("AGENTIC_LATENCY_MODEL", "llama3.2:1b"),
                        "role": "Analyst",
                        "goal": "Answer fast",
                        "backstory": "Latency probe.",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    return path


def test_direct_agent_meets_latency_budgets(
    tmp_path: Path,
    stub_catalog: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from orchestration.direct_agent import run_direct_agent

    monkeypatch.setenv("AGENTIC_KB", "0")
    ttft_budget = _budget_ms("AGENTIC_LATENCY_TTFT_MS", DEFAULT_TTFT_MS)
    complete_budget = _budget_ms("AGENTIC_LATENCY_COMPLETE_MS", DEFAULT_COMPLETE_MS)

    if not LIVE:
        monkeypatch.setenv("AGENTIC_AGENT_PROVIDERS_CATALOG", str(stub_catalog))
        first_token_at: list[float] = []

        def kickoff(**_kw: object) -> str:
            first_token_at.append(time.monotonic())
            return "fast answer"

        built = MagicMock(crew=MagicMock(kickoff=kickoff), kickoff_callback_state=None)
        monkeypatch.setattr("orchestration.runner.build_workflow", lambda *a, **kw: built)
    else:
        first_token_at = []

    started = time.monotonic()
    answer = run_direct_agent(
        tool_root=tmp_path,
        agent_provider_id="latency_probe" if not LIVE else _live_agent_id(),
        goal="Reply with a single short sentence.",
        context="",
        persist=False,
    )
    completed = time.monotonic()

    assert answer, "direct agent returned no text"
    ttft_ms = ((first_token_at[0] if first_token_at else completed) - started) * 1000
    complete_ms = (completed - started) * 1000
    print(f"\nlatency: ttft={ttft_ms:.0f}ms complete={complete_ms:.0f}ms (live={LIVE})")

    assert ttft_ms <= ttft_budget, (
        f"request→first-token {ttft_ms:.0f}ms exceeds budget {ttft_budget:.0f}ms "
        "(raise AGENTIC_LATENCY_TTFT_MS for this profile, or fix the regression)"
    )
    assert complete_ms <= complete_budget, (
        f"request→complete {complete_ms:.0f}ms exceeds budget {complete_budget:.0f}ms "
        "(raise AGENTIC_LATENCY_COMPLETE_MS for this profile, or fix the regression)"
    )


def _live_agent_id() -> str:
    agent_id = os.getenv("AGENTIC_LATENCY_AGENT_ID", "").strip()
    if not agent_id:
        pytest.skip("AGENTIC_LATENCY_LIVE=1 requires AGENTIC_LATENCY_AGENT_ID")
    return agent_id
