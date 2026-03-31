"""One-off / maintenance: ensure each provider YAML declares min_vram_gb (Ollama: GiB heuristic)."""

from __future__ import annotations

import sys
from pathlib import Path

import yaml

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from orchestration.hardware_profile import (  # noqa: E402
    _heuristic_min_vram_gb_for_ollama_model,
)


def _fmt_vram(v: float) -> str:
    return str(int(v)) if v == int(v) else str(v)


def patch_ollama_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "min_vram_gb:" in text:
        return False
    data = yaml.safe_load(text) or {}
    if str(data.get("type", "")).strip().lower() != "ollama":
        return False
    model = str(data.get("model", "") or "")
    v = _heuristic_min_vram_gb_for_ollama_model(model)
    if v is None:
        v = 8.0
    lines = text.splitlines(keepends=True)
    out: list[str] = []
    inserted = False
    for ln in lines:
        out.append(ln)
        if not inserted and ln.strip() == "type: ollama":
            out.append(f"min_vram_gb: {_fmt_vram(v)}\n")
            inserted = True
    if not inserted:
        return False
    path.write_text("".join(out), encoding="utf-8")
    return True


def patch_openai_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "min_vram_gb:" in text:
        return False
    lines = text.splitlines(keepends=True)
    out: list[str] = []
    inserted = False
    for ln in lines:
        out.append(ln)
        if not inserted and ln.strip() == "type: openai":
            out.append("min_vram_gb: 0  # cloud API — no local GPU memory required\n")
            inserted = True
    if not inserted:
        return False
    path.write_text("".join(out), encoding="utf-8")
    return True


def main() -> None:
    prov = _ROOT / "config" / "agent_providers"
    ollama_n = 0
    for path in sorted(prov.glob("ollama_*.yaml")):
        if patch_ollama_file(path):
            ollama_n += 1
    gpt_n = 0
    for path in sorted(prov.glob("gpt_*.yaml")):
        if patch_openai_file(path):
            gpt_n += 1
    print(f"Patched {ollama_n} Ollama + {gpt_n} OpenAI agent-provider YAML files.")


if __name__ == "__main__":
    main()
