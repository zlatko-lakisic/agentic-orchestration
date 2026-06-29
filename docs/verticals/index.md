---
title: "Verticals"
layout: single
sidebar:
  nav: "docs"
toc: true
toc_sticky: true
---

A **vertical overlay** bundles domain-specific orchestrator context, optional extra agent-provider YAML, optional MCP catalog YAML, and optional web start scripts — without forking the core tool.

Overlays live under `examples/verticals/<id>/` at the monorepo root.

## Healthcare

**CLI flag:** `--example healthcare`

| | |
|---|---|
| **Use case** | Medtech evidence research, commercial brief generation |
| **Adds** | Healthcare orchestrator context, specialist agent templates |
| **Web** | `npm run start:healthcare` (default port **3850**) |

```bash
cd agentic-orchestration-tool
python main.py --example healthcare --dynamic \
  "Draft a commercial brief for a novel oncology biomarker"
```

```bash
cd agentic-orchestration-web
npm run start:healthcare
```

![Healthcare banner](https://raw.githubusercontent.com/zlatko-lakisic/agentic-orchestration/main/examples/verticals/healthcare/banner.png)

## Logistics

**CLI flag:** `--example logistics`

| | |
|---|---|
| **Use case** | Warehousing, WMS/ERP integration, labor planning |
| **Adds** | Warehouse context, simulated WMS/ERP MCP fixtures |
| **Web** | `npm run start:logistics` (default port **3851**) |

```bash
cd agentic-orchestration-tool
python main.py --example logistics --dynamic \
  "Analyze current warehouse utilization and flag bottlenecks"
```

```bash
cd agentic-orchestration-web
npm run start:logistics
```

![Logistics banner](https://raw.githubusercontent.com/zlatko-lakisic/agentic-orchestration/main/examples/verticals/logistics/banner.png)

## How overlays load

| Surface | Mechanism |
|---|---|
| CLI | `python main.py --example <id>` via `orchestration/example_overlays.py` |
| Web | `AGENTIC_EXAMPLE=<id>` or `node server.mjs --example <id>` |

Optional MCP entries stay hidden until you set their env gates in `.env`.

## Build a custom vertical

1. Create `examples/verticals/<id>/` with `README.md`, optional `orchestrator-context.md`, `agent_providers/`, `mcp_providers/`.
2. Register `<id>` in `example_overlays.py` and `main.py` `--example` choices.
3. Add `npm run start:<id>` in `agentic-orchestration-web/package.json` if you want a one-command web entry.

Full maintainer guide: [`examples/verticals/README.md`](https://github.com/zlatko-lakisic/agentic-orchestration/blob/main/examples/verticals/README.md).
