# README for the optional Engine API daemon Deployment (Reach / REST clients).
#
# This is additive. The Node web UI (`agentic-coordinator`, NodePort 30487) is unchanged.
#
# ## Ports
#
# | Publish | URL | Notes |
# |---------|-----|--------|
# | hostPort 8765 | `http://<jetson>:8765` | Preferred Reach client Remote URL |
# | NodePort 30765 | `http://<jetson>:30765` | Alternate if hostPort is blocked |
# | ClusterIP 8765 | `http://agentic-engine.agentic-orchestration.svc:8765` | In-cluster |
#
# Web UI stays at `http://<jetson>:30487` — do not point Reach clients there
# (`/api/v1/direct-agent` and `/api/v1/kb/*` only exist on the engine).
#
# ## Apply (Jetson)
#
# ```bash
# bash agentic-orchestration-tool/scripts/jetson-enable-engine.sh
# ```
#
# Or via routine deploy (`jetson-deploy.sh` calls the enable script when
# `AGENTIC_JETSON_ENABLE_ENGINE` is unset/1).
#
# ## Identity
#
# Header-based only (`x-agentic-user-name`, `x-agentic-session-id` / Warpgate).
# Local mode without headers = implicit `local` user. Do not set
# `AGENTIC_REQUIRE_IDENTITY=1` on Jetson unless Warpgate (or equivalent) fronts :8765.
#
# ## One writer
#
# Reach clients → engine daemon (this Deployment) for KB writes.
# Browser UI → Node spawn of `main.py` (coordinator emptyDir KB).
# Avoid pointing both at the same SQLite file concurrently.
