import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const libUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "user-context.mjs"),
);

const {
  sanitizeUserDisplayName,
  sessionIdFromRequestHeaders,
  sanitizeSessionId,
  generateWebSessionId,
  resolveSessionIdFromHeaders,
  userNameFromRequestHeaders,
  userDisplayNameSpawnEnv,
  authProfileFromRequestHeaders,
  normalizeAvatarUrl,
  sanitizeLogoutUrl,
  sessionPayloadFromAuthProfile,
  resolveAuthDisplayName,
} = await import(libUrl);

test("userNameFromRequestHeaders reads configured header", () => {
  const name = userNameFromRequestHeaders(
    { "x-agentic-user-name": "Zlatko" },
    "x-agentic-user-name",
  );
  assert.equal(name, "Zlatko");
});

test("userNameFromRequestHeaders falls back to x-user-name", () => {
  const name = userNameFromRequestHeaders({ "x-user-name": "Alex" }, "x-agentic-user-name,x-user-name");
  assert.equal(name, "Alex");
});

test("sanitizeUserDisplayName rejects empty and overlong values", () => {
  assert.equal(sanitizeUserDisplayName(""), null);
  assert.equal(sanitizeUserDisplayName("a".repeat(121)), null);
});

test("userDisplayNameSpawnEnv maps to AGENTIC_WEB_USER_DISPLAY_NAME", () => {
  assert.deepEqual(userDisplayNameSpawnEnv("Sam"), { AGENTIC_WEB_USER_DISPLAY_NAME: "Sam" });
  assert.deepEqual(userDisplayNameSpawnEnv(""), {});
});

test("sessionIdFromRequestHeaders prefers x-agentic-session-id", () => {
  const id = sessionIdFromRequestHeaders(
    { "x-agentic-session-id": "wg-abc123", "x-warpgate-session-id": "wg-other" },
    "x-agentic-session-id,x-warpgate-session-id",
  );
  assert.equal(id, "wg-abc123");
});

test("sessionIdFromRequestHeaders falls back to x-warpgate-session-id", () => {
  const id = sessionIdFromRequestHeaders(
    { "x-warpgate-session-id": "wg-xyz" },
    "x-agentic-session-id,x-warpgate-session-id",
  );
  assert.equal(id, "wg-xyz");
});

test("sanitizeSessionId rejects invalid values", () => {
  assert.equal(sanitizeSessionId(""), null);
  assert.equal(sanitizeSessionId("bad id"), null);
  assert.equal(sanitizeSessionId("a".repeat(129)), null);
});

test("resolveSessionIdFromHeaders generates web- id when headers empty", () => {
  const id = resolveSessionIdFromHeaders({});
  assert.match(id, /^web-[a-f0-9]{12}$/);
});

test("generateWebSessionId matches web- prefix pattern", () => {
  const id = generateWebSessionId();
  assert.match(id, /^web-[a-f0-9]{12}$/);
});

test("authProfileFromRequestHeaders maps Warpgate X-Auth-* headers", () => {
  const profile = authProfileFromRequestHeaders({
    "x-auth-user-id": "uid-42",
    "x-auth-email": "ada@example.com",
    "x-auth-first-name": "Ada",
    "x-auth-last-name": "Lovelace",
    "x-auth-logout-url": "https://gate.example/logout",
    "x-auth-avatar": "https://cdn.example/ada.jpg",
  });
  assert.equal(profile.userId, "uid-42");
  assert.equal(profile.email, "ada@example.com");
  assert.equal(profile.firstName, "Ada");
  assert.equal(profile.lastName, "Lovelace");
  assert.equal(profile.logoutUrl, "https://gate.example/logout");
  assert.equal(profile.avatarUrl, "https://cdn.example/ada.jpg");
  assert.equal(profile.userName, "Ada Lovelace");
});

test("normalizeAvatarUrl wraps bare base64 jpegPhoto", () => {
  const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  assert.equal(normalizeAvatarUrl(b64), `data:image/jpeg;base64,${b64}`);
});

test("normalizeAvatarUrl accepts data URI and rejects javascript", () => {
  assert.equal(normalizeAvatarUrl("data:image/png;base64,abc"), "data:image/png;base64,abc");
  assert.equal(normalizeAvatarUrl("javascript:alert(1)"), null);
});

test("sessionPayloadFromAuthProfile omits null optional keys", () => {
  const payload = sessionPayloadFromAuthProfile(
    authProfileFromRequestHeaders({ "x-auth-email": "solo@example.com" }),
    "web-abc",
  );
  assert.equal(payload.userName, "solo@example.com");
  assert.equal(payload.sessionId, "web-abc");
  assert.equal(payload.email, "solo@example.com");
  assert.equal("userId" in payload, false);
});

test("resolveAuthDisplayName prefers first and last name", () => {
  assert.equal(
    resolveAuthDisplayName({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" }),
    "Ada Lovelace",
  );
});

test("sanitizeLogoutUrl allows http(s) only", () => {
  assert.equal(sanitizeLogoutUrl("https://gate/logout"), "https://gate/logout");
  assert.equal(sanitizeLogoutUrl("ftp://gate/logout"), null);
});
