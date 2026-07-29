#!/usr/bin/env python3
"""
Jetson / edge smoke: agent societies K6.1 (society lite).

Offline by default — unit tests, charter validation against the real catalogs, and a session
create/append/budget round-trip in a temp directory. No LLM calls unless you opt in::

  python3 scripts/smoke_society_lite.py
  AGENTIC_SMOKE_SOCIETY_LIVE=1 python3 scripts/smoke_society_lite.py
  SMOKE_ROUNDS=3 python3 scripts/smoke_society_lite.py --until-pass
  ./scripts/smoke_society_lite.sh

Env:
  SMOKE_ROUNDS               max rounds when --until-pass (default 3)
  SMOKE_SKIP_UNIT            1 to skip pytest
  AGENTIC_SMOKE_SOCIETY_LIVE 1 to run a real short society (needs local models pulled)
  SMOKE_SOCIETY_CHARTER      charter path for the live run (default: Jetson charter when the
                             Jetson catalog is active, else the full research panel charter)
  SMOKE_SOCIETY_GOAL         goal for the live run
  SMOKE_SOCIETY_TURNS        turn cap for the live run (default 3)
  SMOKE_TIMEOUT_S            live run timeout in seconds (default 900)
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

_TOOL_ROOT = Path(__file__).resolve().parent.parent
_REPO_ROOT = _TOOL_ROOT.parent
_VERTICAL = _REPO_ROOT / "examples" / "verticals" / "society_research_panel"
_PANEL_CHARTER = _VERTICAL / "society_research_panel.yaml"
_JETSON_CHARTER = _VERTICAL / "society_research_panel_jetson.yaml"

if str(_TOOL_ROOT) not in sys.path:
    sys.path.insert(0, str(_TOOL_ROOT))


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _truthy(name: str) -> bool:
    return _env(name).lower() in ("1", "true", "yes", "on")


def _ok(msg: str) -> None:
    print(f"  OK  {msg}")


def _fail(msg: str) -> None:
    print(f" FAIL {msg}", file=sys.stderr)


def _python() -> Path:
    candidate = _TOOL_ROOT / ".venv" / "bin" / "python"
    return candidate if candidate.is_file() else Path(sys.executable)


def run_unit_tests() -> tuple[bool, str]:
    if _truthy("SMOKE_SKIP_UNIT"):
        return True, "unit skipped"
    cmd = [
        str(_python()),
        "-m",
        "pytest",
        "tests/test_society_charter.py",
        "tests/test_society_session.py",
        "tests/test_society_controller.py",
        "tests/test_society_runtime.py",
        "tests/test_delegate_task_tool.py",
        "-q",
        "--tb=line",
    ]
    proc = subprocess.run(cmd, cwd=str(_TOOL_ROOT), capture_output=True, text=True)
    tail = (proc.stdout or proc.stderr or "").strip().splitlines()[-3:]
    if proc.returncode != 0:
        return False, "pytest failed: " + " | ".join(tail)
    return True, "unit tests passed: " + (tail[-1] if tail else "ok")


def check_schema_present() -> tuple[bool, str]:
    import json

    schema = _TOOL_ROOT / "config" / "schemas" / "society_charter.schema.json"
    if not schema.is_file():
        return False, f"missing charter schema: {schema}"
    data = json.loads(schema.read_text(encoding="utf-8"))
    if "society" not in (data.get("properties") or {}):
        return False, "charter schema has no 'society' property"
    return True, f"charter schema ok ({schema.name})"


def check_shipped_charters() -> tuple[bool, str]:
    from orchestration.agent_providers_catalog import load_agent_providers_catalog
    from orchestration.society_charter import (
        load_society_charter,
        validate_members_against_catalog,
    )

    full = load_society_charter(_PANEL_CHARTER)
    if full.protocol != "round_robin" or len(full.members) != 3:
        return False, f"unexpected panel charter shape: {full.roster_summary()}"
    if not full.stop_when:
        return False, "panel charter has no stop_when condition"
    validate_members_against_catalog(
        full,
        load_agent_providers_catalog(_TOOL_ROOT / "config" / "agent_providers"),
    )

    jetson = load_society_charter(_JETSON_CHARTER)
    validate_members_against_catalog(
        jetson,
        load_agent_providers_catalog(_VERTICAL / "agent_providers"),
    )
    return True, (
        f"charters valid: {full.society_id} ({full.roster_summary()}), {jetson.society_id}"
    )


def check_active_catalog_can_seat_a_society() -> tuple[bool, str]:
    """Warn (do not fail) when the catalog in use has too few society_capable entries."""
    from orchestration.agent_providers_catalog import load_agent_providers_catalog_merged

    rel = _env("AGENTIC_AGENT_PROVIDERS_CATALOG", "config/agent_providers")
    path = Path(rel)
    if not path.is_absolute():
        path = _TOOL_ROOT / path
    if not path.exists():
        return False, f"active agent catalog not found: {path}"
    entries = load_agent_providers_catalog_merged(path)
    capable = [str(e.get("id")) for e in entries if e.get("society_capable")]
    if len(capable) < 3:
        print(
            f"  note: active catalog {path.name} has {len(capable)} society_capable entr(ies); "
            "use --example society_research_panel to merge the edge overlay seats",
        )
    return True, f"active catalog {path.name}: {len(capable)} society_capable entr(ies)"


def check_session_roundtrip() -> tuple[bool, str]:
    from orchestration.society_charter import load_society_charter
    from orchestration.society_session import (
        SocietySessionError,
        create_society_session,
        load_society_session,
    )

    charter = load_society_charter(_PANEL_CHARTER)
    with tempfile.TemporaryDirectory(prefix="society-smoke-") as tmp:
        root = Path(tmp)
        session = create_society_session(
            tool_root=root,
            charter=charter,
            goal="smoke goal",
            session_slug="smoke-panel",
        )
        for name in ("meta.json", "blackboard.md", "transcript.jsonl"):
            if not (session.directory / name).is_file():
                return False, f"session missing {name}"

        session.append_turn(
            turn_index=1,
            role="facilitator",
            agent_provider_id=charter.members[0].agent_provider_id,
            text="Opening the panel.",
        )
        if "Opening the panel." not in session.blackboard_text():
            return False, "blackboard did not record the turn"

        used = session.increment_delegation(agent_provider_id="x", requested_by="y")
        if used != 1:
            return False, f"unexpected delegations_used {used}"
        for _ in range(charter.max_delegations):
            try:
                session.increment_delegation(agent_provider_id="x")
            except SocietySessionError:
                break
        else:
            return False, "delegation budget was not enforced"

        reloaded = load_society_session(root, "smoke-panel")
        if reloaded.meta.turn != 1 or reloaded.meta.goal != "smoke goal":
            return False, f"reload mismatch: turn={reloaded.meta.turn} goal={reloaded.meta.goal!r}"
    return True, "session create/append/budget/reload ok"


def check_hierarchical_reference_workflow() -> tuple[bool, str]:
    from orchestration.config_loader import load_workflow_config

    path = _TOOL_ROOT / "config" / "workflows" / "workflow_society_hierarchical_panel.yaml"
    if not path.is_file():
        return False, f"missing reference workflow: {path}"
    cfg = load_workflow_config(path)
    if cfg.process != "hierarchical":
        return False, f"reference workflow process is {cfg.process!r}"
    managers = [
        str(p.get("id"))
        for p in cfg.agent_providers
        if isinstance(p, dict) and p.get("allow_delegation")
    ]
    if len(managers) != 1:
        return False, f"expected exactly one delegating manager, got {managers!r}"
    return True, f"hierarchical reference ok (manager={managers[0]})"


def run_optional_live_society() -> tuple[bool, str]:
    if not _truthy("AGENTIC_SMOKE_SOCIETY_LIVE"):
        return True, "live society skipped (set AGENTIC_SMOKE_SOCIETY_LIVE=1)"

    charter = _env("SMOKE_SOCIETY_CHARTER")
    if not charter:
        jetson_catalog = "jetson" in _env("AGENTIC_AGENT_PROVIDERS_CATALOG")
        charter = str(_JETSON_CHARTER if jetson_catalog else _PANEL_CHARTER)
    goal = _env(
        "SMOKE_SOCIETY_GOAL",
        "Should a small RAG index live on the edge device or in the cluster? Decide.",
    )
    turns = _env("SMOKE_SOCIETY_TURNS", "3") or "3"
    timeout = float(_env("SMOKE_TIMEOUT_S", "900") or "900")

    cmd = [
        str(_python()),
        "main.py",
        "--example",
        "society_research_panel",
        "--society",
        charter,
        "--goal",
        goal,
        "--society-max-turns",
        turns,
        "--society-session",
        "smoke-live",
        "--society-no-controller",
    ]
    print(f"  live: {' '.join(cmd[1:])}")
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(_TOOL_ROOT),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return False, f"live society timed out after {timeout:.0f}s"
    if proc.returncode != 0:
        tail = (proc.stderr or proc.stdout or "").strip().splitlines()[-6:]
        return False, "live society failed: " + " | ".join(tail)

    from orchestration.society_session import load_society_session

    session = load_society_session(_TOOL_ROOT, "smoke-live")
    if session.meta.turn < 1:
        return False, "live society recorded no turns"
    return True, (
        f"live society ok: {session.meta.turn} turn(s), status={session.meta.status}, "
        f"session={session.directory}"
    )


def one_round() -> bool:
    print("=== society lite smoke (K6.1) ===")
    checks = [
        ("unit tests", run_unit_tests),
        ("charter schema", check_schema_present),
        ("shipped charters", check_shipped_charters),
        ("active catalog", check_active_catalog_can_seat_a_society),
        ("session round-trip", check_session_roundtrip),
        ("hierarchical reference", check_hierarchical_reference_workflow),
        ("live society optional", run_optional_live_society),
    ]
    all_ok = True
    for name, fn in checks:
        print(f"-- {name}")
        try:
            ok, detail = fn()
        except Exception as exc:  # noqa: BLE001
            ok, detail = False, f"exception: {exc}"
        if ok:
            _ok(detail)
        else:
            _fail(detail)
            all_ok = False
    return all_ok


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--until-pass", action="store_true")
    args = ap.parse_args()
    rounds = max(1, int(_env("SMOKE_ROUNDS", "3") or "3"))
    if not args.until_pass:
        return 0 if one_round() else 1
    for i in range(1, rounds + 1):
        print(f"\n######## round {i}/{rounds} ########")
        if one_round():
            print(f"\nSMOKE PASS on round {i}")
            return 0
        if i < rounds:
            time.sleep(min(30, 5 * i))
    print("\nSMOKE FAIL after all rounds", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
