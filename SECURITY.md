# Security Policy

Thank you for helping keep **agentic-orchestration** and its users safe.

This monorepo runs a **multi-agent orchestration engine** (Python/CrewAI) and a **local web server** (Node) that can execute user-supplied goals, attach **MCP tools**, call **LLM APIs**, and (optionally) run steps on **Kubernetes**. Treat it as a privileged automation runtime, not a public SaaS edge by default.

## Supported versions

Security fixes are applied to the latest published release on `main` and, when practical, to the most recent minor line.

| Version | Supported |
|---------|-----------|
| Latest release on [`main`](https://github.com/zlatko-lakisic/agentic-orchestration/releases) (see `VERSION`) | ✅ |
| Previous minor (N−1) | ⚠️ Critical/high only, best effort |
| Older releases | ❌ Please upgrade |

Container images on GHCR (`ghcr.io/zlatko-lakisic/agentic-orchestrator-*`) follow the same tag policy as GitHub Releases (`vX.Y.Z`, `latest`).

## Reporting a vulnerability

**Do not open a public GitHub Issue for security vulnerabilities.**

### Preferred: GitHub private vulnerability reporting

1. Open the repository: [zlatko-lakisic/agentic-orchestration](https://github.com/zlatko-lakisic/agentic-orchestration)
2. **Security** → **Report a vulnerability** (or [advisories](https://github.com/zlatko-lakisic/agentic-orchestration/security/advisories/new))
3. Include as much of the following as you can:
   - Affected component (`agentic-orchestration-tool`, `agentic-orchestration-web`, deploy scripts, GHCR images, docs that mislead operators)
   - Version / commit / image digest
   - Attack scenario and impact (confidentiality, integrity, availability, lateral movement)
   - Step-by-step reproduction (PoC)
   - Whether the issue is already public or being exploited
   - Suggested fix, if you have one

We aim to **acknowledge within 3 business days** and to provide an initial severity/triage assessment within **7 business days**. Complex issues may take longer; we will keep you updated through the advisory thread.

### Coordinated disclosure

Please give us a reasonable window to fix and release before public disclosure:

| Severity (indicative) | Target fix / advisory window |
|-----------------------|------------------------------|
| Critical | ASAP; typically ≤ 7 days after confirmed repro |
| High | ≤ 14 days |
| Medium | ≤ 30 days |
| Low / hardening | Next regular release or documented mitigation |

We may publish a GitHub Security Advisory (and CVE when appropriate) and credit reporters who wish to be named.

### Out of scope for private reports (use normal issues/PRs)

- Feature requests and general bugs without security impact
- Denial of service that requires already-authenticated local admin access only
- Issues solely in **upstream** dependencies (CrewAI, Ollama, MCP servers, Traefik, k3s, etc.) — report upstream; optionally open a tracking issue here after coordinated upstream disclosure
- Social engineering of maintainers or users
- Findings that assume the operator intentionally disabled all authentication and exposed the service to the public Internet without documenting that as misconfiguration (still welcome as hardening advice, but may be closed as “operator risk”)

## Threat model (summary)

### Trust boundaries

| Boundary | Assumption |
|----------|------------|
| **Operator host** | Whoever can run the tool/web process or `kubectl` in the cluster is trusted like a local developer or admin |
| **Web UI / WebSocket** | Unauthenticated by default for local use; **must not** be exposed to untrusted networks without an auth proxy (Warpgate, Traefik forward-auth, VPN, etc.). Cross-site pages are refused by an `Origin` check, and a loopback bind only answers to loopback `Host` names (DNS-rebinding guard). |
| **`POST /api/v1/orchestrate` and chat-completions / responses proxies** | **Always** require `Authorization: Bearer` — minted `ao_…` API token or env shared secret (`AGENTIC_ORCHESTRATE_API_KEY` / `AGENTIC_CHAT_COMPLETIONS_API_KEY`). No anonymous open mode. |
| **Admin / operator HTTP (`/api/v1/admin/*`, host-metrics, …)** | Require the assigned reserved **`ao-web`** Web UI token. The token is handed to the Admin page, and the pre-assignment bootstrap routes are usable, **only from a trusted source**: a loopback client with no proxy headers, or a peer listed in `AGENTIC_WEB_TRUSTED_PROXIES`. `AGENTIC_WEB_AUTH_BOOTSTRAP=open` restores the old hand-out to any caller. UI tokens are not accepted on the Bearer API routes above. |
| **Engine daemon (`python -m orchestration.serve`) admin routes** | `/api/v1/admin/*` requires `Authorization: Bearer <AGENTIC_SERVE_ADMIN_TOKEN>`; when that is unset, only a direct loopback peer. This holds under mTLS too: the operator credential, not the absence of a client certificate, opens these routes. An enrollment token bound to a client name can only enroll that name. |
| **Reach / session-overlay clients** | Untrusted input. A client-supplied provider base URL is never combined with the engine's own API key; `${VAR}` in client-registered MCP entries is not expanded from the engine's environment; client priority and quota requests are clamped to operator policy. |
| **LLM providers** | Prompts and tool results leave the host when cloud APIs are configured |
| **MCP tools** | Credentialed integrations (Home Assistant, search, filesystem, media, Xquik, …) inherit the privilege of those credentials and allowed paths |
| **Kubernetes workers** | Can access mounted secrets, run-store PVC, and any network the pod can reach |

### High-impact issue classes we care about

- Remote code execution or arbitrary file write/read **without** intended operator privileges
- Authentication / authorization bypass on gated HTTP APIs
- Secret exfiltration (API keys, tokens in logs, env leakage to untrusted clients)
- Path traversal outside configured upload / filesystem MCP roots
- Unsafe deserialization or template injection leading to RCE
- Supply-chain issues in **this** repo’s release artifacts, workflows, or published images (typosquat, compromised Actions, malicious release assets)
- Cross-tenant session mix-ups when session IDs are attacker-controlled in multi-user reverse-proxy deployments

### Known limits (not vulnerabilities, but do not rely on them)

- **The custom tool "sandbox" is not OS isolation.** Uploaded tools start with a minimal environment (no engine secrets), but run as the daemon user with network and filesystem access. Enable `AGENTIC_CUSTOM_TOOL_SANDBOX` only for operators you would let run code on the host.
- **Reversible cloud anonymisation is best effort.** Unknown provider prefixes are treated as cloud and redacted, and final answers restore placeholders from a per-run map; placeholders carried in older session history are not restored.
- **Usage attribution** (`appId` / `tokenId` on engine WebSocket messages) is self-asserted by the client.
- **Kubernetes images run as root by default**, and several edge workloads are privileged for GPU access. A non-root account (uid 10001) exists in the images for deployments that can use it; see `agentic-orchestration-tool/deploy/k8s/README.md`.

### Explicit non-goals

This project **executes models and tools chosen by configuration**. Prompt injection that causes an agent to call an MCP the operator already enabled is expected risk; we still welcome reports that show **unexpected privilege** beyond catalog/env policy (e.g. escaping `FILESYSTEM_MCP_ALLOWED_DIRECTORY`).

## Operator hardening checklist

Use this when deploying beyond a personal laptop:

1. **Never** bind `AGENTIC_WEB_HOST=0.0.0.0` to an untrusted network without authentication in front of the UI and WebSocket.
   Behind a proxy, set **`AGENTIC_WEB_TRUSTED_PROXIES`** to the proxy's address so only it can obtain the UI token and assert identity headers; set **`AGENTIC_SERVE_ADMIN_TOKEN`** (same value on the web server and the engine daemon) whenever the daemon is not on the web server's loopback.
2. Set strong **`AGENTIC_ORCHESTRATE_API_KEY`** (and/or `AGENTIC_CHAT_COMPLETIONS_API_KEY`) for any HTTP bridge used by plugins or proxies.
3. Keep secrets in `.env` / Kubernetes Secrets — never commit them; rotate after any leak (including chat pastes).
4. Scope MCP credentials to least privilege (HA tokens, search keys, filesystem allowlists).
5. Prefer **local Ollama** when data must not leave the premises; review which agent providers are in the active catalog.
6. On Jetson/k3s: keep NodePort / Traefik upstreams behind Warpgate or equivalent; use GHCR images pinned by digest when possible.
7. Disable or avoid `AGENTIC_AUTO_ENSURE_*` features in locked-down environments where installing runtimes or pulling models from the Internet is prohibited.
8. Run workers and the coordinator under non-root where your platform allows; limit egress with NetworkPolicies if you need network isolation.

Related notes: [`agentic-orchestration-web/README.md`](agentic-orchestration-web/README.md) (Security section), [`docs`](https://zlatko-lakisic.github.io/agentic-orchestration/), wiki [[External-integrations]].

## Safe harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, destruction of data, and interruption of production services
- Do not exploit a vulnerability beyond what is needed to demonstrate it
- Report findings privately and give us time to remediate before public disclosure
- Do not use social engineering or physical attacks

## Dependency and supply-chain security

- Prefer installing from tagged GitHub Releases / GHCR images built by this repo’s Actions
- Review `.github/workflows/` for unexpected changes in PRs
- Report compromised maintainer accounts or suspicious releases immediately via private advisory

## Related projects

- OpenClaw plugin: [agentic-orchestration-openclaw](https://github.com/zlatko-lakisic/agentic-orchestration-openclaw) — see that repo’s `SECURITY.md` for plugin-specific reporting (managed backend bootstrap, hooks, ClawHub package)

## Contact

Primary channel: **GitHub Security Advisories** on this repository.  
Maintainer: [@zlatko-lakisic](https://github.com/zlatko-lakisic)
