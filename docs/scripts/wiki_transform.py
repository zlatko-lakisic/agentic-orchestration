#!/usr/bin/env python3
"""Shared wiki → Minimal Mistakes docs transforms for sync."""

from __future__ import annotations

import re

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

FRONT_MATTER = re.compile(r"\A---\n.*?\n---\n+", re.DOTALL)

PAGE_TITLES: dict[str, str] = {
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
    "Agent-skills": "Agent skills",
    "Agent-skills-roadmap": "Agent skills roadmap",
    "GitHub-Pages-publish": "GitHub Pages publish",
}

# Wiki root filename → docs/ relative path (None = skip sync)
WIKI_OUTPUT: dict[str, str | None] = {
    "Architecture.md": "architecture/index.md",
    "Configuration.md": "configuration/index.md",
    "CLI-reference.md": "cli-reference/index.md",
    "Dynamic-planning.md": "dynamic-planning/index.md",
    "Workflows-and-router.md": "workflows/index.md",
    "MCP-providers.md": "mcp-catalog/index.md",
    "Kubernetes-execution-upgrade.md": "kubernetes-execution-upgrade/index.md",
    "Dual-execution-framework.md": "dual-execution-framework/index.md",
    "Infrastructure.md": "infrastructure/index.md",
    "Testing-and-CI.md": "testing-and-ci/index.md",
    "Web-UI.md": "web-ui/index.md",
    "Sessions-learning-and-knowledge-base.md": "sessions-learning-kb/index.md",
    "Third-party-projects.md": "third-party-projects/index.md",
    "Agent-skills.md": "agent-skills/index.md",
    "Agent-skills-roadmap.md": "agent-skills-roadmap/index.md",
    "Agent-provider-catalog.md": None,
    "Releases.md": None,
    "Home.md": None,
    "GitHub-Pages-publish.md": None,
    "GitLab-Wiki-publish.md": None,
    "_Footer.md": None,
}

# Product / hand-maintained pages — never overwritten by wiki sync
DOCS_PRESERVE = {
    "index.md",
    "features/index.md",
    "quick-start/index.md",
    "execution-backends/index.md",
    "agent-catalog/index.md",
    "verticals/index.md",
    "GitHub-Pages-publish.md",
}

PAGE_SLUGS: dict[str, str] = {
    "Architecture": "architecture",
    "Configuration": "configuration",
    "CLI-reference": "cli-reference",
    "Dynamic-planning": "dynamic-planning",
    "Workflows-and-router": "workflows",
    "MCP-providers": "mcp-catalog",
    "Agent-provider-catalog": "agent-catalog",
    "Kubernetes-execution-upgrade": "kubernetes-execution-upgrade",
    "Dual-execution-framework": "dual-execution-framework",
    "Infrastructure": "infrastructure",
    "Testing-and-CI": "testing-and-ci",
    "Web-UI": "web-ui",
    "Sessions-learning-and-knowledge-base": "sessions-learning-kb",
    "Third-party-projects": "third-party-projects",
    "Agent-skills": "agent-skills",
    "Agent-skills-roadmap": "agent-skills-roadmap",
    "Releases": "changelog",
    "Execution-backends": "execution-backends",
    "features": "features",
    "getting-started": "quick-start",
    "documentation": "documentation",
    "GitHub-Pages-publish": "GitHub-Pages-publish",
}

WIKI_SKIP = set(WIKI_OUTPUT) - {k for k, v in WIKI_OUTPUT.items() if v is None}

GITLAB_PUBLISH_ROW = (
    "| How to publish these files to **GitLab Wiki** | [[GitLab-Wiki-publish]] |"
)
GITHUB_PUBLISH_ROW = (
    "| How to publish the docs site on **GitHub Pages** | "
    "[GitHub Pages publish]({{ '/GitHub-Pages-publish/' | relative_url }}) |"
)


def _slug_for_page(page: str) -> str:
    page = page.strip()
    if page.endswith(".md"):
        page = page[:-3]
    if page in ("Home", "index", "."):
        return ""
    return PAGE_SLUGS.get(page, page)


def _page_href(page: str, anchor: str | None) -> str:
    slug = _slug_for_page(page)
    if not slug:
        href = "{{ '/' | relative_url }}"
    else:
        href = f"{{{{ '/{slug}/' | relative_url }}}}"
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
    text = MD_LINK.sub(convert_md_link, text)
    text = text.replace(GITLAB_PUBLISH_ROW, GITHUB_PUBLISH_ROW)
    return text


def strip_front_matter(text: str) -> str:
    return FRONT_MATTER.sub("", text)


def mm_front_matter(*, title: str, permalink: str, mermaid: bool = False) -> str:
    lines = [
        "---",
        "layout: single",
        f'title: "{title}"',
        f"permalink: {permalink}",
        "toc: true",
        'toc_label: "On this page"',
        'toc_icon: "list"',
        "sidebar:",
        '  nav: "docs"',
    ]
    if mermaid:
        lines.append("mermaid: true")
    lines.extend(["---", ""])
    return "\n".join(lines)


def wiki_to_docs_page(name: str, raw: str) -> tuple[str, str] | None:
    out_rel = WIKI_OUTPUT.get(name)
    if out_rel is None:
        return None
    if out_rel in DOCS_PRESERVE:
        return None

    stem = name[:-3]
    title = PAGE_TITLES.get(stem, stem.replace("-", " "))
    slug = out_rel.removesuffix("/index.md")
    permalink = f"/{slug}/"
    body = convert_text(strip_front_matter(raw))
    fm = mm_front_matter(
        title=title,
        permalink=permalink,
        mermaid="```mermaid" in body,
    )
    return out_rel, fm + body


def changelog_from_repo(changelog_text: str) -> str:
    body = strip_front_matter(changelog_text)
    intro = (
        "Version history for **agentic-orchestration**. "
        "Source: [`CHANGELOG.md`](https://github.com/zlatko-lakisic/agentic-orchestration/blob/main/CHANGELOG.md) "
        "at repo root.\n\n"
    )
    fm = mm_front_matter(title="Changelog", permalink="/changelog/")
    return fm + intro + body
