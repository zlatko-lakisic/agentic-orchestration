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
  buildLlmSpendSeries,
  buildStorageInventory,
  eventsToMermaid,
  isSecretKey,
  matchAdminRoute,
  modelCallChargeLabel,
  parseEnvExampleHelp,
} from "../lib/admin-api.mjs";

test("modelCallChargeLabel formats prompt↑completion↓=total", () => {
  assert.equal(
    modelCallChargeLabel({
      prompt_tokens: 2050,
      completion_tokens: 140,
      total_tokens: 2190,
    }).short,
    "2050↑140↓=2190",
  );
  assert.equal(modelCallChargeLabel({ total_tokens: 50 }).short, "50 tok");
  assert.equal(modelCallChargeLabel({}).short, "");
});

test("eventsToMermaid puts token helps on model_call arrows and restores ok return", () => {
  const { mermaid, tokenHelps } = eventsToMermaid([
    { kind: "request_start", actor: "engine", detail: { mode: "chat" } },
    {
      kind: "model_call",
      actor: "planner",
      detail: {
        model: "ollama/qwen2.5:14b-instruct",
        prompt_tokens: 2050,
        completion_tokens: 140,
        total_tokens: 2190,
      },
    },
  ]);
  assert.match(mermaid, /->>model_\w+: qwen2\.5:14b-instruct/);
  assert.match(mermaid, /-->>\w+: ok/);
  assert.doesNotMatch(mermaid, /2050↑140↓=2190/);
  assert.doesNotMatch(mermaid, /2190 tok/);
  assert.equal(tokenHelps.length, 2);
  assert.equal(tokenHelps[0].kind, "prompt");
  assert.equal(tokenHelps[0].tooltip, "prompt=2050");
  assert.equal(tokenHelps[1].kind, "completion");
  assert.equal(tokenHelps[1].tooltip, "completion=140");
  assert.ok(tokenHelps[0].messageIndex < tokenHelps[1].messageIndex);
});

test("eventsToMermaid labels client participant with appId (ao-chat)", () => {
  const { mermaid } = eventsToMermaid([
    {
      kind: "request_start",
      actor: "orchestrator",
      detail: { mode: "dynamic", app_id: "ao-chat", user_name: "None Administrator" },
    },
    { kind: "run_end", actor: "orchestrator", message: "ok" },
  ]);
  assert.match(mermaid, /participant client as ao-chat/);
  assert.doesNotMatch(mermaid, /participant client as client\b/);
});

test("eventsToMermaid keeps plan intent as notes without fake agent select arrows", () => {
  const { mermaid } = eventsToMermaid([
    { kind: "request_start", actor: "engine", detail: { mode: "chat" } },
    {
      kind: "plan",
      actor: "planner",
      message: "two steps",
      detail: { agents: ["gpt_research"], mcps: ["tavily"], skills: ["web"] },
    },
    {
      kind: "decision",
      actor: "planner",
      detail: {
        steps: [{ id: "s1", agent_provider_id: "gpt_research", mcps: ["tavily"] }],
      },
    },
    { kind: "run_end", actor: "engine", message: "ok" },
  ]);
  assert.match(mermaid, /->>planner: plan/);
  assert.match(mermaid, /Note over planner:.*gpt_research/);
  assert.match(mermaid, /Note over planner:.*s1 gpt_research/);
  assert.doesNotMatch(mermaid, /: select/);
  assert.doesNotMatch(mermaid, /participant gpt_research/);
  assert.doesNotMatch(mermaid, /participant mcp\b/);
  assert.doesNotMatch(mermaid, /participant skills\b/);
});

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
  assert.equal(
    matchAdminRoute("/api/v1/admin/background-activity/cancel")?.name,
    "background_activity_cancel",
  );
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

test("buildLlmUsagePayload rolls up by agent from ledger and traces", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ao-llm-agent-"));
  const ledgerDir = path.join(tmp, "__orchestrator_llm_usage__");
  const tracesDir = path.join(tmp, "__orchestrator_run_traces__");
  const agentsDir = path.join(tmp, "config", "agent_providers");
  fs.mkdirSync(ledgerDir, { recursive: true });
  fs.mkdirSync(tracesDir, { recursive: true });
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(agentsDir, "solo.yaml"),
    ["id: solo_agent", "type: ollama", "model: unique-solo-model", "role: r", "goal: g", "backstory: b"].join(
      "\n",
    ) + "\n",
  );
  const now = Date.now() / 1000;
  fs.writeFileSync(
    path.join(ledgerDir, "usage.jsonl"),
    [
      JSON.stringify({
        ts: now - 20,
        appId: "ao-chat",
        agentProviderId: "gpt_research",
        model: "openai/gpt-4o-mini",
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        source: "crew_litellm",
        ok: true,
      }),
      JSON.stringify({
        ts: now - 15,
        appId: "ao-chat",
        model: "ollama/unique-solo-model",
        promptTokens: 4,
        completionTokens: 2,
        totalTokens: 6,
        source: "crew_litellm",
        ok: true,
      }),
    ].join("\n") + "\n",
  );
  const runId = "run-agent-1";
  fs.writeFileSync(
    path.join(tracesDir, `${runId}.jsonl`),
    [
      JSON.stringify({
        ts: now - 10,
        kind: "agent_start",
        message: "claude_research",
        detail: { agent_provider_id: "claude_research" },
      }),
      JSON.stringify({
        ts: now - 9,
        kind: "model_call",
        message: "anthropic/claude",
        detail: {
          model: "anthropic/claude",
          prompt_tokens: 8,
          completion_tokens: 3,
          total_tokens: 11,
          ok: true,
        },
      }),
      JSON.stringify({ ts: now - 8, kind: "agent_end", message: "ok" }),
    ].join("\n") + "\n",
  );
  const payload = buildLlmUsagePayload({ toolRoot: tmp, limit: 50 });
  const byAgent = new Map((payload.llm.byAgent || []).map((r) => [r.key, r.totalTokens]));
  assert.equal(byAgent.get("gpt_research"), 15);
  assert.equal(byAgent.get("solo_agent"), 6);
  assert.equal(byAgent.get("claude_research"), 11);
  assert.ok(payload.recent.some((r) => r.agentProviderId === "gpt_research"));
});

test("buildLlmUsagePayload shares ollama/ and bare model ids", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ao-llm-model-share-"));
  const ledgerDir = path.join(tmp, "__orchestrator_llm_usage__");
  fs.mkdirSync(ledgerDir, { recursive: true });
  const now = Date.now() / 1000;
  fs.writeFileSync(
    path.join(ledgerDir, "usage.jsonl"),
    [
      JSON.stringify({
        ts: now - 2,
        appId: "ao-chat",
        model: "ollama/qwen2.5:14b-instruct",
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        source: "crew_litellm",
        ok: true,
      }),
      JSON.stringify({
        ts: now - 1,
        appId: "ao-chat",
        model: "qwen2.5:14b-instruct",
        promptTokens: 4,
        completionTokens: 2,
        totalTokens: 6,
        source: "direct_ollama",
        ok: true,
      }),
    ].join("\n") + "\n",
  );
  const payload = buildLlmUsagePayload({ toolRoot: tmp, limit: 20 });
  assert.ok(payload.recent.every((r) => r.model === "qwen2.5:14b-instruct"));
  assert.equal((payload.llm.byModel || []).length, 1);
  assert.equal(payload.llm.byModel[0].key, "qwen2.5:14b-instruct");
  assert.equal(payload.llm.byModel[0].totalTokens, 21);
});

test("buildLlmUsagePayload prefers refined identity over brand appId", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ao-llm-usage-refine-"));
  const ledgerDir = path.join(tmp, "__orchestrator_llm_usage__");
  fs.mkdirSync(ledgerDir, { recursive: true });
  fs.writeFileSync(
    path.join(ledgerDir, "usage.jsonl"),
    JSON.stringify({
      ts: Date.now() / 1000,
      appId: "comstar",
      userName: "comstar-ai",
      userId: "comstar-ai",
      model: "ollama/x",
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      source: "crew_litellm",
      ok: true,
    }) + "\n",
  );
  const payload = buildLlmUsagePayload({ toolRoot: tmp, limit: 20 });
  const keys = (payload.llm.byAppId || []).map((r) => r.key);
  assert.deepEqual(keys, ["comstar-ai"]);
  assert.equal(payload.recent[0].appId, "comstar-ai");
});

test("buildLlmUsagePayload collapses ledger+trace and unknown duplicate", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ao-llm-usage-dedupe-"));
  const ledgerDir = path.join(tmp, "__orchestrator_llm_usage__");
  const tracesDir = path.join(tmp, "__orchestrator_run_traces__");
  fs.mkdirSync(ledgerDir, { recursive: true });
  fs.mkdirSync(tracesDir, { recursive: true });
  const runId = "run-dedupe-1";
  const ts = Math.floor(Date.now() / 1000) - 30;
  // Two near-identical ledger writes (double callback) + sparse unknown row.
  fs.writeFileSync(
    path.join(ledgerDir, "usage.jsonl"),
    [
      JSON.stringify({
        ts: ts + 0.12,
        runId,
        appId: null,
        model: "qwen2.5:14b-instruct",
        promptTokens: 1000,
        completionTokens: 59,
        totalTokens: 1059,
        source: "crew_litellm",
        ok: true,
      }),
      JSON.stringify({
        ts: ts + 0.18,
        runId,
        appId: "comstar-ai",
        userName: "comstar-ai",
        model: "qwen2.5:14b-instruct",
        promptTokens: 1000,
        completionTokens: 59,
        totalTokens: 1059,
        source: "crew_litellm",
        ok: true,
      }),
      JSON.stringify({
        ts: ts + 0.2,
        runId,
        appId: "comstar-ai",
        userName: "comstar-ai",
        model: "ollama/qwen2.5:14b-instruct",
        promptTokens: 1000,
        completionTokens: 59,
        totalTokens: 1059,
        source: "direct_crew",
        ok: true,
      }),
    ].join("\n") + "\n",
  );
  fs.writeFileSync(
    path.join(tracesDir, `${runId}.jsonl`),
    [
      JSON.stringify({
        ts,
        kind: "request_start",
        detail: { app_id: "comstar-ai", user_name: "comstar-ai", user_id: "comstar-ai" },
      }),
      JSON.stringify({
        ts: ts + 0.15,
        kind: "model_call",
        message: "qwen2.5:14b-instruct",
        detail: {
          source: "crew_litellm",
          model: "qwen2.5:14b-instruct",
          prompt_tokens: 1000,
          completion_tokens: 59,
          total_tokens: 1059,
          ok: true,
        },
      }),
      JSON.stringify({ ts: ts + 1, kind: "run_end", message: "ok" }),
    ].join("\n") + "\n",
  );
  const payload = buildLlmUsagePayload({ toolRoot: tmp, limit: 20 });
  assert.equal(payload.recent.length, 1, "all duplicates should collapse");
  assert.equal(payload.recent[0].appId, "comstar-ai");
  assert.equal(payload.llm.grandTotal.calls, 1);
  assert.equal(payload.llm.grandTotal.totalTokens, 1059);
});

test("TLS path keys are not treated as secrets", () => {
  assert.equal(isSecretKey("AGENTIC_SERVE_TLS_CERTFILE"), false);
  assert.equal(isSecretKey("OPENAI_API_KEY"), true);
});

test("buildLlmSpendSeries defaults to 6h with 15m buckets", () => {
  const nowMs = Date.parse("2026-08-13T12:00:00Z");
  const rows = [
    {
      ts: new Date(nowMs - 30 * 60_000).toISOString(),
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    },
    {
      ts: new Date(nowMs - 8 * 3_600_000).toISOString(),
      promptTokens: 999,
      completionTokens: 1,
      totalTokens: 1000,
    },
  ];
  const spend = buildLlmSpendSeries(rows, { nowMs, window: "6h" });
  assert.equal(spend.window, "6h");
  assert.equal(spend.windowHours, 6);
  assert.equal(spend.granularity, "15m");
  assert.equal(spend.current.totalTokens, 150);
  assert.equal(spend.previous.totalTokens, 1000);
  assert.ok(spend.timeline.length >= 20);
  assert.ok(spend.timeline.every((b) => b.ts >= nowMs - 6 * 3_600_000 - 15 * 60_000));
});

test("buildLlmSpendSeries 7d uses daily buckets", () => {
  const nowMs = Date.parse("2026-08-13T12:00:00Z");
  const spend = buildLlmSpendSeries(
    [
      {
        ts: new Date(nowMs - 2 * 86_400_000).toISOString(),
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    ],
    { nowMs, window: "7d" },
  );
  assert.equal(spend.windowHours, 7 * 24);
  assert.equal(spend.granularity, "1d");
  assert.equal(spend.current.totalTokens, 15);
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
