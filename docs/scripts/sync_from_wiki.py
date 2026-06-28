#!/usr/bin/env python3
"""Sync markdown pages from agentic-orchestration.wiki into docs/."""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from wiki_transform import DOCS_PRESERVE, WIKI_SKIP, wiki_to_docs_page


def default_wiki_dir(docs_dir: Path) -> Path:
    candidate = docs_dir.parent.parent / "agentic-orchestration.wiki"
    if candidate.is_dir():
        return candidate
    return docs_dir.parent / "agentic-orchestration.wiki"


def sync_assets(wiki_dir: Path, docs_dir: Path, *, dry_run: bool) -> int:
    src = wiki_dir / "assets"
    dst = docs_dir / "assets"
    if not src.is_dir():
        return 0
    dst.mkdir(parents=True, exist_ok=True)
    copied = 0
    for path in sorted(src.iterdir()):
        if not path.is_file():
            continue
        target = dst / path.name
        if path.name == "logo.png" and target.exists():
            continue
        if target.exists() and target.read_bytes() == path.read_bytes():
            continue
        if not dry_run:
            shutil.copy2(path, target)
        copied += 1
        action = "would copy" if dry_run else "copied"
        print(f"{action} asset: {path.name}")
    return copied


def sync_pages(wiki_dir: Path, docs_dir: Path, *, dry_run: bool) -> int:
    updated = 0
    for src in sorted(wiki_dir.glob("*.md")):
        if src.name in WIKI_SKIP:
            continue
        out_name, content = wiki_to_docs_page(src.name, src.read_text(encoding="utf-8"))
        if out_name in DOCS_PRESERVE:
            continue
        dst = docs_dir / out_name
        if dst.exists() and dst.read_text(encoding="utf-8") == content:
            continue
        if not dry_run:
            dst.write_text(content, encoding="utf-8")
        updated += 1
        action = "would update" if dry_run else "updated"
        print(f"{action}: {src.name} -> {out_name}")
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--wiki-dir",
        type=Path,
        help="Path to agentic-orchestration.wiki checkout (default: sibling of main repo)",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    docs_dir = Path(__file__).resolve().parents[1]
    wiki_dir = (args.wiki_dir or default_wiki_dir(docs_dir)).resolve()
    if not wiki_dir.is_dir():
        print(f"Wiki directory not found: {wiki_dir}", file=sys.stderr)
        return 1

    print(f"Syncing from {wiki_dir}")
    print(f"           to {docs_dir}")
    pages = sync_pages(wiki_dir, docs_dir, dry_run=args.dry_run)
    assets = sync_assets(wiki_dir, docs_dir, dry_run=args.dry_run)
    print(f"Done. {pages} page(s), {assets} asset(s) changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
