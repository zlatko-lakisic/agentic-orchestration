"""
Embedded CA + enrollment tokens for Reach ↔ AO mTLS.

Material lives under ``<tool_root>/__orchestrator_mtls__/``:

- ``ca/ca.pem``, ``ca/ca.key`` — CA certificate and key
- ``ca/server.pem``, ``ca/server.key`` — optional AO-issued server cert
- ``tokens.json`` — hashed single-use enrollment tokens
- ``clients.json`` — issued client cert registry (serial + CN)
- ``revoked.json`` — deny-list by serial and/or subject CN (non-nuclear kick)
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


def clients_path(tool_root: Path) -> Path:
    return mtls_root(tool_root) / "clients.json"


def revoked_path(tool_root: Path) -> Path:
    return mtls_root(tool_root) / "revoked.json"


def ca_cert_path(tool_root: Path) -> Path:
    return ca_dir(tool_root) / "ca.pem"


def normalize_serial(raw: Any) -> str | None:
    """Normalize a cert serial to uppercase hex (no ``0x`` / colons)."""
    if raw is None:
        return None
    if isinstance(raw, int):
        return format(raw, "X")
    text = str(raw).strip()
    if not text:
        return None
    if text.lower().startswith("0x"):
        text = text[2:]
    text = text.replace(":", "").replace(" ", "")
    try:
        return format(int(text, 16), "X")
    except ValueError:
        try:
            return format(int(text, 10), "X")
        except ValueError:
            return text.upper() or None


def _load_json_list(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    return raw if isinstance(raw, list) else []


def _save_json_list(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass


def record_issued_client(
    tool_root: Path,
    *,
    serial_hex: str,
    subject: str,
    expires_at: float | None = None,
) -> dict[str, Any]:
    """Upsert an issued client leaf into ``clients.json``."""
    serial = normalize_serial(serial_hex)
    cn = (subject or "").strip()
    if not serial or not cn:
        raise MtlsCaError("serial and subject are required to record a client")
    now = datetime.now(timezone.utc).isoformat()
    entry = {
        "serial": serial,
        "subject": cn,
        "issuedAt": now,
        "expiresAt": (
            datetime.fromtimestamp(float(expires_at), tz=timezone.utc).isoformat()
            if expires_at
            else None
        ),
    }
    clients = [c for c in _load_json_list(clients_path(tool_root)) if str(c.get("serial")) != serial]
    clients.append(entry)
    _save_json_list(clients_path(tool_root), clients)
    return entry


def list_mtls_clients(tool_root: Path) -> list[dict[str, Any]]:
    """Issued clients with revoke status (plus CN-only revoke rows not in registry)."""
    revoked = _load_json_list(revoked_path(tool_root))
    revoked_serials = {
        normalize_serial(r.get("serial")) for r in revoked if r.get("serial")
    }
    revoked_serials.discard(None)
    revoked_subjects = {
        str(r.get("subject") or "").strip().lower()
        for r in revoked
        if r.get("subject") and not r.get("serial")
    }
    revoked_by_serial = {
        normalize_serial(r.get("serial")): r for r in revoked if r.get("serial")
    }

    out: list[dict[str, Any]] = []
    seen_serials: set[str] = set()
    for c in _load_json_list(clients_path(tool_root)):
        serial = normalize_serial(c.get("serial"))
        subject = str(c.get("subject") or "").strip()
        if not serial:
            continue
        seen_serials.add(serial)
        subject_key = subject.lower()
        is_rev = serial in revoked_serials or subject_key in revoked_subjects
        row = {
            "serial": serial,
            "subject": subject,
            "issuedAt": c.get("issuedAt"),
            "expiresAt": c.get("expiresAt"),
            "revoked": is_rev,
            "revokedAt": (revoked_by_serial.get(serial) or {}).get("revokedAt"),
            "revokeReason": (revoked_by_serial.get(serial) or {}).get("reason"),
        }
        if is_rev and not row["revokedAt"] and subject_key in revoked_subjects:
            for r in revoked:
                if str(r.get("subject") or "").strip().lower() == subject_key and not r.get("serial"):
                    row["revokedAt"] = r.get("revokedAt")
                    row["revokeReason"] = r.get("reason")
                    break
        out.append(row)

    # CN-only bans with no issued registry row still appear as revoke targets.
    for r in revoked:
        if r.get("serial"):
            continue
        subject = str(r.get("subject") or "").strip()
        if not subject:
            continue
        if any(c.get("subject", "").lower() == subject.lower() for c in out):
            continue
        out.append(
            {
                "serial": None,
                "subject": subject,
                "issuedAt": None,
                "expiresAt": None,
                "revoked": True,
                "revokedAt": r.get("revokedAt"),
                "revokeReason": r.get("reason"),
            }
        )
    out.sort(key=lambda r: str(r.get("issuedAt") or r.get("revokedAt") or ""), reverse=True)
    return out


def revoke_mtls_client(
    tool_root: Path,
    *,
    serial: str | None = None,
    subject: str | None = None,
    reason: str | None = None,
) -> dict[str, Any]:
    """
    Deny one client without rotating the CA.

    Prefer ``serial`` (kicks that leaf only). ``subject`` alone bans every cert
    with that CN (useful when the leaf was issued before clients.json existed).
    """
    serial_n = normalize_serial(serial)
    subject_n = (subject or "").strip()
    if not serial_n and not subject_n:
        raise MtlsCaError("serial or subject is required to revoke")

    # Resolve subject from registry when only serial is provided.
    if serial_n and not subject_n:
        for c in _load_json_list(clients_path(tool_root)):
            if normalize_serial(c.get("serial")) == serial_n:
                subject_n = str(c.get("subject") or "").strip()
                break

    entry = {
        "serial": serial_n,
        "subject": subject_n or None,
        "revokedAt": datetime.now(timezone.utc).isoformat(),
        "reason": (reason or "").strip() or None,
    }
    rows = _load_json_list(revoked_path(tool_root))
    # Replace matching prior entry.
    kept: list[dict[str, Any]] = []
    for r in rows:
        same_serial = serial_n and normalize_serial(r.get("serial")) == serial_n
        same_cn_ban = (
            not serial_n
            and not r.get("serial")
            and str(r.get("subject") or "").strip().lower() == subject_n.lower()
        )
        if same_serial or same_cn_ban:
            continue
        kept.append(r)
    kept.append(entry)
    _save_json_list(revoked_path(tool_root), kept)
    return entry


def unrevoke_mtls_client(
    tool_root: Path,
    *,
    serial: str | None = None,
    subject: str | None = None,
) -> bool:
    """Remove a revoke entry. Returns True if something was removed."""
    serial_n = normalize_serial(serial)
    subject_n = (subject or "").strip().lower()
    if not serial_n and not subject_n:
        raise MtlsCaError("serial or subject is required to unrevoke")
    rows = _load_json_list(revoked_path(tool_root))
    kept: list[dict[str, Any]] = []
    removed = False
    for r in rows:
        if serial_n and normalize_serial(r.get("serial")) == serial_n:
            removed = True
            continue
        if (
            not serial_n
            and not r.get("serial")
            and str(r.get("subject") or "").strip().lower() == subject_n
        ):
            removed = True
            continue
        kept.append(r)
    if removed:
        _save_json_list(revoked_path(tool_root), kept)
    return removed


def peercert_serial(peercert: dict[str, Any] | None) -> str | None:
    if not peercert:
        return None
    return normalize_serial(peercert.get("serialNumber"))


def peercert_subject_cn(peercert: dict[str, Any] | None) -> str | None:
    """Best-effort CN from an OpenSSL peercert dict."""
    if not peercert:
        return None
    from orchestration.user_context import user_name_from_peercert

    name = user_name_from_peercert(peercert)
    if name:
        return name
    subject = peercert.get("subject") or ()
    for rdn in subject:
        if not isinstance(rdn, (list, tuple)):
            continue
        for attr in rdn:
            if (
                isinstance(attr, (list, tuple))
                and len(attr) >= 2
                and str(attr[0]).lower() in ("commonname", "cn")
            ):
                cleaned = str(attr[1]).strip()
                if cleaned:
                    return cleaned
    return None


def is_peercert_revoked(tool_root: Path, peercert: dict[str, Any] | None) -> bool:
    """True when the peer leaf serial or CN is on the deny-list."""
    if not peercert:
        return False
    serial = peercert_serial(peercert)
    subject = (peercert_subject_cn(peercert) or "").strip().lower()
    for r in _load_json_list(revoked_path(tool_root)):
        r_serial = normalize_serial(r.get("serial"))
        if serial and r_serial and r_serial == serial:
            return True
        r_subject = str(r.get("subject") or "").strip().lower()
        if subject and r_subject and r_subject == subject and not r_serial:
            # CN-wide ban
            return True
        if subject and r_subject and r_subject == subject and r_serial == serial:
            return True
    return False


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
    serial_hex = format(cert.serial_number, "X")
    record_issued_client(
        tool_root,
        serial_hex=serial_hex,
        subject=cn,
        expires_at=expires.timestamp(),
    )
    return {
        "certificatePem": _pem_cert(cert).decode("utf-8"),
        "caPem": _pem_cert(ca_cert).decode("utf-8"),
        "expiresAt": expires.timestamp(),
        "subject": cn,
        "serial": serial_hex,
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
