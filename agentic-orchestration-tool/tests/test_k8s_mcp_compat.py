from __future__ import annotations

import pytest

from orchestration.k8s_mcp_compat import (
    K8S_NATIVE_MCP_IDS,
    K8S_STDIO_MCP_IDS,
    filter_mcp_ids_for_kubernetes,
    is_k8s_native_mcp,
)


@pytest.mark.unit
def test_k8s_native_mcps() -> None:
    assert is_k8s_native_mcp("search_brave")
    assert not is_k8s_native_mcp("fetch_url")


@pytest.mark.unit
def test_filter_mcp_ids_k3_mvp_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", raising=False)
    ids = list(K8S_NATIVE_MCP_IDS) + list(K8S_STDIO_MCP_IDS)
    allowed, excluded = filter_mcp_ids_for_kubernetes(ids)
    assert set(allowed) == K8S_NATIVE_MCP_IDS
    assert set(excluded) == K8S_STDIO_MCP_IDS


@pytest.mark.unit
def test_filter_mcp_ids_allows_stdio_when_flag_set(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", "1")
    ids = ["search_tavily", "fetch_url", "unknown_mcp"]
    allowed, excluded = filter_mcp_ids_for_kubernetes(ids)
    assert allowed == ["search_tavily", "fetch_url"]
    assert excluded == ["unknown_mcp"]
