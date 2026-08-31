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

test("custom-tool sandbox cluster and endpoint when enabled with no runtimes", async () => {
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
        json: {
          version: "test",
          catalogs: { ok: true, agentProviders: 1 },
          customToolSandbox: true,
        },
      },
      sessions: { ok: true, sessions: [], sessionOverlayEnabled: true },
      sandboxes: {
        ok: true,
        enabled: true,
        runtimes: [],
        count: 0,
        artifacts: [],
        artifactCount: 0,
      },
      probeHost: "test",
      engineLatencyMs: 3,
    }),
  });
  const ep = graph.nodes.find((n) => n.id === "engine/custom-tool-sandbox");
  assert.ok(ep);
  assert.equal(ep.deployed, true);
  assert.equal(ep.status, "healthy");
  const cluster = graph.nodes.find((n) => n.id === "sandboxes/cluster");
  assert.ok(cluster);
  assert.equal(cluster.kind, "tool-sandbox");
  assert.equal(cluster.deployed, true);
  assert.equal(cluster.status, "degraded");
  assert.equal(cluster.sublabel, "none");
  assert.ok(
    graph.edges.some(
      (e) => e.id === "engine/custom-tool-sandbox->sandboxes/cluster",
    ),
  );
  assert.ok(
    graph.edges.some(
      (e) => e.id === "sandboxes/cluster->engine/session-overlay",
    ),
  );
});

test("running sandbox surfaces app node and healthy cluster", async () => {
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
        json: {
          version: "test",
          catalogs: { ok: true, agentProviders: 1 },
          customToolSandbox: true,
        },
      },
      sessions: { ok: true, sessions: [], sessionOverlayEnabled: true },
      sandboxes: {
        ok: true,
        enabled: true,
        count: 1,
        artifactCount: 1,
        runtimes: [
          {
            clientId: "client.comstar.market_data",
            toolId: "client.comstar.market_data",
            toolVersion: "0.8.0",
            appId: "comstar",
            userId: "ada",
            running: true,
            baseUrl: "http://127.0.0.1:41234",
            port: 41234,
          },
        ],
        artifacts: [
          {
            artifactId: "ada::comstar::client.comstar.market_data@0.8.0",
            toolId: "client.comstar.market_data",
            activated: true,
            appId: "comstar",
          },
        ],
      },
      probeHost: "test",
      engineLatencyMs: 3,
    }),
  });
  const cluster = graph.nodes.find((n) => n.id === "sandboxes/cluster");
  assert.ok(cluster);
  assert.equal(cluster.status, "healthy");
  assert.equal(cluster.count, 1);
  assert.deepEqual(cluster.ownedByApps, ["comstar"]);
  const app = graph.nodes.find((n) => n.id === "app/comstar");
  assert.ok(app, "sandbox appId should appear without Reach session");
  assert.equal(app.kind, "web-api-client");
  assert.match(String(app.sublabel), /sandbox/i);
  assert.ok(graph.edges.some((e) => e.id === "app/comstar->sandboxes/cluster"));
  assert.equal(graph.meta.customToolSandboxes.count, 1);
});

test("enrolled mTLS clients appear on Application band without Reach", async () => {
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
        json: {
          version: "test",
          catalogs: { ok: true, agentProviders: 1 },
          mtls: { enroll: true, required: true },
          customToolSandbox: true,
        },
      },
      sessions: { ok: true, sessions: [], sessionOverlayEnabled: true },
      sandboxes: {
        ok: true,
        enabled: true,
        runtimes: [],
        count: 0,
        artifacts: [],
        artifactCount: 0,
      },
      mtlsClients: {
        ok: true,
        count: 2,
        clients: [
          {
            subject: "comstar-stocks",
            revoked: false,
            expiresAt: "2027-08-31T00:00:00Z",
          },
          {
            subject: "comstar-sandbox-smoke",
            revoked: true,
            expiresAt: "2027-01-01T00:00:00Z",
          },
        ],
      },
      probeHost: "test",
      engineLatencyMs: 3,
    }),
  });
  const stocks = graph.nodes.find((n) => n.id === "app/comstar-stocks");
  assert.ok(stocks, "comstar-stocks mTLS client should appear");
  assert.equal(stocks.kind, "mtls-client");
  assert.equal(stocks.appGroup, "web-api");
  assert.match(String(stocks.sublabel), /mTLS/i);
  assert.equal(
    graph.nodes.some((n) => n.id === "app/comstar-sandbox-smoke"),
    false,
    "revoked clients stay hidden",
  );
  assert.ok(
    graph.edges.some((e) => e.id === "app/comstar-stocks->engine/mtls-enrol"),
  );
  assert.equal(
    graph.edges.some((e) => e.id === "app/comstar-stocks->web-ui"),
    false,
    "mTLS clients do not take the Web UI bypass edge",
  );
});

test("sandbox cluster hidden when feature off", async () => {
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
        json: {
          version: "test",
          catalogs: { ok: true, agentProviders: 1 },
          customToolSandbox: false,
        },
      },
      sessions: { ok: true, sessions: [], sessionOverlayEnabled: true },
      sandboxes: {
        ok: true,
        enabled: false,
        runtimes: [],
        count: 0,
        artifacts: [],
        artifactCount: 0,
      },
      mtlsClients: { ok: true, clients: [], count: 0 },
      probeHost: "test",
      engineLatencyMs: 3,
    }),
  });
  const ep = graph.nodes.find((n) => n.id === "engine/custom-tool-sandbox");
  assert.ok(ep);
  assert.equal(ep.deployed, false);
  const cluster = graph.nodes.find((n) => n.id === "sandboxes/cluster");
  assert.ok(cluster);
  assert.equal(cluster.deployed, false);
  assert.equal(cluster.status, "offline");
});
