import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const libUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "user-context.mjs"),
);

const { sanitizeUserDisplayName, userNameFromRequestHeaders, userDisplayNameSpawnEnv } =
  await import(libUrl);

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
