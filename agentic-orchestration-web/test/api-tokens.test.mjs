/**
 * Unit tests for API access token registry + usage ledger.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  WEB_UI_APP_ID,
  CHAT_UI_APP_ID,
  authenticateBearer,
  authenticateChatUiBearer,
  authenticateWebUiBearer,
  authRequired,
  clientIp,
  getChatAssignment,
  getWebAssignment,
  hasActiveTokens,
  isChatUiAssigned,
  isWebUiAssigned,
  listTokens,
  listUsage,
  listClientIpsForAppId,
  mintToken,
  recordUsage,
  revokeToken,
  summarizeWebApiApps,
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
  assert.equal(minted.assignedToWeb, false);

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

test("authenticateBearer accepts minted token and env fallback; never open", () => {
  const toolRoot = tmpTool();
  assert.equal(authRequired(toolRoot, []), true);
  const open = authenticateBearer(toolRoot, "", []);
  assert.equal(open.ok, false);
  assert.equal(open.reason, "missing");

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

  assert.equal(hasActiveTokens(toolRoot), true);
});

test("ao-chat mint auto-assigns and authenticateChatUiBearer succeeds", () => {
  const toolRoot = tmpTool();
  assert.equal(isChatUiAssigned(toolRoot), false);
  const minted = mintToken(toolRoot, { assignToChat: true });
  assert.equal(minted.appId, CHAT_UI_APP_ID);
  assert.equal(minted.assignedToChat, true);
  assert.equal(isChatUiAssigned(toolRoot), true);
  const assigned = getChatAssignment(toolRoot);
  assert.ok(assigned);
  assert.equal(assigned.token, minted.token);

  const viaChat = authenticateChatUiBearer(toolRoot, `Bearer ${minted.token}`);
  assert.equal(viaChat.ok, true);
  assert.equal(viaChat.appId, CHAT_UI_APP_ID);

  const web = mintToken(toolRoot, { assignToWeb: true });
  assert.equal(authenticateChatUiBearer(toolRoot, `Bearer ${web.token}`).ok, false);
  assert.equal(authenticateWebUiBearer(toolRoot, `Bearer ${web.token}`).ok, true);

  const listed = listTokens(toolRoot);
  assert.equal(listed.find((t) => t.id === minted.id)?.assignedToChat, true);
  assert.equal(listed.find((t) => t.id === web.id)?.assignedToWeb, true);
});

test("reminting ao-web replaces assignment and revokes prior ao-web", () => {
  const toolRoot = tmpTool();
  const first = mintToken(toolRoot, { appId: WEB_UI_APP_ID });
  const second = mintToken(toolRoot, { assignToWeb: true });
  assert.equal(getWebAssignment(toolRoot)?.tokenId, second.id);
  assert.equal(authenticateWebUiBearer(toolRoot, `Bearer ${first.token}`).ok, false);
  assert.equal(authenticateWebUiBearer(toolRoot, `Bearer ${second.token}`).ok, true);
  const firstMeta = listTokens(toolRoot).find((t) => t.id === first.id);
  assert.equal(firstMeta?.status, "revoked");
});

test("revokeToken rejects further use and clears web assignment", () => {
  const toolRoot = tmpTool();
  const minted = mintToken(toolRoot, { appId: "tmp" });
  const web = mintToken(toolRoot, { assignToWeb: true });
  const revoked = revokeToken(toolRoot, minted.id);
  assert.ok(revoked);
  assert.equal(revoked.status, "revoked");
  assert.ok(revoked.revokedAt);

  assert.equal(authRequired(toolRoot, []), true);
  const auth = authenticateBearer(toolRoot, `Bearer ${minted.token}`, []);
  assert.equal(auth.ok, false);

  assert.equal(isWebUiAssigned(toolRoot), true);
  revokeToken(toolRoot, web.id);
  assert.equal(isWebUiAssigned(toolRoot), false);
  assert.equal(authenticateWebUiBearer(toolRoot, `Bearer ${web.token}`).ok, false);
  assert.equal(authenticateBearer(toolRoot, "", []).ok, false);
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

test("mintToken requires appId unless assignToWeb", () => {
  const toolRoot = tmpTool();
  assert.throws(() => mintToken(toolRoot, { appId: "  " }), /appId/);
  const web = mintToken(toolRoot, { assignToWeb: true, appId: "" });
  assert.equal(web.appId, WEB_UI_APP_ID);
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

test("summarizeWebApiApps groups tokens by appId and aggregates client IPs", () => {
  const toolRoot = tmpTool();
  const a = mintToken(toolRoot, { appId: "KnowBuddy", label: "kb" });
  const b = mintToken(toolRoot, { appId: "KnowBuddy", label: "kb2" });
  mintToken(toolRoot, { appId: "home-assistant" });
  recordUsage(toolRoot, {
    tokenId: a.id,
    appId: "KnowBuddy",
    ip: "10.0.10.50",
    path: "/api/v1/orchestrate",
    status: 200,
    latencyMs: 12,
  });
  recordUsage(toolRoot, {
    tokenId: b.id,
    appId: "KnowBuddy",
    ip: "10.0.10.51",
    path: "/v1/chat/completions",
    status: 200,
    latencyMs: 8,
  });
  recordUsage(toolRoot, {
    tokenId: a.id,
    appId: "KnowBuddy",
    ip: "10.0.10.50",
    path: "/api/v1/orchestrate",
    status: 200,
    latencyMs: 9,
  });

  const apps = summarizeWebApiApps(toolRoot);
  const kb = apps.find((x) => x.appId === "KnowBuddy");
  const ha = apps.find((x) => x.appId === "home-assistant");
  assert.ok(kb);
  assert.equal(kb.tokenCount, 2);
  assert.equal(kb.clientIpCount, 2);
  assert.equal(kb.recent, true);
  assert.ok(kb.clientIps.some((c) => c.ip === "10.0.10.50" && c.count >= 2));
  assert.ok(ha);
  assert.equal(ha.tokenCount, 1);
  assert.equal(ha.clientIpCount, 0);

  const ips = listClientIpsForAppId(toolRoot, "KnowBuddy");
  assert.deepEqual(
    ips.map((c) => c.ip).sort(),
    ["10.0.10.50", "10.0.10.51"],
  );
});
