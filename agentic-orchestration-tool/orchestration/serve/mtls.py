"""CLI: ``python -m orchestration.serve.mtls`` — init CA, issue server cert, mint tokens."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from orchestration.serve import tool_root
from orchestration.serve.mtls_ca import (
    MtlsCaError,
    init_ca,
    issue_server_cert,
    mint_enroll_token,
    read_ca_pem,
    sign_client_csr,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m orchestration.serve.mtls",
        description="Manage the AO embedded CA and Reach enrollment tokens.",
    )
    parser.add_argument(
        "--tool-root",
        type=Path,
        default=None,
        help="AO tool root (default: package tool_root())",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_init = sub.add_parser("init-ca", help="Create CA under __orchestrator_mtls__/ca/")
    p_init.add_argument("--cn", default="AO Engine CA", help="CA common name")
    p_init.add_argument("--force", action="store_true", help="Replace existing CA")

    p_server = sub.add_parser("issue-server", help="Issue server.pem/key signed by the CA")
    p_server.add_argument("--cn", default="ao-engine", help="Server cert CN")
    p_server.add_argument(
        "--san",
        action="append",
        default=[],
        help="DNS or IP SAN (repeatable); localhost and 127.0.0.1 always added",
    )

    p_token = sub.add_parser("mint-token", help="Mint a one-time enrollment token")
    p_token.add_argument("--ttl", type=int, default=3600, help="TTL seconds (default 3600)")
    p_token.add_argument("--client-name", default=None, help="Optional suggested client CN")
    p_token.add_argument("--max-uses", type=int, default=1, help="Max redemptions (default 1)")

    p_sign = sub.add_parser("sign-csr", help="Sign a CSR PEM file (offline enroll)")
    p_sign.add_argument("csr", type=Path, help="Path to CSR PEM")
    p_sign.add_argument("--client-name", default=None, help="Override CN")
    p_sign.add_argument("--out", type=Path, default=None, help="Write cert PEM here")

    p_ca = sub.add_parser("print-ca", help="Print CA certificate PEM")

    args = parser.parse_args(argv)
    root = (args.tool_root or tool_root()).resolve()

    try:
        if args.cmd == "init-ca":
            result = init_ca(root, common_name=args.cn, force=args.force)
            print(json.dumps({"ok": True, **result}, indent=2))
            return 0
        if args.cmd == "issue-server":
            result = issue_server_cert(
                root,
                common_name=args.cn,
                san_dns=list(args.san) or None,
            )
            print(json.dumps({"ok": True, **result}, indent=2))
            print(
                "Set:\n"
                f"  AGENTIC_SERVE_TLS_CERTFILE={result['serverCert']}\n"
                f"  AGENTIC_SERVE_TLS_KEYFILE={result['serverKey']}\n"
                f"  AGENTIC_SERVE_TLS_CA_FILE={root / '__orchestrator_mtls__' / 'ca' / 'ca.pem'}",
                file=sys.stderr,
            )
            return 0
        if args.cmd == "mint-token":
            result = mint_enroll_token(
                root,
                ttl_seconds=args.ttl,
                client_name=args.client_name,
                max_uses=args.max_uses,
            )
            print(json.dumps({"ok": True, **result}, indent=2))
            return 0
        if args.cmd == "sign-csr":
            csr_pem = args.csr.read_text(encoding="utf-8")
            result = sign_client_csr(root, csr_pem, common_name_override=args.client_name)
            if args.out:
                args.out.write_text(result["certificatePem"], encoding="utf-8")
            print(json.dumps({"ok": True, **result}, indent=2))
            return 0
        if args.cmd == "print-ca":
            sys.stdout.write(read_ca_pem(root))
            return 0
    except MtlsCaError as exc:
        print(json.dumps({"ok": False, "error": str(exc)}), file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(exc)}), file=sys.stderr)
        return 2

    parser.error(f"unknown command {args.cmd}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
