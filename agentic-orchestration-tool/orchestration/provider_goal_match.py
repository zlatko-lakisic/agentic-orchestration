"""Lexical overlap between user goals and provider entries (planner catalog guardrails)."""

from __future__ import annotations

import os
import re
import sys
from typing import Any

_STOPWORDS = frozenset(
    """
    able about above after again against all also am among an and any are as at
    based be became because become been being below between both but by came
    can come could did do does doing done down during each edu few for from further
    get got had has have having he her here hers herself him himself his how if
    into is it its itself like made make many me more most much must my myself
    namely neither no nor not now of off on once only onto or other ours ourselves
    out outside over own perhaps please put rather said same saw say see seemed
    seeming seems seen several shall she should show showed shown shows since some
    such sure take taken than that the their theirs them themselves then these
    they this those through thus to together too toward under until up upon us use
    used using very viz want was way we went were what when where which while who
    whom whose why will willing wish with within without would yes yet you your
    yours yourself yourselves
    """.split()
)


def extract_goal_terms(user_text: str) -> set[str]:
    """Distinct alphabetic tokens (length >= 4); stopwords removed."""
    words = re.findall(r"[a-z]{4,}", user_text.lower())
    return {w for w in words if w not in _STOPWORDS}


def _entry_text_blob(entry: dict[str, Any]) -> str:
    chunks = (
        entry.get("planner_hint"),
        entry.get("role"),
        entry.get("goal"),
        entry.get("id"),
    )
    blob = " ".join(str(x or "") for x in chunks).lower()
    pid = str(entry.get("id", "")).strip()
    extra = ""
    if pid:
        extra = " ".join(re.findall(r"[a-z]{4,}", pid.lower()))
    return f"{blob} {extra}".strip()


def lexical_domain_score(user_prompt: str, entry: dict[str, Any]) -> int:
    terms = extract_goal_terms(user_prompt)
    if not terms:
        return 0
    hay = _entry_text_blob(entry)
    hits = 0
    for w in terms:
        if len(w) >= 7:
            if w in hay:
                hits += 1
            continue
        if re.search(r"(?<![a-z0-9])" + re.escape(w) + r"(?![a-z0-9])", hay):
            hits += 1
    return hits


def _remap_fixup_general_ids(extra_from_env: frozenset[str]) -> frozenset[str]:
    """
    Planner ids commonly chosen even after general-purpose rows are stripped from catalog_doc.
    """
    out = frozenset({"gpt_research", "claude_research"}) | extra_from_env
    return out


def best_lexical_provider_id(
    user_prompt: str,
    catalog_entries: list[dict[str, Any]],
) -> tuple[str | None, int]:
    """Pick catalog id with highest lexical_domain_score (stable tie-break)."""
    if not catalog_entries:
        return None, 0
    best_id: str | None = None
    best_score = -1
    for e in catalog_entries:
        eid = str(e.get("id", "")).strip()
        if not eid:
            continue
        s = lexical_domain_score(user_prompt, e)
        if s > best_score or (s == best_score and (best_id is None or eid < best_id)):
            best_score = s
            best_id = eid
    if best_id is None:
        return None, 0
    return best_id, max(0, best_score)


def maybe_remap_planner_provider_missing_from_catalog(
    pid: str,
    *,
    user_prompt: str,
    catalog_entries: list[dict[str, Any]],
    quiet: bool,
) -> str | None:
    """
    Planner returned ``agent_provider_id`` not currently in catalog (typically
    ``gpt_research`` / ``claude_research`` after domain suppression stripped them).

    Remap only when permitted: default is ids in ``gpt_research`` / ``claude_research``
    plus ``AGENTIC_GENERAL_PURPOSE_AGENT_IDS``. Set ``AGENTIC_PLANNER_REMAP_ANY_UNKNOWN_ID``
    to remap any unknown id. Disable all remapping with ``AGENTIC_PLANNER_STRICT_PROVIDER_IDS``.

    Returns replacement id when remapped; otherwise ``None`` (caller keeps original ``pid``).
    """
    ids = {str(e.get("id", "")).strip() for e in catalog_entries}
    ids.discard("")
    if pid in ids:
        return None

    if len(ids) == 1:
        sole = next(iter(ids))
        if not quiet:
            print(
                f"(dynamic) planner provider remap (sole catalog): {pid!r} -> {sole!r}",
                file=sys.stderr,
            )
        return sole

    if os.getenv("AGENTIC_PLANNER_STRICT_PROVIDER_IDS", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    ):
        return None

    raw_extra = os.getenv("AGENTIC_GENERAL_PURPOSE_AGENT_IDS", "").strip()
    env_extra = frozenset(x.strip() for x in raw_extra.split(",") if x.strip())
    remap_set = _remap_fixup_general_ids(env_extra)
    remap_any = os.getenv("AGENTIC_PLANNER_REMAP_ANY_UNKNOWN_ID", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )
    if pid not in remap_set and not remap_any:
        return None

    best_id, best_score = best_lexical_provider_id(user_prompt, catalog_entries)
    if not best_id:
        return None
    if best_score <= 0 and not remap_any:
        return None

    if not quiet:
        origin = "stripped general-purpose default" if pid in remap_set else "unknown planner id"
        print(
            f"(dynamic) planner provider remap ({origin}): {pid!r} -> {best_id!r} "
            f"(lexical_goal_match score={best_score})",
            file=sys.stderr,
        )
    return best_id


def _general_purpose_entry(entry: dict[str, Any], extra_ids: frozenset[str]) -> bool:
    eid = str(entry.get("id", "")).strip()
    if eid in extra_ids:
        return True
    gp = entry.get("general_purpose")
    if gp is True:
        return True
    if isinstance(gp, str) and gp.strip().lower() in ("true", "1", "yes", "on"):
        return True
    return False


def suppress_general_providers_when_domains_align(
    entries: list[dict[str, Any]],
    user_prompt: str,
    *,
    quiet: bool,
) -> list[dict[str, Any]]:
    """
    When specialist entries lexically match the goal much better than general-purpose
    ones, drop general-purpose providers from the planner catalog so the LLM cannot
    pick broad "research" defaults over domain YAMLs.

    Controlled by AGENTIC_DISABLE_DOMAIN_PROVIDER_SUPPRESSION / AGENTIC_DOMAIN_PROVIDER_MATCH_MIN /
    AGENTIC_GENERAL_PURPOSE_AGENT_IDS (extra ids beyond `general_purpose: true` in YAML).
    """
    if os.getenv("AGENTIC_DISABLE_DOMAIN_PROVIDER_SUPPRESSION", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    ):
        return entries

    raw_extra = os.getenv("AGENTIC_GENERAL_PURPOSE_AGENT_IDS", "").strip()
    extra = frozenset(x.strip() for x in raw_extra.split(",") if x.strip())

    gens = [e for e in entries if _general_purpose_entry(e, extra)]
    specs = [e for e in entries if not _general_purpose_entry(e, extra)]
    if not gens or not specs:
        return entries

    raw_min = (os.getenv("AGENTIC_DOMAIN_PROVIDER_MATCH_MIN", "") or "").strip()
    min_score = int(raw_min) if raw_min else 4
    min_score = max(1, min(min_score, 48))

    best_gen = max(lexical_domain_score(user_prompt, e) for e in gens)
    best_spec = max(lexical_domain_score(user_prompt, e) for e in specs)

    if best_spec < min_score or best_spec <= best_gen:
        return entries

    drop_ids = sorted({str(e.get("id", "")).strip() for e in gens if str(e.get("id", "")).strip()})
    kept = [
        e
        for e in entries
        if str(e.get("id", "")).strip() not in frozenset(drop_ids)
    ]
    if not kept:
        return entries
    if not quiet:
        print(
            f"(dynamic) domain match: omitting general-purpose agent provider(s) {drop_ids!r} "
            f"(specialist lexical score={best_spec} vs general={best_gen}; min={min_score})",
            file=sys.stderr,
        )
    return kept
