from __future__ import annotations

import fnmatch
import json
import os
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import yaml

from agent_providers.factory import agent_provider_from_dict
from orchestration.agent_providers_catalog import load_agent_providers_catalog_merged
from orchestration.catalog_credentials import catalog_entry_has_api_credentials, credential_skip_reason
from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.output_artifacts import workflow_result_to_extractable_text

HarnessTier = Literal["static", "connectivity", "smoke", "capability"]
HarnessStatus = Literal["pass", "fail", "skip"]

_DEFAULT_HARNESS_PROFILES_DIR = "config/agent_harnesses"
_HARNESS_RUNS_DIR = "harness_runs"


@dataclass
class HarnessResult:
    provider_id: str
    tier: str
    status: HarnessStatus
    profile: str
    duration_ms: int
    error: str | None = None
    output_excerpt: str | None = None
    assertion_results: list[dict[str, Any]] = field(default_factory=list)
    eval: dict[str, Any] | None = None
    timestamp: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class HarnessProfileLoader:
    def __init__(self, profiles_dir: Path) -> None:
        self.profiles_dir = profiles_dir
        self._cache: dict[str, dict[str, Any]] | None = None

    def _load_all(self) -> dict[str, dict[str, Any]]:
        if self._cache is not None:
            return self._cache
        out: dict[str, dict[str, Any]] = {}
        if not self.profiles_dir.is_dir():
            self._cache = out
            return out
        for path in sorted(self.profiles_dir.glob("*.yaml")) + sorted(self.profiles_dir.glob("*.yml")):
            if path.name.startswith("_"):
                continue
            raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
            if not isinstance(raw, dict):
                continue
            pid = str(raw.get("id", path.stem)).strip()
            if pid:
                out[pid] = dict(raw)
        self._cache = out
        return out

    def get(self, profile_id: str) -> dict[str, Any] | None:
        return self._load_all().get(profile_id)


def infer_harness_profile(entry: dict[str, Any]) -> str:
    explicit = str(entry.get("harness_profile", "")).strip()
    if explicit:
        return explicit

    pid = str(entry.get("id", "")).lower()
    role = str(entry.get("role", "")).lower()
    combined = f"{pid} {role}"

    if any(k in combined for k in ("vision", "vlm", "visual")):
        return "vision"
    if "coder" in pid or "code" in role or "starcoder" in pid or "devstral" in pid:
        return "coding"
    if "research" in role or "analyst" in role and "engineer" not in role:
        return "research"
    if "writer" in role or "writing" in role:
        return "write"
    if "engineer" in role or "reason" in pid or "architect" in role:
        return "reason"
    if any(k in pid for k in ("garden", "agri", "logistics", "healthcare", "hc_", "lg_")):
        return "domain"
    if entry.get("general_purpose"):
        return "general"
    return "general"


def _harness_block(entry: dict[str, Any]) -> dict[str, Any]:
    raw = entry.get("harness")
    return dict(raw) if isinstance(raw, dict) else {}


def should_skip_live(entry: dict[str, Any], *, tier: HarnessTier) -> str | None:
    if tier in ("static", "connectivity"):
        return None
    block = _harness_block(entry)
    if block.get("skip_live") is True:
        return "harness.skip_live is true"
    if not catalog_entry_has_api_credentials(entry):
        return credential_skip_reason(entry)
    return None


def filter_providers_by_glob(entries: list[dict[str, Any]], pattern: str | None) -> list[dict[str, Any]]:
    if not pattern or not str(pattern).strip():
        return list(entries)
    pat = str(pattern).strip()
    return [e for e in entries if fnmatch.fnmatch(str(e.get("id", "")), pat)]


def _default_model() -> str:
    return (
        os.getenv("OPENAI_MODEL_NAME", "").strip()
        or os.getenv("AGENTIC_PLANNER_MODEL", "").strip()
        or "gpt-4o-mini"
    )


def run_assertions(text: str, assertions: list[Any]) -> tuple[bool, list[dict[str, Any]]]:
    """Run deterministic harness assertions on output text."""
    return _run_assertions(text, assertions)


def _run_assertions(text: str, assertions: list[Any]) -> tuple[bool, list[dict[str, Any]]]:
    results: list[dict[str, Any]] = []
    ok = True
    stripped = (text or "").strip()
    for i, raw in enumerate(assertions or []):
        if not isinstance(raw, dict):
            results.append({"index": i, "type": "unknown", "pass": False, "detail": "not a mapping"})
            ok = False
            continue
        typ = str(raw.get("type", "")).strip().lower()
        name = typ or f"assertion_{i}"
        passed = False
        detail = ""

        if typ == "min_chars":
            need = int(raw.get("value", 0))
            passed = len(stripped) >= need
            detail = f"len={len(stripped)} need>={need}"
        elif typ == "max_chars":
            limit = int(raw.get("value", 0))
            passed = len(stripped) <= limit
            detail = f"len={len(stripped)} need<={limit}"
        elif typ == "bullet_count":
            need = int(raw.get("min", 1))
            bullets = len(re.findall(r"(?m)^\s*[-*•]\s+", stripped))
            passed = bullets >= need
            detail = f"bullets={bullets} need>={need}"
        elif typ == "contains_any":
            values = raw.get("values") or []
            lowered = stripped.lower()
            passed = any(str(v).lower() in lowered for v in values)
            detail = f"checked {len(values)} substrings"
        elif typ == "regex":
            pattern = str(raw.get("pattern", ""))
            passed = bool(re.search(pattern, stripped, re.MULTILINE | re.IGNORECASE))
            detail = f"pattern={pattern!r}"
        elif typ == "forbids_regex":
            pattern = str(raw.get("pattern", ""))
            passed = not bool(re.search(pattern, stripped, re.MULTILINE | re.IGNORECASE))
            detail = f"forbidden pattern={pattern!r}"
        elif typ == "json_parse":
            try:
                json.loads(stripped)
                passed = True
                detail = "valid JSON"
            except json.JSONDecodeError as exc:
                passed = False
                detail = str(exc)
        else:
            detail = f"unsupported assertion type {typ!r}"
            passed = False

        results.append({"name": name, "pass": passed, "detail": detail})
        if not passed:
            ok = False
    return ok, results


def _smoke_task_from_profile(
    entry: dict[str, Any],
    profile: dict[str, Any],
) -> tuple[str, str, str]:
    block = _harness_block(entry)
    override = block.get("smoke_override") if isinstance(block.get("smoke_override"), dict) else {}
    smoke = profile.get("smoke") if isinstance(profile.get("smoke"), dict) else {}
    topic = str(override.get("topic") or smoke.get("topic") or "Harness smoke")
    description = str(override.get("description") or smoke.get("description") or "").strip()
    expected = str(override.get("expected_output") or smoke.get("expected_output") or "Useful output.")
    if not description:
        description = "Reply with a short helpful answer."
    return topic, description, expected


def _workflow_config_for_harness(
    entry: dict[str, Any],
    *,
    topic: str,
    description: str,
    expected_output: str,
) -> WorkflowConfig:
    pid = str(entry["id"])
    return WorkflowConfig(
        name=f"harness-{pid}",
        process="sequential",
        topic=topic,
        instance_key=f"harness-{pid}",
        agent_providers=[dict(entry)],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id="harness_smoke",
                agent_provider_id=pid,
                description=description,
                expected_output=expected_output,
            )
        ],
        task_sequence=["harness_smoke"],
    )


def run_harness_kickoff(
    config: WorkflowConfig,
    *,
    backend: str,
    quiet: bool,
    mcp_catalog_path: Path | None = None,
) -> tuple[str | None, str | None]:
    return _run_smoke_kickoff(
        config,
        backend=backend,
        quiet=quiet,
        mcp_catalog_path=mcp_catalog_path,
    )


def _run_smoke_kickoff(
    config: WorkflowConfig,
    *,
    backend: str,
    quiet: bool,
    mcp_catalog_path: Path | None = None,
) -> tuple[str | None, str | None]:
    if backend == "subprocess":
        from orchestration.backends.base import RunOptions
        from orchestration.backends.subprocess_runner import run_config_via_subprocess

        result = run_config_via_subprocess(
            config,
            options=RunOptions(quiet=quiet),
        )
        if result.exit_code != 0:
            return None, result.error or f"subprocess exit {result.exit_code}"
        return (result.result_text or "").strip() or None, None

    from orchestration.runner import build_workflow, crew_kickoff_context

    built = build_workflow(
        config,
        crew_verbose=False,
        quiet=quiet,
        emit_progress_lines=False,
        mcp_catalog_path=mcp_catalog_path,
    )
    with crew_kickoff_context(built):
        workflow_result = built.crew.kickoff(inputs={"topic": config.topic})
    text = workflow_result_to_extractable_text(workflow_result)
    return (text or "").strip() or None, None


def _tier_static(entry: dict[str, Any], *, default_model: str) -> None:
    agent_provider_from_dict(entry, default_model=default_model)


def _tier_connectivity(entry: dict[str, Any], *, default_model: str) -> None:
    ap = agent_provider_from_dict(entry, default_model=default_model)
    ap.validate_config()
    block = _harness_block(entry)
    skip_init = block.get("skip_connectivity_initialize") is True
    selfcontained = bool(entry.get("selfcontained"))
    env_skip = os.getenv("AGENTIC_HARNESS_SKIP_SELFCONTAINED_INIT", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )
    custom = ap.run_harness_probe("connectivity", {"entry": entry})
    if custom is not None:
        if custom.status == "fail":
            raise RuntimeError(custom.error or "custom harness probe failed")
        if custom.status == "skip":
            raise _HarnessSkip(custom.error or "skipped by provider probe")
        return
    if not (skip_init or (selfcontained and env_skip)):
        ap.initialize()
    ap.health_check()


class _HarnessSkip(Exception):
    def __init__(self, reason: str) -> None:
        self.reason = reason
        super().__init__(reason)


def run_harness(
    entry: dict[str, Any],
    *,
    tier: HarnessTier,
    profile_loader: HarnessProfileLoader,
    tool_root: Path,
    profile_override: str | None = None,
    backend: str | None = None,
    quiet: bool = True,
    default_model: str | None = None,
) -> HarnessResult:
    started = time.perf_counter()
    pid = str(entry.get("id", "")).strip()
    profile_id = profile_override or infer_harness_profile(entry)
    profile = profile_loader.get(profile_id) or profile_loader.get("general") or {}
    ts = datetime.now(timezone.utc).isoformat()
    dm = default_model or _default_model()
    exec_backend = (backend or os.getenv("AGENTIC_EXECUTION_BACKEND", "inprocess")).strip() or "inprocess"

    skip_reason = should_skip_live(entry, tier=tier)
    if skip_reason and tier in ("smoke", "capability"):
        return HarnessResult(
            provider_id=pid,
            tier=tier,
            status="skip",
            profile=profile_id,
            duration_ms=int((time.perf_counter() - started) * 1000),
            error=skip_reason,
            timestamp=ts,
        )

    try:
        if tier == "static":
            _tier_static(entry, default_model=dm)
            status: HarnessStatus = "pass"
            error = None
            output = None
            assertions: list[dict[str, Any]] = []
            eval_data = None
        elif tier == "connectivity":
            try:
                _tier_connectivity(entry, default_model=dm)
                status = "pass"
                error = None
            except _HarnessSkip as exc:
                return HarnessResult(
                    provider_id=pid,
                    tier=tier,
                    status="skip",
                    profile=profile_id,
                    duration_ms=int((time.perf_counter() - started) * 1000),
                    error=exc.reason,
                    timestamp=ts,
                )
            output = None
            assertions = []
            eval_data = None
        elif tier in ("smoke", "capability"):
            topic, description, expected = _smoke_task_from_profile(entry, profile)
            config = _workflow_config_for_harness(
                entry,
                topic=topic,
                description=description,
                expected_output=expected,
            )
            custom = agent_provider_from_dict(entry, default_model=dm).run_harness_probe(
                tier,
                {"entry": entry, "profile": profile},
            )
            if custom is not None and custom.status in ("pass", "fail", "skip"):
                custom.duration_ms = int((time.perf_counter() - started) * 1000)
                custom.timestamp = ts
                custom.profile = profile_id
                return custom
            text, kickoff_err = _run_smoke_kickoff(
                config,
                backend=exec_backend,
                quiet=quiet,
            )
            if kickoff_err:
                return HarnessResult(
                    provider_id=pid,
                    tier=tier,
                    status="fail",
                    profile=profile_id,
                    duration_ms=int((time.perf_counter() - started) * 1000),
                    error=kickoff_err,
                    timestamp=ts,
                )
            raw_assertions = profile.get("assertions") if isinstance(profile.get("assertions"), list) else []
            ok, assertions = _run_assertions(text or "", raw_assertions)
            eval_data = None
            if tier == "capability" and ok:
                eval_data = _run_capability_eval(
                    entry=entry,
                    profile=profile,
                    user_goal=description,
                    output_text=text or "",
                )
                cap = profile.get("capability") if isinstance(profile.get("capability"), dict) else {}
                min_score = float(cap.get("min_score", 0.5))
                score = eval_data.get("score")
                if isinstance(score, (int, float)) and float(score) < min_score:
                    ok = False
            status = "pass" if ok else "fail"
            error = None if ok else "assertion or capability eval failed"
            output = (text or "")[:2000] if text else None
        else:
            raise ValueError(f"unsupported harness tier {tier!r}")

        result = HarnessResult(
            provider_id=pid,
            tier=tier,
            status=status,
            profile=profile_id,
            duration_ms=int((time.perf_counter() - started) * 1000),
            error=error,
            output_excerpt=output,
            assertion_results=assertions,
            eval=eval_data,
            timestamp=ts,
        )
        _maybe_record_harness_stats(tool_root, result)
        return result
    except Exception as exc:  # noqa: BLE001
        return HarnessResult(
            provider_id=pid,
            tier=tier,
            status="fail",
            profile=profile_id,
            duration_ms=int((time.perf_counter() - started) * 1000),
            error=str(exc),
            timestamp=ts,
        )


def _run_capability_eval(
    *,
    entry: dict[str, Any],
    profile: dict[str, Any],
    user_goal: str,
    output_text: str,
) -> dict[str, Any]:
    if os.getenv("AGENTIC_HARNESS_EVAL", "1").strip().lower() in ("0", "false", "no", "off"):
        return {"score": None, "verdict": "disabled", "skipped": True}
    from orchestration.dynamic_planner import evaluate_run_quality

    cap = profile.get("capability") if isinstance(profile.get("capability"), dict) else {}
    rubric = str(cap.get("rubric", "")).strip()
    goal = user_goal
    if rubric:
        goal = f"{user_goal}\n\nRubric:\n{rubric}"
    model = os.getenv("AGENTIC_HARNESS_EVAL_MODEL", "").strip() or None
    return evaluate_run_quality(user_goal=goal, output_text=output_text, model=model)


def _maybe_record_harness_stats(tool_root: Path, result: HarnessResult) -> None:
    if os.getenv("AGENTIC_HARNESS_RECORD_STATS", "1").strip().lower() in ("0", "false", "no", "off"):
        return
    try:
        from orchestration.learning_store import record_harness_result

        record_harness_result(tool_root, result)
    except Exception:  # noqa: BLE001
        return


def write_harness_report(tool_root: Path, results: list[HarnessResult]) -> Path:
    out_dir = tool_root / _HARNESS_RUNS_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    batch_path = out_dir / f"batch_{stamp}.json"
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "count": len(results),
        "passed": sum(1 for r in results if r.status == "pass"),
        "failed": sum(1 for r in results if r.status == "fail"),
        "skipped": sum(1 for r in results if r.status == "skip"),
        "results": [r.to_dict() for r in results],
    }
    batch_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    for r in results:
        agent_dir = out_dir / r.provider_id
        agent_dir.mkdir(parents=True, exist_ok=True)
        (agent_dir / f"{stamp}_{r.tier}.json").write_text(
            json.dumps(r.to_dict(), indent=2),
            encoding="utf-8",
        )
    return batch_path


def run_harness_batch(
    entries: list[dict[str, Any]],
    *,
    tier: HarnessTier,
    profile_loader: HarnessProfileLoader,
    tool_root: Path,
    profile_override: str | None = None,
    backend: str | None = None,
    quiet: bool = True,
    max_agents: int | None = None,
    fail_fast: bool = False,
) -> list[HarnessResult]:
    results: list[HarnessResult] = []
    limited = entries[: max_agents if max_agents and max_agents > 0 else None]
    for entry in limited:
        result = run_harness(
            entry,
            tier=tier,
            profile_loader=profile_loader,
            tool_root=tool_root,
            profile_override=profile_override,
            backend=backend,
            quiet=quiet,
        )
        results.append(result)
        if fail_fast and result.status == "fail":
            break
    return results


def resolve_harness_tier(raw: str | None) -> HarnessTier:
    val = (raw or os.getenv("AGENTIC_HARNESS_TIER", "static")).strip().lower()
    aliases = {
        "l0": "static",
        "l1": "connectivity",
        "l2": "smoke",
        "l3": "capability",
        "static": "static",
        "connectivity": "connectivity",
        "smoke": "smoke",
        "capability": "capability",
    }
    if val not in aliases:
        raise ValueError(f"unsupported harness tier {raw!r}; use static|connectivity|smoke|capability")
    return aliases[val]  # type: ignore[return-value]


def run_harness_cli(args: Any, tool_root: Path) -> int:
    harness_dir_arg = getattr(args, "harness_dir", None)
    user_run_all = bool(getattr(args, "user_harness_run_all", False))
    single_agent = str(getattr(args, "harness_agent", "") or "").strip()
    use_user = user_run_all or bool(harness_dir_arg)
    if not use_user and not getattr(args, "harness_batch", False):
        from orchestration.user_agent_harness import discover_user_harness_packs, resolve_user_harness_dirs

        resolved = resolve_user_harness_dirs(harness_dir_arg, tool_root=tool_root)
        if resolved and single_agent:
            try:
                packs = discover_user_harness_packs(resolved)
            except ValueError as exc:
                print(f"error: {exc}", file=sys.stderr)
                return 2
            if any(p.agent_provider_id == single_agent for p in packs):
                use_user = True
        elif resolved and user_run_all:
            use_user = True
    if use_user:
        from orchestration.user_agent_harness import run_user_harness_cli

        return run_user_harness_cli(args, tool_root)

    tier = resolve_harness_tier(getattr(args, "harness_tier", None))
    catalog_path = Path(getattr(args, "agent_providers_catalog", "config/agent_providers"))
    if not catalog_path.is_absolute():
        catalog_path = (tool_root / catalog_path).resolve()
    profiles_dir = tool_root / _DEFAULT_HARNESS_PROFILES_DIR
    profile_loader = HarnessProfileLoader(profiles_dir)

    entries = load_agent_providers_catalog_merged(catalog_path)
    filt = getattr(args, "harness_filter", None)
    if filt:
        entries = filter_providers_by_glob(entries, str(filt))

    single = getattr(args, "harness_agent", None)
    if single:
        sid = str(single).strip()
        entries = [e for e in entries if str(e.get("id", "")) == sid]
        if not entries:
            print(f"error: agent provider id not found in catalog: {sid!r}", file=sys.stderr)
            return 2

    if not getattr(args, "harness_batch", False) and not single:
        print("error: specify --harness-agent ID or --harness-batch", file=sys.stderr)
        return 2

    max_agents = getattr(args, "harness_max_agents", None)
    fail_fast = bool(getattr(args, "harness_fail_fast", False))
    profile_override = getattr(args, "harness_profile", None)
    if profile_override is not None:
        profile_override = str(profile_override).strip() or None
    backend = getattr(args, "harness_backend", None)
    quiet = not bool(getattr(args, "harness_verbose", False))
    as_json = bool(getattr(args, "harness_json", False))

    results = run_harness_batch(
        entries,
        tier=tier,
        profile_loader=profile_loader,
        tool_root=tool_root,
        profile_override=profile_override,
        backend=str(backend).strip() if backend else None,
        quiet=quiet,
        max_agents=int(max_agents) if max_agents else None,
        fail_fast=fail_fast,
    )

    report_path = write_harness_report(tool_root, results)
    if as_json:
        print(json.dumps({"report_path": str(report_path), "results": [r.to_dict() for r in results]}, indent=2))
    else:
        for r in results:
            mark = {"pass": "OK", "fail": "FAIL", "skip": "SKIP"}[r.status]
            line = f"[{mark}] {r.provider_id} tier={r.tier} profile={r.profile} ({r.duration_ms}ms)"
            if r.error:
                line += f" — {r.error}"
            print(line, file=sys.stderr if r.status == "fail" else sys.stdout)
        print(f"(harness) report: {report_path}", file=sys.stderr)

    if any(r.status == "fail" for r in results):
        return 1
    return 0
