/**
 * Unit tests for Admin Phase 0 read API helpers.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildEffectiveConfig,
  buildCatalogs,
  buildStorageInventory,
  isSecretKey,
  matchAdminRoute,
} from "../lib/admin-api.mjs";

test("isSecretKey detects credentials", () => {
  assert.equal(isSecretKey("OPENAI_API_KEY"), true);
  assert.equal(isSecretKey("HOME_ASSISTANT_TOKEN"), true);
  assert.equal(isSecretKey("AGENTIC_PLANNER_MODEL"), false);
});

test("matchAdminRoute recognizes phase-0 paths", () => {
  assert.equal(matchAdminRoute("/api/v1/admin/config/effective")?.name, "config_effective");
  assert.equal(matchAdminRoute("/api/v1/admin/catalogs/agents")?.kind, "agents");
  assert.equal(matchAdminRoute("/api/v1/admin/catalogs/mcp/home_assistant")?.id, "home_assistant");
  assert.equal(matchAdminRoute("/api/ping"), null);
});

test("buildEffectiveConfig never returns secret values", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ao-admin-"));
  const toolRoot = path.join(tmp, "tool");
  const webRoot = path.join(tmp, "web");
  fs.mkdirSync(path.join(toolRoot, "config"), { recursive: true });
  fs.mkdirSync(webRoot, { recursive: true });
  fs.writeFileSync(
    path.join(toolRoot, ".env"),
    "OPENAI_API_KEY=sk-secret-value\nAGENTIC_PLANNER_MODEL=ollama/llama3.2:3b\n",
  );
  const cfg = buildEffectiveConfig({ toolRoot, webRoot });
  assert.equal(cfg.entries.OPENAI_API_KEY.secret, true);
  assert.equal(cfg.entries.OPENAI_API_KEY.value, undefined);
  assert.equal(cfg.entries.OPENAI_API_KEY.set, true);
  assert.equal(cfg.entries.AGENTIC_PLANNER_MODEL.value, "ollama/llama3.2:3b");
  assert.ok(cfg.fingerprint);
});

test("buildCatalogs lists mcp with credential gates", () => {
  const toolRoot = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "..",
    "agentic-orchestration-tool",
  );
  if (!fs.existsSync(path.join(toolRoot, "config", "mcp_providers"))) {
    return;
  }
  const data = buildCatalogs("mcp", { toolRoot });
  assert.ok(data.entries.length >= 1);
  const ha = data.entries.find((e) => e.id === "home_assistant");
  if (ha && !process.env.HOME_ASSISTANT_URL) {
    assert.ok(["hidden", "unset"].includes(ha.status));
    assert.ok(ha.gateReason);
  }
});

test("buildStorageInventory reports runtime dirs", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ao-admin-store-"));
  fs.mkdirSync(path.join(tmp, "__orchestrator_sessions__"));
  fs.writeFileSync(path.join(tmp, "__orchestrator_sessions__", "a.json"), "{}");
  const inv = buildStorageInventory({ toolRoot: tmp });
  const sessions = inv.roots.find((r) => r.id === "sessions");
  assert.equal(sessions.exists, true);
  assert.ok(sessions.files >= 1);
});
