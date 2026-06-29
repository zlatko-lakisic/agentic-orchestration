from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import yaml

from orchestration.agent_harness import (
    _HARNESS_RUNS_DIR,
    run_assertions,
    run_harness_kickoff,
    write_harness_report,
)
from orchestration.agent_providers_catalog import load_agent_providers_catalog_merged
from orchestration.catalog_credentials import catalog_entry_has_api_credentials, credential_skip_reason
from orchestration.config_loader import TaskDefinition, WorkflowConfig

UserHarnessStatus = Literal["pass", "fail", "skip"]

_EXTRA_USER_HARNESS_DIRS_ENV = "AGENTIC_EXTRA_AGENT_HARNESS_DIRS"


@dataclass
class UserHarnessResult:
    harness_pack: str
    agent_provider_id: str
    scenario_id: str
    status: UserHarnessStatus
    duration_ms: int
    error: str | None = None
    output_excerpt: str | None = None
    assertion_results: list[dict[str, Any]] = field(default_factory=list)
    eval: dict[str, Any] | None = None
    timestamp: str = ""
    kind: str = "user"
    variant_id: str = ""
    backend: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class UserHarnessScenarioRun:
    """One executable scenario instance (base scenario or a matrix variant)."""

    scenario: UserHarnessScenario
    variant_id: str
    inputs: dict[str, Any]

    @property
    def run_id(self) -> str:
        if self.variant_id:
            return f"{self.scenario.id}[{self.variant_id}]"
        return self.scenario.id


@dataclass(frozen=True)
class UserHarnessScenario:
    id: str
    description: str
    expected_output: str
    assertions: tuple[dict[str, Any], ...]
    fixtures: tuple[str, ...]
    mcp_providers: tuple[str, ...]
    optional_eval: dict[str, Any]
    inputs: dict[str, Any]
    path: Path


@dataclass(frozen=True)
class UserHarnessPack:
    agent_provider_id: str
    root_dir: Path
    manifest_path: Path
    defaults: dict[str, Any]
    mcp_providers: tuple[str, ...]
    scenarios: tuple[UserHarnessScenario, ...]


def extra_user_harness_dirs_from_env() -> list[Path]:
    raw = os.getenv(_EXTRA_USER_HARNESS_DIRS_ENV, "").strip()
    if not raw:
        return []
    return [Path(p).expanduser() for p in raw.split(os.pathsep) if p.strip()]


def resolve_user_harness_dirs(
    cli_dirs: list[str] | None,
    *,
    tool_root: Path,
) -> list[Path]:
    out: list[Path] = []
    seen: set[str] = set()
    for part in cli_dirs or []:
        for chunk in str(part).split(os.pathsep):
            chunk = chunk.strip()
            if not chunk:
                continue
            p = Path(chunk).expanduser()
            if not p.is_absolute():
                p = (tool_root / p).resolve()
            key = str(p)
            if key not in seen:
                seen.add(key)
                out.append(p)
    for p in extra_user_harness_dirs_from_env():
        resolved = p.expanduser().resolve()
        key = str(resolved)
        if key not in seen:
            seen.add(key)
            out.append(resolved)
    return out


def _load_manifest(path: Path) -> dict[str, Any]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(raw, dict):
        raise ValueError(f"{path}: harness manifest root must be a mapping")
    return dict(raw)


def _load_scenario(path: Path, *, pack_dir: Path) -> UserHarnessScenario:
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(raw, dict):
        raise ValueError(f"{path}: scenario root must be a mapping")
    sid = str(raw.get("id", path.stem)).strip()
    if not sid:
        raise ValueError(f"{path}: scenario missing id")
    desc = str(raw.get("description", "")).strip()
    if not desc:
        raise ValueError(f"{path}: scenario {sid!r} missing description")
    expected = str(raw.get("expected_output", "Useful output.")).strip()
    assertions_raw = raw.get("assertions") or []
    if not isinstance(assertions_raw, list):
        raise ValueError(f"{path}: assertions must be a list")
    fixtures_raw = raw.get("fixtures") or []
    if not isinstance(fixtures_raw, list):
        raise ValueError(f"{path}: fixtures must be a list")
    mcp_raw = raw.get("mcp_providers") or []
    if not isinstance(mcp_raw, list):
        raise ValueError(f"{path}: mcp_providers must be a list")
    optional_eval = raw.get("optional_eval") if isinstance(raw.get("optional_eval"), dict) else {}
    inputs = raw.get("inputs") if isinstance(raw.get("inputs"), dict) else {}
    return UserHarnessScenario(
        id=sid,
        description=desc,
        expected_output=expected,
        assertions=tuple(dict(x) for x in assertions_raw if isinstance(x, dict)),
        fixtures=tuple(str(x).strip() for x in fixtures_raw if str(x).strip()),
        mcp_providers=tuple(str(x).strip() for x in mcp_raw if str(x).strip()),
        optional_eval=dict(optional_eval),
        inputs=dict(inputs),
        path=path,
    )


def load_user_harness_pack(pack_dir: Path) -> UserHarnessPack | None:
    """Return None if *pack_dir* is not a harness pack (no harness.yaml)."""
    manifest_path = pack_dir / "harness.yaml"
    if not manifest_path.is_file():
        return None
    manifest = _load_manifest(manifest_path)
    agent_id = str(manifest.get("agent_provider_id", pack_dir.name)).strip()
    if not agent_id:
        raise ValueError(f"{manifest_path}: missing agent_provider_id")
    defaults = manifest.get("defaults") if isinstance(manifest.get("defaults"), dict) else {}
    mcp_raw = manifest.get("mcp_providers") or []
    if not isinstance(mcp_raw, list):
        raise ValueError(f"{manifest_path}: mcp_providers must be a list")
    scenarios_dir = pack_dir / "scenarios"
    scenarios: list[UserHarnessScenario] = []
    if scenarios_dir.is_dir():
        paths = sorted(scenarios_dir.glob("*.yaml")) + sorted(scenarios_dir.glob("*.yml"))
        for sp in paths:
            if sp.name.startswith("_"):
                continue
            scenarios.append(_load_scenario(sp, pack_dir=pack_dir))
    if not scenarios:
        raise ValueError(f"{pack_dir}: no scenarios under scenarios/")
    return UserHarnessPack(
        agent_provider_id=agent_id,
        root_dir=pack_dir.resolve(),
        manifest_path=manifest_path,
        defaults=dict(defaults),
        mcp_providers=tuple(str(x).strip() for x in mcp_raw if str(x).strip()),
        scenarios=tuple(scenarios),
    )


def discover_user_harness_packs(harness_roots: list[Path]) -> list[UserHarnessPack]:
    packs: list[UserHarnessPack] = []
    seen_ids: dict[str, str] = {}
    for root in harness_roots:
        if not root.is_dir():
            continue
        for pack_dir in sorted(root.iterdir()):
            if not pack_dir.is_dir() or pack_dir.name.startswith("_"):
                continue
            loaded = load_user_harness_pack(pack_dir)
            if loaded is None:
                continue
            pid = loaded.agent_provider_id
            if pid in seen_ids:
                raise ValueError(
                    f"Duplicate user harness pack for agent {pid!r}: "
                    f"{seen_ids[pid]} and {loaded.root_dir}"
                )
            seen_ids[pid] = str(loaded.root_dir)
            packs.append(loaded)
    return packs


def _scenario_inputs_without_matrix(inputs: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in inputs.items() if k != "matrix"}


def _merge_scenario_inputs(
    pack_defaults: dict[str, Any],
    scenario_inputs: dict[str, Any],
    variant: dict[str, Any] | None = None,
) -> dict[str, Any]:
    merged: dict[str, Any] = dict(pack_defaults)
    merged.update(_scenario_inputs_without_matrix(scenario_inputs))
    if variant:
        merged.update({k: v for k, v in variant.items() if k not in ("label", "id")})
    return merged


def _apply_input_templates(text: str, values: dict[str, Any]) -> str:
    out = text
    for key, val in values.items():
        if key == "matrix" or val is None:
            continue
        if isinstance(val, (str, int, float, bool)):
            out = out.replace("{" + key + "}", str(val))
    return out


def expand_scenario_runs(
    scenario: UserHarnessScenario,
    *,
    pack_defaults: dict[str, Any],
) -> list[UserHarnessScenarioRun]:
    matrix = scenario.inputs.get("matrix")
    if not isinstance(matrix, list) or not matrix:
        return [
            UserHarnessScenarioRun(
                scenario=scenario,
                variant_id="",
                inputs=_merge_scenario_inputs(pack_defaults, scenario.inputs),
            )
        ]
    runs: list[UserHarnessScenarioRun] = []
    for idx, row in enumerate(matrix):
        if not isinstance(row, dict):
            continue
        label = str(row.get("label") or row.get("id") or f"variant_{idx + 1}").strip()
        if not label:
            label = f"variant_{idx + 1}"
        runs.append(
            UserHarnessScenarioRun(
                scenario=scenario,
                variant_id=label,
                inputs=_merge_scenario_inputs(pack_defaults, scenario.inputs, row),
            )
        )
    if not runs:
        return [
            UserHarnessScenarioRun(
                scenario=scenario,
                variant_id="",
                inputs=_merge_scenario_inputs(pack_defaults, scenario.inputs),
            )
        ]
    return runs


def _effective_scenario_text(
    scenario: UserHarnessScenario,
    *,
    inputs: dict[str, Any],
    field_name: str,
    append_field: str,
) -> str:
    override = str(inputs.get(field_name, "")).strip()
    if override:
        base = override
    elif field_name == "description":
        base = scenario.description
    else:
        base = scenario.expected_output
    if not override:
        append = str(inputs.get(append_field, "")).strip()
        if append:
            base = base.rstrip() + "\n\n" + append
    return _apply_input_templates(base, inputs)


def _read_fixture_text(pack_dir: Path, rel: str) -> str:
    candidate = (pack_dir / rel).resolve()
    if not candidate.is_file():
        raise FileNotFoundError(f"fixture not found: {rel} (resolved {candidate})")
    return candidate.read_text(encoding="utf-8").strip()


def _description_with_fixtures(
    base_dir: Path,
    description: str,
    fixtures: tuple[str, ...],
) -> str:
    if not fixtures:
        return description
    blocks = [description.rstrip()]
    for rel in fixtures:
        text = _read_fixture_text(base_dir, rel)
        blocks.append(f"## Attached context ({rel})\n{text}")
    return "\n\n".join(blocks)


def _load_rubric_text(pack_dir: Path, scenario: UserHarnessScenario) -> str:
    rubric_file = str(scenario.optional_eval.get("rubric_file", "")).strip()
    if rubric_file:
        path = (scenario.path.parent / rubric_file).resolve()
        if path.is_file():
            return path.read_text(encoding="utf-8").strip()
    rubric_inline = str(scenario.optional_eval.get("rubric", "")).strip()
    return rubric_inline


def _workflow_for_scenario(
    entry: dict[str, Any],
    pack: UserHarnessPack,
    run: UserHarnessScenarioRun,
) -> WorkflowConfig:
    scenario = run.scenario
    inputs = run.inputs
    topic = str(inputs.get("topic") or "User harness")
    description = _description_with_fixtures(
        scenario.path.parent,
        _effective_scenario_text(
            scenario,
            inputs=inputs,
            field_name="description",
            append_field="description_append",
        ),
        scenario.fixtures,
    )
    expected = _effective_scenario_text(
        scenario,
        inputs=inputs,
        field_name="expected_output",
        append_field="expected_output_append",
    )
    mcp_ids = list(scenario.mcp_providers or pack.mcp_providers)
    pid = str(entry["id"])
    task_id = f"scenario_{scenario.id}"
    if run.variant_id:
        safe_variant = run.variant_id.replace(" ", "_")
        task_id = f"{task_id}_{safe_variant}"
    return WorkflowConfig(
        name=f"user-harness-{pid}-{run.run_id}",
        process="sequential",
        topic=topic,
        instance_key=f"user-harness-{pid}",
        agent_providers=[dict(entry)],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id=task_id,
                agent_provider_id=pid,
                description=description,
                expected_output=expected,
                mcp_providers=mcp_ids if mcp_ids else [],
            )
        ],
        task_sequence=[task_id],
    )


def _run_scenario_eval(
    *,
    user_goal: str,
    output_text: str,
    rubric: str,
    model: str | None = None,
) -> dict[str, Any]:
    if os.getenv("AGENTIC_HARNESS_EVAL", "1").strip().lower() in ("0", "false", "no", "off"):
        return {"score": None, "verdict": "disabled", "skipped": True}
    from orchestration.dynamic_planner import evaluate_run_quality

    goal = user_goal
    if rubric:
        goal = f"{user_goal}\n\nRubric:\n{rubric}"
    eval_model = model or os.getenv("AGENTIC_HARNESS_EVAL_MODEL", "").strip() or None
    return evaluate_run_quality(user_goal=goal, output_text=output_text, model=eval_model)


def run_user_scenario(
    *,
    pack: UserHarnessPack,
    run: UserHarnessScenarioRun,
    entry: dict[str, Any],
    tool_root: Path,
    backend: str | None = None,
    quiet: bool = True,
    mcp_catalog_path: Path | None = None,
) -> UserHarnessResult:
    import time

    scenario = run.scenario
    started = time.perf_counter()
    ts = datetime.now(timezone.utc).isoformat()
    pid = pack.agent_provider_id
    scenario_id = run.run_id

    if not catalog_entry_has_api_credentials(entry):
        return UserHarnessResult(
            harness_pack=pack.root_dir.name,
            agent_provider_id=pid,
            scenario_id=scenario_id,
            status="skip",
            duration_ms=int((time.perf_counter() - started) * 1000),
            error=credential_skip_reason(entry),
            timestamp=ts,
            variant_id=run.variant_id,
        )

    exec_backend = (
        backend
        or str(run.inputs.get("execution_backend", "")).strip()
        or str(pack.defaults.get("execution_backend", "")).strip()
        or os.getenv("AGENTIC_EXECUTION_BACKEND", "inprocess")
    ).strip() or "inprocess"

    try:
        config = _workflow_for_scenario(entry, pack, run)
        text, err = run_harness_kickoff(
            config,
            backend=exec_backend,
            quiet=quiet,
            mcp_catalog_path=mcp_catalog_path,
        )
        if err:
            return UserHarnessResult(
                harness_pack=pack.root_dir.name,
                agent_provider_id=pid,
                scenario_id=scenario_id,
                status="fail",
                duration_ms=int((time.perf_counter() - started) * 1000),
                error=err,
                timestamp=ts,
                variant_id=run.variant_id,
                backend=exec_backend,
            )
        ok, assertion_results = run_assertions(text or "", list(scenario.assertions))
        eval_data = None
        if scenario.optional_eval:
            rubric = _load_rubric_text(pack.root_dir, scenario)
            eval_goal = _effective_scenario_text(
                scenario,
                inputs=run.inputs,
                field_name="description",
                append_field="description_append",
            )
            eval_data = _run_scenario_eval(
                user_goal=eval_goal,
                output_text=text or "",
                rubric=rubric,
            )
            min_score = float(scenario.optional_eval.get("min_score", 0.0) or 0.0)
            score = eval_data.get("score")
            if min_score > 0 and isinstance(score, (int, float)) and float(score) < min_score:
                ok = False
        status: UserHarnessStatus = "pass" if ok else "fail"
        result = UserHarnessResult(
            harness_pack=pack.root_dir.name,
            agent_provider_id=pid,
            scenario_id=scenario_id,
            status=status,
            duration_ms=int((time.perf_counter() - started) * 1000),
            error=None if ok else "assertion or eval failed",
            output_excerpt=(text or "")[:2000] if text else None,
            assertion_results=assertion_results,
            eval=eval_data,
            timestamp=ts,
            variant_id=run.variant_id,
            backend=exec_backend,
        )
        _maybe_record_user_harness_stats(tool_root, result)
        return result
    except Exception as exc:  # noqa: BLE001
        return UserHarnessResult(
            harness_pack=pack.root_dir.name,
            agent_provider_id=pid,
            scenario_id=scenario_id,
            status="fail",
            duration_ms=int((time.perf_counter() - started) * 1000),
            error=str(exc),
            timestamp=ts,
            variant_id=run.variant_id,
            backend=exec_backend,
        )


def _maybe_record_user_harness_stats(tool_root: Path, result: UserHarnessResult) -> None:
    if os.getenv("AGENTIC_USER_HARNESS_RECORD_STATS", "1").strip().lower() in ("0", "false", "no", "off"):
        return
    try:
        from orchestration.learning_store import record_user_harness_result

        record_user_harness_result(tool_root, result)
    except Exception:  # noqa: BLE001
        return


def run_user_harness_packs(
    packs: list[UserHarnessPack],
    *,
    catalog_entries: dict[str, dict[str, Any]],
    tool_root: Path,
    agent_filter: str | None = None,
    backend: str | None = None,
    quiet: bool = True,
    fail_fast: bool = False,
    mcp_catalog_path: Path | None = None,
) -> list[UserHarnessResult]:
    results: list[UserHarnessResult] = []
    for pack in packs:
        if agent_filter and pack.agent_provider_id != agent_filter:
            continue
        entry = catalog_entries.get(pack.agent_provider_id)
        if entry is None:
            results.append(
                UserHarnessResult(
                    harness_pack=pack.root_dir.name,
                    agent_provider_id=pack.agent_provider_id,
                    scenario_id="*",
                    status="fail",
                    duration_ms=0,
                    error=f"agent_provider_id not in merged catalog: {pack.agent_provider_id!r}",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )
            )
            if fail_fast:
                break
            continue
        for scenario in pack.scenarios:
            for run in expand_scenario_runs(scenario, pack_defaults=pack.defaults):
                result = run_user_scenario(
                    pack=pack,
                    run=run,
                    entry=entry,
                    tool_root=tool_root,
                    backend=backend,
                    quiet=quiet,
                    mcp_catalog_path=mcp_catalog_path,
                )
                results.append(result)
                if fail_fast and result.status == "fail":
                    return results
    return results


def write_user_harness_report(tool_root: Path, results: list[UserHarnessResult]) -> Path:
    out_dir = tool_root / _HARNESS_RUNS_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    batch_path = out_dir / f"user_batch_{stamp}.json"
    payload = {
        "kind": "user",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "count": len(results),
        "passed": sum(1 for r in results if r.status == "pass"),
        "failed": sum(1 for r in results if r.status == "fail"),
        "skipped": sum(1 for r in results if r.status == "skip"),
        "results": [r.to_dict() for r in results],
    }
    batch_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return batch_path


def run_user_harness_cli(args: Any, tool_root: Path) -> int:
    harness_dirs = resolve_user_harness_dirs(getattr(args, "harness_dir", None), tool_root=tool_root)
    if not harness_dirs:
        print(
            f"error: user harness requires --harness-dir and/or {_EXTRA_USER_HARNESS_DIRS_ENV}",
            file=sys.stderr,
        )
        return 2

    try:
        packs = discover_user_harness_packs(harness_dirs)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if not packs:
        print(f"error: no harness packs found under {harness_dirs!r}", file=sys.stderr)
        return 2

    catalog_path = Path(getattr(args, "agent_providers_catalog", "config/agent_providers"))
    if not catalog_path.is_absolute():
        catalog_path = (tool_root / catalog_path).resolve()
    mcp_catalog = getattr(args, "mcp_providers_catalog", "config/mcp_providers")
    mcp_catalog_path = Path(mcp_catalog)
    if not mcp_catalog_path.is_absolute():
        mcp_catalog_path = (tool_root / mcp_catalog).resolve()

    entries_list = load_agent_providers_catalog_merged(catalog_path)
    catalog_entries = {str(e.get("id", "")): e for e in entries_list if str(e.get("id", ""))}

    single = getattr(args, "harness_agent", None)
    run_all = bool(getattr(args, "user_harness_run_all", False))
    if not single and not run_all:
        print("error: specify --harness-agent ID or --user-harness-run-all", file=sys.stderr)
        return 2

    agent_filter = str(single).strip() if single else None
    if agent_filter and not run_all:
        if not any(p.agent_provider_id == agent_filter for p in packs):
            print(
                f"error: no user harness pack for agent {agent_filter!r} under {harness_dirs!r}",
                file=sys.stderr,
            )
            return 2

    backend = getattr(args, "harness_backend", None)
    quiet = not bool(getattr(args, "harness_verbose", False))
    fail_fast = bool(getattr(args, "harness_fail_fast", False))
    as_json = bool(getattr(args, "harness_json", False))

    results = run_user_harness_packs(
        packs,
        catalog_entries=catalog_entries,
        tool_root=tool_root,
        agent_filter=agent_filter if not run_all else None,
        backend=str(backend).strip() if backend else None,
        quiet=quiet,
        fail_fast=fail_fast,
        mcp_catalog_path=mcp_catalog_path if mcp_catalog_path.is_dir() else None,
    )

    report_path = write_user_harness_report(tool_root, results)
    if as_json:
        print(json.dumps({"report_path": str(report_path), "results": [r.to_dict() for r in results]}, indent=2))
    else:
        for r in results:
            mark = {"pass": "OK", "fail": "FAIL", "skip": "SKIP"}[r.status]
            line = (
                f"[{mark}] {r.agent_provider_id}/{r.scenario_id} "
                f"pack={r.harness_pack} ({r.duration_ms}ms)"
            )
            if r.error:
                line += f" — {r.error}"
            print(line, file=sys.stderr if r.status == "fail" else sys.stdout)
        print(f"(user-harness) report: {report_path}", file=sys.stderr)

    if any(r.status == "fail" for r in results):
        return 1
    return 0
