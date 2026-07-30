"""
Optional live e2e: direct-agent JSON mode against a real Ollama ``qwen2.5:3b``.

Enable with::

    AGENTIC_DIRECT_AGENT_JSON_E2E=1 python -m pytest tests/test_direct_agent_json_e2e.py -m integration -s
"""

from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

import pytest
import yaml

import orchestration.direct_agent as direct_agent

pytestmark = [
    pytest.mark.integration,
    pytest.mark.timeout(180),
]


def _enabled() -> bool:
    return os.getenv("AGENTIC_DIRECT_AGENT_JSON_E2E", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


@pytest.fixture
def catalog(tmp_path: Path) -> Path:
    model = os.getenv("AGENTIC_DIRECT_AGENT_JSON_E2E_MODEL", "qwen2.5:3b").strip()
    path = tmp_path / "agent_providers.yaml"
    path.write_text(
        yaml.safe_dump(
            {
                "agent_providers": [
                    {
                        "id": "json_router",
                        "type": "ollama",
                        "model": model,
                        "role": "Router",
                        "goal": "Split meeting questions",
                        "backstory": "Return JSON only.",
                        "selfcontained": True,
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    return path


def test_live_json_object_loads_without_fences(
    tmp_path: Path,
    catalog: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    if not _enabled():
        pytest.skip("Set AGENTIC_DIRECT_AGENT_JSON_E2E=1 for live JSON e2e")
    ollama = shutil.which("ollama")
    if not ollama:
        win = Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Ollama" / "ollama.exe"
        if win.is_file():
            monkeypatch.setenv(
                "PATH", str(win.parent) + os.pathsep + os.environ.get("PATH", "")
            )
        else:
            pytest.skip("ollama binary not found")

    monkeypatch.setenv("AGENTIC_AGENT_PROVIDERS_CATALOG", str(catalog))
    monkeypatch.setenv("AGENTIC_AUTO_ENSURE_RUNTIME", "1")
    monkeypatch.setenv("AGENTIC_KB", "0")

    schema = {
        "type": "object",
        "properties": {
            "technical": {"type": ["string", "null"]},
            "commercial": {"type": ["string", "null"]},
        },
    }
    answer = direct_agent.run_direct_agent(
        tool_root=tmp_path,
        agent_provider_id="json_router",
        goal=(
            "Classify this meeting utterance into technical vs commercial. "
            'Utterance: "What is the list price for Falcon?" '
            'Return JSON keys technical and commercial (string or null).'
        ),
        response_format={"type": "json_object"},
        json_schema=schema,
    )
    # Acceptance: json.loads without fence stripping.
    data = json.loads(answer)
    assert isinstance(data, dict)
    assert "technical" in data or "commercial" in data
