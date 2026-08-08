/**
 * Admin WebSocket channel for live topology (Phase 1).
 *
 * Client → { type: "topology_subscribe" }
 * Client → { type: "topology_unsubscribe" }
 * Client → { type: "topology_resync" }
 *
 * Server → topology_snapshot | topology_delta | topology_health
 *
 * baseCtx must include: toolRoot, webRoot, webInstanceId, webPid, fetchJson, buildCatalogs
 */

import {
  buildTopologyGraph,
  diffTopologyGraphs,
} from "./admin-topology-graph.mjs";

const STRUCTURE_MS = 2500;
const HEALTH_MS = 1000;

/** @type {WeakMap<object, object>} */
const stateByWs = new WeakMap();

async function sendSnapshot(ws, sendJson, baseCtx) {
  const graph = await buildTopologyGraph(baseCtx);
  const st = stateByWs.get(ws) || {};
  st.lastGraph = graph;
  stateByWs.set(ws, st);
  sendJson(ws, { type: "topology_snapshot", ...graph });
}

async function pushStructure(ws, sendJson, baseCtx) {
  if (ws.readyState !== 1) return;
  const st = stateByWs.get(ws) || {};
  const next = await buildTopologyGraph(baseCtx);
  const prev = st.lastGraph;
  if (!prev) {
    st.lastGraph = next;
    stateByWs.set(ws, st);
    sendJson(ws, { type: "topology_snapshot", ...next });
    return;
  }
  const diff = diffTopologyGraphs(prev, next);
  const changed =
    diff.nodesUpserted.length ||
    diff.nodesRemoved.length ||
    diff.edgesUpserted.length ||
    diff.edgesRemoved.length;
  if (changed) {
    sendJson(ws, {
      type: "topology_delta",
      seq: next.seq,
      fromSeq: prev.seq,
      nodesUpserted: diff.nodesUpserted,
      nodesRemoved: diff.nodesRemoved,
      edgesUpserted: diff.edgesUpserted,
      edgesRemoved: diff.edgesRemoved,
      notes: next.notes || [],
      capabilities: next.capabilities,
      generatedAt: next.generatedAt,
    });
  }
  st.lastGraph = next;
  stateByWs.set(ws, st);
}

async function pushHealth(ws, sendJson, baseCtx) {
  if (ws.readyState !== 1) return;
  const st = stateByWs.get(ws) || {};
  const next = await buildTopologyGraph(baseCtx);
  const health = (next.nodes || []).map((n) => ({
    id: n.id,
    status: n.status,
    statusReason: n.statusReason || "",
    lastProbeAt: n.lastProbeAt || null,
  }));
  sendJson(ws, {
    type: "topology_health",
    seq: next.seq,
    health,
    generatedAt: next.generatedAt,
  });
  if (!st.lastGraph) st.lastGraph = next;
  stateByWs.set(ws, st);
}

/**
 * @param {import('ws').WebSocket} ws
 * @param {(ws: import('ws').WebSocket, msg: object) => void} sendJson
 * @param {object} baseCtx
 */
export function startTopologyPush(ws, sendJson, baseCtx) {
  stopTopologyPush(ws);
  const st = { lastGraph: null };
  stateByWs.set(ws, st);
  sendSnapshot(ws, sendJson, baseCtx).catch(() => {});

  st.structureTimer = setInterval(() => {
    pushStructure(ws, sendJson, baseCtx).catch(() => {});
  }, STRUCTURE_MS);
  if (typeof st.structureTimer.unref === "function") st.structureTimer.unref();

  st.healthTimer = setInterval(() => {
    pushHealth(ws, sendJson, baseCtx).catch(() => {});
  }, HEALTH_MS);
  if (typeof st.healthTimer.unref === "function") st.healthTimer.unref();

  stateByWs.set(ws, st);
}

/** @param {import('ws').WebSocket} ws */
export function stopTopologyPush(ws) {
  const st = stateByWs.get(ws);
  if (!st) return;
  if (st.structureTimer) clearInterval(st.structureTimer);
  if (st.healthTimer) clearInterval(st.healthTimer);
  stateByWs.delete(ws);
}

/**
 * @param {import('ws').WebSocket} ws
 * @param {(ws: import('ws').WebSocket, msg: object) => void} sendJson
 * @param {object} baseCtx
 */
export function resyncTopology(ws, sendJson, baseCtx) {
  sendSnapshot(ws, sendJson, baseCtx).catch(() => {});
}
