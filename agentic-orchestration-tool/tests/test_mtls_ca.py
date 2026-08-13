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
    is_peercert_revoked,
    issue_server_cert,
    list_mtls_clients,
    mint_enroll_token,
    read_ca_pem,
    revoke_mtls_client,
    sign_client_csr,
    unrevoke_mtls_client,
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


def test_issue_server_cert_ip_san(tmp_path: Path) -> None:
    from ipaddress import IPv4Address

    init_ca(tmp_path)
    issue_server_cert(
        tmp_path,
        common_name="ao-engine",
        san_dns=["10.0.10.16", "nvr.mostardesigns.com"],
    )
    cert = x509.load_pem_x509_certificate(
        (tmp_path / "__orchestrator_mtls__/ca/server.pem").read_bytes()
    )
    san = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    dns = set(san.get_values_for_type(x509.DNSName))
    ips = set(san.get_values_for_type(x509.IPAddress))
    assert {"nvr.mostardesigns.com", "localhost"} <= dns
    assert IPv4Address("10.0.10.16") in ips
    assert IPv4Address("127.0.0.1") in ips
    # Must not encode the IP as a DNS name
    assert not ({"10.0.10.16"} & dns)


def test_sign_csr_requires_cn(tmp_path: Path) -> None:
    init_ca(tmp_path)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    csr = x509.CertificateSigningRequestBuilder().subject_name(x509.Name([])).sign(
        key, hashes.SHA256()
    )
    pem = csr.public_bytes(serialization.Encoding.PEM).decode("utf-8")
    with pytest.raises(MtlsCaError, match="Common Name"):
        sign_client_csr(tmp_path, pem)


def test_revoke_client_by_serial_blocks_peercert(tmp_path: Path) -> None:
    init_ca(tmp_path)
    signed = sign_client_csr(tmp_path, _csr_pem("comstar"), common_name_override="comstar")
    serial = signed["serial"]
    clients = list_mtls_clients(tmp_path)
    assert any(c["serial"] == serial and c["subject"] == "comstar" and not c["revoked"] for c in clients)

    peercert = {"serialNumber": serial, "subject": ((("commonName", "comstar"),),)}
    assert is_peercert_revoked(tmp_path, peercert) is False

    revoke_mtls_client(tmp_path, serial=serial, reason="kick comstar")
    assert is_peercert_revoked(tmp_path, peercert) is True
    assert any(c["serial"] == serial and c["revoked"] for c in list_mtls_clients(tmp_path))

    # Other CN stays allowed.
    other = sign_client_csr(tmp_path, _csr_pem("knowbuddy"), common_name_override="knowbuddy")
    other_peer = {"serialNumber": other["serial"], "subject": ((("commonName", "knowbuddy"),),)}
    assert is_peercert_revoked(tmp_path, other_peer) is False

    unrevoke_mtls_client(tmp_path, serial=serial)
    assert is_peercert_revoked(tmp_path, peercert) is False


def test_revoke_by_cn_bans_subject(tmp_path: Path) -> None:
    init_ca(tmp_path)
    revoke_mtls_client(tmp_path, subject="legacy-app", reason="cn ban")
    peer = {"serialNumber": "DEADBEEF", "subject": ((("commonName", "legacy-app"),),)}
    assert is_peercert_revoked(tmp_path, peer) is True
    peer_other = {"serialNumber": "CAFE", "subject": ((("commonName", "other"),),)}
    assert is_peercert_revoked(tmp_path, peer_other) is False
