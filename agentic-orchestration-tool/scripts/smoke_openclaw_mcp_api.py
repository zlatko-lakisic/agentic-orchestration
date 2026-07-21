#!/usr/bin/env python3
"""
Jetson / edge smoke: OpenClaw MCP tools exposed to AO via synced catalog.

Hits AO ``POST /api/v1/orchestrate`` with prompts that should exercise
``openclaw_filesystem`` (and optionally bridge). Designed for recursive runs
on the Jetson until green::

  python3 scripts/smoke_openclaw_mcp_api.py
  SMOKE_ROUNDS=5 python3 scripts/smoke_openclaw_mcp_api.py --until-pass
  ./scripts/smoke_openclaw_mcp.sh

Env:
  SMOKE_URL          default http://127.0.0.1:30487/api/v1/orchestrate
  SMOKE_API_KEY      optional Bearer (or from k8s secret via shell wrapper)
  SMOKE_PROVIDER_ID  default ollama_llama3_2_3b
  SMOKE_TIMEOUT_S    default 300
  SMOKE_WORKSPACE    default ~/.openclaw/workspace
  SMOKE_ROUNDS       max rounds when --until-pass (default 3)
  SMOKE_CASES        path to cases JSON (default next to this script)
  SMOKE_INCLUDE_BRIDGE  1 to run bridge cases (skip by default on k8s)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

_TOOL_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_CASES = Path(__file__).resolve().parent / "smoke_openclaw_mcp_cases.json"

# Also strip pip/venv install noise that can leak into orchestrate stdout on cold pods.
_INSTALL_NOISE_RE = re.compile(
    r"(?im)^(Requirement already satisfied:|Collecting |Downloading |Installing collected|Successfully installed).*$"
)
_TOOL_LEAK_RE = re.compile(
    r'(?is)("name"\s*:\s*"[^"]+"\s*,\s*"parameters")|'
    r"(npx_y_modelcontextprotocol)|"
    r"(don'?t use past results)|"
    r"(do not use past results)",
)


def _strip_install_noise(text: str) -> str:
    lines = []
    for line in str(text or "").splitlines():
        if _INSTALL_NOISE_RE.match(line.strip()):
            continue
        if re.match(r"^\s*—+", line) and "MB/s" in line:
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _workspace() -> Path:
    raw = _env("SMOKE_WORKSPACE")
    if raw:
        return Path(raw).expanduser()
    return (Path.home() / ".openclaw" / "workspace").expanduser()


def _ensure_smoke_marker(workspace: Path) -> str:
    workspace.mkdir(parents=True, exist_ok=True)
    marker = workspace / "AO_MCP_SMOKE.txt"
    content = "AO_MCP_SMOKE_OK hello-from-workspace"
    if marker.is_file():
        try:
            existing = marker.read_text(encoding="utf-8", errors="replace")
            if "AO_MCP_SMOKE_OK" in existing:
                return existing.strip().splitlines()[0].strip() or content
        except OSError:
            pass
    try:
        marker.write_text(content + "\n", encoding="utf-8")
        return content
    except OSError as exc:
        if marker.is_file():
            try:
                return marker.read_text(encoding="utf-8", errors="replace").strip().splitlines()[0]
            except OSError:
                pass
        print(f"WARN cannot write smoke marker {marker}: {exc}", file=sys.stderr)
        return content


def _ensure_agents_md(workspace: Path) -> str:
    """Guarantee AGENTS.md has stable content for read smokes (pods may have emptied it)."""
    path = workspace / "AGENTS.md"
    body = "# AGENTS.md\nJetson OpenClaw workspace.\n"
    try:
        existing = path.read_text(encoding="utf-8", errors="replace") if path.is_file() else ""
    except OSError:
        existing = ""
    if "Jetson OpenClaw workspace" in existing or "# AGENTS.md" in existing:
        return existing
    try:
        path.write_text(body, encoding="utf-8")
        return body
    except OSError as exc:
        print(f"WARN cannot write AGENTS.md {path}: {exc}", file=sys.stderr)
        return existing or body


def _load_cases(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    cases = data.get("cases") if isinstance(data, dict) else data
    if not isinstance(cases, list) or not cases:
        raise SystemExit(f"no cases in {path}")
    return [c for c in cases if isinstance(c, dict)]


def _post_orchestrate(
    url: str,
    *,
    text: str,
    api_key: str,
    provider_id: str,
    timeout_s: float,
    session_id: str,
) -> tuple[int, dict[str, Any], str]:
    body = {
        "text": text,
        "sessionId": session_id,
        "resetSession": True,
        "runMode": "dynamic",
        "verboseCrew": False,
        "selectedAgentProviderIds": [provider_id],
    }
    raw_body = json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    req = urllib.request.Request(url, data=raw_body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            payload = resp.read().decode("utf-8", errors="replace")
            status = int(resp.status)
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode("utf-8", errors="replace")
        status = int(exc.code)
    except Exception as exc:  # noqa: BLE001
        return 0, {}, f"request failed: {exc}"

    try:
        data = json.loads(payload) if payload else {}
    except json.JSONDecodeError:
        return status, {}, f"non-json response: {payload[:800]}"
    if not isinstance(data, dict):
        return status, {}, f"unexpected json type: {type(data)}"
    return status, data, ""


def _ping(base_url: str, timeout_s: float = 10.0) -> bool:
    # http://host:30487/api/v1/orchestrate → http://host:30487/api/ping
    root = re.sub(r"/api/v1/orchestrate/?$", "", base_url.rstrip("/"))
    ping = f"{root}/api/ping"
    try:
        with urllib.request.urlopen(ping, timeout=timeout_s) as resp:
            return resp.status == 200
    except Exception:
        return False


def _bridge_reachable(url: str = "http://127.0.0.1:3848") -> bool:
    try:
        with urllib.request.urlopen(url.rstrip("/") + "/", timeout=2) as resp:
            return True
    except Exception:
        # many bridges return 404 on /; connection refused is the real skip signal
        try:
            req = urllib.request.Request(url.rstrip("/") + "/invoke", method="POST")
            urllib.request.urlopen(req, timeout=2)
        except urllib.error.HTTPError:
            return True
        except Exception:
            return False
    return False


def _render_text(template: str, *, workspace: Path, marker_content: str) -> str:
    return (
        str(template)
        .replace("{workspace}", str(workspace))
        .replace("{marker_file}", str(workspace / "AO_MCP_SMOKE.txt"))
        .replace("{marker_content}", marker_content)
    )


def _render_prompt(template: str, *, workspace: Path, marker_content: str) -> str:
    return _render_text(template, workspace=workspace, marker_content=marker_content)


def _render_needles(value: Any, *, workspace: Path, marker_content: str) -> Any:
    if isinstance(value, str):
        return _render_text(value, workspace=workspace, marker_content=marker_content)
    if isinstance(value, list):
        return [
            _render_needles(v, workspace=workspace, marker_content=marker_content)
            for v in value
        ]
    return value


def _eval_case(
    case: dict[str, Any],
    *,
    output: str,
    status: int,
    data: dict[str, Any],
    transport_err: str,
    workspace: Path,
    marker_content: str,
) -> tuple[bool, list[str]]:
    failures: list[str] = []
    if transport_err:
        return False, [transport_err]
    if status != 200:
        failures.append(f"http_status={status} body={json.dumps(data)[:400]}")
    if data.get("ok") is not True:
        failures.append(f"ok!=true error={data.get('error')!r}")
    text = _strip_install_noise(str(data.get("output") or output or ""))
    if not text.strip():
        failures.append("empty output")

    if case.get("forbid_tool_leak", True) and _TOOL_LEAK_RE.search(text):
        failures.append("tool-call / meta leak in output")

    for needle in _render_needles(case.get("expect_all") or [], workspace=workspace, marker_content=marker_content):
        n = str(needle)
        if n.startswith("re:"):
            if not re.search(n[3:], text, re.I | re.M):
                failures.append(f"missing regex {n[3:]!r}")
        elif n not in text:
            failures.append(f"missing {n!r}")

    for needle in case.get("expect_any") or []:
        options = needle if isinstance(needle, list) else [needle]
        options = _render_needles(options, workspace=workspace, marker_content=marker_content)
        if not any(str(o) in text for o in options):
            failures.append(f"missing any of {options!r}")

    for needle in _render_needles(case.get("forbid_any") or [], workspace=workspace, marker_content=marker_content):
        if str(needle).lower() in text.lower():
            failures.append(f"forbidden {needle!r} present")

    min_paths = int(case.get("min_absolute_paths") or 0)
    if min_paths > 0:
        paths = re.findall(r"(?m)^(/[^\s]+)$", text)
        if len(paths) < min_paths:
            failures.append(f"absolute_paths={len(paths)} < {min_paths}")

    return (not failures), failures


def run_round(
    *,
    url: str,
    api_key: str,
    provider_id: str,
    timeout_s: float,
    cases: list[dict[str, Any]],
    include_bridge: bool,
    workspace: Path,
    marker_content: str,
) -> tuple[int, int]:
    passed = failed = 0
    for case in cases:
        cid = str(case.get("id") or "case")
        tags = {str(t) for t in (case.get("tags") or [])}
        if "bridge" in tags and not include_bridge and not case.get("skip_orchestrate"):
            print(f"SKIP {cid} (bridge; set SMOKE_INCLUDE_BRIDGE=1)")
            continue
        if case.get("requires_bridge") and not _bridge_reachable(
            str(case.get("bridge_url") or "http://127.0.0.1:3848")
        ):
            print(f"SKIP {cid} (bridge not reachable on host)")
            continue

        if case.get("skip_orchestrate") and str(case.get("prompt")) == "__bridge_health__":
            ok = _bridge_reachable(str(case.get("bridge_url") or "http://127.0.0.1:3848"))
            print(f"{'PASS' if ok else 'FAIL'} {cid} (bridge control plane)")
            if ok:
                passed += 1
            else:
                failed += 1
            continue

        prompt = _render_prompt(
            str(case.get("prompt") or ""),
            workspace=workspace,
            marker_content=marker_content,
        )
        if not prompt.strip():
            print(f"FAIL {cid}: empty prompt")
            failed += 1
            continue

        session_id = f"smoke-openclaw-{cid}-{int(time.time())}"
        print(f"RUN  {cid} …", flush=True)
        t0 = time.time()
        status, data, err = _post_orchestrate(
            url,
            text=prompt,
            api_key=api_key,
            provider_id=provider_id,
            timeout_s=timeout_s,
            session_id=session_id,
        )
        elapsed = time.time() - t0
        output = str(data.get("output") or "")
        ok, failures = _eval_case(
            case,
            output=output,
            status=status,
            data=data,
            transport_err=err,
            workspace=workspace,
            marker_content=marker_content,
        )
        preview = output.strip().replace("\n", "\\n")
        if len(preview) > 240:
            preview = preview[:240] + "…"
        if ok:
            print(f"PASS {cid} ({elapsed:.1f}s) :: {preview}")
            passed += 1
        else:
            print(f"FAIL {cid} ({elapsed:.1f}s) :: {'; '.join(failures)}")
            print(f"     output={preview}")
            failed += 1
    return passed, failed


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--url",
        default=_env("SMOKE_URL", "http://127.0.0.1:30487/api/v1/orchestrate"),
    )
    ap.add_argument("--cases", default=_env("SMOKE_CASES", str(_DEFAULT_CASES)))
    ap.add_argument("--until-pass", action="store_true")
    ap.add_argument("--rounds", type=int, default=int(_env("SMOKE_ROUNDS") or "3"))
    ap.add_argument(
        "--include-bridge",
        action="store_true",
        default=_env("SMOKE_INCLUDE_BRIDGE") in ("1", "true", "yes"),
    )
    ap.add_argument("--only", default="", help="comma-separated case ids")
    args = ap.parse_args(argv)

    url = str(args.url).strip()
    api_key = _env("SMOKE_API_KEY")
    provider_id = _env("SMOKE_PROVIDER_ID", "ollama_llama3_2_3b")
    timeout_s = float(_env("SMOKE_TIMEOUT_S") or "300")
    workspace = _workspace()
    marker_content = _ensure_smoke_marker(workspace)
    _ensure_agents_md(workspace)

    if not _ping(url):
        print(f"FAIL ping for base derived from {url}", file=sys.stderr)
        return 2

    cases = _load_cases(Path(args.cases))
    only = {x.strip() for x in str(args.only).split(",") if x.strip()}
    if only:
        cases = [c for c in cases if str(c.get("id")) in only]
        if not cases:
            print(f"FAIL no cases matched --only {only}", file=sys.stderr)
            return 2

    rounds = max(1, int(args.rounds if args.until_pass else 1))
    last_failed = 0
    for round_i in range(1, rounds + 1):
        print(f"=== round {round_i}/{rounds} url={url} workspace={workspace} ===")
        _passed, failed = run_round(
            url=url,
            api_key=api_key,
            provider_id=provider_id,
            timeout_s=timeout_s,
            cases=cases,
            include_bridge=bool(args.include_bridge),
            workspace=workspace,
            marker_content=marker_content,
        )
        last_failed = failed
        if failed == 0:
            print("ALL PASS")
            return 0
        if not args.until_pass:
            break
        print(f"round {round_i} had {failed} failure(s); retrying…")
        time.sleep(2)

    print(f"FAILED cases remaining={last_failed}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
