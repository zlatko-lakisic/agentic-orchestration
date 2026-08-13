/**
 * Topology graph status policy: never emit `unknown`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTopologyGraph } from "../lib/admin-topology-graph.mjs";

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const toolRoot = path.join(repoRoot, "agentic-orchestration-tool");
const webRoot = path.join(repoRoot, "agentic-orchestration-web");

test("SessionBridge is healthy when engine is up with no Reach sessions", async () => {
  const graph = await buildTopologyGraph({
    toolRoot,
    webRoot,
    webInstanceId: "test",
    webPid: 1,
    fetchJson: async () => ({ ok: false, error: "skip" }),
    buildCatalogs: () => ({ entries: [{ id: "a" }] }),
    probeEngineForGraphFn: async () => ({
      health: {
        ok: true,
        json: { version: "test", catalogs: { ok: true, agentProviders: 1 } },
      },
      sessions: { ok: true, sessions: [], sessionOverlayEnabled: true },
      probeHost: "test",
      engineLatencyMs: 3,
    }),
  });
  const bridge = graph.nodes.find((n) => n.id === "reach/session-bridge");
  assert.ok(bridge, "SessionBridge node missing");
  assert.equal(bridge.status, "healthy");
  assert.equal(bridge.sublabel, "idle");
  for (const n of graph.nodes) {
    assert.notEqual(
      String(n.status || "").toLowerCase(),
      "unknown",
      `${n.id} must not be unknown`,
    );
  }
});

test("Reach app Domain overlays include stock allowlist agents", async () => {
  const graph = await buildTopologyGraph({
    toolRoot,
    webRoot,
    webInstanceId: "test",
    webPid: 1,
    fetchJson: async () => ({ ok: false, error: "skip" }),
    buildCatalogs: () => ({ entries: [{ id: "gpt_research" }, { id: "a" }] }),
    probeEngineForGraphFn: async () => ({
      health: {
        ok: true,
        json: { version: "test", catalogs: { ok: true, agentProviders: 2 } },
      },
      sessions: {
        ok: true,
        sessionOverlayEnabled: true,
        sessions: [
          {
            appId: "comstar",
            userId: "comstar-ai",
            sessionId: "s1",
            agentCount: 1,
            mcpCount: 0,
            skillCount: 0,
            tunnelMcpCount: 0,
            agentIds: ["client.text_responder"],
            mcpIds: [],
            skillIds: [],
            allowedAgentProviderIds: ["gpt_research", "claude_research"],
            sessionEnvKeys: ["OPENAI_API_KEY"],
            clientIp: "192.168.89.34",
          },
        ],
      },
      probeHost: "test",
      engineLatencyMs: 3,
    }),
  });
  const overlays = graph.nodes.find((n) => n.id === "app/comstar/overlays");
  assert.ok(overlays);
  assert.match(String(overlays.sublabel), /stock/i);
  assert.ok(overlays.appMembers?.length);
  const members = overlays.appMembers[0];
  assert.deepEqual(members.overlayIds, ["client.text_responder"]);
  assert.deepEqual(members.allowedIds, ["claude_research", "gpt_research"]);
  assert.ok(members.ids.includes("gpt_research"));
  const catalog = graph.nodes.find((n) => n.id === "catalog/agents");
  const comstar = (catalog.appMembers || []).find((m) => m.appId === "comstar");
  assert.ok(comstar?.allowedIds?.includes("gpt_research"));
});
