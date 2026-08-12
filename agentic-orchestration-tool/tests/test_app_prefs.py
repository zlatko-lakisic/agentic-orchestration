"""Unit tests for orchestration.app_prefs."""

from __future__ import annotations

import json
from pathlib import Path

from orchestration.app_prefs import (
    effective_run_mode,
    get_app_prefs,
    sticky_run_mode_from_prefs,
)


def test_get_app_prefs_reads_shared_json(tmp_path: Path) -> None:
    root = tmp_path / "__orchestrator_api_tokens__"
    root.mkdir()
    (root / "app-prefs.json").write_text(
        json.dumps({"KnowBuddy": {"dynamicPlanning": True, "defaultRunMode": "dynamic"}}),
        encoding="utf-8",
    )
    prefs = get_app_prefs(tmp_path, "knowbuddy")
    assert prefs["dynamicPlanning"] is True
    assert prefs["defaultRunMode"] == "dynamic"
    assert sticky_run_mode_from_prefs(prefs) == "dynamic"
    assert effective_run_mode("dynamic-iterative", prefs) == "dynamic-iterative"
    assert effective_run_mode(None, prefs) == "dynamic"
