#!/usr/bin/env python3
"""
Jetson / edge smoke: agent societies K6.1 (society lite) + K6.2 (message bus and protocols).

Offline by default — unit tests, charter validation against the real catalogs, a session
create/append/budget round-trip, a message-bus round-trip, and turn-protocol selection, all in
a temp directory. No LLM calls unless you opt in::

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


def _load_tool_dotenv() -> None:
    """Best-effort: pick up Jetson ``.env`` so catalog/path detection matches ``main.py``."""
    env_path = _TOOL_ROOT / ".env"
    if not env_path.is_file():
        return
    try:
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            if not key or key in os.environ:
                continue
            os.environ[key] = val.strip().strip('"').strip("'")
    except OSError:
        return


def _prefer_jetson_charter() -> bool:
    """True when the active catalog / host is the Jetson edge layout."""
    catalog = _env("AGENTIC_AGENT_PROVIDERS_CATALOG").lower()
    if "jetson" in catalog or "agent_providers_jetson" in catalog:
        return True
    if Path("/etc/nv_tegra_release").is_file():
        return True
    platform = _env("AGENTIC_EDGE_PLATFORM").lower()
    return platform in ("jetson", "tegra")


def _default_live_charter() -> Path:
    return _JETSON_CHARTER if _prefer_jetson_charter() else _PANEL_CHARTER


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
        "tests/test_society_messages.py",
        "tests/test_society_message_tools.py",
        "tests/test_society_protocols.py",
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
    society = ((data.get("properties") or {}).get("society") or {}).get("properties") or {}
    if not society:
        return False, "charter schema has no 'society' property"

    from orchestration.society_charter import PROTOCOLS

    schema_protocols = (society.get("protocol") or {}).get("enum") or []
    missing = sorted(set(PROTOCOLS) - set(schema_protocols))
    if missing:
        return False, f"charter schema protocol enum is missing {missing!r}"
    return True, f"charter schema ok ({schema.name}, protocols {list(PROTOCOLS)})"


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
        if not session.messages_dir.is_dir():
            return False, "session missing messages/"

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


def check_message_bus_roundtrip() -> tuple[bool, str]:
    """K6.2: post → read thread → unread/cursor → ready_for_draft marker, all on disk."""
    from orchestration.society_charter import load_society_charter
    from orchestration.society_messages import latest_ready_for_draft
    from orchestration.society_session import create_society_session, load_society_session

    charter = load_society_charter(_PANEL_CHARTER)
    ids = charter.agent_provider_ids
    chair, expert, critic = ids[0], ids[1], ids[2]

    with tempfile.TemporaryDirectory(prefix="society-msg-smoke-") as tmp:
        root = Path(tmp)
        session = create_society_session(
            tool_root=root,
            charter=charter,
            goal="smoke goal",
            session_slug="smoke-messages",
        )
        if not session.messages_dir.is_dir():
            return False, "session has no messages/ directory"

        opening = session.post_message(
            from_agent=chair, content="Opening the panel.", turn=1, role="facilitator"
        )
        question = session.post_message(
            from_agent=chair,
            content="Critic, is the latency claim defensible?",
            to_agent=critic,
            thread_id="latency",
            turn=1,
            role="facilitator",
        )
        answer = session.post_message(
            from_agent=critic,
            content="Only under 4 GB of index. ready_for_draft",
            thread_id="latency",
            refs=[question.msg_id],
            turn=2,
            role="critic",
        )

        thread = session.read_thread("latency")
        if [m.msg_id for m in thread] != [question.msg_id, answer.msg_id]:
            return False, f"thread order wrong: {[m.msg_id for m in thread]!r}"
        if thread[1].refs != [question.msg_id]:
            return False, f"refs not persisted: {thread[1].refs!r}"

        unread = [m.msg_id for m in session.unread_for(critic)]
        if unread != [opening.msg_id, question.msg_id]:
            return False, f"unexpected unread for the critic: {unread!r}"
        if question.msg_id in [m.msg_id for m in session.unread_for(expert)]:
            return False, "a directed message leaked to a third member"
        session.mark_seen(critic)
        if session.unread_for(critic):
            return False, "read cursor did not clear unread"

        marker = latest_ready_for_draft(session.directory)
        if marker is None or marker.from_agent != critic:
            return False, "ready_for_draft marker not detected"

        summary = session.recent_messages_summary()
        if "Opening the panel." not in summary or "4 GB" not in summary:
            return False, "recent-messages digest is missing posts"

        reloaded = load_society_session(root, "smoke-messages")
        if len(reloaded.messages()) != 3:
            return False, f"reload lost messages ({len(reloaded.messages())} of 3)"
    return True, "message bus post/thread/unread/cursor/reload ok (3 messages)"


def check_protocol_selection() -> tuple[bool, str]:
    """K6.2: every protocol picks a seat, and ready_for_draft promotes the drafter."""
    from orchestration.society_charter import PROTOCOLS, parse_society_charter
    from orchestration.society_protocols import select_next_member
    from orchestration.society_session import create_society_session

    charter = parse_society_charter(
        {
            "society": {
                "id": "smoke_protocols",
                "max_turns": 6,
                "members": [
                    {"agent_provider_id": "s_chair", "role": "facilitator"},
                    {"agent_provider_id": "s_research", "role": "researcher"},
                    {"agent_provider_id": "s_critic", "role": "critic"},
                    {"agent_provider_id": "s_writer", "role": "writer"},
                ],
            }
        }
    )
    with tempfile.TemporaryDirectory(prefix="society-proto-smoke-") as tmp:
        root = Path(tmp)
        session = create_society_session(
            tool_root=root,
            charter=charter,
            goal="smoke goal",
            session_slug="smoke-protocols",
        )
        for protocol in PROTOCOLS:
            picked = select_next_member(protocol, charter, session, 1)
            if picked.agent_provider_id not in charter.agent_provider_ids:
                return False, f"protocol {protocol!r} picked a non-member"

        if select_next_member("round_robin", charter, session, 2).role != "researcher":
            return False, "round_robin did not advance to the second seat"

        session.post_message(
            from_agent="s_chair", content="Researcher, open with the evidence.", turn=1
        )
        if select_next_member("moderator_picks", charter, session, 2).role != "researcher":
            return False, "moderator_picks ignored the chair's hand-off"

        session.post_message(
            from_agent="s_research",
            content="Two benchmarks disagree.",
            to_agent="s_critic",
            thread_id="evidence",
            turn=2,
        )
        if select_next_member("reactive", charter, session, 3).role != "critic":
            return False, "reactive ignored directed mail"

        session.post_message(
            from_agent="s_critic",
            content="Spread is wide but the call holds. ready_for_draft",
            thread_id="evidence",
            turn=3,
        )
        for protocol in ("reactive", "moderator_picks"):
            if select_next_member(protocol, charter, session, 4).role != "writer":
                return False, f"{protocol} did not promote the writer after ready_for_draft"
    return True, f"protocols ok ({', '.join(PROTOCOLS)}); writer gated on ready_for_draft"


def check_message_tools_attach() -> tuple[bool, str]:
    """The three society_* tools land on a member's agents without a live model."""
    from orchestration.society_message_tools import (
        SOCIETY_TOOL_NAMES,
        attach_society_message_tools,
        message_tools_enabled_from_env,
    )
    from orchestration.society_charter import load_society_charter
    from orchestration.society_session import create_society_session

    class _Agent:
        def __init__(self) -> None:
            self.tools: list = []

    class _Crew:
        def __init__(self) -> None:
            self.agents = [_Agent()]

    class _Built:
        def __init__(self) -> None:
            self.crew = _Crew()

    charter = load_society_charter(_PANEL_CHARTER)
    with tempfile.TemporaryDirectory(prefix="society-tools-smoke-") as tmp:
        session = create_society_session(
            tool_root=Path(tmp),
            charter=charter,
            goal="smoke goal",
            session_slug="smoke-tools",
        )
        built = _Built()
        if not attach_society_message_tools(
            built, session=session, member=charter.members[0], turn=1
        ):
            return False, "message tools did not attach"
        names = [getattr(t, "name", "") for t in built.crew.agents[0].tools]
        if names != list(SOCIETY_TOOL_NAMES):
            return False, f"unexpected tool set: {names!r}"

        post = built.crew.agents[0].tools[0]
        out = post._run(content="smoke post", to_agent=charter.agent_provider_ids[1])
        if "Posted" not in out or len(session.messages()) != 1:
            return False, f"society_post did not write a message: {out!r}"
    default_on = "on by default" if message_tools_enabled_from_env() else "disabled by env"
    return True, f"society_* tools attach and post ({', '.join(SOCIETY_TOOL_NAMES)}; {default_on})"


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

    _load_tool_dotenv()
    charter = _env("SMOKE_SOCIETY_CHARTER") or str(_default_live_charter())
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
    live_env = os.environ.copy()
    # Host-side smoke must hit native Ollama, not the in-cluster DNS name.
    if _prefer_jetson_charter() and "host.k3s.internal" in live_env.get("OLLAMA_HOST", ""):
        live_env["OLLAMA_HOST"] = "http://127.0.0.1:11434"
        live_env["OLLAMA_API_BASE"] = "http://127.0.0.1:11434"
    live_env.setdefault("OLLAMA_HOST", "http://127.0.0.1:11434")
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(_TOOL_ROOT),
            capture_output=True,
            text=True,
            timeout=timeout,
            env=live_env,
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
    print("=== society smoke (K6.1 lite + K6.2 message bus) ===")
    checks = [
        ("unit tests", run_unit_tests),
        ("charter schema", check_schema_present),
        ("shipped charters", check_shipped_charters),
        ("active catalog", check_active_catalog_can_seat_a_society),
        ("session round-trip", check_session_roundtrip),
        ("message bus round-trip", check_message_bus_roundtrip),
        ("turn protocols", check_protocol_selection),
        ("message tools", check_message_tools_attach),
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
