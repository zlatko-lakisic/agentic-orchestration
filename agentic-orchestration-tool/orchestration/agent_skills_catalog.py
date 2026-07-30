from __future__ import annotations

import copy
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

import yaml

from orchestration.mcp_providers_catalog import substitute_mcp_env_vars as substitute_env_vars

_EXTRA_SKILLS_PATH_ENV = "AGENTIC_EXTRA_AGENT_SKILLS_PATH"
_SKIP_STEMS = frozenset({"readme", "index"})
_SKILL_MD_FRONTMATTER_RE = re.compile(r"\A---\s*\r?\n.*?\r?\n---\s*(?:\r?\n)?", re.DOTALL)


def _load_skills_bundle_file(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        raw: dict[str, Any] = yaml.safe_load(f) or {}

    entries = raw.get("agent_skills")
    if not isinstance(entries, list) or not entries:
        raise ValueError(
            f"'agent_skills' must be a non-empty list in bundle catalog {path}",
        )
    out: list[dict[str, Any]] = []
    for i, item in enumerate(entries):
        if not isinstance(item, dict):
            raise ValueError(f"{path}: agent_skills[{i}] must be a mapping")
        pid = str(item.get("id", "")).strip()
        if not pid:
            raise ValueError(f"{path}: agent_skills[{i}] is missing non-empty 'id'")
        entry = dict(item)
        entry["_source_path"] = str(path.resolve())
        out.append(entry)
    return out


def _load_skill_fragment_file(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        raw: Any = yaml.safe_load(f)
    if not isinstance(raw, dict):
        raise ValueError(f"{path}: root must be a mapping (one skill per file)")
    pid = str(raw.get("id", "")).strip()
    if not pid:
        raise ValueError(f"{path}: missing non-empty 'id' at file root")
    entry = dict(raw)
    entry["_source_path"] = str(path.resolve())
    return entry


def _skill_yaml_paths_in_dir(catalog_path: Path) -> list[Path]:
    paths = sorted(catalog_path.glob("*.yaml")) + sorted(catalog_path.glob("*.yml"))
    for sub in sorted(catalog_path.iterdir()):
        if not sub.is_dir() or sub.name.startswith("_"):
            continue
        paths.extend(sorted(sub.glob("*.yaml")))
        paths.extend(sorted(sub.glob("*.yml")))
    out: list[Path] = []
    for path in paths:
        if path.name.startswith("_"):
            continue
        if path.stem.lower() in _SKIP_STEMS:
            continue
        out.append(path)
    return out


def load_agent_skills_catalog(catalog_path: Path) -> list[dict[str, Any]]:
    """Load skill templates from a directory (one ``*.yaml`` per entry) or a bundle file."""
    if not catalog_path.exists():
        return []

    if catalog_path.is_dir():
        return [_load_skill_fragment_file(path) for path in _skill_yaml_paths_in_dir(catalog_path)]

    return _load_skills_bundle_file(catalog_path)


def load_agent_skills_catalog_merged(primary: Path) -> list[dict[str, Any]]:
    """Load the primary catalog plus optional extra directories from env."""
    out = load_agent_skills_catalog(primary)
    extra_raw = os.getenv(_EXTRA_SKILLS_PATH_ENV, "").strip()
    if extra_raw:
        sep = ";" if os.name == "nt" else ":"
        for part in extra_raw.split(sep):
            p = Path(part.strip()).expanduser()
            if not str(p) or not p.exists():
                continue
            out.extend(load_agent_skills_catalog(p))

    out = _assert_unique_skill_ids(out)
    from orchestration.session_overlay import merge_session_skills

    return merge_session_skills(out)


def _assert_unique_skill_ids(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ids = [str(p.get("id", "")).strip() for p in entries]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate agent skill 'id' across skill catalog files")
    return entries


def _resolve_required_file_path(entry: dict[str, Any], file_ref: str) -> Path:
    rel = str(file_ref).strip()
    path = Path(rel).expanduser()
    if path.is_absolute():
        return path
    source = Path(str(entry.get("_source_path", ""))).resolve().parent
    return (source / path).resolve()


def skill_entry_has_required_files(entry: dict[str, Any]) -> bool:
    """True when every path in ``required_files`` exists on disk."""
    raw = entry.get("required_files")
    if not isinstance(raw, list) or not raw:
        return True
    for item in raw:
        rel = str(item).strip()
        if not rel:
            continue
        if not _resolve_required_file_path(entry, rel).is_file():
            return False
    return True


def skill_files_skip_reason(entry: dict[str, Any]) -> str:
    raw = entry.get("required_files")
    if isinstance(raw, list) and raw:
        paths = [str(x).strip() for x in raw if str(x).strip()]
        if paths:
            return "present files: " + ", ".join(paths)
    return "present required files"


def skill_entry_has_credentials(entry: dict[str, Any]) -> bool:
    """True when required env vars for this skill entry are satisfied."""
    raw_all = entry.get("required_env")
    if isinstance(raw_all, list) and raw_all:
        for k in raw_all:
            key = str(k).strip()
            if not key:
                continue
            if not os.getenv(key, "").strip():
                return False

    raw_any = entry.get("required_env_any")
    if isinstance(raw_any, list) and raw_any:
        keys = [str(k).strip() for k in raw_any if str(k).strip()]
        if keys and not any(os.getenv(k, "").strip() for k in keys):
            return False

    return True


def skill_credential_skip_reason(entry: dict[str, Any]) -> str:
    raw_all = entry.get("required_env")
    raw_any = entry.get("required_env_any")
    if isinstance(raw_all, list) and raw_all:
        keys = [str(k).strip() for k in raw_all if str(k).strip()]
        if keys:
            return "set " + " + ".join(keys)
    if isinstance(raw_any, list) and raw_any:
        keys = [str(k).strip() for k in raw_any if str(k).strip()]
        if keys:
            return "set one of [" + ", ".join(keys) + "]"
    return "set required env vars"


def filter_skill_entries_by_credentials(
    entries: list[dict[str, Any]],
    *,
    verbose: bool,
    log_prefix: str = "",
) -> tuple[list[dict[str, Any]], list[str]]:
    kept: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    prefix = f"{log_prefix}: " if log_prefix else ""

    for entry in entries:
        if not skill_entry_has_credentials(entry):
            skipped.append(entry)
            continue
        if not skill_entry_has_required_files(entry):
            skipped.append(entry)
            continue
        kept.append(entry)

    skipped_ids = [str(e.get("id", "")).strip() or "(missing id)" for e in skipped]
    if verbose and skipped:
        for entry in skipped:
            pid = str(entry.get("id", "")).strip() or "(missing id)"
            if not skill_entry_has_credentials(entry):
                hint = skill_credential_skip_reason(entry)
                print(
                    f"{prefix}skipping agent skill {pid!r}: missing credentials; {hint}.",
                    file=sys.stderr,
                )
            elif not skill_entry_has_required_files(entry):
                hint = skill_files_skip_reason(entry)
                print(
                    f"{prefix}skipping agent skill {pid!r}: missing required files; {hint}.",
                    file=sys.stderr,
                )
    return kept, skipped_ids


def skills_list_fingerprint(skill_ids: list[str]) -> tuple[str, ...]:
    return tuple(sorted({str(x).strip() for x in skill_ids if str(x).strip()}))


def resolve_workflow_skill_refs(
    raw_ids: list[str],
    catalog_entries: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Resolve workflow skill id strings into catalog entries (order preserved, deduped)."""
    if not raw_ids:
        return []

    catalog_by_id = {str(p["id"]).strip(): p for p in catalog_entries}
    resolved: list[dict[str, Any]] = []
    seen: set[str] = set()

    for i, item in enumerate(raw_ids):
        pid = str(item).strip()
        if not pid:
            continue
        if pid not in catalog_by_id:
            known = ", ".join(sorted(catalog_by_id))
            raise ValueError(
                f"workflow.skills[{i}] unknown catalog id {pid!r}. Known: {known}",
            )
        if pid in seen:
            continue
        seen.add(pid)
        resolved.append(catalog_by_id[pid])

    return resolved


def _inject_config(entry: dict[str, Any]) -> dict[str, Any]:
    raw = entry.get("inject")
    return raw if isinstance(raw, dict) else {}


def _per_entry_max_chars(entry: dict[str, Any]) -> int | None:
    inject = _inject_config(entry)
    raw = inject.get("max_chars")
    if raw is None:
        return None
    try:
        return max(100, int(raw))
    except (TypeError, ValueError):
        return None


def _read_skill_file_text(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    if path.name.upper() == "SKILL.MD" or path.suffix.lower() in {".md", ".markdown"}:
        text = _SKILL_MD_FRONTMATTER_RE.sub("", text, count=1)
    return text.strip()


def resolve_skill_content(entry: dict[str, Any]) -> str:
    """Load inline or file-backed skill body for one catalog entry."""
    content = entry.get("content")
    if not isinstance(content, dict):
        raise ValueError(f"skill {entry.get('id', '?')!r}: missing 'content' mapping")

    body = content.get("body")
    if body is not None:
        text = substitute_env_vars(str(body))
    else:
        file_rel = str(content.get("file", "")).strip()
        if not file_rel:
            raise ValueError(
                f"skill {entry.get('id', '?')!r}: content.file or content.body is required",
            )
        source = Path(str(entry.get("_source_path", ""))).resolve().parent
        path = (source / file_rel).resolve()
        if not path.is_file():
            raise FileNotFoundError(f"skill {entry.get('id', '?')!r}: content file not found: {path}")
        text = substitute_env_vars(_read_skill_file_text(path))

    cap = _per_entry_max_chars(entry)
    if cap is not None and len(text) > cap:
        text = text[: cap - 1] + "…"
    return text.strip()


def skill_inject_heading(entry: dict[str, Any]) -> str:
    inject = _inject_config(entry)
    heading = str(inject.get("heading", "")).strip()
    if heading:
        return heading
    sid = str(entry.get("id", "")).strip() or "skill"
    return f"## {sid} (skill)"


def skill_inject_target(entry: dict[str, Any]) -> str:
    """Return ``task_description``, ``backstory``, or ``both``."""
    inject = _inject_config(entry)
    target = str(inject.get("target", "task_description")).strip().lower().replace("-", "_")
    if target in {"backstory", "agent_backstory"}:
        return "backstory"
    if target in {"both", "task_description_and_backstory"}:
        return "both"
    return "task_description"


def partition_skill_entries(
    entries: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Split catalog entries by ``inject.target`` for task vs backstory injection."""
    task_entries: list[dict[str, Any]] = []
    backstory_entries: list[dict[str, Any]] = []
    for entry in entries:
        target = skill_inject_target(entry)
        if target in {"task_description", "both"}:
            task_entries.append(entry)
        if target in {"backstory", "both"}:
            backstory_entries.append(entry)
    return task_entries, backstory_entries


def resolve_skill_blocks(entries: list[dict[str, Any]]) -> list[tuple[str, str]]:
    return [(skill_inject_heading(e), resolve_skill_content(e)) for e in entries]


def _planner_summary_for_entry(p: dict[str, Any]) -> str:
    content = p.get("content")
    if isinstance(content, dict):
        summary = str(content.get("summary", "")).strip()
        if summary:
            return summary
    return str(p.get("description", "")).strip()


def _format_skill_catalog_entry(p: dict[str, Any]) -> str:
    pid = str(p.get("id", "")).strip()
    desc = _planner_summary_for_entry(p)
    hint = str(p.get("planner_hint", "")).strip()
    caps = str(p.get("capabilities", "")).strip()
    good_for = str(p.get("good_for", "")).strip()
    parts = [f"- id: {pid!r}"]
    if desc:
        parts.append(f"  description: {desc!r}")
    if caps:
        parts.append(f"  capabilities: {caps!r}")
    if good_for:
        parts.append(f"  good_for: {good_for!r}")
    if hint:
        parts.append(f"  planner_hint: {hint!r}")
    return "\n".join(parts)


def skills_catalog_for_planner_prompt(entries: list[dict[str, Any]]) -> str:
    if not entries:
        return ""
    ordered = sorted(entries, key=lambda p: str(p.get("id", "")).strip().lower())
    return "### Agent skills (procedural instructions)\n" + "\n".join(
        _format_skill_catalog_entry(p) for p in ordered
    )


def deepcopy_skill_catalog_entry(entry: dict[str, Any]) -> dict[str, Any]:
    return copy.deepcopy(entry)


_SKILL_GOAL_MATCH_BLOCKLIST = frozenset({
    "assistant",
    "service",
    "catalog",
    "context",
    "optional",
    "default",
    "instructions",
    "skill",
    "workflow",
})


def _terms_from_skill_catalog_entry(entry: dict[str, Any]) -> set[str]:
    out: set[str] = set()
    eid = str(entry.get("id", "")).strip().lower()
    if eid:
        out.add(eid)
        out.add(eid.replace("_", " "))
        for p in eid.split("_"):
            if len(p) >= 5 and p not in _SKILL_GOAL_MATCH_BLOCKLIST:
                out.add(p)
    for key in ("user_goal_keywords", "match_keywords"):
        raw = entry.get(key)
        if isinstance(raw, list):
            for x in raw:
                s = str(x).strip().lower()
                if s:
                    out.add(s)
    hint = str(entry.get("planner_hint", "")).lower()
    for w in re.findall(r"[a-z][a-z0-9-]{5,}", hint):
        if w not in _SKILL_GOAL_MATCH_BLOCKLIST:
            out.add(w)
    return out


def suggest_skill_ids_from_user_goal(
    user_text: str,
    entries: list[dict[str, Any]],
) -> list[str]:
    u = user_text.strip().lower()
    if not u:
        return []

    def _is_wordish_match(term: str) -> bool:
        t = term.strip().lower()
        if not t or len(t) <= 4:
            return False
        if " " in t:
            return t in u
        return re.search(rf"\b{re.escape(t)}\b", u) is not None

    scored: list[tuple[int, str]] = []
    for e in entries:
        eid = str(e.get("id", "")).strip()
        if not eid:
            continue
        terms = _terms_from_skill_catalog_entry(e)
        hits = sum(1 for term in terms if _is_wordish_match(term))
        if hits > 0:
            scored.append((hits, eid))

    scored.sort(key=lambda t: (-t[0], t[1].lower()))
    out: list[str] = []
    seen: set[str] = set()
    for _hits, eid in scored:
        if eid not in seen:
            seen.add(eid)
            out.append(eid)
    return out


def run_attachment_fingerprint(
    mcp_provider_ids: list[Any] | None,
    skill_ids: list[Any] | None,
) -> str:
    from orchestration.learning_store import attachment_fingerprint_from_specs

    return attachment_fingerprint_from_specs(mcp_provider_ids, skill_ids)


def resolve_task_skill_maps(
    config: WorkflowConfig,
    *,
    skills_catalog_path: Path | None,
    quiet: bool,
) -> dict[str, list[dict[str, Any]]]:
    from orchestration.config_loader import raw_skill_spec_for_task

    catalog_entries: list[dict[str, Any]] = (
        load_agent_skills_catalog_merged(skills_catalog_path)
        if skills_catalog_path is not None
        else []
    )
    if catalog_entries:
        catalog_entries, _skipped = filter_skill_entries_by_credentials(
            catalog_entries,
            verbose=not quiet,
            log_prefix="workflow skills catalog",
        )

    task_skills_resolved: dict[str, list[dict[str, Any]]] = {}
    for tdef in config.tasks:
        raw = raw_skill_spec_for_task(tdef, config)
        task_skills_resolved[tdef.id] = (
            resolve_workflow_skill_refs(raw, catalog_entries) if raw else []
        )
    return task_skills_resolved
