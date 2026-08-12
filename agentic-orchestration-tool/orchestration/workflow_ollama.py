from __future__ import annotations

import hashlib
import os


def resolve_workflow_ollama_host(instance_key: str) -> str:
    """Resolve the ``ollama_host: workflow`` catalog token.

    - ``managed_k8s`` / ``external``: use shared ``OLLAMA_API_BASE`` / ``OLLAMA_HOST``
      (in-cluster Service or operator-managed daemon). Never invent a loopback port —
      k8s warm-pool / worker pods cannot reach the coordinator's 127.0.0.1.
    - Otherwise (local CLI / managed_process): map the workflow ``instance_key`` to a
      dedicated loopback URL so each workflow can own its own Ollama port.
    """
    mode = os.getenv("AGENTIC_OLLAMA_MODE", "").strip().lower()
    if mode in ("managed_k8s", "external"):
        raw = (
            os.getenv("OLLAMA_API_BASE", "").strip()
            or os.getenv("OLLAMA_HOST", "").strip()
            or "http://127.0.0.1:11434"
        )
        if "://" not in raw:
            raw = f"http://{raw}"
        return raw.rstrip("/")

    base = int(os.getenv("AGENTIC_WORKFLOW_OLLAMA_PORT_BASE", "21434"))
    span = int(os.getenv("AGENTIC_WORKFLOW_OLLAMA_PORT_SPAN", "6000"))
    if span < 1:
        span = 6000
    digest = hashlib.sha256(instance_key.encode("utf-8")).hexdigest()
    port = base + (int(digest[:8], 16) % span)
    return f"http://127.0.0.1:{port}"
