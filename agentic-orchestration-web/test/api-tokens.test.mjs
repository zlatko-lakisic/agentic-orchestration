/**
 * Unit tests for API access token registry + usage ledger.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  authenticateBearer,
  authRequired,
  clientIp,
  hasActiveTokens,
  listTokens,
  listUsage,
  mintToken,
  recordUsage,
  revokeToken,
} from "../lib/api-tokens.mjs";

function tmpTool() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ao-api-tokens-"));
}

test("mintToken stores hash only and returns plaintext once", () => {
  const toolRoot = tmpTool();
  const minted = mintToken(toolRoot, { appId: "openclaw", label: "desk" });
  assert.ok(minted.token.startsWith("ao_"));
  assert.equal(minted.appId, "openclaw");
  assert.equal(minted.label, "desk");
  assert.equal(minted.status, "active");
  assert.ok(minted.prefix);
  assert.ok(minted.id);

  const listed = listTokens(toolRoot);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, minted.id);
  assert.equal(listed[0].prefix, minted.prefix);
  assert.equal("token" in listed[0], false);
  assert.equal("hash" in listed[0], false);

  const disk = JSON.parse(
    fs.readFileSync(path.join(toolRoot, "__orchestrator_api_tokens__", "tokens.json"), "utf8"),
  );
  assert.equal(disk.length, 1);
  assert.ok(disk[0].hash);
  assert.equal(disk[0].hash.includes(minted.token), false);
});

test("authenticateBearer accepts minted token and env fallback", () => {
  const toolRoot = tmpTool();
  const minted = mintToken(toolRoot, { appId: "reach-app" });
  const envKey = "shared-env-secret";

  const viaToken = authenticateBearer(toolRoot, `Bearer ${minted.token}`, [envKey]);
  assert.equal(viaToken.ok, true);
  assert.equal(viaToken.source, "token");
  assert.equal(viaToken.appId, "reach-app");
  assert.equal(viaToken.tokenId, minted.id);

  const viaEnv = authenticateBearer(toolRoot, `Bearer ${envKey}`, [envKey]);
  assert.equal(viaEnv.ok, true);
  assert.equal(viaEnv.source, "env");
  assert.equal(viaEnv.appId, "env");

  const bad = authenticateBearer(toolRoot, "Bearer nope", [envKey]);
  assert.equal(bad.ok, false);

  assert.equal(authRequired(toolRoot, []), true);
  assert.equal(hasActiveTokens(toolRoot), true);
});

test("revokeToken rejects further use", () => {
  const toolRoot = tmpTool();
  const minted = mintToken(toolRoot, { appId: "tmp" });
  const stillActive = mintToken(toolRoot, { appId: "keep" });
  const revoked = revokeToken(toolRoot, minted.id);
  assert.ok(revoked);
  assert.equal(revoked.status, "revoked");
  assert.ok(revoked.revokedAt);

  // Gate still required because another active token remains.
  assert.equal(authRequired(toolRoot, []), true);
  const auth = authenticateBearer(toolRoot, `Bearer ${minted.token}`, []);
  assert.equal(auth.ok, false);

  const other = authenticateBearer(toolRoot, `Bearer ${stillActive.token}`, []);
  assert.equal(other.ok, true);
  assert.equal(other.appId, "keep");

  revokeToken(toolRoot, stillActive.id);
  assert.equal(authRequired(toolRoot, []), false);
  const open = authenticateBearer(toolRoot, "", []);
  assert.equal(open.ok, true);
  assert.equal(open.appId, "open");
});
test("recordUsage and listUsage track IP and path", () => {
  const toolRoot = tmpTool();
  const minted = mintToken(toolRoot, { appId: "metrics-app" });
  recordUsage(toolRoot, {
    tokenId: minted.id,
    appId: "metrics-app",
    ip: "10.0.10.50",
    path: "/api/v1/orchestrate",
    status: 200,
    latencyMs: 42.7,
    promptChars: 12,
  });
  const usage = listUsage(toolRoot, minted.id, 10);
  assert.equal(usage.length, 1);
  assert.equal(usage[0].ip, "10.0.10.50");
  assert.equal(usage[0].path, "/api/v1/orchestrate");
  assert.equal(usage[0].status, 200);
  assert.equal(usage[0].latencyMs, 43);

  const listed = listTokens(toolRoot);
  assert.equal(listed[0].lastUsedIp, "10.0.10.50");
  assert.ok(listed[0].lastUsedAt);
});

test("clientIp prefers x-forwarded-for", () => {
  assert.equal(
    clientIp({
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
      socket: { remoteAddress: "127.0.0.1" },
    }),
    "203.0.113.9",
  );
  assert.equal(clientIp({ headers: {}, socket: { remoteAddress: "::ffff:10.1.2.3" } }), "10.1.2.3");
});

test("mintToken requires appId", () => {
  const toolRoot = tmpTool();
  assert.throws(() => mintToken(toolRoot, { appId: "  " }), /appId/);
});

test("AGENTIC_API_TOKENS_DIR overrides store location", () => {
  const toolRoot = tmpTool();
  const alt = fs.mkdtempSync(path.join(os.tmpdir(), "ao-api-tokens-alt-"));
  const prev = process.env.AGENTIC_API_TOKENS_DIR;
  process.env.AGENTIC_API_TOKENS_DIR = alt;
  try {
    const minted = mintToken(toolRoot, { appId: "override-app" });
    assert.ok(fs.existsSync(path.join(alt, "tokens.json")));
    assert.equal(listTokens(toolRoot)[0].id, minted.id);
    assert.equal(fs.existsSync(path.join(toolRoot, "__orchestrator_api_tokens__")), false);
  } finally {
    if (prev === undefined) delete process.env.AGENTIC_API_TOKENS_DIR;
    else process.env.AGENTIC_API_TOKENS_DIR = prev;
  }
});
