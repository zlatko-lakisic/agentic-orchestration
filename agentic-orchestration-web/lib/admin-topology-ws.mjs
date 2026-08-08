/**
 * Admin WebSocket channel for live topology.
 *
 * Client → topology_subscribe | topology_unsubscribe | topology_resync
 * Client → topology_watch_subscribe | topology_watch_unsubscribe
 *
 * Server → topology_snapshot | topology_delta | topology_health | topology_metrics
 * Server → topology_watch_snapshot | topology_watch_tick
 */

import {
  buildTopologyGraph,
  diffTopologyGraphs,
} from "./admin-topology-graph.mjs";
import {
  relatedEdgeSeries,
  watchPayload,
} from "./admin-topology-metrics.mjs";

const TICK_MS = 2000;

/** @type {WeakMap<object, object>} */
const stateByWs = new WeakMap();

function watchKey(target, id) {
  return `${target}:${id}`;
}

function buildWatchMessage(type, target, id, graph) {
  const base = watchPayload(target, id);
  if (target === "node" && graph) {
    const related = relatedEdgeSeries(graph, id);
    base.series = {
      ...base.series,
      rate: related.rate,
      latencyP95: related.latencyP95,
    };
    base.relatedEdgeIds = related.edgeIds;
  }
  return { type, ...base, generatedAt: new Date().toISOString() };
}

async function sendSnapshot(ws, sendJson, baseCtx) {
  const graph = await buildTopologyGraph(baseCtx);
  const st = stateByWs.get(ws) || {};
  st.lastGraph = graph;
  stateByWs.set(ws, st);
  sendJson(ws, { type: "topology_snapshot", ...graph });
}

async function tick(ws, sendJson, baseCtx) {
  if (ws.readyState !== 1) return;
  const st = stateByWs.get(ws) || {};
  const next = await buildTopologyGraph(baseCtx);
  const prev = st.lastGraph;

  if (!prev) {
    sendJson(ws, { type: "topology_snapshot", ...next });
  } else {
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
  }

  sendJson(ws, {
    type: "topology_health",
    seq: next.seq,
    health: (next.nodes || []).map((n) => ({
      id: n.id,
      status: n.status,
      statusReason: n.statusReason || "",
      lastProbeAt: n.lastProbeAt || null,
    })),
    generatedAt: next.generatedAt,
  });

  const metrics = (next.edges || [])
    .filter((e) => e.instrumented)
    .map((e) => {
      const last = watchPayload("edge", e.id).latest || {};
      return {
        edgeId: e.id,
        rate: last.rate ?? null,
        latencyP50: last.latencyP50 ?? null,
        latencyP95: last.latencyP95 ?? null,
        errorRate: last.errorRate ?? null,
        bytesIn: last.bytesIn ?? null,
        bytesOut: last.bytesOut ?? null,
      };
    });
  sendJson(ws, {
    type: "topology_metrics",
    tick: Date.now(),
    seq: next.seq,
    metrics,
    generatedAt: next.generatedAt,
  });

  if (st.watches?.size) {
    for (const key of st.watches) {
      const [target, ...rest] = key.split(":");
      const id = rest.join(":");
      sendJson(
        ws,
        buildWatchMessage("topology_watch_tick", target, id, next),
      );
    }
  }

  st.lastGraph = next;
  stateByWs.set(ws, st);
}

export function startTopologyPush(ws, sendJson, baseCtx) {
  stopTopologyPush(ws);
  const st = { lastGraph: null, watches: new Set() };
  stateByWs.set(ws, st);
  sendSnapshot(ws, sendJson, baseCtx).catch(() => {});

  st.timer = setInterval(() => {
    tick(ws, sendJson, baseCtx).catch(() => {});
  }, TICK_MS);
  if (typeof st.timer.unref === "function") st.timer.unref();
  stateByWs.set(ws, st);
}

export function stopTopologyPush(ws) {
  const st = stateByWs.get(ws);
  if (!st) return;
  if (st.timer) clearInterval(st.timer);
  stateByWs.delete(ws);
}

export function resyncTopology(ws, sendJson, baseCtx) {
  sendSnapshot(ws, sendJson, baseCtx).catch(() => {});
}

export async function subscribeTopologyWatch(ws, sendJson, baseCtx, msg) {
  const target = String(msg?.target || "");
  const id = String(msg?.id || "");
  if ((target !== "node" && target !== "edge") || !id) return;
  let st = stateByWs.get(ws);
  if (!st) {
    startTopologyPush(ws, sendJson, baseCtx);
    st = stateByWs.get(ws);
  }
  if (!st.watches) st.watches = new Set();
  st.watches.add(watchKey(target, id));
  stateByWs.set(ws, st);
  const graph = st.lastGraph || (await buildTopologyGraph(baseCtx));
  st.lastGraph = graph;
  sendJson(ws, buildWatchMessage("topology_watch_snapshot", target, id, graph));
}

export function unsubscribeTopologyWatch(ws, msg) {
  const st = stateByWs.get(ws);
  if (!st?.watches) return;
  const target = String(msg?.target || "");
  const id = String(msg?.id || "");
  if (!target || !id) {
    st.watches.clear();
    return;
  }
  st.watches.delete(watchKey(target, id));
}
