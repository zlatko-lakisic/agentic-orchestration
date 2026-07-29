from __future__ import annotations

import json
import os
import re
import hashlib
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SESSION_DIR_NAME = "__orchestrator_sessions__"
# When --orchestrator-session and AGENTIC_ORCHESTRATOR_SESSION are unset, dynamic runs still
# persist under __orchestrator_sessions__/<this>.json (override with AGENTIC_ORCHESTRATOR_DEFAULT_SESSION).
DEFAULT_ORCHESTRATOR_SESSION_SLUG = "default"
DEFAULT_SESSION_SLUG_ENV = "AGENTIC_ORCHESTRATOR_DEFAULT_SESSION"


@dataclass
class OrchestratorSessionFile:
    """On-disk state for multi-turn dynamic orchestration (planner LLM + run excerpts)."""

    version: int = 1
    updated_at: str = ""
    instance_key: str | None = None
    planner_history: list[dict[str, str]] = field(default_factory=list)
    last_crew_output_excerpt: str | None = None
    # Answer cache (last finalized response for a given user goal).
    last_user_goal: str | None = None
    last_final_answer_excerpt: str | None = None
    # When we serve a cached answer, we store the goal here so a subsequent "no" can trigger re-run.
    pending_reprocess_goal: str | None = None
    # Last workflow run backend id (``inprocess``, ``subprocess``, ``kubernetes``).
    last_execution_backend: str | None = None

    def to_json_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_json_dict(cls, data: dict[str, Any]) -> OrchestratorSessionFile:
        hist = data.get("planner_history") or []
        if not isinstance(hist, list):
            hist = []
        clean_hist: list[dict[str, str]] = []
        for item in hist:
            if not isinstance(item, dict):
                continue
            role = str(item.get("role", "")).strip()
            content = str(item.get("content", ""))
            if role in ("user", "assistant") and content:
                clean_hist.append({"role": role, "content": content})

        return cls(
            version=int(data.get("version", 1)),
            updated_at=str(data.get("updated_at", "")),
            instance_key=data.get("instance_key"),
            planner_history=clean_hist,
            last_crew_output_excerpt=data.get("last_crew_output_excerpt"),
            last_user_goal=data.get("last_user_goal"),
            last_final_answer_excerpt=data.get("last_final_answer_excerpt"),
            pending_reprocess_goal=data.get("pending_reprocess_goal"),
            last_execution_backend=data.get("last_execution_backend"),
        )


def implicit_default_orchestrator_slug() -> str:
    """Filesystem slug used when no session name is set on the CLI or via AGENTIC_ORCHESTRATOR_SESSION."""
    raw = os.getenv(DEFAULT_SESSION_SLUG_ENV, "").strip()
    if not raw:
        raw = DEFAULT_ORCHESTRATOR_SESSION_SLUG
    return safe_orchestrator_session_slug(raw)


def resolve_orchestrator_session_slug(explicit_name: str) -> str:
    """
    Resolve the session file slug.

    ``explicit_name`` should be the combined CLI / AGENTIC_ORCHESTRATOR_SESSION value
    (possibly empty). When empty, ``implicit_default_orchestrator_slug()`` is used.
    """
    if explicit_name.strip():
        return safe_orchestrator_session_slug(explicit_name)
    return implicit_default_orchestrator_slug()


def safe_orchestrator_session_slug(raw: str) -> str:
    """Filesystem-safe name for session JSON (alphanumeric, dash, underscore)."""
    s = raw.strip().lower()
    if not s:
        raise ValueError("Orchestrator session name must be non-empty.")
    if ".." in s or "/" in s or "\\" in s:
        raise ValueError("Orchestrator session name must not contain path segments.")
    cleaned = re.sub(r"[^a-z0-9._-]+", "-", s, flags=re.I).strip("-._")
    if len(cleaned) > 120:
        cleaned = cleaned[:120].rstrip("-._")
    if not cleaned:
        raise ValueError("Orchestrator session name must contain letters or digits.")
    return cleaned


SESSION_USER_DIR_NAME = "users"
SESSION_USER_NAMESPACE_ENV = "AGENTIC_SESSION_USER_NAMESPACE"


def session_user_namespace_enabled() -> bool:
    """``AGENTIC_SESSION_USER_NAMESPACE=1`` writes sessions under ``users/<user_id>/``."""
    return os.getenv(SESSION_USER_NAMESPACE_ENV, "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def _safe_user_id(user_id: str | None) -> str | None:
    raw = str(user_id or "").strip().lower()
    if not raw:
        return None
    cleaned = re.sub(r"[^a-z0-9._-]+", "-", raw).strip("-._")
    return cleaned[:64].rstrip("-._") or None


def legacy_session_file_path(tool_root: Path, session_slug: str) -> Path:
    """Pre-user-dimension location: ``__orchestrator_sessions__/<slug>.json``."""
    return (tool_root / SESSION_DIR_NAME / f"{session_slug}.json").resolve()


def session_file_path(
    tool_root: Path,
    session_slug: str,
    user_id: str | None = None,
) -> Path:
    """
    Path for a session file.

    Legacy single-user layout stays the default. With ``AGENTIC_SESSION_USER_NAMESPACE=1``
    and a ``user_id``, sessions live under ``__orchestrator_sessions__/users/<user_id>/``;
    an existing legacy file for the same slug still wins so nothing is orphaned.
    """
    safe_user = _safe_user_id(user_id)
    if not safe_user or not session_user_namespace_enabled():
        return legacy_session_file_path(tool_root, session_slug)
    legacy = legacy_session_file_path(tool_root, session_slug)
    if legacy.exists():
        return legacy
    return (
        tool_root / SESSION_DIR_NAME / SESSION_USER_DIR_NAME / safe_user / f"{session_slug}.json"
    ).resolve()


def stable_instance_key_for_session(session_slug: str) -> str:
    digest = hashlib.sha256(session_slug.encode("utf-8")).hexdigest()[:14]
    return f"dynamic-sess-{digest}"


def _legacy_sibling_for(path: Path) -> Path | None:
    """Legacy ``<sessions>/<slug>.json`` for a namespaced ``<sessions>/users/<id>/<slug>.json``."""
    parent = path.parent
    if parent.parent.name != SESSION_USER_DIR_NAME:
        return None
    return parent.parent.parent / path.name


def load_session(path: Path) -> OrchestratorSessionFile:
    if not path.exists():
        # Dual-read: a namespaced session that was never written falls back to the
        # legacy single-user file so enabling the namespace never loses history.
        legacy = _legacy_sibling_for(path)
        if legacy is None or not legacy.exists():
            return OrchestratorSessionFile()
        path = legacy
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        return OrchestratorSessionFile()
    return OrchestratorSessionFile.from_json_dict(raw)


def save_session(path: Path, data: OrchestratorSessionFile) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data.updated_at = datetime.now(timezone.utc).isoformat()
    path.write_text(
        json.dumps(data.to_json_dict(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def trim_planner_history(
    history: list[dict[str, str]],
    *,
    max_turn_pairs: int | None = None,
) -> list[dict[str, str]]:
    """Keep the last N complete user+assistant pairs (2*N messages)."""
    limit = max_turn_pairs
    if limit is None:
        limit = int(os.getenv("AGENTIC_ORCHESTRATOR_MAX_PLANNER_TURNS", "12"))
    limit = max(1, min(64, limit))
    cap = limit * 2
    if len(history) <= cap:
        return list(history)
    trimmed = history[-cap:]
    if trimmed and trimmed[0].get("role") == "assistant":
        trimmed = trimmed[1:]
    return trimmed


def excerpt_max_chars() -> int:
    return int(os.getenv("AGENTIC_ORCHESTRATOR_EXCERPT_CHARS", "15000"))


def update_session_after_crew(
    path: Path,
    result_text: str | None,
    *,
    execution_backend: str | None = None,
) -> None:
    """Store a truncated crew output so the next planner turn can use it as context."""
    from orchestration.cloud_anonymize import maybe_redact_for_cloud_provider

    text = (result_text or "").strip()
    if not text and not execution_backend:
        return
    data = load_session(path)
    if text:
        scrubbed = maybe_redact_for_cloud_provider(text)
        data.last_crew_output_excerpt = scrubbed[: excerpt_max_chars()]
    if execution_backend:
        data.last_execution_backend = execution_backend.strip()
    save_session(path, data)


def update_session_after_final(
    path: Path,
    *,
    user_goal: str,
    result_text: str | None,
    execution_backend: str | None = None,
) -> None:
    """Store the finalized answer for answer caching."""
    from orchestration.cloud_anonymize import maybe_redact_for_cloud_provider

    text = (result_text or "").strip()
    if not text and not execution_backend:
        return
    data = load_session(path)
    if text:
        data.last_user_goal = maybe_redact_for_cloud_provider(str(user_goal or "").strip())
        scrubbed = maybe_redact_for_cloud_provider(text)
        data.last_final_answer_excerpt = scrubbed[: excerpt_max_chars()]
        # Clear any pending "reprocess" marker once we have a new finalized answer.
        data.pending_reprocess_goal = None
    if execution_backend:
        data.last_execution_backend = execution_backend.strip()
    save_session(path, data)
