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
    from orchestration.ollama_ownership import (
        MODE_EXTERNAL,
        MODE_MANAGED_K8S,
        resolve_ollama_mode,
    )

    mode = resolve_ollama_mode()
    if mode in (MODE_MANAGED_K8S, MODE_EXTERNAL):
        from agent_providers.ollama_provider import litellm_api_base_for_ollama

        return litellm_api_base_for_ollama()

    base = int(os.getenv("AGENTIC_WORKFLOW_OLLAMA_PORT_BASE", "21434"))
    span = int(os.getenv("AGENTIC_WORKFLOW_OLLAMA_PORT_SPAN", "6000"))
    if span < 1:
        span = 6000
    digest = hashlib.sha256(instance_key.encode("utf-8")).hexdigest()
    port = base + (int(digest[:8], 16) % span)
    return f"http://127.0.0.1:{port}"
