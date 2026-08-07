"""Tests for embedded CA + enrollment tokens."""

from __future__ import annotations

from pathlib import Path

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

from orchestration.serve.mtls_ca import (
    MtlsCaError,
    consume_enroll_token,
    init_ca,
    issue_server_cert,
    mint_enroll_token,
    read_ca_pem,
    sign_client_csr,
)

pytestmark = pytest.mark.unit


def _csr_pem(cn: str = "reach-client") -> str:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    csr = (
        x509.CertificateSigningRequestBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, cn)]))
        .sign(key, hashes.SHA256())
    )
    return csr.public_bytes(serialization.Encoding.PEM).decode("utf-8")


def test_init_ca_mint_token_sign_csr(tmp_path: Path) -> None:
    init_ca(tmp_path, common_name="Test CA")
    assert "BEGIN CERTIFICATE" in read_ca_pem(tmp_path)

    server = issue_server_cert(tmp_path, common_name="ao-test", san_dns=["ao-test.local"])
    assert Path(server["serverCert"]).is_file()
    assert Path(server["serverKey"]).is_file()

    minted = mint_enroll_token(tmp_path, client_name="alice", ttl_seconds=600)
    assert minted["token"]
    consume_enroll_token(tmp_path, minted["token"])
    with pytest.raises(MtlsCaError, match="already used"):
        consume_enroll_token(tmp_path, minted["token"])

    minted2 = mint_enroll_token(tmp_path, ttl_seconds=600)
    signed = sign_client_csr(tmp_path, _csr_pem("bob"), common_name_override="bob")
    assert "BEGIN CERTIFICATE" in signed["certificatePem"]
    assert signed["subject"] == "bob"
    assert "BEGIN CERTIFICATE" in signed["caPem"]
    # token from minted2 unused — enroll path would consume separately
    assert minted2["token"]


def test_invalid_token_rejected(tmp_path: Path) -> None:
    init_ca(tmp_path)
    with pytest.raises(MtlsCaError, match="invalid"):
        consume_enroll_token(tmp_path, "nope")


def test_sign_csr_requires_cn(tmp_path: Path) -> None:
    init_ca(tmp_path)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    csr = x509.CertificateSigningRequestBuilder().subject_name(x509.Name([])).sign(
        key, hashes.SHA256()
    )
    pem = csr.public_bytes(serialization.Encoding.PEM).decode("utf-8")
    with pytest.raises(MtlsCaError, match="Common Name"):
        sign_client_csr(tmp_path, pem)
