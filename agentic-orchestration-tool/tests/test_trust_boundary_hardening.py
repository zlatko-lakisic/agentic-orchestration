"""Trust-boundary fixes outside the HTTP layer: mTLS stores, session overlays and env,
custom-tool artifacts, the fetch tool, cloud anonymization, and the knowledge base."""

from __future__ import annotations

import io
import json
import os
import socket
import threading
import zipfile
from pathlib import Path
from typing import Any

import pytest

pytestmark = pytest.mark.unit


# ---- mTLS enrollment / registries ------------------------------------------


def _csr(common_name: str) -> str:
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    csr = (
        x509.CertificateSigningRequestBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)]))
        .sign(key, hashes.SHA256())
    )
    return csr.public_bytes(serialization.Encoding.PEM).decode("utf-8")


@pytest.fixture
def ca_root(tmp_path: Path) -> Path:
    pytest.importorskip("cryptography")
    from orchestration.serve.mtls_ca import init_ca

    init_ca(tmp_path)
    return tmp_path


def test_enroll_token_name_cannot_be_overridden(ca_root: Path) -> None:
    from orchestration.serve.mtls_ca import MtlsCaError, enroll_client, mint_enroll_token

    minted = mint_enroll_token(ca_root, client_name="alice")
    with pytest.raises(MtlsCaError, match="does not match"):
        enroll_client(ca_root, token=minted["token"], csr_pem=_csr("bob"), client_name="bob")
    # The refused attempt did not spend the token; the bound name is what gets issued.
    issued = enroll_client(ca_root, token=minted["token"], csr_pem=_csr("whatever"))
    assert issued["subject"] == "alice"
    with pytest.raises(MtlsCaError, match="already used"):
        enroll_client(ca_root, token=minted["token"], csr_pem=_csr("alice"))


def test_unbound_token_uses_requested_or_csr_name(ca_root: Path) -> None:
    from orchestration.serve.mtls_ca import enroll_client, mint_enroll_token

    a = mint_enroll_token(ca_root)
    assert enroll_client(ca_root, token=a["token"], csr_pem=_csr("carol"))["subject"] == "carol"
    b = mint_enroll_token(ca_root)
    named = enroll_client(ca_root, token=b["token"], csr_pem=_csr("x"), client_name="dave")
    assert named["subject"] == "dave"


def test_bad_csr_does_not_burn_the_token(ca_root: Path) -> None:
    from orchestration.serve.mtls_ca import MtlsCaError, enroll_client, mint_enroll_token

    minted = mint_enroll_token(ca_root)
    with pytest.raises(MtlsCaError, match="invalid CSR"):
        enroll_client(ca_root, token=minted["token"], csr_pem="not a csr")
    # A name that cannot be encoded as a certificate SAN is a clean error, not a crash.
    with pytest.raises(MtlsCaError):
        enroll_client(ca_root, token=minted["token"], csr_pem=_csr("Иван Петров"))
    assert enroll_client(ca_root, token=minted["token"], csr_pem=_csr("erin"))["subject"] == "erin"


def test_single_use_token_survives_concurrent_enrollment(ca_root: Path) -> None:
    from orchestration.serve.mtls_ca import MtlsCaError, enroll_client, mint_enroll_token

    minted = mint_enroll_token(ca_root, client_name="solo")
    csrs = [_csr("solo") for _ in range(4)]
    results: list[str] = []
    barrier = threading.Barrier(len(csrs))

    def _attempt(csr: str) -> None:
        barrier.wait(timeout=10)
        try:
            enroll_client(ca_root, token=minted["token"], csr_pem=csr)
            results.append("ok")
        except MtlsCaError:
            results.append("refused")

    threads = [threading.Thread(target=_attempt, args=(c,)) for c in csrs]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)
    assert results.count("ok") == 1
    assert results.count("refused") == len(csrs) - 1


def test_corrupt_deny_list_fails_closed(ca_root: Path) -> None:
    from orchestration.serve.mtls_ca import (
        MtlsCaError,
        is_peercert_revoked,
        revoke_mtls_client,
        revoked_path,
    )

    cert = {"subject": ((("commonName", "alice"),),), "serialNumber": "0A"}
    assert is_peercert_revoked(ca_root, cert) is False
    revoke_mtls_client(ca_root, subject="mallory")
    assert is_peercert_revoked(ca_root, cert) is False
    revoked_path(ca_root).write_text('[{"subject": "mall', encoding="utf-8")
    # An unreadable deny-list must not admit anyone, and must not be silently rewritten.
    assert is_peercert_revoked(ca_root, cert) is True
    with pytest.raises(MtlsCaError):
        revoke_mtls_client(ca_root, subject="alice")


@pytest.mark.skipif(os.name == "nt", reason="POSIX permission bits")
def test_private_material_is_never_world_readable(ca_root: Path) -> None:
    from orchestration.serve.mtls_ca import (
        ca_key_path,
        issue_server_cert,
        mint_enroll_token,
        server_key_path,
        tokens_path,
    )

    issue_server_cert(ca_root)
    mint_enroll_token(ca_root)
    for path in (ca_key_path(ca_root), server_key_path(ca_root), tokens_path(ca_root)):
        assert path.stat().st_mode & 0o077 == 0, path
    leftovers = [p.name for p in ca_key_path(ca_root).parent.iterdir() if p.name.endswith(".tmp")]
    assert leftovers == []


# ---- identity --------------------------------------------------------------


def test_non_ascii_names_do_not_collapse_onto_the_local_user() -> None:
    from orchestration.user_context import LOCAL_USER_ID, user_id_from_display_name

    ivan = user_id_from_display_name("Иван Петров")
    lei = user_id_from_display_name("李雷")
    assert ivan != LOCAL_USER_ID and lei != LOCAL_USER_ID and ivan != lei
    assert user_id_from_display_name("Иван Петров") == ivan
    assert user_id_from_display_name("Ada Lovelace") == "ada-lovelace"
    assert user_id_from_display_name(None) == LOCAL_USER_ID


# ---- session overlay -------------------------------------------------------


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost.evil.example/mcp",
        "http://127.0.0.1@evil.example/mcp",
        "http://127.0.0.1.evil.example:9000/mcp",
        "https://127.0.0.1:9000/mcp",
        "http://127.0.0.1/mcp",
    ],
)
def test_sandbox_loopback_url_must_really_be_loopback(url: str) -> None:
    from orchestration.session_overlay import _is_sandbox_loopback_url

    assert _is_sandbox_loopback_url(url) is False


def test_sandbox_loopback_url_must_be_an_owned_running_sandbox(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import orchestration.session_overlay as so

    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("AGENTIC_CUSTOM_TOOL_SANDBOX", "1")
    so.reset_overlays_for_tests()
    owned: dict[tuple[str, str], set[int]] = {("ada", "myapp"): {41001}}
    monkeypatch.setattr(
        so,
        "_owned_sandbox_ports",
        lambda *, user_id, app_id: owned.get((user_id, app_id), set()),
    )

    def _register(user: str, port: int) -> Any:
        return so.register_overlay(
            user_id=user,
            session_id="s1",
            connection_id="c1",
            app_id="myapp",
            mcps=[
                {
                    "id": "client.tool",
                    "streamable_http": {"url": f"http://127.0.0.1:{port}/mcp"},
                }
            ],
            stock_ids=set(),
        )

    assert _register("ada", 41001).mcps[0]["id"] == "client.tool"
    # Someone else's sandbox port, or any other local service, is refused.
    with pytest.raises(so.SessionOverlayError, match="not a running custom-tool sandbox"):
        _register("bob", 41001)
    with pytest.raises(so.SessionOverlayError, match="not a running custom-tool sandbox"):
        _register("ada", 8765)
    so.reset_overlays_for_tests()


def test_session_base_url_never_pairs_with_the_process_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import orchestration.session_overlay as so
    from orchestration.session_env import SESSION_KEY_PLACEHOLDER, getenv, guard_session_env

    monkeypatch.setenv("OPENAI_API_KEY", "process-level-secret")
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    so.reset_overlays_for_tests()

    guarded = guard_session_env({"OPENAI_BASE_URL": "https://client.example/v1"})
    assert guarded["OPENAI_API_KEY"] == SESSION_KEY_PLACEHOLDER
    own_key = guard_session_env(
        {"OPENAI_BASE_URL": "https://client.example/v1", "OPENAI_API_KEY": "client-key"}
    )
    assert own_key["OPENAI_API_KEY"] == "client-key"
    assert "OPENAI_API_KEY" not in guard_session_env({"TAVILY_API_KEY": "t"})
    # A client agent entry that re-points the provider counts the same way.
    by_entry = guard_session_env({}, [{"id": "client.a", "openai_base_url": "https://c.example"}])
    assert by_entry["OPENAI_API_KEY"] == SESSION_KEY_PLACEHOLDER

    so.register_overlay(
        user_id="ada",
        session_id="s1",
        connection_id="c1",
        app_id="myapp",
        env={"OPENAI_BASE_URL": "https://client.example/v1"},
        stock_ids=set(),
    )
    with so.overlay_run_context(user_id="ada", session_id="s1", connection_id="c1"):
        assert getenv("OPENAI_BASE_URL") == "https://client.example/v1"
        assert getenv("OPENAI_API_KEY") == SESSION_KEY_PLACEHOLDER
    # Outside the session the process key is untouched.
    assert getenv("OPENAI_API_KEY") == "process-level-secret"
    so.reset_overlays_for_tests()


def test_huggingface_base_url_refused_while_engine_holds_a_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import orchestration.session_overlay as so

    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY_ENSURE_OLLAMA", "0")
    so.reset_overlays_for_tests()
    entry = {
        "id": "client.hf",
        "type": "huggingface",
        "role": "r",
        "goal": "g",
        "backstory": "b",
        "model": "m",
        "huggingface_base_url": "https://client.example",
    }
    kwargs = dict(
        user_id="ada", session_id="s1", connection_id="c1", app_id="myapp", stock_ids=set()
    )
    monkeypatch.setenv("HF_TOKEN", "hf-process-secret")
    with pytest.raises(so.SessionOverlayError, match="huggingface_base_url"):
        so.register_overlay(agents=[entry], **kwargs)
    monkeypatch.delenv("HF_TOKEN")
    monkeypatch.delenv("HUGGINGFACE_API_KEY", raising=False)
    assert so.register_overlay(agents=[entry], **kwargs).agents
    so.reset_overlays_for_tests()


def test_overlay_priority_and_quota_are_clamped_to_operator_policy(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import orchestration.session_overlay as so

    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.delenv("AGENTIC_SERVE_MAX_CLIENT_PRIORITY", raising=False)
    monkeypatch.setenv("AGENTIC_API_TOKENS_DIR", str(tmp_path / "tokens"))
    so.reset_overlays_for_tests()
    kwargs = dict(session_id="s1", connection_id="c1", stock_ids=set(), catalog_root=None)

    greedy = so.register_overlay(
        user_id="ada",
        app_id="myapp",
        max_queue_priority=100,
        default_priority="realtime",
        queue_quota={"maxConcurrentRuns": 999},
        **kwargs,
    )
    assert greedy.max_queue_priority == 75  # default ceiling for identified clients
    assert greedy.default_priority == 75
    assert greedy.queue_quota == {"maxConcurrentRuns": 999}  # only limits itself

    modest = so.register_overlay(user_id="ada", app_id="myapp", max_queue_priority=40, **kwargs)
    assert modest.max_queue_priority == 40

    (tmp_path / "tokens").mkdir()
    (tmp_path / "tokens" / "app-prefs.json").write_text(
        json.dumps(
            {
                "myapp": {
                    "maxQueuePriority": "realtime",
                    "queueQuota": {"maxConcurrentRuns": 2, "weight": 1.0},
                }
            }
        ),
        encoding="utf-8",
    )
    granted = so.register_overlay(
        user_id="ada",
        app_id="myapp",
        max_queue_priority=100,
        queue_quota={"maxConcurrentRuns": 999, "maxQueuedRuns": 5, "weight": 50},
        **kwargs,
    )
    assert granted.max_queue_priority == 100
    assert granted.queue_quota == {"maxConcurrentRuns": 2, "maxQueuedRuns": 5, "weight": 1.0}
    so.reset_overlays_for_tests()


def test_tunnel_url_resolves_only_for_the_owning_session(monkeypatch: pytest.MonkeyPatch) -> None:
    import orchestration.session_overlay as so
    from orchestration.mcp_tunnel import McpTunnelError, McpTunnelHub

    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("AGENTIC_SERVE_MCP_TUNNEL", "1")
    so.reset_overlays_for_tests()
    hub = McpTunnelHub()
    try:
        so.register_overlay(
            user_id="ada",
            session_id="s1",
            connection_id="conn-ada",
            app_id="myapp",
            mcps=[{"id": "client.fs", "streamable_http": {"url": "tunnel://session-mcp/fs"}}],
            stock_ids=set(),
        )
        so.register_overlay(
            user_id="bob",
            session_id="s2",
            connection_id="conn-bob",
            app_id="myapp",
            stock_ids=set(),
        )
        hub.register_bridge("conn-ada", lambda _payload: None)
        with so.overlay_run_context(user_id="ada", session_id="s1", connection_id="conn-ada"):
            url = hub.rewrite_tunnel_url("tunnel://session-mcp/fs", mcp_id="client.fs")
            assert "/t/conn-ada/fs" in url
        # Bob knowing Ada's connection id is not enough.
        with so.overlay_run_context(user_id="bob", session_id="s2", connection_id="conn-ada"):
            with pytest.raises(McpTunnelError):
                hub.rewrite_tunnel_url("tunnel://session-mcp/fs", mcp_id="client.fs")
    finally:
        hub.stop_for_tests()
        so.reset_overlays_for_tests()


# ---- custom tool artifacts -------------------------------------------------


def test_artifact_and_sandbox_paths_stay_inside_their_roots(tmp_path: Path) -> None:
    from orchestration.tool_artifacts import _artifact_dir, artifact_store_root
    from orchestration.tool_sandbox_runtime import sandbox_root

    store = artifact_store_root(tmp_path).resolve()
    evil_user = "../../../../tmp/evil"
    path = _artifact_dir(
        tmp_path,
        user_id=evil_user,
        app_id="app",
        record_key=f"{evil_user}::app::client.app.tool@1.0.0",
    )
    assert store in path.parents
    dotted = _artifact_dir(tmp_path, user_id="..", app_id=".", record_key="..")
    assert store in dotted.parents
    box = sandbox_root(tmp_path, user_id="..", app_id="../x", client_id="client.app.tool")
    assert (tmp_path / "_tool_sandbox").resolve() in box.parents


def test_register_artifact_rejects_free_form_tool_ids(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from orchestration.tool_artifacts import ToolArtifactError, activate_artifact

    monkeypatch.setenv("AGENTIC_CUSTOM_TOOL_SANDBOX", "1")
    with pytest.raises(ToolArtifactError, match="invalid toolId"):
        activate_artifact(
            tool_root=tmp_path,
            user_id="mallory",
            app_id="mine",
            tool_id="client.app.mine@1.0.0/../../../victim/app/victim__app__client.app.t",
            tool_version="1.0.0",
        )


def test_upload_rejects_bad_zip_and_oversized_members(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from orchestration.tool_artifacts import ToolArtifactError, ingest_upload

    monkeypatch.setenv("AGENTIC_CUSTOM_TOOL_SANDBOX", "1")
    with pytest.raises(ToolArtifactError, match="not a valid zip"):
        ingest_upload(tool_root=tmp_path, user_id="ada", app_id="app", zip_bytes=b"nope")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", "{not json")
    with pytest.raises(ValueError, match="manifest"):
        ingest_upload(tool_root=tmp_path, user_id="ada", app_id="app", zip_bytes=buf.getvalue())

    manifest = {
        "contractVersion": "1",
        "toolId": "client.app.bomb",
        "toolVersion": "1.0.0",
        "runtime": "python",
        "wheel": "bomb-1.0.0-py3-none-any.whl",
        "entrypoints": {"mcp": "bomb.server"},
        "permissions": {},
    }
    monkeypatch.setenv("AGENTIC_CUSTOM_TOOL_MAX_UNPACKED_BYTES", str(64 * 1024))
    bomb = io.BytesIO()
    with zipfile.ZipFile(bomb, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest))
        zf.writestr(manifest["wheel"], b"\0" * (4 * 1024 * 1024))  # compresses to a few KB
    assert len(bomb.getvalue()) < 64 * 1024
    with pytest.raises(ToolArtifactError, match="uncompressed"):
        ingest_upload(tool_root=tmp_path, user_id="ada", app_id="app", zip_bytes=bomb.getvalue())


def test_tool_env_withholds_daemon_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.custom_tool_contract import CustomToolManifest
    from orchestration.tool_sandbox_runtime import build_tool_env

    monkeypatch.setenv("OPENAI_API_KEY", "process-level-secret")
    monkeypatch.setenv("AGENTIC_ORCHESTRATE_API_KEY", "inbound-secret")
    monkeypatch.setenv("WEATHER_TOKEN", "operator-approved")
    monkeypatch.delenv("AGENTIC_CUSTOM_TOOL_ENV_PASSTHROUGH", raising=False)
    manifest = CustomToolManifest.from_json(
        {
            "contractVersion": "1",
            "toolId": "client.app.greedy",
            "toolVersion": "1.0.0",
            "runtime": "python",
            "wheel": "greedy-1.0.0-py3-none-any.whl",
            "entrypoints": {"mcp": "greedy.server"},
            # A manifest naming the daemon's secrets must not receive them.
            "permissions": {"env": ["OPENAI_API_KEY", "WEATHER_TOKEN"]},
        }
    )
    env = build_tool_env(port=4242, manifest=manifest, activation_env={"MY_SETTING": "1"})
    assert env["AGENTIC_TOOL_PORT"] == "4242"
    assert env["MY_SETTING"] == "1"
    assert "PATH" in env
    for secret in ("OPENAI_API_KEY", "AGENTIC_ORCHESTRATE_API_KEY", "WEATHER_TOKEN"):
        assert secret not in env
    monkeypatch.setenv("AGENTIC_CUSTOM_TOOL_ENV_PASSTHROUGH", "WEATHER_TOKEN")
    approved = build_tool_env(port=4242, manifest=manifest)
    assert approved["WEATHER_TOKEN"] == "operator-approved"
    assert "OPENAI_API_KEY" not in approved


def test_pip_failure_is_a_sandbox_error_not_a_crash(tmp_path: Path) -> None:
    import sys

    from orchestration.tool_sandbox_runtime import ToolSandboxError, _run_checked

    with pytest.raises(ToolSandboxError, match="failed"):
        _run_checked([sys.executable, "-c", "import sys; sys.exit(3)"], timeout=30, what="step")
    with pytest.raises(ToolSandboxError, match="timed out"):
        _run_checked(
            [sys.executable, "-c", "import time; time.sleep(30)"], timeout=0.5, what="step"
        )


# ---- fetch tool ------------------------------------------------------------


def _resolve_to(monkeypatch: pytest.MonkeyPatch, mapping: dict[str, str]) -> None:
    def fake_getaddrinfo(host: str, port: Any, *args: Any, **kwargs: Any):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (mapping[host], port or 80))]

    monkeypatch.setattr("orchestration.fetch_url_tool.socket.getaddrinfo", fake_getaddrinfo)


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1:8765/api/v1/admin/reach-sessions",
        "http://localhost:11434/api/tags",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.43.0.1/",
        "http://[::1]:8765/health",
        "file:///etc/passwd",
        "http://a b/",
    ],
)
def test_fetch_refuses_internal_targets(url: str, monkeypatch: pytest.MonkeyPatch) -> None:
    pytest.importorskip("crewai")
    from orchestration.fetch_url_tool import FetchUrlBlocked, assert_public_fetch_url

    monkeypatch.delenv("AGENTIC_FETCH_URL_ALLOW_PRIVATE", raising=False)
    monkeypatch.delenv("AGENTIC_FETCH_URL_ALLOWED_HOSTS", raising=False)
    with pytest.raises(FetchUrlBlocked):
        assert_public_fetch_url(url)


def test_fetch_resolves_hostnames_before_trusting_them(monkeypatch: pytest.MonkeyPatch) -> None:
    pytest.importorskip("crewai")
    from orchestration.fetch_url_tool import FetchUrlBlocked, FetchUrlTool, assert_public_fetch_url

    monkeypatch.delenv("AGENTIC_FETCH_URL_ALLOW_PRIVATE", raising=False)
    monkeypatch.delenv("AGENTIC_FETCH_URL_ALLOWED_HOSTS", raising=False)
    _resolve_to(monkeypatch, {"rebind.example": "127.0.0.1", "public.example": "93.184.216.34"})
    with pytest.raises(FetchUrlBlocked):
        assert_public_fetch_url("http://rebind.example/")
    assert_public_fetch_url("https://public.example/page")
    # The tool reports the block instead of raising into the agent loop.
    assert "Fetch blocked" in FetchUrlTool()._run("http://rebind.example/secret")
    monkeypatch.setenv("AGENTIC_FETCH_URL_ALLOWED_HOSTS", "rebind.example")
    assert_public_fetch_url("http://rebind.example/")
    monkeypatch.delenv("AGENTIC_FETCH_URL_ALLOWED_HOSTS")
    monkeypatch.setenv("AGENTIC_FETCH_URL_ALLOW_PRIVATE", "1")
    assert_public_fetch_url("http://127.0.0.1:8765/health")


def test_fetch_revalidates_every_redirect_hop(monkeypatch: pytest.MonkeyPatch) -> None:
    pytest.importorskip("crewai")
    import http.server

    import orchestration.fetch_url_tool as fut

    class _Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *_args: Any) -> None:
            return

        def do_GET(self) -> None:  # noqa: N802
            if self.path == "/hop":
                self.send_response(302)
                self.send_header("Location", "http://internal.example/secret")
                self.end_headers()
                return
            body = b"<html><body>public page</body></html>"
            self.send_response(200)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    try:
        monkeypatch.delenv("AGENTIC_FETCH_URL_ALLOW_PRIVATE", raising=False)
        # Treat the test server's hostname as public; the redirect target is internal.
        monkeypatch.setenv("AGENTIC_FETCH_URL_ALLOWED_HOSTS", "localhost")
        _resolve_to(monkeypatch, {"internal.example": "10.0.0.5", "localhost": "127.0.0.1"})
        monkeypatch.setenv("no_proxy", "localhost,127.0.0.1")
        monkeypatch.setenv("NO_PROXY", "localhost,127.0.0.1")
        assert "public page" in fut.fetch_url_text(f"http://localhost:{port}/ok")
        with pytest.raises(fut.FetchUrlBlocked):
            fut.fetch_url_text(f"http://localhost:{port}/hop")
    finally:
        server.shutdown()
        server.server_close()


# ---- cloud anonymization ---------------------------------------------------


def test_unknown_litellm_prefix_is_treated_as_cloud(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.cloud_anonymize import is_cloud_litellm_model

    monkeypatch.delenv("AGENTIC_CLOUD_PROVIDER_TYPES", raising=False)
    monkeypatch.delenv("AGENTIC_LOCAL_PROVIDER_TYPES", raising=False)
    for model in ("gemini/gemini-2.5-pro", "bedrock/anthropic.claude", "mistral/large", "openrouter/x"):
        assert is_cloud_litellm_model(model) is True, model
    for model in ("ollama/qwen2.5:7b", "ollama_chat/llama3", "vllm/meta", "jetstream/gemma"):
        assert is_cloud_litellm_model(model) is False, model
    assert is_cloud_litellm_model("openai/gpt-4o") is True
    assert is_cloud_litellm_model("gpt-4o") is True
    monkeypatch.setenv("AGENTIC_LOCAL_PROVIDER_TYPES", "mygateway")
    assert is_cloud_litellm_model("mygateway/model") is False


def test_messages_to_unknown_provider_are_redacted(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.cloud_anonymize import clear_token_map, redact_messages_for_cloud

    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    clear_token_map()
    out = redact_messages_for_cloud(
        [{"role": "user", "content": "mail jane.doe@example.com"}],
        litellm_model="gemini/gemini-2.5-pro",
    )
    assert "jane.doe@example.com" not in out[0]["content"]
    clear_token_map()


def test_run_token_map_restores_only_its_own_tokens(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.cloud_anonymize import clear_token_map, redact_for_cloud, run_token_map

    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "1")
    clear_token_map()
    with run_token_map() as restore:
        scrubbed = redact_for_cloud("write to jane.doe@example.com", force=True)
        assert "jane.doe@example.com" not in scrubbed
        answer = f"Sent. {scrubbed} — also [EMAIL:1] from elsewhere."
        restored = restore(answer)
        assert "jane.doe@example.com" in restored
        # A look-alike token minted by another context is left alone, never mis-restored.
        assert "[EMAIL:1]" in restored
        structured = json.dumps({"to": scrubbed.split()[-1]})
        assert json.loads(restore(structured))["to"] == "jane.doe@example.com"
    # The map is gone once the run ends.
    assert "jane.doe@example.com" not in redact_for_cloud("x [EMAIL:1]", force=True)
    clear_token_map()


def test_restore_keeps_structured_answers_parseable(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.cloud_anonymize import clear_token_map, get_token_map, run_token_map

    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "1")
    clear_token_map()
    with run_token_map() as restore:
        token = get_token_map().token_for('Dwayne "The Rock" Johnson', "PERSON")
        answer = json.dumps({"name": token})
        assert json.loads(restore(answer))["name"] == 'Dwayne "The Rock" Johnson'
    clear_token_map()


def test_stored_documents_use_static_placeholders(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from orchestration.cloud_anonymize import clear_token_map, redact_for_storage
    from orchestration.knowledge_base import add_document, search

    monkeypatch.setenv("AGENTIC_KB", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "1")
    clear_token_map()
    assert redact_for_storage("a@example.com and [EMAIL:r1f2e-3] and [FIGURE:2]") == (
        "[EMAIL] and [EMAIL] and [FIGURE:2]"
    )
    add_document(
        tool_root=tmp_path, session_slug="s", user_goal="g", content="alpha contact a@example.com"
    )
    clear_token_map()
    add_document(
        tool_root=tmp_path, session_slug="s", user_goal="g", content="alpha contact b@example.com"
    )
    snippets = [h.content_snippet for h in search(tool_root=tmp_path, query="alpha")]
    assert len(snippets) == 2
    # Two different people must not both be stored as "[EMAIL:1]".
    assert all("[EMAIL]" in s and "[EMAIL:" not in s for s in snippets)
    clear_token_map()


# ---- knowledge base scoping ------------------------------------------------


def test_planner_kb_context_is_scoped_by_user(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from orchestration.knowledge_base import add_document, planner_kb_context

    monkeypatch.setenv("AGENTIC_KB", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "0")
    add_document(
        tool_root=tmp_path,
        session_slug="a",
        user_goal="alice goal",
        content="quarterly merger memo for alice",
        user_id="alice",
    )
    add_document(
        tool_root=tmp_path,
        session_slug="shared",
        user_goal="shared goal",
        content="quarterly memo template",
    )
    for_bob = planner_kb_context(tool_root=tmp_path, user_prompt="quarterly memo", user_id="bob")
    assert "alice" not in for_bob
    assert "shared goal" in for_bob  # rows without an owner stay shared
    for_alice = planner_kb_context(
        tool_root=tmp_path, user_prompt="quarterly memo", user_id="alice"
    )
    assert "alice goal" in for_alice
    # CLI / single-user call shape is unchanged.
    assert "alice goal" in planner_kb_context(tool_root=tmp_path, user_prompt="quarterly memo")


def test_search_allowed_deal_ids(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.knowledge_base import add_document, search

    monkeypatch.setenv("AGENTIC_KB", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "0")
    add_document(tool_root=tmp_path, session_slug="s", user_goal="g", content="kiwi one", deal_id="d1")
    add_document(tool_root=tmp_path, session_slug="s", user_goal="g", content="kiwi two", deal_id="d2")
    add_document(tool_root=tmp_path, session_slug="s", user_goal="g", content="kiwi global")

    def _deals(**kwargs: Any) -> set[str]:
        return {h.deal_id for h in search(tool_root=tmp_path, query="kiwi", limit=12, **kwargs)}

    assert _deals() == {"d1", "d2", ""}
    assert _deals(allowed_deal_ids=["d1"]) == {"d1", ""}
    assert _deals(allowed_deal_ids=[]) == {""}


def test_invalid_deal_id_is_denied_in_server_mode(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from orchestration.deal_auth import DealAccessDenied, check_deal_access

    monkeypatch.setenv("AGENTIC_DEAL_AUTH", "1")
    with pytest.raises(DealAccessDenied):
        check_deal_access(tool_root=tmp_path, user_id="ada", deal_id="!!!")
    assert check_deal_access(tool_root=tmp_path, user_id="ada", deal_id=None) is True
    monkeypatch.delenv("AGENTIC_DEAL_AUTH")
    monkeypatch.delenv("AGENTIC_REQUIRE_IDENTITY", raising=False)
    assert check_deal_access(tool_root=tmp_path, user_id="ada", deal_id="!!!") is True


# ---- attachments -----------------------------------------------------------


def test_text_excerpt_reads_only_the_head(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.attachments import _read_text_excerpt

    path = tmp_path / "big.log"
    path.write_text("head-of-file\n" + "x" * 500_000, encoding="utf-8")

    def _no_full_read(self: Path) -> bytes:
        raise AssertionError("the whole file must not be loaded for an excerpt")

    monkeypatch.setattr(Path, "read_bytes", _no_full_read)
    excerpt = _read_text_excerpt(path, 100)
    assert excerpt.startswith("head-of-file")
    assert len(excerpt) < 1000
