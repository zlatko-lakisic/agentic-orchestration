#!/usr/bin/env python3
"""CI stub worker: consume a step spec path and write canned result.json (no LLM)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Step ids from kind e2e workflows (brainstorm + agent skills smoke).
DEFAULT_OUTPUTS: dict[str, str] = {
    "diverge": "\n".join(f"{i}. Theme idea {i}" for i in range(1, 13)),
    "converge": "## Top 5\n1. Theme idea 1 — strong fit\n2. Theme idea 2 — strong fit",
    "research_topic": "bullet one\nbullet two",
    "write_brief": "Final briefing with action items.",
    "skills_echo": "SKILL_ECHO_OK\nSkills injection verified by kind stub worker.",
}


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: k8s-stub-worker.py <spec-path>", file=sys.stderr)
        return 2

    app_root = Path(__file__).resolve().parent.parent
    if str(app_root) not in sys.path:
        sys.path.insert(0, str(app_root))

    spec_path = Path(sys.argv[1])
    data = json.loads(spec_path.read_text(encoding="utf-8-sig"))
    step_id = str(data.get("step_id", "step"))
    run_id = str(data.get("run_id", ""))
    paths = data.get("paths") or {}
    run_store = str(paths.get("run_store") or "").strip()
    if not run_store or not run_id:
        print("error: spec missing paths.run_store or run_id", file=sys.stderr)
        return 2

    try:
        from orchestration.k8s_stub_skills import verify_agent_skills_step_spec

        embedded_catalog = Path(
            os.getenv("AGENTIC_K8S_STUB_SKILLS_CATALOG", "/app/config/agent_skills"),
        )
        verify_agent_skills_step_spec(data, embedded_catalog_dir=embedded_catalog)
    except ValueError as exc:
        print(f"error: skills spec verification failed: {exc}", file=sys.stderr)
        return 3
    except ImportError as exc:
        print(f"error: skills verification module unavailable: {exc}", file=sys.stderr)
        return 3

    text = DEFAULT_OUTPUTS.get(step_id, f"stub output for {step_id}")
    result_path = Path(run_store) / run_id / step_id / "result.json"
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
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
