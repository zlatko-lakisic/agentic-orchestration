"""
Public Reach/engine catalog metadata (enablement UI + required secrets).

Stock catalogs only — no host credential filtering (clients collect secrets and
pass them via ``session_overlay_register.env`` / allowlists).
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from orchestration.session_env import (
    SECRET_LABELS,
    agent_type_required_secrets,
    entry_required_secrets,
    session_env_allowed_keys,
)

_KIND_ALIASES = {
    "agent": "agents",
    "agents": "agents",
    "mcp": "mcps",
    "mcps": "mcps",
    "skill": "skills",
    "skills": "skills",
    "harness": "harnesses",
    "harnesses": "harnesses",
}


def _parse_kinds(raw: Any) -> set[str] | None:
    if raw is None:
        return None
    if isinstance(raw, str):
        parts = [p.strip().lower() for p in raw.replace(";", ",").split(",")]
    elif isinstance(raw, (list, tuple, set)):
        parts = [str(p or "").strip().lower() for p in raw]
    else:
        return None
    out: set[str] = set()
    for p in parts:
        if not p:
            continue
        mapped = _KIND_ALIASES.get(p)
        if mapped:
            out.add(mapped)
    return out or None


def _agent_row(entry: dict[str, Any]) -> dict[str, Any]:
    typ = str(entry.get("type") or "").strip().lower()
    secrets = agent_type_required_secrets(typ)
    harness = str(entry.get("harness_profile") or "").strip() or None
    return {
        "id": str(entry.get("id") or "").strip(),
        "kind": "agent",
        "type": typ or None,
        "role": str(entry.get("role") or "").strip() or None,
        "goal": str(entry.get("goal") or "").strip() or None,
        "model": str(entry.get("model") or "").strip() or None,
        "description": str(entry.get("planner_hint") or entry.get("description") or "").strip()
        or None,
        "plannerHint": str(entry.get("planner_hint") or "").strip() or None,
        "harnessProfile": harness,
        "generalPurpose": bool(entry.get("general_purpose")),
        "minVramGb": entry.get("min_vram_gb"),
        "requiredSecrets": secrets,
        "enableField": "allowedAgentProviderIds",
    }


def _mcp_row(entry: dict[str, Any]) -> dict[str, Any]:
    transport = None
    if isinstance(entry.get("streamable_http"), dict):
        transport = "streamable-http"
    elif isinstance(entry.get("stdio"), dict):
        transport = "stdio"
    return {
        "id": str(entry.get("id") or "").strip(),
        "kind": "mcp",
        "description": str(entry.get("description") or "").strip() or None,
        "plannerHint": str(entry.get("planner_hint") or "").strip() or None,
        "capabilities": entry.get("capabilities")
        if isinstance(entry.get("capabilities"), list)
        else None,
        "transport": transport,
        "requiredSecrets": entry_required_secrets(entry),
        "enableField": "allowedMcpProviderIds",
    }


def _skill_row(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(entry.get("id") or "").strip(),
        "kind": "skill",
        "description": str(
            entry.get("description") or entry.get("planner_hint") or ""
        ).strip()
        or None,
        "plannerHint": str(entry.get("planner_hint") or "").strip() or None,
        "requiredSecrets": entry_required_secrets(entry),
        "enableField": "allowedSkillIds",
    }


def _harness_row(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(entry.get("id") or "").strip(),
        "kind": "harness",
        "description": str(entry.get("description") or "").strip() or None,
        "requiredSecrets": [],
        # Harness profiles are attached via agent ``harness_profile`` — not a session allowlist.
        "enableField": None,
        "note": "Select via agent harnessProfile; not an independent session allowlist",
    }


def build_reach_catalog(
    tool_root: Path | None = None,
    *,
    kinds: Any = None,
) -> dict[str, Any]:
    """Return stock agents/MCPs/skills/harnesses + requiredSecrets for Reach UIs."""
    from orchestration.agent_providers_catalog import load_agent_providers_catalog_merged
    from orchestration.agent_skills_catalog import load_agent_skills_catalog_merged
    from orchestration.dynamic_run import catalog_paths
    from orchestration.mcp_providers_catalog import load_mcp_providers_catalog_merged

    paths = catalog_paths(tool_root)
    want = _parse_kinds(kinds)
    out: dict[str, Any] = {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sessionEnvAllowedKeys": sorted(session_env_allowed_keys(tool_root)),
        "secretLabels": dict(SECRET_LABELS),
        "enableFields": {
            "agents": "allowedAgentProviderIds",
            "mcps": "allowedMcpProviderIds",
            "skills": "allowedSkillIds",
            "harnesses": None,
        },
        "agents": [],
        "mcps": [],
        "skills": [],
        "harnesses": [],
    }

    if want is None or "agents" in want:
        try:
            agents = load_agent_providers_catalog_merged(paths.agent_providers)
        except Exception:  # noqa: BLE001
            agents = []
        out["agents"] = [_agent_row(e) for e in agents if str(e.get("id") or "").strip()]

    if want is None or "mcps" in want:
        try:
            mcps = load_mcp_providers_catalog_merged(paths.mcp_providers)
        except Exception:  # noqa: BLE001
            mcps = []
        out["mcps"] = [_mcp_row(e) for e in mcps if str(e.get("id") or "").strip()]

    if want is None or "skills" in want:
        try:
            skills = load_agent_skills_catalog_merged(paths.agent_skills)
        except Exception:  # noqa: BLE001
            skills = []
        out["skills"] = [_skill_row(e) for e in skills if str(e.get("id") or "").strip()]

    if want is None or "harnesses" in want:
        try:
            import yaml

            root = tool_root or paths.agent_providers.parent.parent
            harness_dir = (root / "config" / "agent_harnesses").resolve()
            harnesses: list[dict[str, Any]] = []
            if harness_dir.is_dir():
                for path in sorted(harness_dir.glob("*.yaml")) + sorted(
                    harness_dir.glob("*.yml")
                ):
                    if path.name.startswith("_"):
                        continue
                    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
                    if isinstance(raw, dict) and str(raw.get("id") or "").strip():
                        harnesses.append(dict(raw))
        except Exception:  # noqa: BLE001
            harnesses = []
        out["harnesses"] = [
            _harness_row(e) for e in harnesses if str(e.get("id") or "").strip()
        ]

    out["counts"] = {
        "agents": len(out["agents"]),
        "mcps": len(out["mcps"]),
        "skills": len(out["skills"]),
        "harnesses": len(out["harnesses"]),
    }
    return out
