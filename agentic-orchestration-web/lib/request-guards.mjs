/**
 * Pure request-validation helpers shared by the HTTP and WebSocket paths of server.mjs.
 *
 * - trusted-source check for the first-party UI token bootstrap routes
 * - Origin / Host validation (cross-site WebSocket hijacking, DNS rebinding)
 * - WebSocket subprotocol token transport (`ao-auth` + `ao-bearer.<token>`)
 * - WebSocket client frame validation
 * - prompt sanitising for the Python argv hand-off
 *
 * Nothing here touches the filesystem or starts a listener, so it is unit-testable.
 */
import net from "node:net";

/** Headers a reverse proxy adds; their presence means the socket peer is not the real client. */
export const FORWARDING_HEADERS = ["x-forwarded-for", "forwarded", "x-real-ip"];

export const WS_AUTH_SUBPROTOCOL = "ao-auth";
export const WS_BEARER_SUBPROTOCOL_PREFIX = "ao-bearer.";

export const UNTRUSTED_SOURCE_ERROR = "web_auth_untrusted_source";
export const UNTRUSTED_SOURCE_HINT =
  "This server only hands out the first-party UI token (and allows token bootstrap) to a trusted source: " +
  "a loopback client with no proxy headers, or a reverse proxy listed in AGENTIC_WEB_TRUSTED_PROXIES " +
  "(comma-separated IPs/CIDRs of your auth proxy). Set AGENTIC_WEB_TRUSTED_PROXIES on the web server, " +
  "or AGENTIC_WEB_AUTH_BOOTSTRAP=open to restore the previous open behaviour (not recommended on shared networks).";

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function parseCommaList(raw) {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Normalise a socket/remote address: drop IPv4-mapped prefix, brackets and zone id.
 * @param {unknown} raw
 */
export function normalizeIp(raw) {
  let ip = String(raw ?? "").trim();
  if (!ip) return "";
  if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1);
  const zone = ip.indexOf("%");
  if (zone >= 0) ip = ip.slice(0, zone);
  if (/^::ffff:/i.test(ip) && net.isIPv4(ip.slice(7))) ip = ip.slice(7);
  return ip.toLowerCase();
}

/** @param {unknown} raw */
export function isLoopbackAddress(raw) {
  const ip = normalizeIp(raw);
  if (!ip) return false;
  if (net.isIPv4(ip)) return ip.startsWith("127.");
  if (net.isIPv6(ip)) return ip === "::1" || ip === "0:0:0:0:0:0:0:1";
  return false;
}

/**
 * Loopback host *name* (as found in a Host / Origin header, port already removed).
 * @param {unknown} raw
 */
export function isLoopbackHostname(raw) {
  let h = String(raw ?? "").trim().toLowerCase();
  if (!h) return false;
  if (h.endsWith(".")) h = h.slice(0, -1);
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  return isLoopbackAddress(h);
}

/**
 * Hostname (lowercase, no port, no brackets) from a Host-style header value.
 * @param {unknown} raw
 * @returns {string}
 */
export function hostnameFromHostHeader(raw) {
  const first = Array.isArray(raw) ? raw[0] : raw;
  let v = String(first ?? "").split(",")[0].trim().toLowerCase();
  if (!v) return "";
  if (v.startsWith("[")) {
    const end = v.indexOf("]");
    return end > 0 ? v.slice(1, end) : "";
  }
  // Bare IPv6 without brackets has more than one colon; leave it alone.
  if ((v.match(/:/g) || []).length === 1) v = v.slice(0, v.indexOf(":"));
  if (v.endsWith(".")) v = v.slice(0, -1);
  return v;
}

/**
 * @param {unknown} ipRaw
 * @param {unknown} listRaw comma list of IPs and CIDRs (IPv4 and IPv6)
 */
export function ipMatchesCidrList(ipRaw, listRaw) {
  const ip = normalizeIp(ipRaw);
  if (!ip) return false;
  const family = net.isIPv4(ip) ? "ipv4" : net.isIPv6(ip) ? "ipv6" : "";
  if (!family) return false;
  const entries = Array.isArray(listRaw) ? listRaw : parseCommaList(listRaw);
  if (!entries.length) return false;
  const block = new net.BlockList();
  for (const entryRaw of entries) {
    const entry = String(entryRaw || "").trim();
    if (!entry) continue;
    const slash = entry.indexOf("/");
    try {
      if (slash < 0) {
        const addr = normalizeIp(entry);
        if (net.isIPv4(addr)) block.addAddress(addr, "ipv4");
        else if (net.isIPv6(addr)) block.addAddress(addr, "ipv6");
        continue;
      }
      const addr = normalizeIp(entry.slice(0, slash));
      const prefix = Number(entry.slice(slash + 1));
      if (!Number.isInteger(prefix) || prefix < 0) continue;
      if (net.isIPv4(addr) && prefix <= 32) block.addSubnet(addr, prefix, "ipv4");
      else if (net.isIPv6(addr) && prefix <= 128) block.addSubnet(addr, prefix, "ipv6");
    } catch {
      /* skip malformed entry */
    }
  }
  try {
    return block.check(ip, family);
  } catch {
    return false;
  }
}

/** @param {Record<string, unknown>|undefined|null} headers */
export function hasForwardingHeader(headers) {
  if (!headers) return false;
  for (const name of FORWARDING_HEADERS) {
    const raw = headers[name];
    const v = Array.isArray(raw) ? raw.join(",") : raw;
    if (v != null && String(v).trim()) return true;
  }
  return false;
}

/** @param {Record<string, string|undefined>} [env] */
export function bootstrapOpenMode(env = process.env) {
  return String(env.AGENTIC_WEB_AUTH_BOOTSTRAP || "").trim().toLowerCase() === "open";
}

/**
 * May this request receive the plaintext first-party UI token / use the pre-assignment
 * bootstrap routes?
 *
 *  - `AGENTIC_WEB_AUTH_BOOTSTRAP=open` → always (legacy behaviour)
 *  - socket peer listed in `AGENTIC_WEB_TRUSTED_PROXIES` → yes
 *  - loopback socket peer with no forwarding header → yes
 *
 * @param {{ headers?: Record<string, unknown>, socket?: { remoteAddress?: string } }|null|undefined} req
 * @param {Record<string, string|undefined>} [env]
 */
export function isTrustedBootstrapSource(req, env = process.env) {
  if (bootstrapOpenMode(env)) return true;
  const peer = normalizeIp(req?.socket?.remoteAddress);
  if (!peer) return false;
  if (ipMatchesCidrList(peer, env.AGENTIC_WEB_TRUSTED_PROXIES)) return true;
  if (isLoopbackAddress(peer) && !hasForwardingHeader(req?.headers)) return true;
  return false;
}

const IDENTITY_HEADER_PREFIXES = ["x-auth-", "x-warpgate-", "x-agentic-"];
const IDENTITY_HEADER_NAMES = ["x-user-name", "x-forwarded-avatar"];

/**
 * Identity headers (user, session, avatar, logout URL …) are only meaningful when an
 * authenticating proxy set them. Once the operator has declared which proxies are trusted
 * (`AGENTIC_WEB_TRUSTED_PROXIES`), drop those headers — in place — from every request whose
 * socket peer is not one of them, and flag the request so the forwarded client IP is ignored.
 * No-op (returns false) when no trusted proxy is configured, so default behaviour is unchanged.
 *
 * @param {{ headers?: Record<string, unknown>, socket?: { remoteAddress?: string }, agenticUntrustedPeer?: boolean }|null|undefined} req
 * @param {Record<string, string|undefined>} [env]
 * @returns {boolean} true when the peer was treated as untrusted
 */
export function stripUntrustedIdentityHeaders(req, env = process.env) {
  if (!req || !req.headers) return false;
  const trusted = parseCommaList(env.AGENTIC_WEB_TRUSTED_PROXIES);
  if (!trusted.length) return false;
  if (ipMatchesCidrList(req.socket?.remoteAddress, trusted)) return false;
  const configured = [
    env.AGENTIC_WEB_SESSION_ID_HEADER,
    env.AGENTIC_WEB_USER_NAME_HEADER,
    env.AGENTIC_WEB_AVATAR_HEADER,
  ].flatMap((v) => parseCommaList(v).map((s) => s.toLowerCase()));
  for (const name of Object.keys(req.headers)) {
    const lower = name.toLowerCase();
    if (
      IDENTITY_HEADER_PREFIXES.some((p) => lower.startsWith(p)) ||
      IDENTITY_HEADER_NAMES.includes(lower) ||
      configured.includes(lower)
    ) {
      delete req.headers[name];
    }
  }
  req.agenticUntrustedPeer = true;
  return true;
}

/** JSON body for the 403 an untrusted caller gets on the bootstrap routes. */
export function untrustedSourceBody(assigned) {
  return {
    assigned: Boolean(assigned),
    token: null,
    error: UNTRUSTED_SOURCE_ERROR,
    hint: UNTRUSTED_SOURCE_HINT,
  };
}

/**
 * Origin rule: no Origin passes (non-browser clients). Otherwise the Origin hostname must be a
 * loopback name, equal the Host (or X-Forwarded-Host) hostname, or be listed in
 * `AGENTIC_WEB_ALLOWED_ORIGINS` (full origins or bare hostnames; `*` disables the check).
 *
 * @param {{ origin?: unknown, host?: unknown, forwardedHost?: unknown }} parts
 * @param {Record<string, string|undefined>} [env]
 */
export function isOriginAllowed(parts, env = process.env) {
  const originRaw = Array.isArray(parts?.origin) ? parts.origin[0] : parts?.origin;
  const origin = String(originRaw ?? "").trim();
  if (!origin) return true;
  const allow = parseCommaList(env.AGENTIC_WEB_ALLOWED_ORIGINS).map((s) =>
    s.toLowerCase().replace(/\/+$/, ""),
  );
  if (allow.includes("*")) return true;
  if (origin.toLowerCase() === "null") return allow.includes("null");
  let u;
  try {
    u = new URL(origin);
  } catch {
    return false;
  }
  const originHost = hostnameFromHostHeader(u.host);
  if (!originHost) return false;
  if (isLoopbackHostname(originHost)) return true;
  const hostNames = [
    hostnameFromHostHeader(parts?.host),
    hostnameFromHostHeader(parts?.forwardedHost),
  ].filter(Boolean);
  if (hostNames.includes(originHost)) return true;
  const full = `${u.protocol}//${u.host}`.toLowerCase();
  return allow.includes(full) || allow.includes(originHost) || allow.includes(u.host.toLowerCase());
}

/** @param {unknown} bindHost */
export function isLoopbackBind(bindHost) {
  return isLoopbackHostname(String(bindHost ?? "").trim());
}

/**
 * Host rule (DNS-rebinding guard): only enforced when the server is bound to a loopback
 * address. Then the Host hostname must be a loopback name or listed in
 * `AGENTIC_WEB_ALLOWED_HOSTS` (`*` disables the check). A missing Host passes.
 *
 * @param {{ host?: unknown, bindHost?: unknown }} parts
 * @param {Record<string, string|undefined>} [env]
 */
export function isHostAllowed(parts, env = process.env) {
  if (!isLoopbackBind(parts?.bindHost)) return true;
  const host = hostnameFromHostHeader(parts?.host);
  if (!host) return true;
  if (isLoopbackHostname(host)) return true;
  const allow = parseCommaList(env.AGENTIC_WEB_ALLOWED_HOSTS).map((s) =>
    hostnameFromHostHeader(s) || s.toLowerCase(),
  );
  if (allow.includes("*")) return true;
  return allow.includes(host);
}

/**
 * Offered subprotocols from a `Sec-WebSocket-Protocol` request header.
 * @param {unknown} headerRaw
 * @returns {string[]}
 */
export function parseWsProtocolHeader(headerRaw) {
  const raw = Array.isArray(headerRaw) ? headerRaw.join(",") : headerRaw;
  return parseCommaList(raw);
}

/**
 * Token carried as `ao-bearer.<token>` in the offered subprotocols ("" when absent).
 * @param {unknown} headerRaw
 */
export function wsBearerFromProtocolHeader(headerRaw) {
  for (const p of parseWsProtocolHeader(headerRaw)) {
    if (p.startsWith(WS_BEARER_SUBPROTOCOL_PREFIX)) {
      return p.slice(WS_BEARER_SUBPROTOCOL_PREFIX.length).trim();
    }
  }
  return "";
}

/**
 * `ws` `handleProtocols` callback: select `ao-auth` when offered; never echo the token entry.
 * @param {Set<string>|Iterable<string>} protocols
 * @returns {string|false}
 */
export function selectWsSubprotocol(protocols) {
  const list = [...(protocols || [])];
  if (list.includes(WS_AUTH_SUBPROTOCOL)) return WS_AUTH_SUBPROTOCOL;
  for (const p of list) {
    if (!String(p).startsWith(WS_BEARER_SUBPROTOCOL_PREFIX)) return p;
  }
  return false;
}

/**
 * Parse and validate one client WebSocket frame. Never throws.
 * @param {unknown} raw Buffer | string | ArrayBuffer | Buffer[]
 * @returns {{ ok: true, msg: Record<string, unknown> } | { ok: false, error: string }}
 */
export function parseWsClientMessage(raw) {
  let text;
  try {
    if (typeof raw === "string") text = raw;
    else if (Array.isArray(raw)) text = Buffer.concat(raw).toString("utf8");
    else if (raw instanceof ArrayBuffer) text = Buffer.from(raw).toString("utf8");
    else text = Buffer.from(/** @type {any} */ (raw)).toString("utf8");
  } catch {
    return { ok: false, error: "Invalid message" };
  }
  let msg;
  try {
    msg = JSON.parse(text);
  } catch {
    return { ok: false, error: "Invalid JSON message" };
  }
  if (msg == null || typeof msg !== "object" || Array.isArray(msg)) {
    return { ok: false, error: "Message must be a JSON object" };
  }
  if (typeof msg.type !== "string" || !msg.type) {
    return { ok: false, error: "Message is missing a string 'type'" };
  }
  return { ok: true, msg };
}

/** String field or "" — never throws on non-string client input. */
export function stringField(value) {
  return typeof value === "string" ? value : "";
}

/**
 * Prepare prompt text for the Python argv hand-off: NUL bytes make spawn() throw.
 * @param {unknown} text
 */
export function sanitizePromptText(text) {
  return stringField(text).replace(/\u0000/g, "");
}

/**
 * Upper bound on prompt size. Long prompts are streamed to the orchestrator over stdin
 * (see lib/spawn-args.mjs), so this is a resource limit, not an argv limit.
 */
export const DEFAULT_MAX_PROMPT_BYTES = 2_000_000;
export const HARD_MAX_PROMPT_BYTES = 16 * 1024 * 1024;

/** @param {Record<string, string|undefined>} [env] */
export function maxPromptBytes(env = process.env) {
  const raw = String(env.AGENTIC_WEB_MAX_PROMPT_BYTES ?? "").trim();
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n < 1024) return DEFAULT_MAX_PROMPT_BYTES;
  return Math.min(Math.trunc(n), HARD_MAX_PROMPT_BYTES);
}

/**
 * @param {string} text
 * @param {Record<string, string|undefined>} [env]
 * @returns {string|null} error message when the prompt cannot be passed to the orchestrator
 */
export function promptTooLargeError(text, env = process.env) {
  const limit = maxPromptBytes(env);
  const bytes = Buffer.byteLength(String(text || ""), "utf8");
  if (bytes <= limit) return null;
  return `Prompt too large (${bytes} bytes; max ${limit} bytes). Attach long documents as files instead.`;
}
