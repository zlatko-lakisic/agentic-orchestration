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
# AGENTIC_OLLAMA_IDLE_UNLOAD_SECONDS (default 120). Status:
#   GET http://agentic-ollama:11434/api/agentic/resource-status
#
# Bring-your-own / host systemd Ollama (edge default today): leave
# OLLAMA_API_BASE=http://host.k3s.internal:11434 and AGENTIC_OLLAMA_MODE=auto|external.
# Do not run this enable script unless you want the stack-owned Deployment.
# To put the broker in front of an external daemon, set
# AGENTIC_OLLAMA_RESOURCE_SHARING=1 and AGENTIC_OLLAMA_UPSTREAM to the daemon URL,
# then run: python -m orchestration.ollama_resource_broker
