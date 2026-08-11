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
