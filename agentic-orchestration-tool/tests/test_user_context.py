"""Python port parity for agentic-orchestration-web/test/user-context.test.mjs."""

from __future__ import annotations

import re

import pytest

from orchestration.user_context import (
    DEFAULT_SESSION_ID_HEADERS,
    DEFAULT_USER_NAME_HEADERS,
    Identity,
    IdentityRequiredError,
    LOCAL_USER_ID,
    auth_profile_from_request_headers,
    generate_web_session_id,
    normalize_avatar_url,
    require_identity_enabled,
    resolve_auth_display_name,
    resolve_identity,
    resolve_session_id_from_headers,
    sanitize_logout_url,
    sanitize_session_id,
    sanitize_user_display_name,
    session_id_from_request_headers,
    user_display_name_spawn_env,
    user_id_from_display_name,
    user_name_from_peercert,
    user_name_from_request_headers,
)


pytestmark = pytest.mark.unit

WEB_SESSION_RE = re.compile(r"^web-[a-f0-9]{12}$")


def test_user_name_from_request_headers_reads_configured_header() -> None:
    name = user_name_from_request_headers(
        {"x-agentic-user-name": "Zlatko"},
        "x-agentic-user-name",
    )
    assert name == "Zlatko"


def test_user_name_from_request_headers_falls_back_to_x_user_name() -> None:
    name = user_name_from_request_headers({"x-user-name": "Alex"}, DEFAULT_USER_NAME_HEADERS)
    assert name == "Alex"


def test_sanitize_user_display_name_rejects_empty_and_overlong() -> None:
    assert sanitize_user_display_name("") is None
    assert sanitize_user_display_name("a" * 121) is None


def test_sanitize_user_display_name_collapses_whitespace_and_rejects_controls() -> None:
    assert sanitize_user_display_name("  Ada   Lovelace ") == "Ada Lovelace"
    assert sanitize_user_display_name("bad\x07name") is None


def test_user_display_name_spawn_env_maps_to_display_name_var() -> None:
    assert user_display_name_spawn_env("Sam") == {"AGENTIC_WEB_USER_DISPLAY_NAME": "Sam"}
    assert user_display_name_spawn_env("") == {}


def test_session_id_from_request_headers_prefers_agentic_header() -> None:
    session_id = session_id_from_request_headers(
        {"x-agentic-session-id": "wg-abc123", "x-warpgate-session-id": "wg-other"},
        DEFAULT_SESSION_ID_HEADERS,
    )
    assert session_id == "wg-abc123"


def test_session_id_from_request_headers_falls_back_to_warpgate() -> None:
    session_id = session_id_from_request_headers(
        {"x-warpgate-session-id": "wg-xyz"},
        DEFAULT_SESSION_ID_HEADERS,
    )
    assert session_id == "wg-xyz"


def test_sanitize_session_id_rejects_invalid_values() -> None:
    assert sanitize_session_id("") is None
    assert sanitize_session_id("bad id") is None
    assert sanitize_session_id("a" * 129) is None
    assert sanitize_session_id("ok.session-1_2") == "ok.session-1_2"


def test_resolve_session_id_from_headers_generates_web_id_when_empty() -> None:
    assert WEB_SESSION_RE.match(resolve_session_id_from_headers({}))


def test_generate_web_session_id_matches_prefix_pattern() -> None:
    assert WEB_SESSION_RE.match(generate_web_session_id())


def test_headers_are_matched_case_insensitively() -> None:
    assert user_name_from_request_headers({"X-Agentic-User-Name": "Grace"}) == "Grace"
    assert session_id_from_request_headers({"X-Agentic-Session-Id": "wg-1"}) == "wg-1"


def test_header_list_values_use_the_first_entry() -> None:
    assert user_name_from_request_headers({"x-user-name": ["Ida", "Other"]}) == "Ida"


def test_env_configures_header_names(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_WEB_USER_NAME_HEADER", "x-remote-user")
    assert user_name_from_request_headers({"x-remote-user": "Proxy User"}) == "Proxy User"
    assert user_name_from_request_headers({"x-agentic-user-name": "Ignored"}) is None


def test_user_id_from_display_name_is_filesystem_safe() -> None:
    assert user_id_from_display_name("Ada Lovelace") == "ada-lovelace"
    assert user_id_from_display_name("") == LOCAL_USER_ID
    assert user_id_from_display_name(None) == LOCAL_USER_ID
    assert "/" not in user_id_from_display_name("a/b\\c")
    assert len(user_id_from_display_name("x" * 200)) <= 64


def test_resolve_identity_local_mode_without_headers() -> None:
    identity = resolve_identity({})
    assert isinstance(identity, Identity)
    assert identity.user_name is None
    assert identity.user_id == LOCAL_USER_ID
    assert identity.local is True
    assert identity.mtls is False
    assert WEB_SESSION_RE.match(identity.session_id)


def test_resolve_identity_server_mode_with_headers() -> None:
    identity = resolve_identity(
        {"x-agentic-user-name": "Zlatko", "x-agentic-session-id": "wg-abc123"}
    )
    assert identity.user_name == "Zlatko"
    assert identity.session_id == "wg-abc123"
    assert identity.user_id == "zlatko"
    assert identity.local is False
    assert identity.mtls is False
    assert identity.to_json_dict()["userId"] == "zlatko"


def test_resolve_identity_raises_when_identity_required(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_REQUIRE_IDENTITY", "1")
    assert require_identity_enabled() is True
    with pytest.raises(IdentityRequiredError):
        resolve_identity({})
    # A forwarded name still resolves normally.
    assert resolve_identity({"x-user-name": "Alex"}).user_id == "alex"


def test_require_identity_disabled_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_REQUIRE_IDENTITY", raising=False)
    assert require_identity_enabled() is False


def test_user_name_from_peercert_prefers_agentic_uri() -> None:
    peercert = {
        "subject": ((("commonName", "ignored"),),),
        "subjectAltName": (
            ("DNS", "dns-name"),
            ("URI", "agentic://user/Alice"),
        ),
    }
    assert user_name_from_peercert(peercert) == "Alice"


def test_resolve_identity_mtls_wins_over_headers() -> None:
    peercert = {
        "subject": ((("commonName", "cert-user"),),),
        "subjectAltName": (("URI", "agentic://user/cert-user"),),
    }
    identity = resolve_identity(
        {"x-agentic-user-name": "header-user", "x-agentic-session-id": "sess-1"},
        peercert=peercert,
    )
    assert identity.user_name == "cert-user"
    assert identity.user_id == "cert-user"
    assert identity.session_id == "sess-1"
    assert identity.mtls is True
    assert identity.local is False
    assert identity.to_json_dict()["mtls"] is True


def test_auth_profile_from_request_headers_maps_warpgate_headers() -> None:
    profile = auth_profile_from_request_headers(
        {
            "x-auth-user-id": "uid-42",
            "x-auth-email": "ada@example.com",
            "x-auth-first-name": "Ada",
            "x-auth-last-name": "Lovelace",
            "x-auth-logout-url": "https://gate.example/logout",
            "x-warpgate-avatar": "https://cdn.example/ada.jpg",
        }
    )
    assert profile["user_id"] == "uid-42"
    assert profile["email"] == "ada@example.com"
    assert profile["user_name"] == "Ada Lovelace"
    assert profile["avatar_url"] == "https://cdn.example/ada.jpg"


def test_normalize_avatar_url_wraps_bare_base64() -> None:
    b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    assert normalize_avatar_url(b64) == f"data:image/jpeg;base64,{b64}"


def test_resolve_identity_uses_auth_user_id() -> None:
    identity = resolve_identity(
        {
            "x-auth-user-id": "ldap-uid-9",
            "x-auth-first-name": "Ada",
            "x-auth-last-name": "Lovelace",
        }
    )
    assert identity.user_name == "Ada Lovelace"
    assert identity.user_id == "ldap-uid-9"
    body = identity.to_json_dict()
    assert body["firstName"] == "Ada"
    assert body["lastName"] == "Lovelace"
    assert body["userId"] == "ldap-uid-9"


def test_resolve_auth_display_name_prefers_name_parts() -> None:
    assert (
        resolve_auth_display_name(
            first_name="Ada",
            last_name="Lovelace",
            email="ada@example.com",
        )
        == "Ada Lovelace"
    )


def test_sanitize_logout_url_allows_https_only() -> None:
    assert sanitize_logout_url("https://gate/logout") == "https://gate/logout"
    assert sanitize_logout_url("ftp://gate/logout") is None
