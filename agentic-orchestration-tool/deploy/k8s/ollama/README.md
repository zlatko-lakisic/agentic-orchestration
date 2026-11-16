# README: in-cluster Ollama (managed_k8s)
#
# Enable:
#   bash agentic-orchestration-tool/scripts/jetson-enable-ollama.sh
#
# Sets AGENTIC_OLLAMA_MODE=managed_k8s and OLLAMA_API_BASE=http://agentic-ollama:11434
# when missing from .env, then syncs the k8s secret.
#
# Resource sharing: the Deployment runs a `resource-broker` sidecar on :11434 and
# the ollama daemon on loopback :11435. Clients keep using http://agentic-ollama:11434.
# The broker FIFO-queues when VRAM is busy and unloads idle models after
# AGENTIC_OLLAMA_IDLE_UNLOAD_SECONDS (default 120).
#
# Probes (resource-broker):
#   GET /health  — liveness; in-memory only (never waits on upstream Ollama)
#   GET /ready   — readiness; ≤1s threaded ping of upstream /api/tags
# Deep status (operators / debug; may wait on /api/ps):
#   GET http://agentic-ollama:11434/api/agentic/resource-status
#
# Bring-your-own / host systemd Ollama (edge default today): leave
# OLLAMA_API_BASE=http://host.k3s.internal:11434 and AGENTIC_OLLAMA_MODE=auto|external.
# Do not run this enable script unless you want the stack-owned Deployment.
# To put the broker in front of an external daemon, set
# AGENTIC_OLLAMA_RESOURCE_SHARING=1 and AGENTIC_OLLAMA_UPSTREAM to the daemon URL,
# then run: python -m orchestration.ollama_resource_broker
#
# Jetson unified-memory tuning (optional):
# Set AGENTIC_JETSON_MEMORY_TUNE=1 for jetson-deploy.sh to raise
# vm.vfs_cache_pressure to 200 and vm.min_free_kbytes to 262144 (256 MiB).
# Existing higher values are preserved; the reserve helps GPU/NvMap model loads.
# AGENTIC_JETSON_DROP_CACHES=1 additionally permits a cache drop only when
# MemAvailable is below 1 GiB (override with
# AGENTIC_JETSON_DROP_CACHES_THRESHOLD_KB). For a one-shot recovery after an
# Ollama model_load failure:
#   sudo -v
#   AGENTIC_JETSON_DROP_CACHES=1 \
#     bash agentic-orchestration-tool/scripts/jetson-ollama-memory-tune.sh \
#       --after-model-load-failure
# The script uses sudo for kernel changes and harmlessly skips non-Linux hosts.
# Sysctl changes are runtime-only and revert on reboot unless managed separately.
