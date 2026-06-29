---
layout: default
title: Documentation
permalink: /documentation/
---

# Documentation

Technical reference for the **agentic-orchestration** repository. These pages are synced from the project wiki and track catalogs, CLI flags, architecture, and operations.

New to the project? Start with [Getting started]({{ '/getting-started/' | relative_url }}) or the [Features]({{ '/features/' | relative_url }}) overview.

## Core

| Topic | Page |
|-------|------|
| Repository layout, components, data directories | [Architecture]({{ '/Architecture/' | relative_url }}) |
| Docker Compose, optional Ollama, volumes / networking | [Infrastructure]({{ '/Infrastructure/' | relative_url }}) |
| Static workflows, router mode, `meta` blocks | [Workflows and router]({{ '/Workflows-and-router/' | relative_url }}) |
| `--dynamic`, planner, controller, iterative mode | [Dynamic planning]({{ '/Dynamic-planning/' | relative_url }}) |
| Environment variables (authoritative: `.env.example`) | [Configuration]({{ '/Configuration/' | relative_url }}) |
| CLI flags and modes | [CLI reference]({{ '/CLI-reference/' | relative_url }}) |
| WebSocket UI, `AGENTIC_*` web env, scripts | [Web UI]({{ '/Web-UI/' | relative_url }}) |

## Catalogs

| Topic | Page |
|-------|------|
| Shipped **agent provider** YAML templates | [Agent provider catalog]({{ '/Agent-provider-catalog/' | relative_url }}) |
| Shipped **MCP** catalog (HA, search, Exa, fetch, memory, …) | [MCP providers]({{ '/MCP-providers/' | relative_url }}) |
| Dependencies, upstream projects, licenses | [Third-party projects]({{ '/Third-party-projects/' | relative_url }}) |

## Execution and platform

| Topic | Page |
|-------|------|
| Dual execution framework (CrewAI + pluggable backends) | [Dual execution framework]({{ '/Dual-execution-framework/' | relative_url }}) |
| K8s execution upgrade roadmap (pod-per-step, phased) | [Kubernetes execution upgrade]({{ '/Kubernetes-execution-upgrade/' | relative_url }}) |
| Sessions, learning loop, KB, answer cache | [Sessions, learning, and KB]({{ '/Sessions-learning-and-knowledge-base/' | relative_url }}) |

## Project

| Topic | Page |
|-------|------|
| Unit tests, GitHub Actions CI, test tiers | [Testing and CI]({{ '/Testing-and-CI/' | relative_url }}) |
| Versioning, changelog, GitHub Releases | [Releases]({{ '/Releases/' | relative_url }}) |

When documentation and the repository diverge, prefer the **repository** for filenames, line-accurate behavior, and the latest YAML.
