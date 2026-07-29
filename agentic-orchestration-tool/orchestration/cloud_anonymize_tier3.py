"""Tier 3 cloud anonymization extras: reversible token maps + optional Presidio NER.

Kept as a sibling of ``cloud_anonymize.py`` (rather than folded in) to keep that module
small and readable. Public helpers are re-exported from ``cloud_anonymize`` so callers
can keep importing from a single place.

Soft dependency on Presidio (``presidio_analyzer`` / ``presidio_anonymizer``) — this
module never hard-fails when those packages are missing; NER is simply skipped with a
one-time stderr warning. Install extras via ``requirements-anonymize.txt``.
"""

from __future__ import annotations

import json
import os
import re
import sys
from contextvars import ContextVar
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Matches the reversible placeholders we mint, e.g. "[EMAIL:1]", "[PERSON:3]".
_TOKEN_RE = re.compile(r"\[[A-Z][A-Z0-9_]*:\d+\]")

_DEFAULT_NER_ENTITIES = ("PERSON", "LOCATION", "NRP")


def _env_truthy(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() not in ("0", "false", "no", "off", "")


def anonymize_reversible_enabled() -> bool:
    """Default on — set ``AGENTIC_ANONYMIZE_REVERSIBLE=0`` for static ``[EMAIL]``-style placeholders."""
    return _env_truthy("AGENTIC_ANONYMIZE_REVERSIBLE", "1")


def anonymize_ner_enabled() -> bool:
    """Default off — set ``AGENTIC_ANONYMIZE_NER=1`` to run the optional Presidio NER pass."""
    return _env_truthy("AGENTIC_ANONYMIZE_NER", "0")


def anonymize_tool_results_enabled() -> bool:
    """Default on — set ``AGENTIC_ANONYMIZE_TOOL_RESULTS=0`` to skip scrubbing tool output."""
    return _env_truthy("AGENTIC_ANONYMIZE_TOOL_RESULTS", "1")


def anonymize_vision_local_enabled() -> bool:
    """Default on — prefer a local Ollama vision model over cloud when anonymization is active."""
    return _env_truthy("AGENTIC_ANONYMIZE_VISION_LOCAL", "1")


def anonymize_vision_model() -> str:
    """Local vision model to substitute for a cloud model (``AGENTIC_ANONYMIZE_VISION_MODEL``)."""
    raw = os.getenv("AGENTIC_ANONYMIZE_VISION_MODEL", "").strip()
    if not raw:
        return "ollama/llava"
    return raw if "/" in raw else f"ollama/{raw}"


def ner_entities() -> tuple[str, ...]:
    """Presidio entity types to redact (``AGENTIC_ANONYMIZE_NER_ENTITIES``, comma list)."""
    raw = os.getenv("AGENTIC_ANONYMIZE_NER_ENTITIES", "").strip()
    if not raw:
        return _DEFAULT_NER_ENTITIES
    return tuple(p.strip().upper() for p in raw.split(",") if p.strip())


@dataclass
class TokenMap:
    """Session-scoped ``original <-> [KIND:n]`` mapping for reversible redaction.

    The same original value always yields the same token within a given map. Optionally
    backed by a JSON file on disk (see ``set_token_map_session``) so a placeholder minted
    in one process can be restored in another run of the same orchestrator session.
    """

    session_slug: str | None = None
    path: Path | None = None
    _forward: dict[str, str] = field(default_factory=dict)
    _reverse: dict[str, str] = field(default_factory=dict)
    _counters: dict[str, int] = field(default_factory=dict)

    def token_for(self, original: str, kind: str) -> str:
        """Return the stable placeholder for ``original``, minting one if new."""
        existing = self._forward.get(original)
        if existing is not None:
            return existing
        kind_key = re.sub(r"[^A-Za-z0-9_]", "", str(kind or "VALUE").strip().upper()) or "VALUE"
        n = self._counters.get(kind_key, 0) + 1
        self._counters[kind_key] = n
        token = f"[{kind_key}:{n}]"
        self._forward[original] = token
        self._reverse[token] = original
        self._save_if_bound()
        return token

    def restore(self, text: str) -> str:
        """Replace every known ``[KIND:n]`` token in ``text`` with its original value."""
        if not text or not self._reverse:
            return text
        return _TOKEN_RE.sub(lambda m: self._reverse.get(m.group(0), m.group(0)), text)

    def is_empty(self) -> bool:
        return not self._forward

    def to_json_dict(self) -> dict[str, Any]:
        return {"forward": dict(self._forward), "counters": dict(self._counters)}

    @classmethod
    def from_json_dict(cls, data: dict[str, Any], *, session_slug: str | None = None) -> "TokenMap":
        tm = cls(session_slug=session_slug)
        forward = data.get("forward")
        if isinstance(forward, dict):
            for orig, tok in forward.items():
                if isinstance(orig, str) and isinstance(tok, str):
                    tm._forward[orig] = tok
                    tm._reverse[tok] = orig
        counters = data.get("counters")
        if isinstance(counters, dict):
            for k, v in counters.items():
                try:
                    tm._counters[str(k)] = int(v)
                except (TypeError, ValueError):
                    continue
        return tm

    def _save_if_bound(self) -> None:
        if self.path is None:
            return
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(
                json.dumps(self.to_json_dict(), indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except OSError as exc:
            print(
                f"(anonymize) warning: could not persist token map {self.path}: {exc}",
                file=sys.stderr,
            )


_CURRENT_TOKEN_MAP: ContextVar[TokenMap | None] = ContextVar("_CURRENT_TOKEN_MAP", default=None)


def get_token_map() -> TokenMap:
    """Return the current context's token map, creating an in-memory one if unbound."""
    tm = _CURRENT_TOKEN_MAP.get()
    if tm is None:
        tm = TokenMap()
        _CURRENT_TOKEN_MAP.set(tm)
    return tm


def bind_token_map(token_map: TokenMap) -> None:
    """Bind an explicit token map as current for this context (e.g. one orchestrator run)."""
    _CURRENT_TOKEN_MAP.set(token_map)


def clear_token_map() -> None:
    """Unbind the current token map — the next ``get_token_map()`` call starts fresh."""
    _CURRENT_TOKEN_MAP.set(None)


def restore_tokens(text: str) -> str:
    """Replace placeholders in ``text`` with their original values from the current map."""
    if not isinstance(text, str):
        return str(text or "")
    tm = _CURRENT_TOKEN_MAP.get()
    if tm is None:
        return text
    return tm.restore(text)


def _tool_root_guess() -> Path:
    """agentic-orchestration-tool/ when this file lives at orchestration/cloud_anonymize_tier3.py."""
    return Path(__file__).resolve().parent.parent


def _anon_map_path(session_slug: str, *, tool_root: Path | None = None) -> Path:
    from orchestration.orchestrator_session import SESSION_DIR_NAME, safe_orchestrator_session_slug

    root = tool_root or _tool_root_guess()
    safe = safe_orchestrator_session_slug(session_slug)
    return (root / SESSION_DIR_NAME / "anon_maps" / f"{safe}.json").resolve()


def set_token_map_session(session_slug: str, *, tool_root: Path | None = None) -> TokenMap:
    """
    Bind the token map for ``session_slug``, loading it from disk when present.

    Subsequent ``token_for`` calls persist to
    ``__orchestrator_sessions__/anon_maps/<slug>.json`` so a restart of the same
    orchestrator session can still resolve previously minted placeholders.
    """
    path = _anon_map_path(session_slug, tool_root=tool_root)
    tm: TokenMap | None = None
    if path.is_file():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                tm = TokenMap.from_json_dict(data, session_slug=session_slug)
        except (OSError, json.JSONDecodeError) as exc:
            print(f"(anonymize) warning: could not load token map {path}: {exc}", file=sys.stderr)
    if tm is None:
        tm = TokenMap(session_slug=session_slug)
    tm.path = path
    bind_token_map(tm)
    return tm


def reversible_sub(
    pattern: re.Pattern[str],
    kind: str,
    text: str,
    *,
    token_map: TokenMap | None = None,
) -> str:
    """Regex-substitute matches of ``pattern`` with stable ``[KIND:n]`` tokens."""
    tm = token_map if token_map is not None else get_token_map()
    return pattern.sub(lambda m: tm.token_for(m.group(0), kind), text)


# --- Optional Presidio NER --------------------------------------------------

_ner_warned = False
_analyzer_engine: Any = None
_analyzer_load_failed = False


def _warn_ner_unavailable_once() -> None:
    global _ner_warned
    if _ner_warned:
        return
    _ner_warned = True
    print(
        "(anonymize) warning: AGENTIC_ANONYMIZE_NER=1 but presidio-analyzer is not installed; "
        "skipping NER pass. Install with `pip install -r requirements-anonymize.txt`.",
        file=sys.stderr,
    )


def _get_presidio_analyzer() -> Any:
    """Soft-import and cache a Presidio ``AnalyzerEngine`` instance (or ``None``)."""
    global _analyzer_engine, _analyzer_load_failed
    if _analyzer_engine is not None:
        return _analyzer_engine
    if _analyzer_load_failed:
        return None
    try:
        from presidio_analyzer import AnalyzerEngine  # type: ignore[import-not-found]
    except Exception:
        _analyzer_load_failed = True
        _warn_ner_unavailable_once()
        return None
    try:
        _analyzer_engine = AnalyzerEngine()
    except Exception as exc:  # noqa: BLE001 — e.g. missing spaCy model
        _analyzer_load_failed = True
        print(f"(anonymize) warning: Presidio AnalyzerEngine init failed: {exc}", file=sys.stderr)
        return None
    return _analyzer_engine


def presidio_available() -> bool:
    """True when Presidio can be imported and initialized (does not check env toggle)."""
    return _get_presidio_analyzer() is not None


def apply_ner_redaction(text: str, *, token_map: TokenMap | None = None) -> str:
    """
    Run Presidio NER over ``text`` and replace detected entities with placeholders.

    No-op when NER is disabled (``AGENTIC_ANONYMIZE_NER=0``, default) or Presidio is not
    installed. Uses reversible ``[KIND:n]`` tokens when reversible mode is on, otherwise
    static ``[KIND]`` placeholders (matching Tier 1+2 style).
    """
    if not text or not anonymize_ner_enabled():
        return text
    analyzer = _get_presidio_analyzer()
    if analyzer is None:
        return text
    try:
        results = analyzer.analyze(text=text, language="en", entities=list(ner_entities()))
    except Exception as exc:  # noqa: BLE001 — never let NER crash a run
        print(f"(anonymize) warning: Presidio analyze failed: {exc}", file=sys.stderr)
        return text
    if not results:
        return text
    reversible = anonymize_reversible_enabled()
    tm = token_map if token_map is not None else get_token_map()
    out = text
    # Replace back-to-front so earlier match offsets stay valid.
    for r in sorted(results, key=lambda r: r.start, reverse=True):
        original = text[r.start : r.end]
        if not original:
            continue
        token = tm.token_for(original, r.entity_type) if reversible else f"[{r.entity_type}]"
        out = out[: r.start] + token + out[r.end :]
    return out
