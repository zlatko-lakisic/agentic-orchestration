from __future__ import annotations

import pytest

from orchestration.k8s_mcp_compat import (
    K8S_MCP_FILESYSTEM_WORKSPACE_SUBDIR,
    K8S_NATIVE_MCP_IDS,
    K8S_STDIO_MCP_IDS,
    adapt_mcp_catalog_entry_for_kubernetes,
    apply_kubernetes_mcp_catalog_policy,
    filter_mcp_ids_for_kubernetes,
    is_k8s_native_mcp,
    is_session_tunnel_mcp_entry,
    k8s_filesystem_allowed_directory,
    pod_sidecar_mcp_ids_for_step,
    rewrite_spec_mcps_for_pod_sidecars,
    sidecar_containers_for_mcps,
    spec_requires_engine_mcp_tunnel,
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
    monkeypatch.setenv("AGENTIC_K8S_WORKER_STDIO_MCPS", "0")
    ids = list(K8S_NATIVE_MCP_IDS) + list(K8S_STDIO_MCP_IDS)
    allowed, excluded = filter_mcp_ids_for_kubernetes(ids)
    assert set(allowed) == K8S_NATIVE_MCP_IDS
    assert set(excluded) == K8S_STDIO_MCP_IDS


@pytest.mark.unit
def test_filter_mcp_ids_allows_fetch_via_worker_stdio_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_MCP_FETCH_URL", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_POD_SIDECAR_MCPS", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_WORKER_STDIO_MCPS", raising=False)
    allowed, excluded = filter_mcp_ids_for_kubernetes(
        ["search_tavily", "fetch_url", "memory_knowledge_graph"]
    )
    assert allowed == ["search_tavily", "fetch_url"]
    assert excluded == ["memory_knowledge_graph"]


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
def test_filter_mcp_ids_allows_extra_http_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", raising=False)
    monkeypatch.setenv("AGENTIC_K8S_EXTRA_HTTP_MCPS", "plant_knowledge")
    allowed, excluded = filter_mcp_ids_for_kubernetes(["plant_knowledge", "unknown_mcp"])
    assert allowed == ["plant_knowledge"]
    assert excluded == ["unknown_mcp"]


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
    monkeypatch.setenv("AGENTIC_K8S_WORKER_STDIO_MCPS", "0")
    monkeypatch.setenv("AGENTIC_K8S_POD_SIDECAR_MCPS", "fetch_url")
    allowed, excluded = filter_mcp_ids_for_kubernetes(["fetch_url", "memory_knowledge_graph"])
    assert allowed == ["fetch_url"]
    assert excluded == ["memory_knowledge_graph"]


@pytest.mark.unit
def test_filter_mcp_ids_allows_filesystem_via_worker_stdio(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_MCP_FILESYSTEM_URL", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_POD_SIDECAR_MCPS", raising=False)
    monkeypatch.setenv("AGENTIC_K8S_WORKER_STDIO_MCPS", "filesystem_local")
    allowed, excluded = filter_mcp_ids_for_kubernetes(["filesystem_local", "memory_knowledge_graph"])
    assert allowed == ["filesystem_local"]
    assert excluded == ["memory_knowledge_graph"]


@pytest.mark.unit
def test_filter_mcp_ids_allows_weather_via_worker_stdio(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_POD_SIDECAR_MCPS", raising=False)
    monkeypatch.setenv("AGENTIC_K8S_WORKER_STDIO_MCPS", "weather_mcp")
    assert "weather_mcp" in K8S_STDIO_MCP_IDS
    allowed, excluded = filter_mcp_ids_for_kubernetes(["weather_mcp", "memory_knowledge_graph"])
    assert allowed == ["weather_mcp"]
    assert excluded == ["memory_knowledge_graph"]


@pytest.mark.unit
def test_apply_kubernetes_mcp_catalog_policy_keeps_sidecar_stdio(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.setenv("AGENTIC_K8S_POD_SIDECAR_MCPS", "fetch_url")
    monkeypatch.setenv("AGENTIC_K8S_WORKER_STDIO_MCPS", "0")
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
    monkeypatch.setenv("AGENTIC_K8S_WORKER_STDIO_MCPS", "0")
    entries = [
        {"id": "search_tavily", "streamable_http": {"url": "http://t"}},
        {"id": "fetch_url", "stdio": {"command": "python", "args": []}},
    ]
    kept, excluded = apply_kubernetes_mcp_catalog_policy(entries, verbose=False)
    assert [e["id"] for e in kept] == ["search_tavily"]
    assert excluded == ["fetch_url"]


@pytest.mark.unit
def test_is_session_tunnel_mcp_entry() -> None:
    assert is_session_tunnel_mcp_entry(
        {
            "id": "client.calendar_google",
            "streamable_http": {"url": "tunnel://session-mcp/calendar_google"},
        }
    )
    assert not is_session_tunnel_mcp_entry(
        {
            "id": "client.calendar_google",
            "streamable_http": {"url": "https://example.com/mcp"},
        }
    )
    assert not is_session_tunnel_mcp_entry(
        {
            "id": "fetch_url",
            "streamable_http": {"url": "tunnel://session-mcp/fetch"},
        }
    )


@pytest.mark.unit
def test_spec_requires_engine_mcp_tunnel() -> None:
    assert spec_requires_engine_mcp_tunnel(
        {
            "mcp_providers": [
                {
                    "id": "client.filesystem_local",
                    "streamable_http": {"url": "tunnel://session-mcp/filesystem"},
                }
            ]
        }
    )
    assert spec_requires_engine_mcp_tunnel(
        {
            "mcp_providers": [
                {
                    "id": "client.filesystem_local",
                    "url": "http://localhost:8766/t/abc/filesystem",
                    "transport": "streamable-http",
                }
            ]
        }
    )
    assert not spec_requires_engine_mcp_tunnel(
        {"mcp_providers": [{"id": "fetch_url", "stdio": {"command": "uvx"}}]}
    )


@pytest.mark.unit
def test_apply_k8s_policy_keeps_session_tunnel_mcps(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.delenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_EXTRA_HTTP_MCPS", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_POD_SIDECAR_MCPS", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_MCP_FETCH_URL", raising=False)
    monkeypatch.setenv("AGENTIC_K8S_WORKER_STDIO_MCPS", "0")
    tunnel = {
        "id": "client.calendar_google",
        "streamable_http": {
            "url": "tunnel://session-mcp/calendar_google",
            "headers": {},
        },
    }
    entries = [
        {"id": "search_tavily", "streamable_http": {"url": "http://t"}},
        {"id": "fetch_url", "stdio": {"command": "python", "args": []}},
        tunnel,
    ]
    kept, excluded = apply_kubernetes_mcp_catalog_policy(entries, verbose=False)
    kept_ids = [e["id"] for e in kept]
    assert "client.calendar_google" in kept_ids
    assert "search_tavily" in kept_ids
    assert "fetch_url" not in kept_ids
    assert excluded == ["fetch_url"]
    cal = next(e for e in kept if e["id"] == "client.calendar_google")
    assert cal["streamable_http"]["url"] == "tunnel://session-mcp/calendar_google"


@pytest.mark.unit
def test_apply_k8s_policy_keeps_client_https_overlay_mcps(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.delenv("AGENTIC_K8S_EXTRA_HTTP_MCPS", raising=False)
    monkeypatch.setenv("AGENTIC_K8S_WORKER_STDIO_MCPS", "0")
    entries = [
        {
            "id": "client.remote_http",
            "streamable_http": {"url": "https://mcp.example.com/mcp"},
        }
    ]
    kept, excluded = apply_kubernetes_mcp_catalog_policy(entries, verbose=False)
    assert [e["id"] for e in kept] == ["client.remote_http"]
    assert excluded == []
    assert kept[0]["streamable_http"]["url"] == "https://mcp.example.com/mcp"


@pytest.mark.unit
def test_apply_k8s_policy_noop_for_inprocess(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "inprocess")
    entries = [
        {"id": "fetch_url", "stdio": {"command": "python", "args": []}},
        {
            "id": "client.calendar_google",
            "streamable_http": {"url": "tunnel://session-mcp/calendar_google"},
        },
    ]
    kept, excluded = apply_kubernetes_mcp_catalog_policy(entries, verbose=False)
    assert kept is entries
    assert excluded == []


@pytest.mark.unit
def test_session_tunnel_survives_merge_and_resolve(monkeypatch: pytest.MonkeyPatch) -> None:
    """Overlay merge + k8s policy + resolve_workflow_mcp_refs (handoff acceptance path)."""
    import tempfile
    from pathlib import Path

    from orchestration.mcp_providers_catalog import (
        load_mcp_providers_catalog_merged,
        resolve_workflow_mcp_refs,
    )
    from orchestration.mcp_tunnel import (
        register_connection_bridge,
        unregister_connection_bridge,
    )
    from orchestration.session_overlay import (
        overlay_run_context,
        register_overlay,
        reset_overlays_for_tests,
    )

    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "kubernetes")
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("AGENTIC_SERVE_MCP_TUNNEL", "1")
    monkeypatch.delenv("AGENTIC_K8S_EXTRA_HTTP_MCPS", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", raising=False)
    monkeypatch.setenv("AGENTIC_K8S_WORKER_STDIO_MCPS", "0")
    reset_overlays_for_tests()
    unregister_connection_bridge("c1")
    register_connection_bridge("c1", lambda _payload: None)
    try:
        register_overlay(
            user_id="ada",
            session_id="s1",
            connection_id="c1",
            app_id="testapp",
            mcps=[
                {
                    "id": "client.calendar_google",
                    "description": "Google Calendar (session tunnel)",
                    "streamable_http": {
                        "url": "tunnel://session-mcp/calendar_google",
                        "headers": {},
                    },
                }
            ],
            stock_ids={"fetch_url", "search_tavily"},
        )
        with overlay_run_context(user_id="ada", session_id="s1", connection_id="c1"):
            with tempfile.TemporaryDirectory() as td:
                primary = Path(td)
                merged = load_mcp_providers_catalog_merged(primary)
                kept, excluded = apply_kubernetes_mcp_catalog_policy(merged, verbose=False)
                assert "client.calendar_google" not in excluded
                assert any(e.get("id") == "client.calendar_google" for e in kept)
                resolved = resolve_workflow_mcp_refs(["client.calendar_google"], kept)
                assert resolved
                assert isinstance(resolved[0], dict)
                # Prefer localhost over 127.0.0.1 so CrewAI tool names start with a letter.
                assert str(resolved[0].get("url", "")).startswith("http://localhost:")
    finally:
        unregister_connection_bridge("c1")
        reset_overlays_for_tests()


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
def test_pod_sidecar_mcp_ids_skips_when_worker_stdio_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_K8S_POD_SIDECAR_MCPS", "fetch_url")
    monkeypatch.delenv("AGENTIC_K8S_MCP_FETCH_URL", raising=False)
    monkeypatch.delenv("AGENTIC_K8S_WORKER_STDIO_MCPS", raising=False)
    assert pod_sidecar_mcp_ids_for_step(["fetch_url"]) == []


@pytest.mark.unit
def test_pod_sidecar_mcp_ids_skips_when_gateway_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_K8S_POD_SIDECAR_MCPS", "fetch_url")
    monkeypatch.setenv("AGENTIC_K8S_MCP_FETCH_URL", "http://cluster-fetch/mcp")
    assert pod_sidecar_mcp_ids_for_step(["fetch_url"]) == []


@pytest.mark.unit
def test_sidecar_filesystem_mounts_workspace_subpath() -> None:
    containers = sidecar_containers_for_mcps(["filesystem_local"])
    assert len(containers) == 1
    mounts = containers[0]["volumeMounts"]
    assert mounts[0]["mountPath"] == "/workspace"
    assert mounts[0]["subPath"] == K8S_MCP_FILESYSTEM_WORKSPACE_SUBDIR


@pytest.mark.unit
def test_k8s_filesystem_allowed_directory_env_override(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_K8S_MCP_FILESYSTEM_DIR", "/run/store/custom")
    assert k8s_filesystem_allowed_directory() == "/run/store/custom"
