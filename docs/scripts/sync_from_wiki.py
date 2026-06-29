#!/usr/bin/env python3
"""Sync markdown pages from agentic-orchestration.wiki into docs/ (Minimal Mistakes)."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

from wiki_transform import DOCS_PRESERVE, WIKI_OUTPUT, changelog_from_repo, wiki_to_docs_page


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
        if src.name not in WIKI_OUTPUT:
            continue
        result = wiki_to_docs_page(src.name, src.read_text(encoding="utf-8"))
        if result is None:
            continue
        out_rel, content = result
        if out_rel in DOCS_PRESERVE:
            continue
        dst = docs_dir / out_rel
        if dst.exists() and dst.read_text(encoding="utf-8") == content:
            continue
        if not dry_run:
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text(content, encoding="utf-8")
        updated += 1
        action = "would update" if dry_run else "updated"
        print(f"{action}: {src.name} -> {out_rel}")
    return updated


def sync_changelog(repo_root: Path, docs_dir: Path, *, dry_run: bool) -> bool:
    src = repo_root / "CHANGELOG.md"
    if not src.is_file():
        return False
    content = changelog_from_repo(src.read_text(encoding="utf-8"))
    dst = docs_dir / "changelog" / "index.md"
    if dst.exists() and dst.read_text(encoding="utf-8") == content:
        return False
    if not dry_run:
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(content, encoding="utf-8")
    print(f"{'would update' if dry_run else 'updated'}: CHANGELOG.md -> changelog/index.md")
    return True


def regen_agent_catalog(docs_dir: Path, *, dry_run: bool) -> bool:
    script = docs_dir / "scripts" / "generate_agent_catalog_md.py"
    if not script.is_file():
        return False
    if dry_run:
        print("would run: generate_agent_catalog_md.py")
        return False
    subprocess.run([sys.executable, str(script)], check=True)
    body_path = docs_dir / "agent-catalog" / "_catalog_body.md"
    index_path = docs_dir / "agent-catalog" / "index.md"
    if not body_path.is_file():
        return False
    intro = """---
title: "Agent Catalog"
layout: single
permalink: /agent-catalog/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---

The planner selects from this catalog automatically during `--dynamic` runs. Constrain selection with `--dynamic-agent-provider-ids ID1,ID2`. Add providers via YAML directories or Python classes.

Regenerate tables: `python scripts/generate_agent_catalog_md.py` then `python scripts/sync_from_wiki.py`.

## Shipped providers

"""
    index_path.write_text(intro + body_path.read_text(encoding="utf-8"), encoding="utf-8")
    print("updated: agent-catalog/index.md from YAML")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--wiki-dir",
        type=Path,
        help="Path to agentic-orchestration.wiki checkout (default: sibling of main repo)",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-catalog", action="store_true", help="Skip agent catalog regen")
    args = parser.parse_args()

    docs_dir = Path(__file__).resolve().parents[1]
    repo_root = docs_dir.parent
    wiki_dir = (args.wiki_dir or default_wiki_dir(docs_dir)).resolve()
    if not wiki_dir.is_dir():
        print(f"Wiki directory not found: {wiki_dir}", file=sys.stderr)
        return 1

    print(f"Syncing from {wiki_dir}")
    print(f"           to {docs_dir}")
    pages = sync_pages(wiki_dir, docs_dir, dry_run=args.dry_run)
    assets = sync_assets(wiki_dir, docs_dir, dry_run=args.dry_run)
    changelog = sync_changelog(repo_root, docs_dir, dry_run=args.dry_run)
    catalog = False
    if not args.skip_catalog:
        catalog = regen_agent_catalog(docs_dir, dry_run=args.dry_run)
    changed = pages + assets + int(changelog) + int(catalog)
    print(f"Done. {changed} item(s) changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
