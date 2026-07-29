#!/usr/bin/env python3
"""
Jetson / edge smoke: engine API daemon (`python -m orchestration.serve`).

Offline by default and safe on a CLI-only install: the FastAPI checks skip gracefully
when the optional extras are missing, while the identity, KB, host-metrics, and
direct-agent checks always run (they need no network and no API keys)::

  python3 scripts/smoke_serve.py
  ./scripts/smoke_serve.sh
  pip install -r requirements-serve.txt && python3 scripts/smoke_serve.py

Env:
  SMOKE_SKIP_UNIT           1 to skip pytest
  AGENTIC_SMOKE_SERVE_LIVE  1 to bind a real uvicorn port and curl /health
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

_TOOL_ROOT = Path(__file__).resolve().parent.parent

if str(_TOOL_ROOT) not in sys.path:
    sys.path.insert(0, str(_TOOL_ROOT))


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _truthy(name: str) -> bool:
    return _env(name).lower() in ("1", "true", "yes", "on")


#: Prefix a check detail with this to report it as a skip rather than a pass.
_SKIPPED = "skipped: "


def _ok(msg: str) -> None:
    print(f"  OK  {msg}")


def _skip(msg: str) -> None:
    print(f" SKIP {msg}")


def _fail(msg: str) -> None:
    print(f" FAIL {msg}", file=sys.stderr)


def _python() -> Path:
    """Interpreter for subprocess checks — the one running us when it is a venv."""
    if sys.prefix != sys.base_prefix:
        return Path(sys.executable)
    candidate = _TOOL_ROOT / ".venv" / "bin" / "python"
    return candidate if candidate.is_file() else Path(sys.executable)


def _module_installed(module: str) -> bool:
    from importlib.util import find_spec

    try:
        return find_spec(module) is not None
    except (ImportError, ValueError):
        return False


def _fastapi_installed() -> bool:
    from orchestration.serve import fastapi_available

    return fastapi_available()


def run_unit_tests() -> tuple[bool, str]:
    if _truthy("SMOKE_SKIP_UNIT"):
        return True, _SKIPPED + "unit tests skipped (SMOKE_SKIP_UNIT=1)"
    targets = [
        "tests/test_user_context.py",
        "tests/test_direct_agent.py",
        "tests/test_host_metrics.py",
        "tests/test_knowledge_base_scopes.py",
        "tests/test_deal_auth.py",
        "tests/test_session_user_namespace.py",
        "tests/test_hardware_resident_models.py",
    ]
    if _fastapi_installed():
        targets.append("tests/test_serve_app.py")
    proc = subprocess.run(
        [str(_python()), "-m", "pytest", *targets, "-q", "--tb=line"],
        cwd=str(_TOOL_ROOT),
        capture_output=True,
        text=True,
    )
    tail = (proc.stdout or proc.stderr or "").strip().splitlines()[-3:]
    if proc.returncode != 0:
        return False, "pytest failed: " + " | ".join(tail)
    return True, "unit tests passed: " + (tail[-1] if tail else "ok")


def check_soft_imports() -> tuple[bool, str]:
    """The engine must import without FastAPI, and the CLI must not pull it in."""
    code = (
        "import sys; import orchestration.serve as s; import orchestration.user_context;"
        "import orchestration.dynamic_run; import orchestration.direct_agent;"
        "import orchestration.host_metrics; import orchestration.deal_auth;"
        "loaded=[m for m in ('fastapi','uvicorn') if m in sys.modules];"
        "print('LOADED:'+','.join(loaded))"
    )
    proc = subprocess.run(
        [str(_python()), "-c", code],
        cwd=str(_TOOL_ROOT),
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return False, f"import failed: {(proc.stderr or '').strip()[-300:]}"
    loaded = (proc.stdout or "").strip().removeprefix("LOADED:").strip()
    if loaded:
        return False, f"optional serve deps imported at module load: {loaded}"
    return True, "engine modules import without fastapi/uvicorn"


def check_serve_deps_error_is_actionable() -> tuple[bool, str]:
    """A missing extra must name requirements-serve.txt, not raise a bare ImportError."""
    from orchestration.serve import SERVE_DEPS_HINT

    if "requirements-serve.txt" not in SERVE_DEPS_HINT:
        return False, "SERVE_DEPS_HINT does not mention requirements-serve.txt"
    if _fastapi_installed():
        return True, "serve extras installed; hint text is actionable"
    try:
        from orchestration.serve import require_serve_deps

        require_serve_deps()
    except ImportError as exc:
        if "requirements-serve.txt" in str(exc):
            return True, "missing extras raise a clear, actionable ImportError"
        return False, f"unhelpful ImportError: {exc}"
    return False, "require_serve_deps() did not raise without fastapi installed"


def check_identity_resolution() -> tuple[bool, str]:
    from orchestration.user_context import IdentityRequiredError, resolve_identity

    local = resolve_identity({})
    if local.user_id != "local" or not local.local:
        return False, f"no headers should resolve to the implicit local user: {local}"
    server = resolve_identity({"x-agentic-user-name": "Ada Lovelace", "x-agentic-session-id": "wg-1"})
    if server.user_id != "ada-lovelace" or server.session_id != "wg-1":
        return False, f"proxy headers not honored: {server}"
    prior = os.environ.get("AGENTIC_REQUIRE_IDENTITY")
    os.environ["AGENTIC_REQUIRE_IDENTITY"] = "1"
    try:
        resolve_identity({})
        return False, "AGENTIC_REQUIRE_IDENTITY=1 did not reject an anonymous request"
    except IdentityRequiredError:
        pass
    finally:
        if prior is None:
            os.environ.pop("AGENTIC_REQUIRE_IDENTITY", None)
        else:
            os.environ["AGENTIC_REQUIRE_IDENTITY"] = prior
    return True, "local implicit user + proxy headers + AGENTIC_REQUIRE_IDENTITY rejection"


def check_host_metrics_sample() -> tuple[bool, str]:
    from orchestration.host_metrics import metrics_scope, sample_host_metrics

    sample_host_metrics()
    sample = sample_host_metrics()
    if "memory" not in sample or "cpu" not in sample:
        return False, f"unexpected metrics payload keys: {sorted(sample)}"
    return True, f"host metrics scope={metrics_scope()} cpu={sample['cpu'].get('percent')}"


def check_kb_two_tier() -> tuple[bool, str]:
    from orchestration.knowledge_base import add_document, delete_by_scope, search, upsert_by_source

    prior_anon = os.environ.get("AGENTIC_ANONYMIZE_CLOUD")
    os.environ["AGENTIC_ANONYMIZE_CLOUD"] = "0"
    try:
        with tempfile.TemporaryDirectory(prefix="serve-smoke-kb-") as tmp:
            root = Path(tmp)
            add_document(
                tool_root=root,
                session_slug=None,
                user_goal="pricing",
                content="smoke pricing global baseline",
            )
            add_document(
                tool_root=root,
                session_slug=None,
                user_goal="pricing",
                content="smoke pricing deal override",
                deal_id="smoke-deal",
            )
            hits = search(tool_root=root, query="pricing", deal_id="smoke-deal")
            if not hits or hits[0].deal_id != "smoke-deal":
                return False, f"deal precedence not applied: {[h.scope for h in hits]}"
            first = upsert_by_source(
                tool_root=root, source_id="smoke://a", user_goal="g", content="upsert v1"
            )
            same = upsert_by_source(
                tool_root=root, source_id="smoke://a", user_goal="g", content="upsert v1"
            )
            if same["action"] != "unchanged" or same["docId"] != first["docId"]:
                return False, f"upsert-by-source is not idempotent: {same}"
            if delete_by_scope(tool_root=root, deal_id="smoke-deal") != 1:
                return False, "delete-by-scope did not remove the deal row"
            if search(tool_root=root, query="override"):
                return False, "delete-by-scope left residual rows"
    finally:
        if prior_anon is None:
            os.environ.pop("AGENTIC_ANONYMIZE_CLOUD", None)
        else:
            os.environ["AGENTIC_ANONYMIZE_CLOUD"] = prior_anon
    return True, "two-tier precedence, idempotent upsert, clean delete-by-scope"


def check_direct_agent_offline() -> tuple[bool, str]:
    """Direct path builds a one-task config and returns a mocked answer (no LLM)."""
    from unittest.mock import MagicMock

    import yaml

    from orchestration.direct_agent import build_direct_agent_config, run_direct_agent

    if not _module_installed("crewai"):
        return True, _SKIPPED + "crewai not installed (unit-test tier); kickoff check needs it"

    with tempfile.TemporaryDirectory(prefix="serve-smoke-direct-") as tmp:
        root = Path(tmp)
        catalog = root / "agent_providers.yaml"
        catalog.write_text(
            yaml.safe_dump(
                {
                    "agent_providers": [
                        {
                            "id": "smoke_probe",
                            "type": "ollama",
                            "model": "llama3.2:1b",
                            "role": "Analyst",
                            "goal": "Answer",
                            "backstory": "Smoke probe.",
                        }
                    ]
                }
            ),
            encoding="utf-8",
        )
        config = build_direct_agent_config(
            agent_provider_id="smoke_probe",
            goal="smoke question",
            context="smoke context",
            catalog_path=catalog,
        )
        if len(config.tasks) != 1:
            return False, f"direct path built {len(config.tasks)} tasks; expected exactly 1"

        import orchestration.runner as runner

        built = MagicMock(
            crew=MagicMock(kickoff=MagicMock(return_value="mocked direct answer")),
            kickoff_callback_state=None,
        )
        original = runner.build_workflow
        runner.build_workflow = lambda *a, **kw: built  # type: ignore[assignment]
        prior_catalog = os.environ.get("AGENTIC_AGENT_PROVIDERS_CATALOG")
        os.environ["AGENTIC_AGENT_PROVIDERS_CATALOG"] = str(catalog)
        try:
            answer = run_direct_agent(
                tool_root=root,
                agent_provider_id="smoke_probe",
                goal="smoke question",
                persist=False,
            )
        finally:
            runner.build_workflow = original  # type: ignore[assignment]
            if prior_catalog is None:
                os.environ.pop("AGENTIC_AGENT_PROVIDERS_CATALOG", None)
            else:
                os.environ["AGENTIC_AGENT_PROVIDERS_CATALOG"] = prior_catalog
        if answer != "mocked direct answer":
            return False, f"direct agent returned {answer!r}"
    return True, "one-task config + mocked kickoff returns the answer"


def check_resident_model_plan() -> tuple[bool, str]:
    from orchestration.hardware_profile import detect_vram_gb_available, plan_resident_models

    entries = [
        {"id": "small", "type": "ollama", "model": "llama3.2:1b", "min_vram_gb": 2},
        {"id": "large", "type": "ollama", "model": "llama3.3:70b", "min_vram_gb": 40},
    ]
    plan = plan_resident_models(entries, vram_gb_available=8.0)
    if plan["selected"] != ["small"] or not plan["skipped"]:
        return False, f"unexpected resident plan: {plan}"
    detected = detect_vram_gb_available()
    return True, f"resident plan packs by VRAM; detected budget={detected}"


def check_app_via_testclient() -> tuple[bool, str]:
    if not _fastapi_installed():
        return True, _SKIPPED + "fastapi not installed (pip install -r requirements-serve.txt)"
    from fastapi.testclient import TestClient

    from orchestration.serve.app import create_app

    with tempfile.TemporaryDirectory(prefix="serve-smoke-app-") as tmp:
        with TestClient(create_app(tool_root_path=Path(tmp))) as client:
            health = client.get("/health").json()
            if not health.get("ok"):
                return False, f"/health not ok: {health}"
            if not client.get("/api/ping").json().get("ok"):
                return False, "/api/ping not ok"
            session = client.get("/api/session").json()
            if session.get("userId") != "local":
                return False, f"/api/session should be the local user: {session}"
            named = client.get("/api/session", headers={"x-user-name": "Ada"}).json()
            if named.get("userId") != "ada":
                return False, f"/api/session ignored the proxy header: {named}"
            if "memory" not in client.get("/api/host-metrics").json():
                return False, "/api/host-metrics payload missing memory"
            with client.websocket_connect("/ws") as ws:
                hello = ws.receive_json()
                if hello.get("type") != "hello":
                    return False, f"first ws frame was {hello}"
                ws.send_json({"type": "ping"})
                if ws.receive_json().get("type") != "pong":
                    return False, "ws ping did not answer pong"
    return True, f"TestClient: /health {health['version']}, /api/session, /ws hello+pong"


def check_kb_rest_roundtrip() -> tuple[bool, str]:
    if not _fastapi_installed():
        return True, _SKIPPED + "fastapi not installed; KB REST needs it"
    from fastapi.testclient import TestClient

    from orchestration.serve.app import create_app

    prior_anon = os.environ.get("AGENTIC_ANONYMIZE_CLOUD")
    os.environ["AGENTIC_ANONYMIZE_CLOUD"] = "0"
    try:
        with tempfile.TemporaryDirectory(prefix="serve-smoke-rest-") as tmp:
            with TestClient(create_app(tool_root_path=Path(tmp))) as client:
                ingest = client.post(
                    "/api/v1/kb/ingest",
                    json={"content": "rest smoke deal note", "dealId": "smoke-deal"},
                ).json()
                if not ingest.get("docId"):
                    return False, f"ingest returned {ingest}"
                hits = client.get(
                    "/api/v1/kb/search", params={"q": "smoke", "dealId": "smoke-deal"}
                ).json()
                if not hits.get("hits"):
                    return False, "search returned no hits after ingest"
                removed = client.request("DELETE", "/api/v1/kb/scope/smoke-deal").json()
                if removed.get("removed") != 1:
                    return False, f"delete-by-scope returned {removed}"
    finally:
        if prior_anon is None:
            os.environ.pop("AGENTIC_ANONYMIZE_CLOUD", None)
        else:
            os.environ["AGENTIC_ANONYMIZE_CLOUD"] = prior_anon
    return True, "REST ingest → search → delete-by-scope round-trips"


def check_module_entry_point() -> tuple[bool, str]:
    proc = subprocess.run(
        [str(_python()), "-m", "orchestration.serve", "--check"],
        cwd=str(_TOOL_ROOT),
        capture_output=True,
        text=True,
    )
    output = (proc.stdout + proc.stderr).strip()
    if not _fastapi_installed():
        if proc.returncode == 2 and "requirements-serve.txt" in output:
            return True, "module entry point fails clearly without the optional extras"
        return False, f"expected an actionable exit 2, got {proc.returncode}: {output[-200:]}"
    if proc.returncode != 0 or "ready" not in output:
        return False, f"python -m orchestration.serve --check failed: {output[-200:]}"
    return True, f"python -m orchestration.serve --check: {output}"


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def run_optional_live_bind() -> tuple[bool, str]:
    if not _truthy("AGENTIC_SMOKE_SERVE_LIVE"):
        return True, _SKIPPED + "live bind (set AGENTIC_SMOKE_SERVE_LIVE=1)"
    if not _fastapi_installed():
        return False, "live bind requested but fastapi is not installed"
    port = _free_port()
    env = {**os.environ, "AGENTIC_SERVE_HOST": "127.0.0.1", "AGENTIC_SERVE_PORT": str(port)}
    proc = subprocess.Popen(
        [str(_python()), "-m", "orchestration.serve"],
        cwd=str(_TOOL_ROOT),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        deadline = time.time() + 45
        while time.time() < deadline:
            if proc.poll() is not None:
                return False, f"daemon exited early: {(proc.stderr.read() or '')[-300:]}"
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=2) as resp:
                    body = json.loads(resp.read().decode("utf-8"))
                if body.get("ok"):
                    return True, f"live daemon on 127.0.0.1:{port} reports version {body['version']}"
                return False, f"/health not ok: {body}"
            except (urllib.error.URLError, OSError, json.JSONDecodeError):
                time.sleep(0.5)
        return False, f"daemon did not answer /health on port {port} within 45s"
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()


def one_round() -> bool:
    print("=== engine API daemon smoke (orchestration.serve) ===")
    checks = [
        ("unit tests", run_unit_tests),
        ("soft imports", check_soft_imports),
        ("serve deps error", check_serve_deps_error_is_actionable),
        ("identity resolution", check_identity_resolution),
        ("host metrics", check_host_metrics_sample),
        ("kb two-tier", check_kb_two_tier),
        ("direct agent offline", check_direct_agent_offline),
        ("resident model plan", check_resident_model_plan),
        ("module entry point", check_module_entry_point),
        ("app via TestClient", check_app_via_testclient),
        ("kb REST round-trip", check_kb_rest_roundtrip),
        ("live bind optional", run_optional_live_bind),
    ]
    all_ok = True
    for name, fn in checks:
        print(f"-- {name}")
        try:
            ok, detail = fn()
        except Exception as exc:  # noqa: BLE001
            ok, detail = False, f"exception: {exc}"
        if ok:
            if detail.startswith(_SKIPPED):
                _skip(detail[len(_SKIPPED):])
            else:
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
