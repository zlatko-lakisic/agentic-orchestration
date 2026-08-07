"""
Embedded CA + enrollment tokens for Reach ↔ AO mTLS.

Material lives under ``<tool_root>/__orchestrator_mtls__/``:

- ``ca/ca.pem``, ``ca/ca.key`` — CA certificate and key
- ``ca/server.pem``, ``ca/server.key`` — optional AO-issued server cert
- ``tokens.json`` — hashed single-use enrollment tokens
"""

from __future__ import annotations

import hashlib
import json
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

MTLS_DIR_NAME = "__orchestrator_mtls__"
DEFAULT_TOKEN_TTL_SECONDS = 3600
DEFAULT_CLIENT_CERT_DAYS = 365
DEFAULT_CA_DAYS = 3650


class MtlsCaError(RuntimeError):
    """CA / enrollment failure."""


def mtls_root(tool_root: Path) -> Path:
    return (tool_root / MTLS_DIR_NAME).resolve()


def ca_dir(tool_root: Path) -> Path:
    return mtls_root(tool_root) / "ca"


def tokens_path(tool_root: Path) -> Path:
    return mtls_root(tool_root) / "tokens.json"


def ca_cert_path(tool_root: Path) -> Path:
    return ca_dir(tool_root) / "ca.pem"


def ca_key_path(tool_root: Path) -> Path:
    return ca_dir(tool_root) / "ca.key"


def server_cert_path(tool_root: Path) -> Path:
    return ca_dir(tool_root) / "server.pem"


def server_key_path(tool_root: Path) -> Path:
    return ca_dir(tool_root) / "server.key"


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _load_tokens(tool_root: Path) -> list[dict[str, Any]]:
    path = tokens_path(tool_root)
    if not path.is_file():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    return raw if isinstance(raw, list) else []


def _save_tokens(tool_root: Path, tokens: list[dict[str, Any]]) -> None:
    root = mtls_root(tool_root)
    root.mkdir(parents=True, exist_ok=True)
    path = tokens_path(tool_root)
    path.write_text(json.dumps(tokens, indent=2) + "\n", encoding="utf-8")
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass


def ca_exists(tool_root: Path) -> bool:
    return ca_cert_path(tool_root).is_file() and ca_key_path(tool_root).is_file()


def _new_rsa_key() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _pem_key(key: rsa.RSAPrivateKey) -> bytes:
    return key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    )


def _pem_cert(cert: x509.Certificate) -> bytes:
    return cert.public_bytes(serialization.Encoding.PEM)


def init_ca(
    tool_root: Path,
    *,
    common_name: str = "AO Engine CA",
    days: int = DEFAULT_CA_DAYS,
    force: bool = False,
) -> dict[str, str]:
    """Create a self-signed CA under ``__orchestrator_mtls__/ca/``."""
    if ca_exists(tool_root) and not force:
        raise MtlsCaError(f"CA already exists at {ca_dir(tool_root)} (use force=True to replace)")
    directory = ca_dir(tool_root)
    directory.mkdir(parents=True, exist_ok=True)

    key = _new_rsa_key()
    subject = issuer = x509.Name(
        [
            x509.NameAttribute(NameOID.COMMON_NAME, common_name),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "agentic-orchestration"),
        ]
    )
    now = datetime.now(timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=1))
        .not_valid_after(now + timedelta(days=days))
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_cert_sign=True,
                crl_sign=True,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .sign(key, hashes.SHA256())
    )

    ca_key_path(tool_root).write_bytes(_pem_key(key))
    ca_cert_path(tool_root).write_bytes(_pem_cert(cert))
    try:
        os.chmod(ca_key_path(tool_root), 0o600)
        os.chmod(ca_cert_path(tool_root), 0o644)
    except OSError:
        pass
    return {
        "caCert": str(ca_cert_path(tool_root)),
        "caKey": str(ca_key_path(tool_root)),
        "commonName": common_name,
    }


def _san_entries(names: list[str]) -> list[x509.GeneralName]:
    """Build SAN entries; IPv4/IPv6 → IPAddress, everything else → DNSName."""
    from ipaddress import ip_address

    out: list[x509.GeneralName] = []
    seen: set[str] = set()
    for raw in names:
        name = (raw or "").strip()
        if not name or name in seen:
            continue
        seen.add(name)
        try:
            out.append(x509.IPAddress(ip_address(name)))
        except ValueError:
            out.append(x509.DNSName(name))
    return out


def issue_server_cert(
    tool_root: Path,
    *,
    common_name: str = "ao-engine",
    san_dns: list[str] | None = None,
    days: int = DEFAULT_CLIENT_CERT_DAYS,
) -> dict[str, str]:
    """Issue a TLS server certificate signed by the AO CA.

    ``san_dns`` may include hostnames **or** IP addresses; IPs are encoded as
    IP SANs (required for clients that dial by IP, e.g. Dart ``SecurityContext``).
    """
    if not ca_exists(tool_root):
        raise MtlsCaError("CA not initialized; run init-ca first")
    ca_cert, ca_key = load_ca(tool_root)
    key = _new_rsa_key()
    names = list(san_dns or [])
    if common_name and common_name not in names:
        names.insert(0, common_name)
    if "localhost" not in names:
        names.append("localhost")
    if "127.0.0.1" not in names:
        names.append("127.0.0.1")
    san = _san_entries(names)
    if not san:
        raise MtlsCaError("server cert requires at least one SAN")
    now = datetime.now(timezone.utc)
    subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)])
    builder = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(ca_cert.subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=1))
        .not_valid_after(now + timedelta(days=days))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_encipherment=True,
                key_cert_sign=False,
                crl_sign=False,
                content_commitment=False,
                data_encipherment=False,
                key_agreement=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(
            x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]),
            critical=False,
        )
        .add_extension(
            x509.SubjectAlternativeName(san),
            critical=False,
        )
    )
    cert = builder.sign(ca_key, hashes.SHA256())
    server_key_path(tool_root).write_bytes(_pem_key(key))
    # Serve leaf + CA so clients that only get the leaf can still chain if needed.
    server_cert_path(tool_root).write_bytes(_pem_cert(cert) + _pem_cert(ca_cert))
    try:
        os.chmod(server_key_path(tool_root), 0o600)
        os.chmod(server_cert_path(tool_root), 0o644)
    except OSError:
        pass
    return {
        "serverCert": str(server_cert_path(tool_root)),
        "serverKey": str(server_key_path(tool_root)),
        "commonName": common_name,
    }


def load_ca(tool_root: Path) -> tuple[x509.Certificate, rsa.RSAPrivateKey]:
    if not ca_exists(tool_root):
        raise MtlsCaError("CA not initialized")
    cert = x509.load_pem_x509_certificate(ca_cert_path(tool_root).read_bytes())
    key = serialization.load_pem_private_key(ca_key_path(tool_root).read_bytes(), password=None)
    if not isinstance(key, rsa.RSAPrivateKey):
        raise MtlsCaError("CA key must be RSA")
    return cert, key


def read_ca_pem(tool_root: Path) -> str:
    if not ca_cert_path(tool_root).is_file():
        raise MtlsCaError("CA certificate not found")
    return ca_cert_path(tool_root).read_text(encoding="utf-8")


def mint_enroll_token(
    tool_root: Path,
    *,
    ttl_seconds: int = DEFAULT_TOKEN_TTL_SECONDS,
    client_name: str | None = None,
    max_uses: int = 1,
) -> dict[str, Any]:
    """Create a single-use (by default) enrollment token. Returns the plaintext token once."""
    mtls_root(tool_root).mkdir(parents=True, exist_ok=True)
    token = secrets.token_urlsafe(32)
    now = time.time()
    entry = {
        "hash": _hash_token(token),
        "createdAt": now,
        "expiresAt": now + max(60, int(ttl_seconds)),
        "maxUses": max(1, int(max_uses)),
        "uses": 0,
        "clientName": (client_name or "").strip() or None,
    }
    tokens = [t for t in _load_tokens(tool_root) if float(t.get("expiresAt", 0)) > now]
    tokens.append(entry)
    _save_tokens(tool_root, tokens)
    return {
        "token": token,
        "expiresAt": entry["expiresAt"],
        "maxUses": entry["maxUses"],
        "clientName": entry["clientName"],
    }


def consume_enroll_token(tool_root: Path, token: str) -> dict[str, Any]:
    """Validate and consume one use of an enrollment token. Raises on failure."""
    text = (token or "").strip()
    if not text:
        raise MtlsCaError("enrollment token is required")
    digest = _hash_token(text)
    now = time.time()
    tokens = _load_tokens(tool_root)
    matched: dict[str, Any] | None = None
    for entry in tokens:
        if entry.get("hash") == digest:
            matched = entry
            break
    if matched is None:
        raise MtlsCaError("invalid enrollment token")
    if float(matched.get("expiresAt", 0)) < now:
        raise MtlsCaError("enrollment token expired")
    uses = int(matched.get("uses", 0))
    max_uses = int(matched.get("maxUses", 1))
    if uses >= max_uses:
        raise MtlsCaError("enrollment token already used")
    matched["uses"] = uses + 1
    _save_tokens(tool_root, tokens)
    return matched


def sign_client_csr(
    tool_root: Path,
    csr_pem: str,
    *,
    common_name_override: str | None = None,
    days: int = DEFAULT_CLIENT_CERT_DAYS,
) -> dict[str, Any]:
    """Sign a PEM CSR and return leaf + CA PEMs."""
    ca_cert, ca_key = load_ca(tool_root)
    try:
        csr = x509.load_pem_x509_csr(csr_pem.encode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise MtlsCaError(f"invalid CSR: {exc}") from exc
    if not csr.is_signature_valid:
        raise MtlsCaError("CSR signature is invalid")

    cn = (common_name_override or "").strip()
    if not cn:
        try:
            cn = csr.subject.get_attributes_for_oid(NameOID.COMMON_NAME)[0].value  # type: ignore[assignment]
            cn = str(cn).strip()
        except (IndexError, AttributeError):
            cn = ""
    if not cn:
        raise MtlsCaError("CSR must include a Common Name (or pass clientName)")

    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=days)
    subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, cn)])
    builder = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(ca_cert.subject)
        .public_key(csr.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=1))
        .not_valid_after(expires)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_encipherment=True,
                key_cert_sign=False,
                crl_sign=False,
                content_commitment=False,
                data_encipherment=False,
                key_agreement=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(
            x509.ExtendedKeyUsage([ExtendedKeyUsageOID.CLIENT_AUTH]),
            critical=False,
        )
        .add_extension(
            x509.SubjectAlternativeName(
                [
                    x509.DNSName(cn),
                    x509.UniformResourceIdentifier(f"agentic://user/{cn}"),
                ]
            ),
            critical=False,
        )
    )
    cert = builder.sign(ca_key, hashes.SHA256())
    return {
        "certificatePem": _pem_cert(cert).decode("utf-8"),
        "caPem": _pem_cert(ca_cert).decode("utf-8"),
        "expiresAt": expires.timestamp(),
        "subject": cn,
    }


def mtls_hello_payload(tool_root: Path) -> dict[str, Any] | None:
    """Advertise mTLS capability on WebSocket hello when CA exists or TLS env is set."""
    from orchestration.serve.mtls_tls import mtls_required, tls_configured

    if not tls_configured() and not ca_exists(tool_root):
        return None
    return {
        "enroll": ca_exists(tool_root),
        "required": mtls_required(),
        "caPath": "/api/v1/mtls/ca",
        "enrollPath": "/api/v1/mtls/enroll",
    }
