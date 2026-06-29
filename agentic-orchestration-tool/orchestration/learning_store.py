from __future__ import annotations

import json
import os
import hashlib
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any


RUN_RATING_META_PREFIX = "(agentic) run_rating_meta:"


LEARNING_DIR_NAME = "__orchestrator_learning__"


def learning_dir(tool_root: Path) -> Path:
    return (tool_root / LEARNING_DIR_NAME).resolve()


def stats_path(tool_root: Path) -> Path:
    return learning_dir(tool_root) / "stats.json"


def pending_ratings_path(tool_root: Path) -> Path:
    return learning_dir(tool_root) / "pending_ratings.jsonl"


def traces_path(tool_root: Path) -> Path:
    return learning_dir(tool_root) / "traces.jsonl"


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}
    return raw if isinstance(raw, dict) else {}


def _write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def append_trace_event(tool_root: Path, event: dict[str, Any]) -> None:
    """Append a JSONL trace event (best-effort, no exceptions)."""
    try:
        p = traces_path(tool_root)
        p.parent.mkdir(parents=True, exist_ok=True)
        payload = dict(event)
        payload.setdefault("ts", time.time())
        with p.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception:  # noqa: BLE001
        return


@dataclass
class ProviderKey:
    provider_id: str
    mcp_fingerprint: str  # Legacy name; value is combined MCP+skill attachment digest
    task_tag: str

    @property
    def attachment_fingerprint(self) -> str:
        return self.mcp_fingerprint

    def as_key(self) -> str:
        return f"{self.task_tag}::{self.provider_id}::{self.mcp_fingerprint}"


def normalize_attachment_fingerprint(
    value: str | None = None,
    *,
    legacy_mcp_fingerprint: str | None = None,
) -> str:
    """Normalize attachment fingerprint from new or legacy field names."""
    raw = (value or legacy_mcp_fingerprint or "").strip()
    return raw or "none"


def attachment_fingerprint_event_fields(fp: str) -> dict[str, str]:
    """Trace/rating JSON fields (new name + legacy ``mcp_fingerprint`` alias)."""
    normalized = normalize_attachment_fingerprint(fp)
    return {
        "attachment_fingerprint": normalized,
        "mcp_fingerprint": normalized,
    }


def _infer_task_tag(user_prompt: str) -> str:
    s = (user_prompt or "").lower()
    if any(k in s for k in ("home assistant", "hass", "automation", "mqtt")):
        return "home_assistant"
    if any(k in s for k in ("mirrord", "kubernetes", "k8s", "helm")):
        return "devops"
    if any(k in s for k in ("bug", "stack trace", "error:", "traceback", "exception")):
        return "debug"
    if any(k in s for k in ("refactor", "implement", "add feature", "write code", "typescript", "python")):
        return "build"
    if any(k in s for k in ("research", "compare", "best", "what is", "explain")):
        return "research"
    return "general"


def load_stats(tool_root: Path) -> dict[str, Any]:
    return _read_json(stats_path(tool_root))


def save_stats(tool_root: Path, data: dict[str, Any]) -> None:
    _write_json(stats_path(tool_root), data)


def enqueue_user_rating(tool_root: Path, rating_event: dict[str, Any]) -> None:
    """Append user rating (JSONL) so Python can consume later."""
    p = pending_ratings_path(tool_root)
    p.parent.mkdir(parents=True, exist_ok=True)
    payload = dict(rating_event)
    payload.setdefault("ts", time.time())
    with p.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False) + "\n")


def consume_pending_ratings(tool_root: Path, stats: dict[str, Any]) -> dict[str, Any]:
    """
    Merge pending user ratings into stats and clear the pending file.

    Rating event expected shape:
      { session_slug, provider_id, attachment_fingerprint, task_tag, rating: -1|+1 }
      Legacy alias: ``mcp_fingerprint`` (same value as ``attachment_fingerprint``).
    """
    p = pending_ratings_path(tool_root)
    if not p.exists():
        return stats

    lines = p.read_text(encoding="utf-8").splitlines()
    if not lines:
        return stats

    for ln in lines:
        try:
            ev = json.loads(ln)
        except Exception:  # noqa: BLE001
            continue
        if not isinstance(ev, dict):
            continue
        rating = ev.get("rating", 0)
        try:
            rating_i = int(rating)
        except Exception:  # noqa: BLE001
            continue
        if rating_i not in (-1, 1):
            continue
        pk = ProviderKey(
            provider_id=str(ev.get("provider_id", "")).strip() or "unknown",
            mcp_fingerprint=normalize_attachment_fingerprint(
                str(ev.get("attachment_fingerprint", "")).strip() or None,
                legacy_mcp_fingerprint=str(ev.get("mcp_fingerprint", "")).strip() or None,
            ),
            task_tag=str(ev.get("task_tag", "")).strip() or "general",
        )
        key = pk.as_key()
        bucket = stats.setdefault("provider_stats", {}).setdefault(key, {})
        bucket["user_votes"] = int(bucket.get("user_votes", 0)) + 1
        bucket["user_vote_sum"] = int(bucket.get("user_vote_sum", 0)) + rating_i

    # Clear after consumption (best-effort).
    try:
        p.write_text("", encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass
    return stats


def update_provider_score(
    *,
    stats: dict[str, Any],
    provider_id: str,
    user_prompt: str,
    eval_score: float | None,
    attachment_fingerprint: str | None = None,
    mcp_fingerprint: str | None = None,
) -> dict[str, Any]:
    tag = _infer_task_tag(user_prompt)
    fp = normalize_attachment_fingerprint(attachment_fingerprint, legacy_mcp_fingerprint=mcp_fingerprint)
    pk = ProviderKey(
        provider_id=provider_id.strip() or "unknown",
        mcp_fingerprint=fp,
        task_tag=tag,
    )
    key = pk.as_key()
    bucket = stats.setdefault("provider_stats", {}).setdefault(key, {})
    bucket["runs"] = int(bucket.get("runs", 0)) + 1
    if eval_score is not None:
        try:
            s = float(eval_score)
        except Exception:  # noqa: BLE001
            s = None
        if s is not None:
            s = max(0.0, min(1.0, s))
            bucket["eval_count"] = int(bucket.get("eval_count", 0)) + 1
            bucket["eval_sum"] = float(bucket.get("eval_sum", 0.0)) + s
    return stats


def mcp_fingerprint_from_ids(mcp_provider_ids: list[Any] | None) -> str:
    """Stable fingerprint for a list of MCP ids (strings)."""
    return _catalog_ids_fingerprint(mcp_provider_ids)


def skill_fingerprint_from_ids(skill_ids: list[Any] | None) -> str:
    """Stable fingerprint for a list of agent skill catalog ids."""
    return _catalog_ids_fingerprint(skill_ids)


def _catalog_ids_fingerprint(ids: list[Any] | None) -> str:
    raw = sorted({str(x).strip() for x in (ids or []) if str(x).strip()})
    digest = hashlib.sha256(json.dumps(raw, ensure_ascii=False).encode("utf-8")).hexdigest()[:12]
    return digest if raw else "none"


def attachment_fingerprint_from_specs(
    mcp_provider_ids: list[Any] | None,
    skill_ids: list[Any] | None,
) -> str:
    """Stable fingerprint for MCP + skill attachments (learning/KB stat keys)."""
    mcp_fp = mcp_fingerprint_from_ids(mcp_provider_ids)
    skill_fp = skill_fingerprint_from_ids(skill_ids)
    if mcp_fp == "none" and skill_fp == "none":
        return "none"
    if mcp_fp == "none":
        return skill_fp
    if skill_fp == "none":
        return mcp_fp
    return f"{mcp_fp}+{skill_fp}"


def attachment_fingerprint_for_task(task: Any, config: Any) -> str:
    """Fingerprint MCP + skill ids resolved for one task (inherits workflow defaults)."""
    from orchestration.config_loader import raw_mcp_spec_for_task, raw_skill_spec_for_task

    return attachment_fingerprint_from_specs(
        raw_mcp_spec_for_task(task, config),
        raw_skill_spec_for_task(task, config),
    )


def emit_run_rating_meta(config: Any, *, task_index: int = -1) -> None:
    """Emit one stderr JSON line for web UI thumbs up/down (MCP + skill attachment fp)."""
    tasks = getattr(config, "tasks", None) or []
    if not tasks:
        return
    task = tasks[task_index]
    payload = {
        "provider_id": str(getattr(task, "agent_provider_id", "") or "").strip() or "unknown",
        "attachment_fingerprint": attachment_fingerprint_for_task(task, config),
    }
    print(
        f"{RUN_RATING_META_PREFIX}{json.dumps(payload, separators=(',', ':'))}",
        file=sys.stderr,
        flush=True,
    )


def record_harness_result(tool_root: Path, result: Any) -> None:
    """Update rolling harness pass/fail stats per provider (best-effort)."""
    try:
        stats = load_stats(tool_root)
        bucket: dict[str, Any] = stats.setdefault("harness_stats", {})
        if not isinstance(bucket, dict):
            bucket = {}
            stats["harness_stats"] = bucket
        pid = str(getattr(result, "provider_id", "") or "").strip()
        if not pid:
            return
        entry = bucket.get(pid) if isinstance(bucket.get(pid), dict) else {}
        entry = dict(entry)
        entry["last_tier"] = str(getattr(result, "tier", "") or "")
        entry["last_status"] = str(getattr(result, "status", "") or "")
        entry["last_ts"] = str(getattr(result, "timestamp", "") or "")
        entry["last_profile"] = str(getattr(result, "profile", "") or "")
        entry["runs"] = int(entry.get("runs", 0) or 0) + 1
        if getattr(result, "status", None) == "pass":
            entry["passes"] = int(entry.get("passes", 0) or 0) + 1
        elif getattr(result, "status", None) == "fail":
            entry["failures"] = int(entry.get("failures", 0) or 0) + 1
        eval_data = getattr(result, "eval", None)
        if isinstance(eval_data, dict):
            score = eval_data.get("score")
            if isinstance(score, (int, float)):
                entry["eval_count"] = int(entry.get("eval_count", 0) or 0) + 1
                entry["eval_sum"] = float(entry.get("eval_sum", 0.0) or 0.0) + float(score)
        bucket[pid] = entry
        save_stats(tool_root, stats)
    except Exception:  # noqa: BLE001
        return


def record_user_harness_result(tool_root: Path, result: Any) -> None:
    """Update rolling user-harness scenario stats (best-effort)."""
    try:
        stats = load_stats(tool_root)
        bucket: dict[str, Any] = stats.setdefault("user_harness_stats", {})
        if not isinstance(bucket, dict):
            bucket = {}
            stats["user_harness_stats"] = bucket
        pid = str(getattr(result, "agent_provider_id", "") or "").strip()
        sid = str(getattr(result, "scenario_id", "") or "").strip()
        if not pid or not sid or sid == "*":
            return
        key = f"{pid}::{sid}"
        entry = bucket.get(key) if isinstance(bucket.get(key), dict) else {}
        entry = dict(entry)
        entry["last_status"] = str(getattr(result, "status", "") or "")
        entry["last_ts"] = str(getattr(result, "timestamp", "") or "")
        entry["harness_pack"] = str(getattr(result, "harness_pack", "") or "")
        entry["runs"] = int(entry.get("runs", 0) or 0) + 1
        if getattr(result, "status", None) == "pass":
            entry["passes"] = int(entry.get("passes", 0) or 0) + 1
        elif getattr(result, "status", None) == "fail":
            entry["failures"] = int(entry.get("failures", 0) or 0) + 1
        bucket[key] = entry
        save_stats(tool_root, stats)
    except Exception:  # noqa: BLE001
        return


def harness_performance_summary(*, stats: dict[str, Any]) -> str:
    """Planner-facing summary of agents with recent platform harness failures."""
    if os.getenv("AGENTIC_HARNESS_FEED_PLANNER", "1").strip().lower() in ("0", "false", "no", "off"):
        return ""
    bucket: dict[str, Any] = stats.get("harness_stats", {}) if isinstance(stats, dict) else {}
    if not isinstance(bucket, dict) or not bucket:
        return ""
    failing: list[str] = []
    for pid, entry in sorted(bucket.items()):
        if not isinstance(entry, dict):
            continue
        if str(entry.get("last_status", "")) == "fail":
            failing.append(f"- {pid} (tier={entry.get('last_tier', '?')}, profile={entry.get('last_profile', '?')})")
    if not failing:
        return ""
    return (
        "\n\n## Harness health (local)\n"
        "These catalog agents recently failed platform harness probes in this environment; "
        "prefer other providers when plausible.\n"
        + "\n".join(failing[:12])
        + "\n"
    )


def user_harness_performance_summary(*, stats: dict[str, Any]) -> str:
    """Planner-facing summary of user-harness scenario pass rates and recent failures."""
    if os.getenv("AGENTIC_USER_HARNESS_FEED_PLANNER", "1").strip().lower() in ("0", "false", "no", "off"):
        return ""
    bucket: dict[str, Any] = stats.get("user_harness_stats", {}) if isinstance(stats, dict) else {}
    if not isinstance(bucket, dict) or not bucket:
        return ""
    failing: list[str] = []
    weak: list[str] = []
    for key, entry in sorted(bucket.items()):
        if not isinstance(entry, dict):
            continue
        if "::" not in key:
            continue
        pid, sid = key.split("::", 1)
        runs = int(entry.get("runs", 0) or 0)
        if runs <= 0:
            continue
        passes = int(entry.get("passes", 0) or 0)
        rate = passes / runs
        if str(entry.get("last_status", "")) == "fail":
            failing.append(f"- {pid}/{sid} (last fail; {passes}/{runs} pass)")
        elif runs >= 3 and rate < 0.5:
            weak.append(f"- {pid}/{sid} ({passes}/{runs} pass rate)")
    if not failing and not weak:
        return ""
    lines: list[str] = [
        "\n\n## User harness scenarios (local)",
        "Domain scenario packs recently failed or show low pass rates in this environment; "
        "prefer other agents or re-run harness before relying on these ids.",
    ]
    if failing:
        lines.append("Recent failures:")
        lines.extend(failing[:8])
    if weak:
        lines.append("Low pass rate:")
        lines.extend(weak[:8])
    lines.append("")
    return "\n".join(lines)


def planner_performance_summary(
    *,
    stats: dict[str, Any],
    user_prompt: str,
    top_n: int = 6,
) -> str:
    """
    Build a short planner-facing summary of historically good providers for similar task tags.
    """
    tag = _infer_task_tag(user_prompt)
    prov_stats: dict[str, Any] = stats.get("provider_stats", {}) if isinstance(stats, dict) else {}
    rows: list[tuple[float, str]] = []
    for key, bucket in (prov_stats or {}).items():
        if not isinstance(key, str) or not isinstance(bucket, dict):
            continue
        if not key.startswith(tag + "::"):
            continue
        runs = int(bucket.get("runs", 0) or 0)
        if runs <= 0:
            continue
        eval_count = int(bucket.get("eval_count", 0) or 0)
        eval_sum = float(bucket.get("eval_sum", 0.0) or 0.0)
        avg = (eval_sum / eval_count) if eval_count > 0 else 0.0
        user_votes = int(bucket.get("user_votes", 0) or 0)
        user_vote_sum = int(bucket.get("user_vote_sum", 0) or 0)
        user_avg = (user_vote_sum / user_votes) if user_votes > 0 else 0.0  # -1..+1
        # Weighted score: prefer evaluated runs; incorporate user vote signal lightly.
        score = avg + (0.1 * user_avg)
        rows.append((score, f"- {key} (avg_eval={avg:.2f} over {eval_count}, user={user_vote_sum}/{user_votes}, runs={runs})"))
    rows.sort(key=lambda x: x[0], reverse=True)
    if not rows:
        return ""
    top = rows[: max(1, min(20, top_n))]
    return (
        "\n\n## Historical performance (local)\n"
        f"Task tag: {tag!r}. Prefer providers with higher avg_eval/user votes when multiple are plausible.\n"
        + "\n".join(line for _, line in top)
        + "\n"
    )


def learning_enabled() -> bool:
    return os.getenv("AGENTIC_LEARNING", "1").strip().lower() not in ("0", "false", "no", "off")

