"""K8s MCP compatibility policy (K0.6 — see wiki Kubernetes-execution-upgrade)."""

from __future__ import annotations

import os

# Streamable HTTP — worker pod calls remote URL; no local subprocess (K3 MVP allowlist).
K8S_NATIVE_MCP_IDS: frozenset[str] = frozenset(
    {
        "search_brave",
        "search_tavily",
        "home_assistant",
    }
)

# Stdio — require sidecar or cluster HTTP gateway before use in K8s (Phase K4).
K8S_STDIO_MCP_IDS: frozenset[str] = frozenset(
    {
        "search_exa",
        "fetch_url",
        "filesystem_local",
        "memory_knowledge_graph",
    }
)

SHIPPED_MCP_IDS: frozenset[str] = K8S_NATIVE_MCP_IDS | K8S_STDIO_MCP_IDS


def k8s_allow_stdio_mcps_from_env() -> bool:
    raw = os.getenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", "0").strip().lower()
    return raw in ("1", "true", "yes", "on")


def is_k8s_native_mcp(mcp_id: str) -> bool:
    return mcp_id in K8S_NATIVE_MCP_IDS


def is_k8s_stdio_mcp(mcp_id: str) -> bool:
    return mcp_id in K8S_STDIO_MCP_IDS


def filter_mcp_ids_for_kubernetes(
    mcp_ids: list[str],
    *,
    allow_stdio: bool | None = None,
) -> tuple[list[str], list[str]]:
    """Return ``(allowed, excluded)`` for ``AGENTIC_EXECUTION_BACKEND=kubernetes``.

    K3 MVP: only ``K8S_NATIVE_MCP_IDS`` unless ``allow_stdio`` or
    ``AGENTIC_K8S_ALLOW_STDIO_MCPS=1`` (sidecar templates required — K4).
    """
    if allow_stdio is None:
        allow_stdio = k8s_allow_stdio_mcps_from_env()
    allowed: list[str] = []
    excluded: list[str] = []
    for mcp_id in mcp_ids:
        if is_k8s_native_mcp(mcp_id):
            allowed.append(mcp_id)
        elif allow_stdio and is_k8s_stdio_mcp(mcp_id):
            allowed.append(mcp_id)
        else:
            excluded.append(mcp_id)
    return allowed, excluded
