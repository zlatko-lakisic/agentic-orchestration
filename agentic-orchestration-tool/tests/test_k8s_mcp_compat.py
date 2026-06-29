from __future__ import annotations

import pytest

from orchestration.k8s_mcp_compat import (
    K8S_NATIVE_MCP_IDS,
    K8S_STDIO_MCP_IDS,
    adapt_mcp_catalog_entry_for_kubernetes,
    apply_kubernetes_mcp_catalog_policy,
    filter_mcp_ids_for_kubernetes,
    is_k8s_native_mcp,
    pod_sidecar_mcp_ids_for_step,
    rewrite_spec_mcps_for_pod_sidecars,
)


@pytest.mark.unit
def test_k8s_native_mcps() -> None:
    assert is_k8s_native_mcp("search_brave")
    assert not is_k8s_native_mcp("fetch_url")


@pytest.mark.unit
def test_filter_mcp_ids_k3_mvp_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_MCP_FETCH_URL", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_POD_SIDECAR_MCPS", raising=False)
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


@pytest.mark.unit
def test_filter_mcp_ids_allows_stdio_with_gateway_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", raising=False)
    monkeypatch.setenv("AGENTIC_K8S_MCP_FETCH_URL", "http://fetch:8080/mcp")
    allowed, excluded = filter_mcp_ids_for_kubernetes(["fetch_url", "memory_knowledge_graph"])
    assert allowed == ["fetch_url"]
    assert excluded == ["memory_knowledge_graph"]


@pytest.mark.unit
def test_adapt_catalog_entry_rewrites_stdio_to_http(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_K8S_MCP_FETCH_URL", "http://fetch:8080/mcp")
    entry = {
        "id": "fetch_url",
        "stdio": {"command": "python", "args": ["-m", "mcp_server_fetch"]},
    }
    adapted = adapt_mcp_catalog_entry_for_kubernetes(entry)
    assert "stdio" not in adapted
    assert adapted["streamable_http"]["url"] == "http://fetch:8080/mcp"


@pytest.mark.unit
def test_filter_mcp_ids_allows_stdio_with_pod_sidecar(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_MCP_FETCH_URL", raising=False)
    monkeypatch.setenv("AGENTIC_K8S_POD_SIDECAR_MCPS", "fetch_url")
    allowed, excluded = filter_mcp_ids_for_kubernetes(["fetch_url", "memory_knowledge_graph"])
    assert allowed == ["fetch_url"]
    assert excluded == ["memory_knowledge_graph"]


@pytest.mark.unit
def test_apply_kubernetes_mcp_catalog_policy_keeps_sidecar_stdio(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.setenv("AGENTIC_K8S_POD_SIDECAR_MCPS", "fetch_url")
    monkeypatch.setenv("AGENTIC_MCP_FETCH_ENABLED", "1")
    entries = [
        {"id": "search_tavily", "streamable_http": {"url": "http://t"}},
        {"id": "fetch_url", "stdio": {"command": "python", "args": []}},
    ]
    kept, excluded = apply_kubernetes_mcp_catalog_policy(entries, verbose=False)
    assert [e["id"] for e in kept] == ["search_tavily", "fetch_url"]
    assert excluded == []


@pytest.mark.unit
def test_apply_kubernetes_mcp_catalog_policy(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.delenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_POD_SIDECAR_MCPS", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_MCP_FETCH_URL", raising=False)
    entries = [
        {"id": "search_tavily", "streamable_http": {"url": "http://t"}},
        {"id": "fetch_url", "stdio": {"command": "python", "args": []}},
    ]
    kept, excluded = apply_kubernetes_mcp_catalog_policy(entries, verbose=False)
    assert [e["id"] for e in kept] == ["search_tavily"]
    assert excluded == ["fetch_url"]


@pytest.mark.unit
def test_rewrite_spec_mcps_for_pod_sidecars() -> None:
    spec = {
        "mcp_providers": [
            {
                "id": "fetch_url",
                "resolved": {"command": "python", "args": ["-m", "mcp_server_fetch"]},
            }
        ]
    }
    out = rewrite_spec_mcps_for_pod_sidecars(spec, ["fetch_url"])
    resolved = out["mcp_providers"][0]["resolved"]
    assert resolved["url"] == "http://127.0.0.1:8080/mcp"
    assert resolved["transport"] == "streamable-http"


@pytest.mark.unit
def test_pod_sidecar_mcp_ids_skips_when_gateway_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_K8S_POD_SIDECAR_MCPS", "fetch_url")
    monkeypatch.setenv("AGENTIC_K8S_MCP_FETCH_URL", "http://cluster-fetch/mcp")
    assert pod_sidecar_mcp_ids_for_step(["fetch_url"]) == []
