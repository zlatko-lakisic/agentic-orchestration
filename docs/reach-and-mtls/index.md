---
layout: single
title: "Reach and engine mTLS"
permalink: /reach-and-mtls/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# <img src="{{ "/assets/ao-mark.svg" | relative_url }}" alt="AO" width="18" height="18" style="vertical-align:-3px" /> Reach and engine mTLS

Reach ([`agentic-orchestration-reach`](https://github.com/zlatko-lakisic/agentic-orchestration-reach)) is the Dart client SDK for **session overlays** and **reverse MCP tunnels** against a shared Agentic Orchestration **engine** daemon (`python -m orchestration.serve`). It talks to the engine **directly** — not via Warpgate.

Canonical SDK docs: Reach `README.md`. Engine serve env: [Configuration]({{ '/configuration/' | relative_url }}). Daemon plan: [Engine daemon plan]({{ '/engine-daemon-plan/' | relative_url }}).

## Versions

| Component | Version | Notes |
|-----------|---------|--------|
| <img src="{{ "/assets/ao-mark.svg" | relative_url }}" alt="AO" width="16" height="16" style="vertical-align:-3px" /> engine | **≥ v1.29.0** | TLS/mTLS, CA CLI, enroll API (`main` also has IP-SAN fix for dial-by-IP) |
| <img src="{{ "/assets/ao-mark.svg" | relative_url }}" alt="AO" width="16" height="16" style="vertical-align:-3px" /> Reach | **v0.4.0** | `ReachMtlsConfig`, `ReachMtlsEnroller`, WSS client certs |

## Trust model

1. **Enrollment (one-time):** admin mints a token on Agentic Orchestration; Reach generates a key+CSR (`openssl`), posts to `POST /api/v1/mtls/enroll`, persists `cert.pem` / `key.pem` / `ca.pem`.
2. **Steady state:** Reach connects with `https` / `wss` and presents the client cert. User identity comes from the cert (SAN/CN), not spoofable headers.
3. **Token TTL ≠ session auth.** A 24h enroll token is only for first-time cert issue. Client certs default to **365 days**.

Public (server TLS only, no client cert): `/health`, `/api/ping`, `/api/v1/mtls/ca`, `/api/v1/mtls/enroll`.  
Everything else (including `/ws`) requires a verified client cert when `AGENTIC_SERVE_TLS_REQUIRE_CLIENT_CERT=1` (default when a client CA file is set).

## Operator setup (edge host)

```bash
cd /var/projects/agentic-orchestration/agentic-orchestration-tool
python3 -m orchestration.serve.mtls init-ca --cn "AO Engine CA"
# IPs become IP SANs; hostnames become DNS SANs (required for Dart dial-by-IP)
python3 -m orchestration.serve.mtls issue-server --cn ao-engine \
  --san 10.0.10.16 \
  --san nvr.example.com
```

Set in `config/env.host` (or `.env`) — paths are **inside the engine pod** (`/app/tool` hostPath):

```bash
AGENTIC_SERVE_TLS_CERTFILE=/app/tool/__orchestrator_mtls__/ca/server.pem
AGENTIC_SERVE_TLS_KEYFILE=/app/tool/__orchestrator_mtls__/ca/server.key
AGENTIC_SERVE_TLS_CA_FILE=/app/tool/__orchestrator_mtls__/ca/ca.pem
AGENTIC_SERVE_TLS_REQUIRE_CLIENT_CERT=1
```

Then sync secret + restart engine:

```bash
bash scripts/jetson-sync-k8s-secret.sh
kubectl -n agentic-orchestration rollout restart deployment/agentic-engine
```

Mint an enroll token:

```bash
python3 -m orchestration.serve.mtls mint-token --client-name alice --ttl 86400
```

Material lives under `__orchestrator_mtls__/ca/` on the tool hostPath (gitignored runtime).

## Reach client enroll + connect

```dart
final material = await ReachMtlsEnroller().enroll(
  baseUrl: 'https://10.0.10.16:8765',
  enrollToken: tokenFromAdmin,
  materialDir: '${Platform.environment['HOME']}/.myapp/ao-mtls',
  trustEnrollmentCa: true, // or pass caPem from GET /api/v1/mtls/ca
);

await bridge.start(
  config: ReachConnectionConfig(
    baseUrl: 'https://10.0.10.16:8765', // https required when mtls is set
    headers: const {},
    mtls: ReachMtlsConfig(materialDir: material.dir),
  ),
  overlayRoot: overlayRoot,
  mcpBootstrap: bootstrap,
);
```

Requires `openssl` on PATH for enrollment. Pin SDK: Reach git ref `v0.4.0`.

## Deployed endpoints (reference)

| Host | Role | Engine (mTLS) | Web UI |
|------|------|---------------|--------|
| Jetson (`172.16.90.20`, `omega-jetson-orin`) | Edge / Ada | `https://172.16.90.20:8765` | `http://172.16.90.20:30487` |
| NVR (`10.0.10.16`, `nvr.mostardesigns.com`) | AI server | `https://10.0.10.16:8765` | `http://10.0.10.16:30487` |

Do **not** point Reach clients at `:30487` — that is the Node web UI.

Server cert SANs must include **IP Address:** entries for any IP URL clients use. Re-issue after the IP-SAN fix:

```bash
python3 -m orchestration.serve.mtls issue-server --cn ao-engine --san <ip> --san <hostname>
kubectl -n agentic-orchestration rollout restart deployment/agentic-engine
```

## Revoke one client (non-nuclear)

After enroll, kick a single client without rotating the CA:

- **Admin:** Access → **mTLS clients** → Revoke (or Revoke by CN…)
- **CLI on the engine host:**

```bash
python3 -m orchestration.serve.mtls list-clients
python3 -m orchestration.serve.mtls revoke-client --cn myapp --reason "kick"
# or: --serial <hex>
python3 -m orchestration.serve.mtls unrevoke-client --cn myapp
```

Deny-list lives in `__orchestrator_mtls__/revoked.json`. The next HTTP/WS request from that cert gets **403** / policy close; other clients keep working.

## Gaps

- Speech sidecars (STT/TTS) remain cleartext HTTP in v1.
- No automatic client-cert renewal — re-enroll near expiry.
- Engine k8s probes use **TCP** (not HTTP) so TLS rollouts stay healthy.
- Clients issued before the registry only appear after re-enroll; use **Revoke by CN** for those.

See also: [Engine daemon plan]({{ '/engine-daemon-plan/' | relative_url }}), [Infrastructure]({{ '/infrastructure/' | relative_url }}), [Configuration]({{ '/configuration/' | relative_url }}), [External integrations]({{ '/external-integrations/' | relative_url }}), Reach repo `CHANGELOG.md`.
