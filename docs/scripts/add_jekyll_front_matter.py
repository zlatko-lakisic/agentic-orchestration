#!/usr/bin/env python3
"""Add Jekyll YAML front matter to wiki markdown pages."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

PAGE_TITLES: dict[str, str] = {
    "index": "Home",
    "Architecture": "Architecture",
    "Infrastructure": "Infrastructure",
    "Dual-execution-framework": "Dual execution framework",
    "Kubernetes-execution-upgrade": "Kubernetes execution upgrade",
    "Agent-provider-catalog": "Agent provider catalog",
    "MCP-providers": "MCP providers",
    "Workflows-and-router": "Workflows and router",
    "Dynamic-planning": "Dynamic planning",
    "Sessions-learning-and-knowledge-base": "Sessions, learning, and KB",
    "Configuration": "Configuration",
    "Testing-and-CI": "Testing and CI",
    "Releases": "Releases",
    "Web-UI": "Web UI",
    "CLI-reference": "CLI reference",
    "Third-party-projects": "Third-party projects",
    "GitHub-Pages-publish": "GitHub Pages publish",
    "GitLab-Wiki-publish": "GitLab Wiki publish (deprecated)",
}

SKIP_FILES = {"_Footer.md"}


def front_matter(stem: str) -> str:
    title = PAGE_TITLES.get(stem, stem.replace("-", " "))
    if stem == "index":
        permalink = "/"
    else:
        permalink = f"/{stem}/"
    return (
        "---\n"
        f"layout: default\n"
        f"title: {title}\n"
        f"permalink: {permalink}\n"
        "---\n\n"
    )


def add_front_matter(path: Path, *, dry_run: bool) -> bool:
    text = path.read_text(encoding="utf-8")
    if text.startswith("---\n"):
        return False
    updated = front_matter(path.stem) + text
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
        files = sorted(p for p in repo_root.glob("*.md") if p.name not in SKIP_FILES)

    changed = 0
    for path in files:
        if add_front_matter(path, dry_run=args.dry_run):
            changed += 1
            action = "would update" if args.dry_run else "updated"
            print(f"{action}: {path.name}")

    print(f"Done. {changed} file(s) changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
