---
layout: single
title: "Agent skills"
permalink: /agent-skills/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# Agent skills (shipped catalog)

The tool loads **procedural skill** templates from `agentic-orchestration-tool/config/agent_skills/` (one `*.yaml` per skill unless using a bundle file). Merge additional directories via `AGENTIC_EXTRA_AGENT_SKILLS_PATH` (`;` on Windows, `:` on Unix).

Skills inject **markdown instructions** into task descriptions (default) or agent backstory. They do not add callable tools — use [MCP providers]({{ '/mcp-catalog/' | relative_url }}) for external tools.

Design history and phased rollout: [Agent skills roadmap]({{ '/agent-skills-roadmap/' | relative_url }}).

## Design

Each catalog file is a **single** mapping with at least:

- **`id`** — Stable identifier referenced by workflow YAML / planner JSON.
- **`description`** — What the skill does (human + planner when no `content.summary`).
- **`planner_hint`** — When the planner should attach this skill.
- **`capabilities`** / **`good_for`** — Optional planner context.
- **`user_goal_keywords`** (optional) — Keyword hints for relevance matching and pruning.
- **`required_env`** / **`required_env_any`** (optional) — Credential gating (same pattern as MCP).
- **`required_files`** (optional) — Paths relative to the YAML file's directory; skill is hidden if any file is missing.
- **`content`** — `body:` inline markdown, or `file:` (e.g. `instructions.md`, `SKILL.md` with YAML frontmatter stripped).
- **`content.summary`** (optional) — Short planner-only hint when the body is large.
- **`inject`** — `target` (`task_description` | `backstory` | `both`), optional `heading`, `max_chars`.

## Inventory (repository)

| `id` | Injection | Purpose |
|------|-----------|---------|
| `echo_skill` | task | Smoke test — injects `SKILL_ECHO_OK` marker |
| `echo_backstory_skill` | backstory | Smoke test — backstory injection |
| `release_process` | task | Semver release checklist (`RELEASING.md`, `scripts/release.py`) |
| `pr_review` | task | Structured pull-request review checklist |

`release_process` requires monorepo root files (`RELEASING.md`, `CHANGELOG.md`, `VERSION`) via `required_files`.

## Attachment semantics

Mirror MCP attachment:

| Layer | Field |
|-------|--------|
| Workflow default | `workflow.skills` |
| Per task | `task.skills` |
| Dynamic planner | top-level `skill_ids` and per-step `skill_ids` |
| Force none | `[]` |

CLI: **`--agent-skills-catalog`** (default `config/agent_skills`).

## Workers (subprocess / K8s)

`workflow_materializer` writes `skills` ids and `paths.agent_skills_catalog` into each `StepSpec`. Workers (`python main.py --execute-step`) re-resolve skill content from the catalog when both ids and catalog path are present.

**Kind CI (stub worker):** `docker/Dockerfile.worker-stub` embeds the catalog and `k8s-stub-worker.py` verifies spec handoff (no LLM). See `test_agent_skills_smoke_kind_kubernetes_workflow` in `tests/test_kind_kubernetes_e2e.py`.

## Learning and KB

Per-task **attachment fingerprints** combine MCP + skill ids for learning stats, KB rows, and web UI ratings. JSON events use `attachment_fingerprint` (legacy alias: `mcp_fingerprint`).

## Smoke workflow

Static regression target:

```powershell
python main.py --config config/workflows/workflow_agent_skills_smoke.yaml "skills smoke test"
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `AGENTIC_EXTRA_AGENT_SKILLS_PATH` | Extra skill YAML directories |
| `AGENTIC_AGENT_SKILLS_CATALOG` | Default catalog path when not using CLI flag |
| `AGENTIC_SKILLS_MAX_CHARS_PER_TASK` | Global injected markdown cap (default 24000) |
| `AGENTIC_DISABLE_SKILL_GOAL_MATCH` | Disable auto-attach when planner omits skills |
| `AGENTIC_STRICT_SKILL_IDS` | Fail on unknown planner skill ids (default: warn and drop) |

See [Configuration]({{ '/configuration/' | relative_url }}) and `agentic-orchestration-tool/.env.example`.

## Related

- [Dynamic planning]({{ '/dynamic-planning/' | relative_url }}) — planner `skill_ids` contract
- [MCP providers]({{ '/mcp-catalog/' | relative_url }}) — external tools (complementary)
- [Agent tools roadmap]({{ '/Agent-tools-roadmap/' | relative_url }}) — in-process tools (planned)
- [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}) — `StepSpec` materialization
