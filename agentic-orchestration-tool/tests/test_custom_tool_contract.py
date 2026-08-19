"""Unit tests for custom tool manifest contract v1."""

from __future__ import annotations

import pytest

from orchestration.custom_tool_contract import (
    CONTRACT_VERSION,
    CustomToolContractError,
    validate_manifest,
    validate_zip_members,
)

pytestmark = pytest.mark.unit


def _valid_manifest() -> dict:
    return {
        "contractVersion": CONTRACT_VERSION,
        "toolId": "client.mock_comstar.echo_tool",
        "toolVersion": "0.1.0",
        "runtime": "python",
        "wheel": "mock_echo_tool-0.1.0-py3-none-any.whl",
        "entrypoints": {"http_module": "mock_echo_tool.server", "http_callable": "run_server"},
        "requiredEnv": [],
        "permissions": {},
        "healthcheck": {"path": "/health"},
        "fallbackPolicy": "tunnel",
    }


def test_validate_manifest_accepts_v1() -> None:
    manifest = validate_manifest(_valid_manifest())
    assert manifest.tool_id == "client.mock_comstar.echo_tool"
    assert manifest.client_id == "client.mock_comstar.echo_tool"
    assert manifest.http_module == "mock_echo_tool.server"


def test_reject_bad_contract_version() -> None:
    raw = _valid_manifest()
    raw["contractVersion"] = "2"
    with pytest.raises(CustomToolContractError, match="contractVersion"):
        validate_manifest(raw)


def test_reject_invalid_tool_id() -> None:
    raw = _valid_manifest()
    raw["toolId"] = "filesystem_local"
    with pytest.raises(CustomToolContractError, match="toolId"):
        validate_manifest(raw)


def test_reject_missing_entrypoint() -> None:
    raw = _valid_manifest()
    raw["entrypoints"] = {}
    with pytest.raises(CustomToolContractError, match="entrypoints"):
        validate_manifest(raw)


def test_validate_zip_members_requires_wheel() -> None:
    manifest = validate_manifest(_valid_manifest())
    validate_zip_members(manifest, {"manifest.json", manifest.wheel})
    with pytest.raises(CustomToolContractError, match="wheel"):
        validate_zip_members(manifest, {"manifest.json"})
