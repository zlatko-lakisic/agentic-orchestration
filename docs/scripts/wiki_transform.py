#!/usr/bin/env python3
"""Shared wiki → Jekyll transforms for docs sync."""

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
    "index": "Documentation",
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
}

WIKI_SKIP = {"_Footer.md", "GitLab-Wiki-publish.md"}
DOCS_PRESERVE = {"GitHub-Pages-publish.md"}

GITLAB_PUBLISH_ROW = (
    "| How to publish these files to **GitLab Wiki** | [[GitLab-Wiki-publish]] |"
)
GITHUB_PUBLISH_ROW = (
    "| How to publish the docs site on **GitHub Pages** | "
    "[GitHub Pages publish](GitHub-Pages-publish/) |"
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


def strip_front_matter(text: str) -> str:
    return FRONT_MATTER.sub("", text)


def front_matter(stem: str) -> str:
    title = PAGE_TITLES.get(stem, stem.replace("-", " "))
    permalink = "/" if stem == "index" else f"/{stem}/"
    return (
        "---\n"
        f"layout: default\n"
        f"title: {title}\n"
        f"permalink: {permalink}\n"
        "---\n\n"
    )


def transform_home_to_index(text: str) -> str:
    text = text.replace("# Agentic Orchestration — Wiki home", "# Agentic Orchestration")
    text = text.replace("This wiki mirrors", "Documentation for")
    text = text.replace("## Wiki map", "## Documentation map")
    text = text.replace(GITLAB_PUBLISH_ROW, GITHUB_PUBLISH_ROW)
    text = text.replace(
        "When the wiki and repo diverge",
        "When the documentation and repository diverge",
    )
    return text


def wiki_to_docs_page(name: str, raw: str) -> tuple[str, str]:
    body = strip_front_matter(raw)
    if name == "Home.md":
        body = transform_home_to_index(body)
        out_name = "index.md"
        stem = "index"
    else:
        out_name = name
        stem = out_name[:-3]
    body = convert_text(body)
    return out_name, front_matter(stem) + body
