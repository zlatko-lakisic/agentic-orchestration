# Example verticals

These folders live at the **monorepo root** next to `agentic-orchestration-tool/` and `agentic-orchestration-web/`. Each subfolder is an **overlay**: orchestrator context, optional extra agent-provider YAML, optional MCP catalog YAML, and sometimes **web start/stop scripts** that target both packages without duplicating application code.

**Discovery index** — keep this table aligned with folders under `examples/verticals/` and with the same table in the repo root [`README.md`](../README.md).

| ID | Folder | CLI (`main.py`, from `agentic-orchestration-tool/`) | Web (`agentic-orchestration-web`) | Default example web port¹ | README |
|----|--------|------------------------------------------------------|-----------------------------------|----------------------------|--------|
| `healthcare` | [`healthcare/`](healthcare/) | `--example healthcare` | `npm run start:healthcare` → [`package.json`](../agentic-orchestration-web/package.json) script `start:healthcare` | `3850` | [`healthcare/README.md`](healthcare/README.md) |

¹Per-vertical scripts under `healthcare/` default **`AGENTIC_WEB_PORT`** to **3850** so the stock UI can stay on **3847**. Override with env when starting those scripts.

## How it works

- **CLI:** `python main.py --example <id> …` loads paths from `<repo>/examples/verticals/<id>/` via [`agentic-orchestration-tool/orchestration/example_overlays.py`](../agentic-orchestration-tool/orchestration/example_overlays.py). Valid `<id>` values are defined in [`agentic-orchestration-tool/main.py`](../agentic-orchestration-tool/main.py) (`--example` choices).
- **Web:** [`agentic-orchestration-web/server.mjs`](../agentic-orchestration-web/server.mjs) honors `AGENTIC_EXAMPLE=<id>` (or `node server.mjs --example <id>`) and passes `--example <id>` into spawned `main.py` runs. Add matching **`npm run start:<id>`** scripts in [`package.json`](../agentic-orchestration-web/package.json) when you introduce a new vertical that should be one command from the web package.

When a vertical ships **web scripts** in its own folder, they may include `start-web.sh`, `start-web-bg.sh`, and `stop-web.sh` (plus `.ps1` on Windows): they resolve the sibling **`agentic-orchestration-web`** next to **`agentic-orchestration-tool`**, and write **`.web-server.pid` / `.web-server.log` beside those scripts** (see [`.gitignore`](../.gitignore) patterns under `examples/**`).

## Related (not the same as a vertical)

- **Routable workflow YAML** for healthcare-style *fixed* crews lives in the tool under [`agentic-orchestration-tool/config/workflows/workflow_healthcare_commercial_brief.yaml`](../agentic-orchestration-tool/config/workflows/workflow_healthcare_commercial_brief.yaml) (router mode). That is separate from the **`--example healthcare`** overlay, which mainly affects **dynamic** orchestrator context and merged catalogs.

## Adding or renaming a vertical

1. Add `examples/verticals/<id>/` with a **`README.md`** describing the scenario, env gates, and scripts.
2. Wire **`--example <id>`** in `example_overlays.py` + `main.py` argparse `choices`.
3. Wire **web**: `server.mjs` (`applyExampleOverlayFromEnv` / spawn argv) and **`package.json`** `start:<id>` if you want a one-liner from the web package.
4. Update **this file’s table** and the **Example verticals** table + maintainer bullets in the root [`README.md`](../README.md).
