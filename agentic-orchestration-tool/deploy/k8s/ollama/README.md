# README: in-cluster Ollama (managed_k8s)
#
# Enable:
#   bash agentic-orchestration-tool/scripts/jetson-enable-ollama.sh
#
# Sets AGENTIC_OLLAMA_MODE=managed_k8s and OLLAMA_API_BASE=http://agentic-ollama:11434
# when missing from .env, then syncs the k8s secret.
#
# Bring-your-own / host systemd Ollama (Jetson default today): leave
# OLLAMA_API_BASE=http://host.k3s.internal:11434 and AGENTIC_OLLAMA_MODE=auto|external.
# Do not run this enable script unless you want the stack-owned Deployment.
