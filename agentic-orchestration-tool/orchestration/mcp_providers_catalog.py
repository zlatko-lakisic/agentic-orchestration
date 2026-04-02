from __future__ import annotations

import copy
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

import yaml

_EXTRA_MCP_PATH_ENV = "AGENTIC_EXTRA_MCP_PROVIDERS_PATH"


def substitute_mcp_env_vars(text: str) -> str:
    """Replace ``${VAR}`` placeholders with ``os.environ[VAR]`` (empty string if unset)."""

    def _repl(match: re.Match[str]) -> str:
        return os.getenv(match.group(1).strip(), "")

    return re.sub(r"\$\{([^}]+)\}", _repl, text)


def _load_mcp_bundle_file(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        raw: dict[str, Any] = yaml.safe_load(f) or {}

    entries = raw.get("mcp_providers")
    if not isinstance(entries, list) or not entries:
        raise ValueError(
            f"'mcp_providers' must be a non-empty list in bundle catalog {path}",
        )
    out: list[dict[str, Any]] = []
    for i, item in enumerate(entries):
        if not isinstance(item, dict):
            raise ValueError(f"{path}: mcp_providers[{i}] must be a mapping")
        pid = str(item.get("id", "")).strip()
        if not pid:
            raise ValueError(f"{path}: mcp_providers[{i}] is missing non-empty 'id'")
        out.append(dict(item))
    return out


def _load_mcp_fragment_file(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        raw: Any = yaml.safe_load(f)
    if not isinstance(raw, dict):
        raise ValueError(f"{path}: root must be a mapping (one MCP provider per file)")
    pid = str(raw.get("id", "")).strip()
    if not pid:
        raise ValueError(f"{path}: missing non-empty 'id' at file root")
    return dict(raw)


def load_mcp_providers_catalog(catalog_path: Path) -> list[dict[str, Any]]:
    """Load MCP provider templates from a directory (one ``*.yaml`` per entry) or a legacy bundle file."""
    if not catalog_path.exists():
        return []

    if catalog_path.is_dir():
        out: list[dict[str, Any]] = []
        paths = sorted(catalog_path.glob("*.yaml")) + sorted(catalog_path.glob("*.yml"))
        for path in paths:
            if path.name.startswith("_"):
                continue
            stem = path.stem.lower()
            if stem in frozenset({"readme", "index"}):
                continue
            out.append(_load_mcp_fragment_file(path))
        return out

    return _load_mcp_bundle_file(catalog_path)


def load_mcp_providers_catalog_merged(primary: Path) -> list[dict[str, Any]]:
    """Load the primary catalog plus optional extra directories from ``AGENTIC_EXTRA_MCP_PROVIDERS_PATH``."""

    out = load_mcp_providers_catalog(primary)
    extra_raw = os.getenv(_EXTRA_MCP_PATH_ENV, "").strip()
    if not extra_raw:
        return _assert_unique_mcp_ids(out)

    sep = ";" if os.name == "nt" else ":"
    for part in extra_raw.split(sep):
        p = Path(part.strip()).expanduser()
        if not str(p) or not p.exists():
            continue
        out.extend(load_mcp_providers_catalog(p))

    return _assert_unique_mcp_ids(out)


def _assert_unique_mcp_ids(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ids = [str(p.get("id", "")).strip() for p in entries]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate MCP provider 'id' across MCP catalog files")
    return entries


def mcp_entry_has_api_credentials(entry: dict[str, Any]) -> bool:
    """
    True when this MCP entry can be used with current environment.

    Supported keys on entry:
    - required_env: list[str] (all must be set and non-empty)
    - required_env_any: list[str] (at least one must be set and non-empty)
    """
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


def mcp_credential_skip_reason(entry: dict[str, Any]) -> str:
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


def filter_mcp_entries_by_api_credentials(
    entries: list[dict[str, Any]],
    *,
    verbose: bool,
    log_prefix: str = "",
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Drop MCP catalog entries when required env vars are missing.

    Many skips are summarized into one line (threshold from
    ``AGENTIC_MCP_CREDENTIAL_SKIP_SUMMARY_AT``, default 6). Set
    ``AGENTIC_MCP_CREDENTIAL_SKIP_VERBOSE=1`` to always print one line per skipped id.
    """
    kept: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    prefix = f"{log_prefix}: " if log_prefix else ""

    for entry in entries:
        if mcp_entry_has_api_credentials(entry):
            kept.append(entry)
        else:
            skipped.append(entry)

    skipped_ids = [str(e.get("id", "")).strip() or "(missing id)" for e in skipped]
    if not verbose or not skipped:
        return kept, skipped_ids

    force_each = os.getenv("AGENTIC_MCP_CREDENTIAL_SKIP_VERBOSE", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )
    try:
        summary_at = max(
            1, int(os.getenv("AGENTIC_MCP_CREDENTIAL_SKIP_SUMMARY_AT", "6").strip())
        )
    except ValueError:
        summary_at = 6

    if not force_each and len(skipped) >= summary_at:
        by_id: Counter[str] = Counter(
            str(e.get("id", "")).strip() or "(missing id)" for e in skipped
        )
        sample = [k for k, _ in by_id.most_common(6)]
        more = len(by_id) - len(sample)
        suffix = f" (+{more} more)" if more > 0 else ""
        print(
            f"{prefix}credential filter: skipping {len(skipped)} MCP provider(s): "
            f"{', '.join(sample)}{suffix}.",
            file=sys.stderr,
        )
        return kept, skipped_ids

    for entry in skipped:
        pid = str(entry.get("id", "")).strip() or "(missing id)"
        hint = mcp_credential_skip_reason(entry)
        print(
            f"{prefix}skipping MCP provider {pid!r}: missing credentials; {hint}.",
            file=sys.stderr,
        )
    return kept, skipped_ids


def _stdio_mcps_entry(item: dict[str, Any]) -> dict[str, Any] | None:
    """Build a CrewAI-style stdio MCP config (``command``, ``args``, optional ``env``)."""
    raw = item.get("stdio")
    if not isinstance(raw, dict) or not raw:
        return None

    command = str(raw.get("command", "")).strip()
    if not command:
        raise ValueError(
            f"MCP provider {item.get('id', '?')!r}: stdio.command is required when stdio is set",
        )

    args_raw = raw.get("args")
    if args_raw is None:
        args_list: list[str] = []
    elif isinstance(args_raw, list):
        args_list = [substitute_mcp_env_vars(str(a)) for a in args_raw]
    else:
        raise ValueError(
            f"MCP provider {item.get('id', '?')!r}: stdio.args must be a list when set",
        )

    env: dict[str, str] | None = None
    env_raw = raw.get("env")
    if isinstance(env_raw, dict) and env_raw:
        env = {
            str(k).strip(): substitute_mcp_env_vars(str(v))
            for k, v in env_raw.items()
            if str(k).strip()
        }

    out: dict[str, Any] = {"command": command, "args": args_list}
    if env:
        out["env"] = env
    return out


def _streamable_http_mcps_entry(item: dict[str, Any]) -> dict[str, Any] | None:
    """Build a CrewAI-style streamable HTTP MCP config (``url``, ``transport``, optional ``headers``)."""
    raw_sh = item.get("streamable_http")
    if not isinstance(raw_sh, dict) or not raw_sh:
        return None

    raw_url = str(raw_sh.get("url", "")).strip()
    if not raw_url:
        raise ValueError(
            f"MCP provider {item.get('id', '?')!r}: streamable_http.url is required when "
            f"streamable_http is set",
        )
    url = substitute_mcp_env_vars(raw_url).strip().rstrip("/")

    headers: dict[str, str] = {}
    headers_raw = raw_sh.get("headers")
    if isinstance(headers_raw, dict):
        for hk, hv in headers_raw.items():
            key = str(hk).strip()
            if not key:
                continue
            headers[key] = substitute_mcp_env_vars(str(hv))

    return {
        "url": url,
        "transport": "streamable-http",
        **({"headers": headers} if headers else {}),
    }


def _string_refs_from_mapping(item: dict[str, Any]) -> list[str]:
    ref = item.get("ref")
    refs = item.get("refs")
    out: list[str] = []
    if ref is not None and str(ref).strip():
        out.append(str(ref).strip())
    if isinstance(refs, list):
        out.extend(str(x).strip() for x in refs if x is not None and str(x).strip())
    if not out:
        raise ValueError(
            f"MCP provider {item.get('id', '?')!r} must define non-empty 'ref'/'refs', "
            f"or a 'streamable_http' block",
        )
    return out


def _mcps_entries_from_mapping(item: dict[str, Any]) -> list[Any]:
    sh = _streamable_http_mcps_entry(item)
    st = _stdio_mcps_entry(item)
    if sh is not None and st is not None:
        raise ValueError(
            f"MCP provider {item.get('id', '?')!r}: define only one of "
            f"'streamable_http' or 'stdio'",
        )
    if sh is not None:
        return [sh]
    if st is not None:
        return [st]
    strings = _string_refs_from_mapping(item)
    return strings


def _mcps_dedupe_key(entry: Any) -> str:
    if isinstance(entry, str):
        return f"s:{entry}"
    if isinstance(entry, dict):
        return f"d:{json.dumps(entry, sort_keys=True)}"
    return f"o:{repr(entry)}"


def mcps_list_fingerprint(resolved_mcps: list[Any]) -> tuple[str, ...]:
    """Stable tuple identity for a resolved ``mcps`` list (order-preserving)."""
    return tuple(_mcps_dedupe_key(e) for e in resolved_mcps)


def resolve_workflow_mcp_refs(
    raw_items: list[Any],
    catalog_entries: list[dict[str, Any]],
) -> list[Any]:
    """Resolve workflow ``mcp_providers`` into CrewAI ``mcps`` entries (URL strings and/or transport dicts)."""
    if not raw_items:
        return []

    catalog_by_id = {str(p["id"]).strip(): p for p in catalog_entries}

    resolved: list[Any] = []
    seen: set[str] = set()

    for i, item in enumerate(raw_items):
        entries: list[Any]
        if isinstance(item, str):
            pid = item.strip()
            if not pid or pid not in catalog_by_id:
                known = ", ".join(sorted(catalog_by_id))
                raise ValueError(
                    f"workflow.mcp_providers[{i}] unknown catalog id {pid!r}. Known: {known}",
                )
            entries = _mcps_entries_from_mapping(catalog_by_id[pid])
        elif isinstance(item, dict):
            entries = _mcps_entries_from_mapping(item)
        else:
            raise ValueError(f"workflow.mcp_providers[{i}] must be a string id or a mapping")

        for ent in entries:
            if isinstance(ent, str):
                expanded = substitute_mcp_env_vars(ent)
                if not expanded:
                    continue
                key = _mcps_dedupe_key(expanded)
                if key not in seen:
                    seen.add(key)
                    resolved.append(expanded)
            else:
                key = _mcps_dedupe_key(ent)
                if key not in seen:
                    seen.add(key)
                    resolved.append(ent)

    return resolved


def _format_mcp_catalog_entry(p: dict[str, Any]) -> str:
    pid = str(p.get("id", "")).strip()
    desc = str(p.get("description", "")).strip()
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
    sh = p.get("streamable_http")
    if isinstance(sh, dict) and sh:
        parts.append("  transport: streamable-http (+ optional headers from env)")
    st = p.get("stdio")
    if isinstance(st, dict) and st:
        parts.append("  transport: stdio (local subprocess via npx/node)")
    return "\n".join(parts)


def mcp_catalog_for_planner_prompt(entries: list[dict[str, Any]]) -> str:
    if not entries:
        return ""
    ordered = sorted(entries, key=lambda p: str(p.get("id", "")).strip().lower())
    return "### MCP providers (tools via CrewAI `mcps`)\n" + "\n".join(
        _format_mcp_catalog_entry(p) for p in ordered
    )


def deepcopy_mcp_catalog_entry(entry: dict[str, Any]) -> dict[str, Any]:
    return copy.deepcopy(entry)


# Terms that appear in many MCP hints but are poor keyword triggers for goal matching.
_MCP_GOAL_MATCH_BLOCKLIST = frozenset({
    "assistant",
    "service",
    "server",
    "catalog",
    "context",
    "protocol",
    "provider",
    "optional",
    "default",
    "behavior",
    "entities",
    "integration",
    "configuration",
    "instructions",
    "https",
    "http",
    "model",
})


def _terms_from_mcp_catalog_entry(entry: dict[str, Any]) -> set[str]:
    out: set[str] = set()
    eid = str(entry.get("id", "")).strip().lower()
    if eid:
        out.add(eid)
        out.add(eid.replace("_", " "))
        for p in eid.split("_"):
            if len(p) >= 5 and p not in _MCP_GOAL_MATCH_BLOCKLIST:
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
        if w not in _MCP_GOAL_MATCH_BLOCKLIST:
            out.add(w)
    return out


def suggest_mcp_ids_from_user_goal(
    user_text: str,
    entries: list[dict[str, Any]],
) -> list[str]:
    """
    Heuristic MCP catalog ids whose keywords appear in the user goal (dynamic fallback when
    the planner omits ``mcp_provider_ids``). Used only when no task resolves any MCP.
    """
    u = user_text.strip().lower()
    if not u:
        return []

    def _is_wordish_match(term: str) -> bool:
        t = term.strip().lower()
        if not t:
            return False
        if len(t) <= 4:
            # avoid overly-generic short matches like "mail", "home", etc.
            return False
        if " " in t:
            return t in u
        return re.search(rf"\b{re.escape(t)}\b", u) is not None

    scored: list[tuple[int, str]] = []
    for e in entries:
        eid = str(e.get("id", "")).strip()
        if not eid:
            continue
        terms = _terms_from_mcp_catalog_entry(e)
        hits = 0
        for term in terms:
            if _is_wordish_match(term):
                hits += 1
        if hits <= 0:
            continue

        # Penalize Home Assistant unless the user explicitly mentions it.
        if eid == "home_assistant" and hits == 1:
            # The only hit is likely generic; require explicit HA mention.
            if not any(k in u for k in ("home assistant", "homeassistant", "hass", "hassio")):
                continue

        scored.append((hits, eid))

    scored.sort(key=lambda t: (-t[0], t[1].lower()))
    out: list[str] = []
    seen: set[str] = set()
    for _hits, eid in scored:
        if eid not in seen:
            seen.add(eid)
            out.append(eid)
    return out
