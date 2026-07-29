#!/usr/bin/env python3
"""
Jetson / edge smoke: cloud anonymization Tier 1 + Tier 2 + Tier 3.

Runs unit tests, then live checks against the tool tree (and optionally
orchestrate). Designed for recursive runs::

  python3 scripts/smoke_cloud_anonymize.py
  SMOKE_ROUNDS=5 python3 scripts/smoke_cloud_anonymize.py --until-pass
  ./scripts/smoke_cloud_anonymize.sh

Env:
  SMOKE_ROUNDS              max rounds when --until-pass (default 5)
  SMOKE_SKIP_UNIT           1 to skip pytest
  SMOKE_SKIP_LIVE_LOCAL     1 to skip live local-only planner refusal check
  SMOKE_URL                 optional POST /api/v1/orchestrate for PII round-trip
  SMOKE_API_KEY             Bearer for orchestrate
  SMOKE_PROVIDER_ID         default ollama_llama3_2_3b (or first ollama id)
  SMOKE_TIMEOUT_S           default 180
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

_TOOL_ROOT = Path(__file__).resolve().parent.parent
_REPO_ROOT = _TOOL_ROOT.parent


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _ok(msg: str) -> None:
    print(f"  OK  {msg}")


def _fail(msg: str) -> None:
    print(f" FAIL {msg}", file=sys.stderr)


def run_unit_tests() -> tuple[bool, str]:
    if _env("SMOKE_SKIP_UNIT") in ("1", "true", "yes"):
        return True, "unit skipped"
    py = _TOOL_ROOT / ".venv" / "bin" / "python"
    if not py.is_file():
        py = Path(sys.executable)
    cmd = [
        str(py),
        "-m",
        "pytest",
        "tests/test_cloud_anonymize.py",
        "tests/test_cloud_anonymize_planner.py",
        "tests/test_cloud_anonymize_tier3.py",
        "-q",
        "--tb=line",
    ]
    proc = subprocess.run(
        cmd,
        cwd=str(_TOOL_ROOT),
        capture_output=True,
        text=True,
        env={**os.environ, "PYTHONPATH": str(_TOOL_ROOT)},
    )
    out = (proc.stdout or "") + (proc.stderr or "")
    if proc.returncode != 0:
        return False, f"pytest exit {proc.returncode}\n{out[-2000:]}"
    return True, out.strip().splitlines()[-1] if out.strip() else "pytest ok"


def run_module_self_check() -> tuple[bool, str]:
    sys.path.insert(0, str(_TOOL_ROOT))
    os.environ.setdefault("AGENTIC_ANONYMIZE_CLOUD", "1")
    # Tier 1+2 static-placeholder check — Tier 3 reversible tokens are covered separately below.
    os.environ["AGENTIC_ANONYMIZE_REVERSIBLE"] = "0"
    from orchestration.cloud_anonymize import (  # noqa: E402
        clear_custom_anonymize_pattern_cache,
        filter_catalog_to_local_providers,
        load_custom_anonymize_patterns,
        maybe_redact_for_cloud_provider,
        redact_for_cloud,
        user_wants_local_only,
    )

    clear_custom_anonymize_pattern_cache()
    raw = "Contact jane.doe@example.com SSN 123-45-6789 key sk-abcdefghijklmnopqrstuvwxyz012345"
    scrubbed = redact_for_cloud(raw, force=True)
    if "jane.doe@example.com" in scrubbed or "123-45-6789" in scrubbed:
        return False, f"builtin scrub missed PII: {scrubbed!r}"
    if "[EMAIL]" not in scrubbed or "[SSN]" not in scrubbed:
        return False, f"builtin scrub missing placeholders: {scrubbed!r}"

    if maybe_redact_for_cloud_provider("a@b.co", provider_type="ollama") != "a@b.co":
        return False, "ollama path should skip redaction"
    if "[EMAIL]" not in maybe_redact_for_cloud_provider("a@b.co", provider_type="openai"):
        return False, "openai path should redact"

    if not user_wants_local_only("keep this private and run offline"):
        return False, "user_wants_local_only missed privacy/offline cue"
    if user_wants_local_only("summarize private equity trends"):
        return False, "user_wants_local_only false-positive on private equity"

    catalog = [
        {"id": "gpt", "type": "openai"},
        {"id": "local", "type": "ollama"},
    ]
    kept = filter_catalog_to_local_providers(catalog)
    if [e["id"] for e in kept] != ["local"]:
        return False, f"filter_catalog_to_local_providers -> {[e['id'] for e in kept]}"

    # Shipped empty patterns file should load without error.
    load_custom_anonymize_patterns(force_reload=True)
    return True, "module self-check ok"


def run_tier3_self_check() -> tuple[bool, str]:
    sys.path.insert(0, str(_TOOL_ROOT))
    os.environ.setdefault("AGENTIC_ANONYMIZE_CLOUD", "1")
    os.environ["AGENTIC_ANONYMIZE_REVERSIBLE"] = "1"
    os.environ.setdefault("AGENTIC_ANONYMIZE_TOOL_RESULTS", "1")
    from orchestration.cloud_anonymize import (  # noqa: E402
        clear_token_map,
        redact_for_cloud,
        redact_tool_result_for_cloud,
        restore_tokens,
    )
    from orchestration.cloud_anonymize_tier3 import presidio_available  # noqa: E402

    clear_token_map()
    raw = "Contact jane.doe@example.com twice: jane.doe@example.com."
    scrubbed = redact_for_cloud(raw, force=True)
    if "jane.doe@example.com" in scrubbed:
        return False, f"reversible scrub missed PII: {scrubbed!r}"
    if scrubbed.count("[EMAIL:1]") != 2:
        return False, f"reversible scrub should reuse the same token per value: {scrubbed!r}"
    restored = restore_tokens(scrubbed)
    if restored != raw:
        return False, f"restore_tokens did not recover original: {restored!r} != {raw!r}"
    clear_token_map()

    tool_out = redact_tool_result_for_cloud("page mentions secret@corp.example")
    if "secret@corp.example" in tool_out or "[EMAIL" not in tool_out:
        return False, f"redact_tool_result_for_cloud did not scrub: {tool_out!r}"
    clear_token_map()

    ner_note = "NER not installed (optional)"
    if os.getenv("AGENTIC_ANONYMIZE_NER", "0").strip().lower() not in ("0", "false", "no", "off", ""):
        if presidio_available():
            ner_note = "NER installed and initialized"
        else:
            ner_note = "AGENTIC_ANONYMIZE_NER=1 but Presidio unavailable (soft-skip, ok)"

    return True, f"Tier3 self-check ok ({ner_note})"


def run_planner_local_only_enforcement() -> tuple[bool, str]:
    if _env("SMOKE_SKIP_LIVE_LOCAL") in ("1", "true", "yes"):
        return True, "live local-only skipped"
    sys.path.insert(0, str(_TOOL_ROOT))
    os.environ.setdefault("AGENTIC_ANONYMIZE_CLOUD", "1")
    # Tier 1+2 static-placeholder check — Tier 3 reversible tokens are covered separately below.
    os.environ["AGENTIC_ANONYMIZE_REVERSIBLE"] = "0"
    from orchestration.dynamic_planner import workflow_config_from_plan  # noqa: E402
    from orchestration.cloud_anonymize import user_wants_local_only  # noqa: E402

    catalog = [
        {
            "id": "gpt_research",
            "type": "openai",
            "role": "r",
            "goal": "g",
            "backstory": "b",
        },
        {
            "id": "ollama_local",
            "type": "ollama",
            "role": "r",
            "goal": "g",
            "backstory": "b",
            "model": "llama3.2",
        },
    ]
    goal = "keep this private — use ollama only"
    if not user_wants_local_only(goal):
        return False, "local-only cue not detected"
    plan_cloud = {
        "plan_summary": "s",
        "steps": [
            {
                "agent_provider_id": "gpt_research",
                "description": "Do {topic}",
                "expected_output": "done",
            }
        ],
    }
    try:
        workflow_config_from_plan(
            user_prompt=goal,
            plan=plan_cloud,
            catalog_entries=catalog,
            instance_key="smoke-anon",
            max_steps=2,
            quiet=True,
        )
    except ValueError as exc:
        if "Local-only" not in str(exc):
            return False, f"expected Local-only ValueError, got: {exc}"
    else:
        return False, "cloud provider should be rejected for local-only goal"

    plan_local = {
        "plan_summary": "s",
        "steps": [
            {
                "agent_provider_id": "ollama_local",
                "description": "Email secret@corp.example about {topic}",
                "expected_output": "done",
            }
        ],
    }
    cfg = workflow_config_from_plan(
        user_prompt=goal,
        plan=plan_local,
        catalog_entries=catalog,
        instance_key="smoke-anon",
        max_steps=2,
        quiet=True,
    )
    if cfg.tasks[0].agent_provider_id != "ollama_local":
        return False, "ollama step should be allowed"
    # Ollama skips scrub — email remains in description (Tier 1 cloud-only).
    if "secret@corp.example" not in cfg.tasks[0].description:
        return False, "local agent should keep email (no cloud scrub)"

    # Cloud step should scrub even without local-only wording.
    cfg2 = workflow_config_from_plan(
        user_prompt="normal goal",
        plan={
            "plan_summary": "s",
            "steps": [
                {
                    "agent_provider_id": "gpt_research",
                    "description": "Email secret@corp.example about {topic}",
                    "expected_output": "done",
                }
            ],
        },
        catalog_entries=catalog,
        instance_key="smoke-anon2",
        max_steps=2,
        quiet=True,
    )
    if "secret@corp.example" in cfg2.tasks[0].description:
        return False, "cloud step should scrub email in description"
    if "[EMAIL]" not in cfg2.tasks[0].description:
        return False, "cloud step missing [EMAIL] placeholder"
    return True, "planner Tier1+2 enforcement ok"


def _post_orchestrate(url: str, body: dict[str, Any], api_key: str, timeout: float) -> dict[str, Any]:
    data = json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    return json.loads(raw) if raw.strip() else {}


def run_optional_orchestrate_pii() -> tuple[bool, str]:
    url = _env("SMOKE_URL")
    if not url:
        return True, "orchestrate PII check skipped (no SMOKE_URL)"
    api_key = _env("SMOKE_API_KEY")
    provider = _env("SMOKE_PROVIDER_ID", "ollama_llama3_2_3b")
    timeout = float(_env("SMOKE_TIMEOUT_S", "180") or "180")
    # Pin a local provider so the run succeeds; scrub still applies if planner is cloud.
    body = {
        "text": (
            "Reply with exactly one short sentence confirming you received a contact email. "
            "Do not invent other emails. Reference contact: smoke-anon@example.com"
        ),
        "selectedAgentProviderIds": [provider],
        "selectedMcpProviderIds": [],
    }
    try:
        result = _post_orchestrate(url, body, api_key, timeout)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:800]
        return False, f"orchestrate HTTP {exc.code}: {detail}"
    except Exception as exc:  # noqa: BLE001
        return False, f"orchestrate error: {exc}"
    text = json.dumps(result)
    # Soft check: response path should complete; raw key material must not appear.
    if "sk-abcdefghijklmnopqrstuvwxyz" in text:
        return False, "API key pattern leaked into orchestrate response"
    return True, "orchestrate PII round-trip completed"


def one_round() -> bool:
    print("=== cloud anonymize smoke ===")
    checks = [
        ("unit tests", run_unit_tests),
        ("module self-check", run_module_self_check),
        ("planner Tier1+2", run_planner_local_only_enforcement),
        ("Tier3 self-check", run_tier3_self_check),
        ("orchestrate optional", run_optional_orchestrate_pii),
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
    rounds = max(1, int(_env("SMOKE_ROUNDS", "5") or "5"))
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
