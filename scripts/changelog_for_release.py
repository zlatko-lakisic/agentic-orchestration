#!/usr/bin/env python3
"""Print CHANGELOG body for a version (used by GitHub Release workflow)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHANGELOG = ROOT / "CHANGELOG.md"


def section_for_version(version: str) -> str:
    text = CHANGELOG.read_text(encoding="utf-8")
    # Match ## [X.Y.Z] - date through next ## [ or EOF
    pattern = re.compile(
        rf"^## \[{re.escape(version)}\][^\n]*\n(.*?)(?=^## \[|\Z)",
        re.MULTILINE | re.DOTALL,
    )
    match = pattern.search(text)
    if not match:
        raise SystemExit(f"No CHANGELOG section for version {version!r}")
    body = match.group(1).strip()
    if not body:
        raise SystemExit(f"Empty CHANGELOG section for version {version!r}")
    return body


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: changelog_for_release.py X.Y.Z")
    ver = sys.argv[1].lstrip("v")
    print(section_for_version(ver))


if __name__ == "__main__":
    main()
