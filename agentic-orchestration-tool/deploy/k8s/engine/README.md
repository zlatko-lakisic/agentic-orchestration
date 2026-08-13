# README for the optional Engine API daemon Deployment (Reach / REST clients).
#
# This is additive. The Node web UI (`agentic-coordinator`, NodePort 30487) is unchanged.
#
# ## Ports
#
# | Publish | URL | Notes |
# |---------|-----|--------|
# | hostPort 8765 | `http://<edge-host>:8765` | Preferred Reach client Remote URL |
# | NodePort 30765 | `http://<edge-host>:30765` | Alternate if hostPort is blocked |
# | ClusterIP 8765 | `http://agentic-engine.agentic-orchestration.svc:8765` | In-cluster |
#
# Web UI stays at `http://<edge-host>:30487` — do not point Reach clients there
# (`/api/v1/direct-agent` and `/api/v1/kb/*` only exist on the engine).
#
# ## Shared run store (warm pool)
#
# The engine mounts PVC `agentic-run-store` at `/run/store` and sets
# `AGENTIC_RUN_STORE_PATH=/run/store` (same as coordinator / warm-pool). Explicit
# Deployment env overrides the env Secret's host path (`/var/lib/agentic/run-store`)
# so warm-pool queue files are visible to workers. Without this, Reach/Comstar
# steps enqueue into pod-local disk and hang after `step_start`.
#
# Prerequisite: run-store PVC already applied (`scripts/k8s-apply-run-store.sh` or
# `jetson-k3s-deploy.sh`).
#
# ## Apply (edge)
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
# Header-based only (`x-agentic-user-name`, `x-agentic-session-id` / security gateway).
# Local mode without headers = implicit `local` user. Do not set
# `AGENTIC_REQUIRE_IDENTITY=1` on edge unless a security gateway (or equivalent) fronts :8765.
#
# ## One writer
#
# Reach clients → engine daemon (this Deployment) for KB writes.
# Browser UI → Node spawn of `main.py` (coordinator emptyDir KB).
# Avoid pointing both at the same SQLite file concurrently.
