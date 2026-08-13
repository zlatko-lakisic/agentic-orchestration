/**
 * Unit tests for Admin Phase 0 read API helpers.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEffectiveConfig,
  buildCatalogs,
  buildLlmUsagePayload,
  buildStorageInventory,
  isSecretKey,
  matchAdminRoute,
  parseEnvExampleHelp,
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
  assert.equal(matchAdminRoute("/api/v1/admin/tokens")?.name, "tokens");
  assert.equal(matchAdminRoute("/api/v1/admin/web-auth")?.name, "web_auth");
  assert.equal(matchAdminRoute("/api/v1/admin/chat-auth")?.name, "chat_auth");
  assert.equal(matchAdminRoute("/api/v1/admin/tokens/abc/usage")?.name, "token_usage");
  assert.equal(matchAdminRoute("/api/v1/admin/tokens/abc")?.id, "abc");
  assert.equal(matchAdminRoute("/api/v1/admin/llm-usage")?.name, "llm_usage");
  assert.equal(matchAdminRoute("/api/v1/admin/control")?.name, "control");
  assert.equal(matchAdminRoute("/api/v1/admin/control/restart")?.name, "control_restart");
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

test("buildEffectiveConfig uses curated defaults when unset", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ao-admin-"));
  const toolRoot = path.join(tmp, "tool");
  const webRoot = path.join(tmp, "web");
  fs.mkdirSync(path.join(toolRoot, "config"), { recursive: true });
  fs.mkdirSync(webRoot, { recursive: true });
  const cfg = buildEffectiveConfig({ toolRoot, webRoot });
  assert.equal(cfg.entries.AGENTIC_KB.effective, "1");
  assert.equal(cfg.entries.AGENTIC_KB.source, "default");
  assert.equal(cfg.entries.AGENTIC_KB.set, false);
  assert.equal(cfg.entries.AGENTIC_ANSWER_CACHE.effective, "1");
  assert.equal(cfg.entries.AGENTIC_EXECUTION_BACKEND.effective, "inprocess");
  assert.ok(typeof cfg.entries.AGENTIC_KB.help === "string");
  assert.ok(cfg.entries.AGENTIC_KB.help.length > 8);
  assert.equal(
    cfg.entries.AGENTIC_KB.wikiUrl,
    "https://github.com/zlatko-lakisic/agentic-orchestration/wiki/Configuration#AGENTIC_KB",
  );
});

test("buildEffectiveConfig excludes injected k8s env by default", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ao-admin-"));
  const toolRoot = path.join(tmp, "tool");
  const webRoot = path.join(tmp, "web");
  fs.mkdirSync(path.join(toolRoot, "config"), { recursive: true });
  fs.mkdirSync(webRoot, { recursive: true });
  process.env.AGENTIC_COORDINATOR_SERVICE_HOST = "10.43.0.1";
  process.env.AGENTIC_COORDINATOR_PORT_3847_TCP_ADDR = "10.43.0.1";
  try {
    const cfg = buildEffectiveConfig({ toolRoot, webRoot });
    assert.equal(cfg.entries.AGENTIC_COORDINATOR_SERVICE_HOST, undefined);
    const withInj = buildEffectiveConfig({ toolRoot, webRoot, includeInjected: true });
    assert.ok(withInj.entries.AGENTIC_COORDINATOR_SERVICE_HOST);
  } finally {
    delete process.env.AGENTIC_COORDINATOR_SERVICE_HOST;
    delete process.env.AGENTIC_COORDINATOR_PORT_3847_TCP_ADDR;
  }
});

test("buildStorageInventory distinguishes not_mounted_here", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ao-admin-store-"));
  fs.mkdirSync(path.join(tmp, "__orchestrator_sessions__"));
  fs.writeFileSync(path.join(tmp, "__orchestrator_sessions__", "a.json"), "{}");
  const inv = buildStorageInventory({ toolRoot: tmp });
  const sessions = inv.roots.find((r) => r.id === "sessions");
  assert.equal(sessions.exists, true);
  assert.equal(sessions.visibility, "present");
  const kb = inv.roots.find((r) => r.id === "kb");
  assert.equal(kb.visibility, "not_mounted_here");
});

test("buildLlmUsagePayload attributes Reach appId from userName and traces", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ao-llm-usage-"));
  const ledgerDir = path.join(tmp, "__orchestrator_llm_usage__");
  const tracesDir = path.join(tmp, "__orchestrator_run_traces__");
  fs.mkdirSync(ledgerDir, { recursive: true });
  fs.mkdirSync(tracesDir, { recursive: true });
  fs.writeFileSync(
    path.join(ledgerDir, "usage.jsonl"),
    [
      JSON.stringify({
        ts: Date.now() / 1000 - 10,
        appId: null,
        userName: "acme-client",
        userId: "acme-client",
        model: "ollama/x",
        promptTokens: 11,
        completionTokens: 7,
        totalTokens: 18,
        source: "direct_ollama",
        ok: true,
      }),
      JSON.stringify({
        ts: Date.now() / 1000 - 8,
        appId: "ao-chat",
        userName: "operator",
        model: "ollama/x",
        promptTokens: 2,
        completionTokens: 1,
        totalTokens: 3,
        source: "crew_litellm",
        ok: true,
      }),
      JSON.stringify({
        ts: Date.now() / 1000 - 6,
        appId: null,
        userName: "knowbuddy",
        userId: "knowbuddy",
        model: "ollama/z",
        promptTokens: 4,
        completionTokens: 1,
        totalTokens: 5,
        source: "direct_ollama",
        ok: true,
      }),
    ].join("\n") + "\n",
  );
  const runId = "run-client-1";
  const now = Date.now() / 1000;
  fs.writeFileSync(
    path.join(tracesDir, `${runId}.jsonl`),
    [
      JSON.stringify({
        ts: now - 5,
        kind: "request_start",
        detail: {
          app_id: null,
          user_name: "other-app",
          user_id: "other-app",
          mode: "direct_agent",
        },
      }),
      JSON.stringify({
        ts: now - 4,
        kind: "model_call",
        message: "ollama/y",
        detail: {
          source: "direct_ollama",
          model: "ollama/y",
          prompt_tokens: 3,
          completion_tokens: 2,
          total_tokens: 5,
          ok: true,
        },
      }),
      JSON.stringify({ ts: now - 3, kind: "run_end", message: "ok" }),
    ].join("\n") + "\n",
  );
  const payload = buildLlmUsagePayload({ toolRoot: tmp, limit: 50 });
  const keys = new Set((payload.llm.byAppId || []).map((r) => r.key));
  assert.ok(keys.has("acme-client"));
  assert.ok(keys.has("ao-chat"));
  assert.ok(keys.has("knowbuddy"));
  assert.ok(keys.has("other-app"));
  assert.ok(payload.recent.some((r) => r.appId === "acme-client"));
  assert.ok((payload.sources?.mergedRows || 0) >= 4);
});

test("TLS path keys are not treated as secrets", () => {
  assert.equal(isSecretKey("AGENTIC_SERVE_TLS_CERTFILE"), false);
  assert.equal(isSecretKey("OPENAI_API_KEY"), true);
});

test("parseEnvExampleHelp extracts comments before KEY=", () => {
  const toolRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "agentic-orchestration-tool",
  );
  if (!fs.existsSync(path.join(toolRoot, ".env.example"))) return;
  const help = parseEnvExampleHelp(toolRoot);
  assert.ok(help.OLLAMA_HOST);
  assert.match(help.OLLAMA_HOST, /Ollama/i);
});
