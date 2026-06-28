#!/usr/bin/env python3
"""Convert wiki [[Page]] and .md links to Jekyll pretty-permalink URLs."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from wiki_transform import convert_text


def convert_file(path: Path, *, dry_run: bool) -> bool:
    original = path.read_text(encoding="utf-8")
    updated = convert_text(original)
    if updated == original:
        return False
    if not dry_run:
        path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    if args.paths:
        files = [p.resolve() for p in args.paths]
    else:
        files = sorted(
            p for p in repo_root.glob("*.md") if p.name not in {"_Footer.md"}
        )

    changed = 0
    for path in files:
        if convert_file(path, dry_run=args.dry_run):
            changed += 1
            action = "would update" if args.dry_run else "updated"
            print(f"{action}: {path.name}")

    print(f"Done. {changed} file(s) changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
