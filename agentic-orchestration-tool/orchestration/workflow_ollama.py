from __future__ import annotations

import hashlib
import os


def resolve_workflow_ollama_host(instance_key: str) -> str:
    """Map a workflow to a dedicated loopback URL so each workflow uses its own Ollama port."""
    base = int(os.getenv("AGENTIC_WORKFLOW_OLLAMA_PORT_BASE", "21434"))
    span = int(os.getenv("AGENTIC_WORKFLOW_OLLAMA_PORT_SPAN", "6000"))
    if span < 1:
        span = 6000
    digest = hashlib.sha256(instance_key.encode("utf-8")).hexdigest()
    port = base + (int(digest[:8], 16) % span)
    return f"http://127.0.0.1:{port}"
