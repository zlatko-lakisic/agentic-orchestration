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
