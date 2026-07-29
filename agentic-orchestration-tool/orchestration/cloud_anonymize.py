"""Heuristic redaction for text sent to cloud LLM providers (Tier 1 + Tier 2).

When ``AGENTIC_ANONYMIZE_CLOUD`` is on (default), emails, phones, SSN-like numbers,
API keys, and card-like digit runs are replaced with stable placeholders before
egress to cloud planner/agent models. Local providers (e.g. Ollama) skip redaction
unless ``force=True``.

Operators can add domain-specific regexes via YAML
(``AGENTIC_ANONYMIZE_PATTERNS_PATH`` / ``AGENTIC_EXTRA_ANONYMIZE_PATTERNS_PATH``).

This is **not** a HIPAA/contractual guarantee — heuristic only. Pair with
``user_wants_local_only`` catalog filtering for stronger privacy requests.
"""

from __future__ import annotations

import copy
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

_DEFAULT_CLOUD_TYPES = frozenset({"openai", "anthropic", "huggingface"})

_PATTERNS_PATH_ENV = "AGENTIC_ANONYMIZE_PATTERNS_PATH"
_EXTRA_PATTERNS_PATH_ENV = "AGENTIC_EXTRA_ANONYMIZE_PATTERNS_PATH"
_DEFAULT_PATTERNS_REL = Path("config") / "anonymize_patterns.yaml"

# Phrase matches (substring).
_LOCAL_ONLY_PHRASES = (
    "local-only",
    "local only",
    "on my machine",
    "no cloud",
    "air-gapped",
    "airgapped",
    "ollama-only",
    "ollama only",
    "use ollama",
    "keep private",
    "keep this private",
    "in private",
    "for privacy",
    "privacy mode",
    "do not send to the cloud",
    "don't send to the cloud",
)

# Ambiguous short tokens — require word boundaries (avoid "private equity").
_LOCAL_ONLY_WORDS = (
    "offline",
    "locally",
    "airgapped",
    "privately",
)

_EMAIL_RE = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
)
# North-American-ish and intl loosely: +1 (555) 123-4567, 555-123-4567, etc.
_PHONE_RE = re.compile(
    r"(?<!\w)(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?!\w)",
)
_SSN_RE = re.compile(r"(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)")
# OpenAI-style + common secret prefixes / bearer tokens.
_API_KEY_RE = re.compile(
    r"(?i)\b(?:"
    r"sk-[A-Za-z0-9_\-]{16,}"
    r"|sk-ant-[A-Za-z0-9_\-]{16,}"
    r"|hf_[A-Za-z0-9]{16,}"
    r"|ghp_[A-Za-z0-9]{20,}"
    r"|xox[baprs]-[A-Za-z0-9\-]{10,}"
    r"|Bearer\s+[A-Za-z0-9._\-]{16,}"
    r")\b"
)
# 13–19 digit runs that look like payment cards (with optional separators).
_CARD_RE = re.compile(r"(?<!\d)(?:\d[ -]*?){13,19}(?!\d)")

_FLAG_MAP = {
    "i": re.IGNORECASE,
    "m": re.MULTILINE,
    "s": re.DOTALL,
    "x": re.VERBOSE,
}


@dataclass(frozen=True)
class CustomAnonymizePattern:
    """One operator-defined regex scrubber."""

    id: str
    regex: re.Pattern[str]
    replacement: str
    source_path: str = ""


_custom_cache_key: tuple[tuple[str, float], ...] | None = None
_custom_compiled: list[CustomAnonymizePattern] = []


def _env_truthy(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() not in ("0", "false", "no", "off", "")


def anonymize_cloud_enabled() -> bool:
    """Default on — set ``AGENTIC_ANONYMIZE_CLOUD=0`` to disable."""
    return _env_truthy("AGENTIC_ANONYMIZE_CLOUD", "1")


def cloud_provider_types() -> frozenset[str]:
    raw = os.getenv("AGENTIC_CLOUD_PROVIDER_TYPES", "").strip()
    if not raw:
        return _DEFAULT_CLOUD_TYPES
    parts = {p.strip().lower() for p in raw.split(",") if p.strip()}
    return frozenset(parts) if parts else _DEFAULT_CLOUD_TYPES


def is_cloud_provider_type(typ: str | None) -> bool:
    t = str(typ or "").strip().lower()
    if not t:
        return False
    return t in cloud_provider_types()


def litellm_model_provider_prefix(model: str) -> str:
    """Return the LiteLLM provider prefix (``openai``, ``ollama``, …)."""
    m = str(model or "").strip()
    if not m:
        return ""
    if "/" not in m:
        return "openai"
    return m.split("/", 1)[0].strip().lower()


def is_cloud_litellm_model(model: str) -> bool:
    prefix = litellm_model_provider_prefix(model)
    if not prefix:
        return False
    # Map common LiteLLM prefixes onto catalog provider types.
    mapped = {
        "openai": "openai",
        "anthropic": "anthropic",
        "huggingface": "huggingface",
        "hf": "huggingface",
        "together_ai": "openai",
        "groq": "openai",
        "azure": "openai",
        "azure_ai": "openai",
        "ollama": "ollama",
        "vllm": "vllm",
    }.get(prefix, prefix)
    return is_cloud_provider_type(mapped)


def user_wants_local_only(text: str) -> bool:
    """True when the user goal explicitly asks for private / offline / Ollama-only execution."""
    t = str(text or "").strip().lower()
    if not t:
        return False
    if any(p in t for p in _LOCAL_ONLY_PHRASES):
        return True
    return any(re.search(rf"\b{re.escape(w)}\b", t) is not None for w in _LOCAL_ONLY_WORDS)


def filter_catalog_to_local_providers(
    entries: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Drop catalog rows whose ``type`` is in ``AGENTIC_CLOUD_PROVIDER_TYPES``."""
    kept: list[dict[str, Any]] = []
    for e in entries:
        typ = str(e.get("type", "")).strip().lower()
        if is_cloud_provider_type(typ):
            continue
        kept.append(e)
    return kept


def clear_custom_anonymize_pattern_cache() -> None:
    """Drop cached custom regexes (tests / after editing pattern files)."""
    global _custom_cache_key, _custom_compiled
    _custom_cache_key = None
    _custom_compiled = []


def _tool_root_guess() -> Path:
    """agentic-orchestration-tool/ when cwd is that dir or a child."""
    return Path(__file__).resolve().parent.parent


def _split_path_list(raw: str) -> list[Path]:
    if not raw.strip():
        return []
    sep = ";" if os.name == "nt" and ";" in raw else os.pathsep
    # Also accept commas for ergonomics.
    if "," in raw and sep not in raw:
        parts = raw.split(",")
    else:
        parts = raw.split(sep)
    out: list[Path] = []
    for p in parts:
        s = p.strip()
        if s:
            out.append(Path(s).expanduser())
    return out


def _default_patterns_path() -> Path | None:
    override = os.getenv(_PATTERNS_PATH_ENV, "").strip()
    if override:
        return Path(override).expanduser()
    cand = _tool_root_guess() / _DEFAULT_PATTERNS_REL
    return cand if cand.is_file() or cand.is_dir() else None


def _yaml_files_for_path(path: Path) -> list[Path]:
    if path.is_file():
        return [path]
    if not path.is_dir():
        return []
    paths = sorted(path.glob("*.yaml")) + sorted(path.glob("*.yml"))
    return [
        p
        for p in paths
        if not p.name.startswith("_") and p.stem.lower() not in ("readme", "index")
    ]


def _parse_flags(raw: Any) -> int:
    if raw is None or raw is False or raw == "":
        return 0
    flags = 0
    items: list[str]
    if isinstance(raw, str):
        items = [c for c in raw.replace(",", " ").replace("|", " ").split() if c]
        if len(items) == 1 and len(items[0]) > 1 and all(c in _FLAG_MAP for c in items[0]):
            items = list(items[0])
    elif isinstance(raw, (list, tuple)):
        items = [str(x).strip() for x in raw if str(x).strip()]
    else:
        raise ValueError(f"flags must be a string or list, got {type(raw)!r}")
    for item in items:
        key = item.strip().lower()
        if key.startswith("re."):
            key = key[3:]
        if key not in _FLAG_MAP:
            raise ValueError(f"unknown regex flag {item!r} (allowed: i, m, s, x)")
        flags |= _FLAG_MAP[key]
    return flags


def _patterns_from_mapping(raw: dict[str, Any], *, source: Path) -> list[CustomAnonymizePattern]:
    entries = raw.get("patterns")
    if entries is None:
        # Single-pattern fragment (id + pattern at root).
        if str(raw.get("pattern", "")).strip():
            entries = [raw]
        else:
            return []
    if not isinstance(entries, list):
        raise ValueError(f"{source}: 'patterns' must be a list")
    out: list[CustomAnonymizePattern] = []
    for i, item in enumerate(entries):
        if not isinstance(item, dict):
            raise ValueError(f"{source}: patterns[{i}] must be a mapping")
        if item.get("enabled") is False:
            continue
        pid = str(item.get("id", "")).strip() or f"pattern_{i}"
        pattern = str(item.get("pattern", "")).strip()
        if not pattern:
            raise ValueError(f"{source}: patterns[{i}] ({pid}) missing non-empty 'pattern'")
        replacement = str(item.get("replacement", "[REDACTED]"))
        try:
            flags = _parse_flags(item.get("flags"))
        except ValueError as exc:
            raise ValueError(f"{source}: patterns[{i}] ({pid}): {exc}") from exc
        try:
            compiled = re.compile(pattern, flags)
        except re.error as exc:
            raise ValueError(
                f"{source}: patterns[{i}] ({pid}): invalid regex: {exc}"
            ) from exc
        out.append(
            CustomAnonymizePattern(
                id=pid,
                regex=compiled,
                replacement=replacement,
                source_path=str(source.resolve()),
            )
        )
    return out


def _load_patterns_file(path: Path) -> list[CustomAnonymizePattern]:
    with path.open("r", encoding="utf-8") as f:
        raw: Any = yaml.safe_load(f)
    if raw is None:
        return []
    if not isinstance(raw, dict):
        raise ValueError(f"{path}: root must be a mapping with 'patterns' (or a single pattern)")
    return _patterns_from_mapping(raw, source=path)


def _fingerprint_paths(paths: list[Path]) -> tuple[tuple[str, float], ...]:
    key: list[tuple[str, float]] = []
    for p in paths:
        try:
            st = p.stat()
            key.append((str(p.resolve()), float(st.st_mtime)))
        except OSError:
            key.append((str(p), -1.0))
    return tuple(key)


def _collect_pattern_files() -> list[Path]:
    files: list[Path] = []
    primary = _default_patterns_path()
    if primary is not None:
        files.extend(_yaml_files_for_path(primary))
    for extra in _split_path_list(os.getenv(_EXTRA_PATTERNS_PATH_ENV, "")):
        resolved = extra if extra.is_absolute() else (_tool_root_guess() / extra)
        files.extend(_yaml_files_for_path(resolved))
    # De-dupe while preserving order.
    seen: set[str] = set()
    out: list[Path] = []
    for p in files:
        try:
            key = str(p.resolve())
        except OSError:
            key = str(p)
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out


def load_custom_anonymize_patterns(*, force_reload: bool = False) -> list[CustomAnonymizePattern]:
    """Load and compile operator YAML regex scrubbers (cached by path mtime)."""
    global _custom_cache_key, _custom_compiled
    files = _collect_pattern_files()
    key = _fingerprint_paths(files)
    if not force_reload and _custom_cache_key == key:
        return list(_custom_compiled)

    compiled: list[CustomAnonymizePattern] = []
    for path in files:
        try:
            compiled.extend(_load_patterns_file(path))
        except Exception as exc:  # noqa: BLE001
            print(
                f"(anonymize) warning: skipping custom patterns in {path}: {exc}",
                file=sys.stderr,
            )
    _custom_cache_key = key
    _custom_compiled = compiled
    return list(compiled)


def redact_for_cloud(text: str, *, force: bool = False) -> str:
    """Replace common PII / secret patterns with placeholders.

    When ``force`` is False (default), returns ``text`` unchanged if anonymization
    is disabled via env. Built-in scrubbers run first; custom YAML patterns after.
    """
    if not force and not anonymize_cloud_enabled():
        return text if isinstance(text, str) else str(text or "")
    s = text if isinstance(text, str) else str(text or "")
    if not s:
        return s
    s = _API_KEY_RE.sub("[API_KEY]", s)
    s = _EMAIL_RE.sub("[EMAIL]", s)
    s = _SSN_RE.sub("[SSN]", s)
    s = _PHONE_RE.sub("[PHONE]", s)
    s = _CARD_RE.sub("[CARD]", s)
    for pat in load_custom_anonymize_patterns():
        s = pat.regex.sub(pat.replacement, s)
    return s


def maybe_redact_for_cloud_provider(
    text: str,
    *,
    provider_type: str | None = None,
    litellm_model: str | None = None,
) -> str:
    """Redact when anonymization is on **and** the destination is a cloud provider."""
    if not anonymize_cloud_enabled():
        return text if isinstance(text, str) else str(text or "")
    cloud = False
    if provider_type is not None:
        cloud = is_cloud_provider_type(provider_type)
    elif litellm_model is not None:
        cloud = is_cloud_litellm_model(litellm_model)
    else:
        # Persist / attachment paths: scrub when feature is on (Tier 2).
        cloud = True
    if not cloud:
        return text if isinstance(text, str) else str(text or "")
    return redact_for_cloud(text, force=True)


def redact_messages_for_cloud(
    messages: list[dict[str, Any]],
    *,
    litellm_model: str,
) -> list[dict[str, Any]]:
    """Deep-copy messages and redact string ``content`` fields for cloud models."""
    if not anonymize_cloud_enabled() or not is_cloud_litellm_model(litellm_model):
        return messages
    out = copy.deepcopy(messages)
    for m in out:
        if not isinstance(m, dict):
            continue
        c = m.get("content")
        if isinstance(c, str):
            m["content"] = redact_for_cloud(c, force=True)
        elif isinstance(c, list):
            # Multimodal content parts — redact text parts only.
            new_parts: list[Any] = []
            for part in c:
                if isinstance(part, dict) and isinstance(part.get("text"), str):
                    p2 = dict(part)
                    p2["text"] = redact_for_cloud(part["text"], force=True)
                    new_parts.append(p2)
                else:
                    new_parts.append(part)
            m["content"] = new_parts
    return out
