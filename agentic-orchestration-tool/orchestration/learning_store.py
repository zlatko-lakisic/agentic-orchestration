from __future__ import annotations

import json
import os
import hashlib
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any


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
    mcp_fingerprint: str
    task_tag: str

    def as_key(self) -> str:
        return f"{self.task_tag}::{self.provider_id}::{self.mcp_fingerprint}"


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
      { session_slug, provider_id, mcp_fingerprint, task_tag, rating: -1|+1 }
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
            mcp_fingerprint=str(ev.get("mcp_fingerprint", "")).strip() or "none",
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
    mcp_fingerprint: str,
    user_prompt: str,
    eval_score: float | None,
) -> dict[str, Any]:
    tag = _infer_task_tag(user_prompt)
    pk = ProviderKey(
        provider_id=provider_id.strip() or "unknown",
        mcp_fingerprint=mcp_fingerprint.strip() or "none",
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
    raw = []
    for x in (mcp_provider_ids or []):
        s = str(x).strip()
        if s:
            raw.append(s)
    raw = sorted(set(raw))
    digest = hashlib.sha256(json.dumps(raw, ensure_ascii=False).encode("utf-8")).hexdigest()[:12]
    return digest if raw else "none"


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

