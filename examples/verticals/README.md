# Example verticals

These folders live at the **monorepo root** next to `agentic-orchestration-tool/` and `agentic-orchestration-web/`. Each subfolder is an **overlay** (orchestrator context + optional extra agent/MCP YAML). Prefer the CLI **`--example <id>`** on `main.py` (run from `agentic-orchestration-tool/`) so paths resolve without editing `.env`.

When a vertical ships a **web** entrypoint, it may include `start-web.sh`, `start-web-bg.sh`, and `stop-web.sh` (plus `.ps1` on Windows) in that folder: they resolve the sibling **`agentic-orchestration-web`** repo next to **`agentic-orchestration-tool`**, use a **dedicated default port** so the stock UI can keep using `3847`, and write **`.web-server.pid` / `.web-server.log` beside those scripts** (not inside `agentic-orchestration-web/`).

**Adding a vertical:** extend the **Example verticals** table and maintainer checklist in the repo root **[`README.md`](../README.md)** so discoverability stays in one place.
