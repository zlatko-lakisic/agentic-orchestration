/**
 * Unit tests for the request guards shared by the HTTP and WebSocket paths of server.mjs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  UNTRUSTED_SOURCE_ERROR,
  hostnameFromHostHeader,
  ipMatchesCidrList,
  isHostAllowed,
  isLoopbackAddress,
  isOriginAllowed,
  isTrustedBootstrapSource,
  maxPromptBytes,
  normalizeIp,
  parseWsClientMessage,
  promptTooLargeError,
  sanitizePromptText,
  selectWsSubprotocol,
  stringField,
  stripUntrustedIdentityHeaders,
  untrustedSourceBody,
  wsBearerFromProtocolHeader,
} from "../lib/request-guards.mjs";

const req = (remoteAddress, headers = {}) => ({ socket: { remoteAddress }, headers });

test("normalizeIp / isLoopbackAddress handle IPv4-mapped and bracketed forms", () => {
  assert.equal(normalizeIp("::ffff:127.0.0.1"), "127.0.0.1");
  assert.equal(normalizeIp("[::1]"), "::1");
  assert.equal(normalizeIp("fe80::1%eth0"), "fe80::1");
  assert.equal(isLoopbackAddress("::ffff:127.0.0.1"), true);
  assert.equal(isLoopbackAddress("127.8.9.1"), true);
  assert.equal(isLoopbackAddress("::1"), true);
  assert.equal(isLoopbackAddress("10.0.0.5"), false);
  assert.equal(isLoopbackAddress("127.0.0.1.evil.example"), false);
  assert.equal(isLoopbackAddress(""), false);
});

test("ipMatchesCidrList matches IPs and CIDRs for IPv4 and IPv6", () => {
  assert.equal(ipMatchesCidrList("10.42.3.9", "10.42.0.0/16"), true);
  assert.equal(ipMatchesCidrList("10.43.3.9", "10.42.0.0/16"), false);
  assert.equal(ipMatchesCidrList("::ffff:192.168.1.7", "192.168.1.7, 10.0.0.0/8"), true);
  assert.equal(ipMatchesCidrList("fd00::12", "fd00::/8"), true);
  assert.equal(ipMatchesCidrList("fe80::12", "fd00::/8"), false);
  assert.equal(ipMatchesCidrList("10.0.0.1", ""), false);
  assert.equal(ipMatchesCidrList("10.0.0.1", "not-an-ip, 10.0.0.0/99, , 10.0.0.1"), true);
  assert.equal(ipMatchesCidrList("garbage", "0.0.0.0/0"), false);
});

test("trusted bootstrap source: loopback without proxy headers", () => {
  const env = {};
  assert.equal(isTrustedBootstrapSource(req("127.0.0.1"), env), true);
  assert.equal(isTrustedBootstrapSource(req("::1"), env), true);
  assert.equal(isTrustedBootstrapSource(req("::ffff:127.0.0.1"), env), true);
  // A local reverse proxy forwards remote clients over loopback: not trusted by default.
  for (const h of ["x-forwarded-for", "forwarded", "x-real-ip"]) {
    assert.equal(isTrustedBootstrapSource(req("127.0.0.1", { [h]: "203.0.113.9" }), env), false, h);
  }
  assert.equal(isTrustedBootstrapSource(req("192.168.1.20"), env), false);
  assert.equal(isTrustedBootstrapSource(req(undefined), env), false);
  assert.equal(isTrustedBootstrapSource(null, env), false);
});

test("trusted bootstrap source: AGENTIC_WEB_TRUSTED_PROXIES and the open escape hatch", () => {
  const env = { AGENTIC_WEB_TRUSTED_PROXIES: "10.0.10.5, 10.42.0.0/16" };
  assert.equal(isTrustedBootstrapSource(req("10.0.10.5", { "x-forwarded-for": "1.2.3.4" }), env), true);
  assert.equal(isTrustedBootstrapSource(req("10.42.7.7"), env), true);
  assert.equal(isTrustedBootstrapSource(req("10.0.10.6"), env), false);
  // Loopback proxy must be listed explicitly once it forwards for others.
  assert.equal(isTrustedBootstrapSource(req("127.0.0.1", { "x-forwarded-for": "1.2.3.4" }), env), false);
  assert.equal(
    isTrustedBootstrapSource(req("127.0.0.1", { "x-forwarded-for": "1.2.3.4" }), {
      AGENTIC_WEB_TRUSTED_PROXIES: "127.0.0.1",
    }),
    true,
  );
  assert.equal(isTrustedBootstrapSource(req("203.0.113.9"), { AGENTIC_WEB_AUTH_BOOTSTRAP: "open" }), true);
  assert.equal(isTrustedBootstrapSource(req("203.0.113.9"), { AGENTIC_WEB_AUTH_BOOTSTRAP: "1" }), false);
});

test("untrustedSourceBody follows the cross-worker contract", () => {
  const body = untrustedSourceBody(true);
  assert.deepEqual(Object.keys(body).sort(), ["assigned", "error", "hint", "token"]);
  assert.equal(body.assigned, true);
  assert.equal(body.token, null);
  assert.equal(body.error, UNTRUSTED_SOURCE_ERROR);
  assert.equal(body.error, "web_auth_untrusted_source");
  assert.match(body.hint, /AGENTIC_WEB_TRUSTED_PROXIES/);
  assert.match(body.hint, /AGENTIC_WEB_AUTH_BOOTSTRAP=open/);
  assert.equal(untrustedSourceBody(false).assigned, false);
});

test("hostnameFromHostHeader strips ports and brackets", () => {
  assert.equal(hostnameFromHostHeader("Example.COM:3847"), "example.com");
  assert.equal(hostnameFromHostHeader("[::1]:3847"), "::1");
  assert.equal(hostnameFromHostHeader("127.0.0.1"), "127.0.0.1");
  assert.equal(hostnameFromHostHeader("a.example, b.example"), "a.example");
  assert.equal(hostnameFromHostHeader(undefined), "");
});

test("Origin rule: absent, loopback, same host, allowlist", () => {
  const env = {};
  assert.equal(isOriginAllowed({ origin: undefined, host: "127.0.0.1:3847" }, env), true);
  assert.equal(isOriginAllowed({ origin: "http://localhost:3873", host: "127.0.0.1:3847" }, env), true);
  assert.equal(isOriginAllowed({ origin: "http://127.0.0.1:3847", host: "127.0.0.1:3847" }, env), true);
  assert.equal(isOriginAllowed({ origin: "http://[::1]:3847", host: "[::1]:3847" }, env), true);
  // Cross-site page driving a local server (the CSWSH case).
  assert.equal(isOriginAllowed({ origin: "http://evil.example", host: "127.0.0.1:3847" }, env), false);
  assert.equal(isOriginAllowed({ origin: "https://localhost.evil.example", host: "127.0.0.1" }, env), false);
  assert.equal(isOriginAllowed({ origin: "null", host: "127.0.0.1:3847" }, env), false);
  assert.equal(isOriginAllowed({ origin: "not a url", host: "127.0.0.1:3847" }, env), false);
  // Reverse-proxied deployment: Origin host equals Host (or X-Forwarded-Host).
  assert.equal(isOriginAllowed({ origin: "https://ao.example.com", host: "ao.example.com" }, env), true);
  assert.equal(
    isOriginAllowed(
      { origin: "https://ao.example.com", host: "127.0.0.1:3847", forwardedHost: "ao.example.com" },
      env,
    ),
    true,
  );
  assert.equal(isOriginAllowed({ origin: "https://other.example.com", host: "ao.example.com" }, env), false);
  const allow = { AGENTIC_WEB_ALLOWED_ORIGINS: "https://app.example.com, tools.example.org" };
  assert.equal(isOriginAllowed({ origin: "https://app.example.com", host: "ao.example.com" }, allow), true);
  assert.equal(isOriginAllowed({ origin: "http://tools.example.org:8080", host: "ao.example.com" }, allow), true);
  assert.equal(isOriginAllowed({ origin: "http://app.example.com", host: "ao.example.com" }, allow), false);
  assert.equal(
    isOriginAllowed({ origin: "http://evil.example", host: "x" }, { AGENTIC_WEB_ALLOWED_ORIGINS: "*" }),
    true,
  );
});

test("Host rule: only enforced on a loopback bind", () => {
  const env = {};
  assert.equal(isHostAllowed({ host: "127.0.0.1:3847", bindHost: "127.0.0.1" }, env), true);
  assert.equal(isHostAllowed({ host: "localhost:3847", bindHost: "127.0.0.1" }, env), true);
  assert.equal(isHostAllowed({ host: "[::1]:3847", bindHost: "::1" }, env), true);
  assert.equal(isHostAllowed({ host: undefined, bindHost: "127.0.0.1" }, env), true);
  // DNS rebinding: attacker hostname resolving to 127.0.0.1.
  assert.equal(isHostAllowed({ host: "rebind.evil.example:3847", bindHost: "127.0.0.1" }, env), false);
  assert.equal(isHostAllowed({ host: "rebind.evil.example", bindHost: "localhost" }, env), false);
  // Non-loopback bind (LAN / Kubernetes): any Host.
  assert.equal(isHostAllowed({ host: "ao.example.com", bindHost: "0.0.0.0" }, env), true);
  assert.equal(isHostAllowed({ host: "10.0.0.9:3847", bindHost: "10.0.0.9" }, env), true);
  const allow = { AGENTIC_WEB_ALLOWED_HOSTS: "ao.example.com" };
  assert.equal(isHostAllowed({ host: "ao.example.com", bindHost: "127.0.0.1" }, allow), true);
  assert.equal(isHostAllowed({ host: "other.example.com", bindHost: "127.0.0.1" }, allow), false);
  assert.equal(
    isHostAllowed({ host: "anything", bindHost: "127.0.0.1" }, { AGENTIC_WEB_ALLOWED_HOSTS: "*" }),
    true,
  );
});

test("WebSocket subprotocol token transport", () => {
  assert.equal(wsBearerFromProtocolHeader("ao-auth, ao-bearer.ao_abc-DEF_123"), "ao_abc-DEF_123");
  assert.equal(wsBearerFromProtocolHeader("ao-auth"), "");
  assert.equal(wsBearerFromProtocolHeader(undefined), "");
  assert.equal(selectWsSubprotocol(new Set(["ao-auth", "ao-bearer.ao_secret"])), "ao-auth");
  // The token entry is never echoed back, even when ao-auth is missing.
  assert.equal(selectWsSubprotocol(new Set(["ao-bearer.ao_secret"])), false);
  assert.equal(selectWsSubprotocol(new Set(["ao-bearer.ao_secret", "graphql-ws"])), "graphql-ws");
  assert.equal(selectWsSubprotocol(new Set()), false);
});

test("parseWsClientMessage never throws on malformed frames", () => {
  // Each of these used to throw inside the 'message' listener and kill the process.
  for (const frame of ["null", "[]", "5", '"chat"', "true", "{bad json", "", '{"type":5}', "{}"]) {
    const parsed = parseWsClientMessage(Buffer.from(frame));
    assert.equal(parsed.ok, false, frame);
    assert.equal(typeof parsed.error, "string");
  }
  const ok = parseWsClientMessage(Buffer.from('{"type":"chat","text":123}'));
  assert.equal(ok.ok, true);
  assert.equal(ok.msg.type, "chat");
  assert.equal(parseWsClientMessage([Buffer.from('{"type":'), Buffer.from('"ping"}')]).ok, true);
  assert.equal(parseWsClientMessage('{"type":"ping"}').ok, true);
  assert.equal(parseWsClientMessage(undefined).ok, false);
});

test("stringField / sanitizePromptText tolerate non-strings and strip NUL", () => {
  assert.equal(stringField(123), "");
  assert.equal(stringField(null), "");
  assert.equal(stringField("x"), "x");
  assert.equal(sanitizePromptText(123), "");
  assert.equal(sanitizePromptText({ trim: 1 }), "");
  // spawn() throws ERR_INVALID_ARG_VALUE on NUL bytes in argv.
  assert.equal(sanitizePromptText("a\u0000b"), "ab");
});

test("promptTooLargeError enforces the configured prompt size limit", () => {
  assert.equal(promptTooLargeError("hello", {}), null);
  // Long prompts go over stdin, so sizes past the argv limit are accepted by default.
  assert.equal(promptTooLargeError("x".repeat(130_000), {}), null);
  assert.match(promptTooLargeError("x".repeat(2_000_001), {}), /Prompt too large/);
  // Multi-byte text is measured in bytes, not characters.
  assert.match(
    promptTooLargeError("é".repeat(3_000), { AGENTIC_WEB_MAX_PROMPT_BYTES: "4096" }),
    /Prompt too large/,
  );
  assert.equal(maxPromptBytes({}), 2_000_000);
  assert.equal(maxPromptBytes({ AGENTIC_WEB_MAX_PROMPT_BYTES: "4096" }), 4096);
  assert.equal(maxPromptBytes({ AGENTIC_WEB_MAX_PROMPT_BYTES: "999999999" }), 16 * 1024 * 1024);
  assert.equal(maxPromptBytes({ AGENTIC_WEB_MAX_PROMPT_BYTES: "abc" }), 2_000_000);
});

test("identity headers are only honoured from configured trusted proxies", () => {
  const headers = () => ({
    "x-auth-user-id": "mallory",
    "x-warpgate-session-id": "victim",
    "x-agentic-user-name": "Mallory",
    "x-user-name": "Mallory",
    "x-custom-session": "victim",
    "x-forwarded-for": "198.51.100.1",
    host: "ao.example.com",
    authorization: "Bearer t",
  });
  // No trusted proxy configured: nothing changes (default behaviour).
  const untouched = req("203.0.113.9", headers());
  assert.equal(stripUntrustedIdentityHeaders(untouched, {}), false);
  assert.equal(untouched.headers["x-auth-user-id"], "mallory");
  assert.equal(untouched.agenticUntrustedPeer, undefined);

  const env = { AGENTIC_WEB_TRUSTED_PROXIES: "10.0.10.5", AGENTIC_WEB_SESSION_ID_HEADER: "X-Custom-Session" };
  const fromProxy = req("10.0.10.5", headers());
  assert.equal(stripUntrustedIdentityHeaders(fromProxy, env), false);
  assert.equal(fromProxy.headers["x-auth-user-id"], "mallory");

  const direct = req("203.0.113.9", headers());
  assert.equal(stripUntrustedIdentityHeaders(direct, env), true);
  assert.deepEqual(Object.keys(direct.headers).sort(), ["authorization", "host", "x-forwarded-for"]);
  assert.equal(direct.agenticUntrustedPeer, true);
  assert.equal(stripUntrustedIdentityHeaders(null, env), false);
});
