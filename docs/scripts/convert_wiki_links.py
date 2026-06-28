#!/usr/bin/env python3
"""Convert wiki [[Page]] and .md links to Jekyll pretty-permalink URLs."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

WIKI_LINK = re.compile(
    r"\[\["
    r"(?P<page>[^\]|#]+)"
    r"(?:#(?P<anchor>[^\]|]+))?"
    r"(?:\|(?P<label>[^\]]+))?"
    r"\]\]"
)

MD_LINK = re.compile(
    r"\]\("
    r"(?P<page>[^)#/]+?)"
    r"(?:\.md)?"
    r"/?"
    r"(?:#(?P<anchor>[^)]+))?"
    r"\)"
)


def _page_href(page: str, anchor: str | None) -> str:
    page = page.strip()
    if page.endswith(".md"):
        page = page[:-3]
    if page in (".", "index", "Home"):
        href = "/"
    else:
        href = f"{page}/"
    if anchor:
        href += f"#{anchor.lower()}"
    return href


def convert_wiki_link(match: re.Match[str]) -> str:
    page = match.group("page").strip()
    anchor = match.group("anchor")
    label = match.group("label") or page.replace("-", " ")
    return f"[{label}]({_page_href(page, anchor)})"


def convert_md_link(match: re.Match[str]) -> str:
    page = match.group("page").strip()
    anchor = match.group("anchor")
    return f"]({_page_href(page, anchor)})"


def convert_text(text: str) -> str:
    text = WIKI_LINK.sub(convert_wiki_link, text)
    return MD_LINK.sub(convert_md_link, text)


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
