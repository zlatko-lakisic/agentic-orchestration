#!/usr/bin/env python3
"""Generate docs/agent-catalog/index.md body tables from agent provider YAML."""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path

import yaml

TOOL = Path(__file__).resolve().parents[2] / "agentic-orchestration-tool"
OUT = Path(__file__).resolve().parents[1] / "agent-catalog" / "_catalog_body.md"

TYPE_ENV = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "huggingface": "HF_TOKEN",
    "ollama": "OLLAMA_HOST",
    "vllm": "VLLM_BASE_URL",
    "jetstream": "JETSTREAM_BASE_URL",
}

TYPE_ORDER = ["openai", "anthropic", "ollama", "huggingface", "vllm", "jetstream"]


def _hw(data: dict) -> str:
    hw = data.get("hardware") or {}
    arch = hw.get("architecture")
    if isinstance(arch, list):
        return ", ".join(str(a) for a in arch)
    if arch:
        return str(arch)
    mvg = data.get("min_vram_gb")
    if mvg is not None:
        return f"min_vram {mvg} GiB"
    return "—"


def _esc(s: str) -> str:
    return s.replace("|", "\\|").replace("\n", " ")


def main() -> None:
    root = TOOL / "config" / "agent_providers"
    by_type: dict[str, list[dict]] = defaultdict(list)
    for path in sorted(root.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        t = str(data.get("type", "unknown"))
        by_type[t].append(
            {
                "id": str(data.get("id", path.stem)),
                "model": str(data.get("model", "—")),
                "role": str(data.get("role", "—")),
                "hint": str(data.get("planner_hint") or data.get("good_for") or "—"),
                "hw": _hw(data),
                "env": TYPE_ENV.get(t, "—"),
                "gp": "✓" if data.get("general_purpose") else "",
            }
        )

    lines: list[str] = []
    for t in TYPE_ORDER + sorted(k for k in by_type if k not in TYPE_ORDER):
        entries = by_type.get(t)
        if not entries:
            continue
        lines.append(f"### {t} ({len(entries)} providers)\n")
        lines.append("| ID | Model | Role | Good for | Hardware | Env | GP |")
        lines.append("|---|---|---|---|---|---|---|")
        for e in entries:
            lines.append(
                "| `{id}` | {model} | {role} | {hint} | {hw} | {env} | {gp} |".format(
                    id=_esc(e["id"]),
                    model=_esc(e["model"][:40]),
                    role=_esc(e["role"][:50]),
                    hint=_esc(e["hint"][:70]),
                    hw=_esc(e["hw"][:30]),
                    env=e["env"],
                    gp=e["gp"],
                )
            )
        lines.append("")
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} ({sum(len(v) for v in by_type.values())} providers)")


if __name__ == "__main__":
    main()
