# Example verticals

Each folder under `examples/verticals/` is an **overlay** (orchestrator context + optional extra agent/MCP YAML). Prefer the CLI **`--example <id>`** on `main.py` so paths stay repo-relative without editing `.env`.

When a vertical ships a **web** entrypoint, it may include `start-web.sh`, `start-web-bg.sh`, and `stop-web.sh` (plus `.ps1` on Windows) in that folder: they resolve the sibling **`agentic-orchestration-web`** repo next to **`agentic-orchestration-tool`**, use a **dedicated default port** so the stock UI can keep using `3847`, and write **`.web-server.pid` / `.web-server.log` beside those scripts** (not inside `agentic-orchestration-web/`).
