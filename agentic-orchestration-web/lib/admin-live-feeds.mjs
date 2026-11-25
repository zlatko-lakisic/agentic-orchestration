/**
 * Admin WebSocket snapshot feeds — steady push of list/dashboard payloads
 * so Admin SPA pages do not need manual HTTP refresh.
 *
 * Client → admin_feed_subscribe | admin_feed_unsubscribe
 * Server → admin_feed (topic + data) | admin_feed_error
 */
import { listAppPrefs, getAppPrefs } from "./app-prefs.mjs";
import { listTokens } from "./api-tokens.mjs";
import {
  buildAccessPosture,
  buildAoResources,
  buildControlStatus,
  buildEffectiveConfig,
  buildLlmUsagePayload,
  buildStorageInventory,
  buildTopology,
  listRecentRuns,
  listRecentTraces,
} from "./admin-api.mjs";

const DEFAULT_INTERVAL_MS = 4000;
const MIN_INTERVAL_MS = 2000;
const MAX_INTERVAL_MS = 30000;

/** @type {WeakMap<object, { timer: ReturnType<typeof setInterval>|null, topics: Set<string>, params: Record<string, unknown>, ctx: object, sendJson: Function }>} */
const stateByWs = new WeakMap();

const TOPIC_BUILDERS = {
  llm_usage: async (ctx, params) =>
    buildLlmUsagePayload({
      toolRoot: ctx.toolRoot,
      limit: Number(params?.limit) || 200,
      window: params?.window || params?.range || undefined,
      windowHours:
        params?.windowHours != null ? Number(params.windowHours) : undefined,
      windowDays:
        params?.windowDays != null ? Number(params.windowDays) : undefined,
    }),
  traces: async (ctx, params) =>
    listRecentTraces({
      toolRoot: ctx.toolRoot,
      limit: Number(params?.limit) || 500,
      client: String(params?.client || ""),
      clientIp: String(params?.clientIp || ""),
      crewOnly: Boolean(params?.crewOnly),
    }),
  runs: async (ctx, params) =>
    listRecentRuns({
      toolRoot: ctx.toolRoot,
      limit: Number(params?.limit) || 80,
    }),
  topology: async (ctx) => buildTopology(ctx),
  ao_resources: async (ctx) => buildAoResources(ctx),
  fingerprint: async (ctx) => {
    const cfg = buildEffectiveConfig({
      toolRoot: ctx.toolRoot,
      webRoot: ctx.webRoot,
    });
    return {
      fingerprint: cfg.fingerprint,
      generatedAt: cfg.generatedAt,
    };
  },
  control: async () => buildControlStatus(),
  storage: async (ctx) => buildStorageInventory(ctx),
  access: async (ctx, _params, req) => {
    const posture = buildAccessPosture({
      toolRoot: ctx.toolRoot,
      webRoot: ctx.webRoot,
      req: req || ctx.req || null,
    });
    const tokens = listTokens(ctx.toolRoot);
    const known = new Set(listAppPrefs(ctx.toolRoot).map((p) => p.appId));
    for (const t of tokens) {
      const id = String(t.appId || "").trim().toLowerCase();
      if (id) known.add(id);
    }
    const apps = [...known]
      .sort((a, b) => a.localeCompare(b))
      .map((appId) => ({ appId, ...getAppPrefs(ctx.toolRoot, appId) }));
    return { posture, tokens, apps, generatedAt: new Date().toISOString() };
  },
};

/**
 * Feed snapshots are expensive (trace / run directory scans) and identical for every
 * subscriber asking for the same topic + params, so build each one once per short window and
 * share it — N open Admin tabs must not mean N synchronous directory walks per tick.
 * `access` depends on the subscriber's own request, so it is never shared.
 */
const SHARED_SNAPSHOT_TTL_MS = 1500;
const UNSHARED_TOPICS = new Set(["access"]);
/** @type {Map<string, { at: number, promise: Promise<unknown> }>} */
const sharedSnapshots = new Map();

function stableStringify(value) {
  if (value == null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(",")}}`;
}

/**
 * @param {string} topic
 * @param {{ toolRoot?: string, webRoot?: string, req?: unknown }} ctx
 * @param {unknown} topicParams
 */
export function buildFeedSnapshot(topic, ctx, topicParams) {
  const builder = TOPIC_BUILDERS[topic];
  if (UNSHARED_TOPICS.has(topic)) {
    return builder(ctx, topicParams, ctx.req);
  }
  let paramsKey;
  try {
    paramsKey = stableStringify(topicParams);
  } catch {
    return builder(ctx, topicParams, ctx.req);
  }
  const key = `${topic}|${ctx.toolRoot || ""}|${ctx.webRoot || ""}|${paramsKey}`;
  const now = Date.now();
  const hit = sharedSnapshots.get(key);
  if (hit && now - hit.at < SHARED_SNAPSHOT_TTL_MS) return hit.promise;
  if (sharedSnapshots.size > 200) {
    for (const [k, v] of sharedSnapshots) {
      if (now - v.at >= SHARED_SNAPSHOT_TTL_MS) sharedSnapshots.delete(k);
    }
  }
  const promise = Promise.resolve().then(() => builder(ctx, topicParams, ctx.req));
  sharedSnapshots.set(key, { at: now, promise });
  promise.catch(() => {
    if (sharedSnapshots.get(key)?.promise === promise) sharedSnapshots.delete(key);
  });
  return promise;
}

export function knownAdminFeedTopics() {
  return Object.keys(TOPIC_BUILDERS);
}

function clampInterval(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return DEFAULT_INTERVAL_MS;
  return Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, Math.round(n)));
}

async function pushTopic(ws, sendJson, topic, ctx, params) {
  if (ws.readyState !== 1) return;
  const builder = TOPIC_BUILDERS[topic];
  if (!builder) {
    sendJson(ws, {
      type: "admin_feed_error",
      topic,
      message: `Unknown feed topic: ${topic}`,
    });
    return;
  }
  try {
    const data = await buildFeedSnapshot(topic, ctx, params?.[topic] || params || {});
    if (ws.readyState !== 1) return;
    sendJson(ws, {
      type: "admin_feed",
      topic,
      generatedAt: new Date().toISOString(),
      data,
    });
  } catch (err) {
    if (ws.readyState !== 1) return;
    sendJson(ws, {
      type: "admin_feed_error",
      topic,
      message: err instanceof Error ? err.message : "Feed failed",
    });
  }
}

async function tick(ws) {
  const st = stateByWs.get(ws);
  if (!st || ws.readyState !== 1) return;
  const topics = [...st.topics];
  for (const topic of topics) {
    await pushTopic(ws, st.sendJson, topic, st.ctx, st.params);
  }
}

function clearTimer(st) {
  if (st?.timer) {
    clearInterval(st.timer);
    st.timer = null;
  }
}

/**
 * @param {object} ws
 * @param {(ws: object, msg: object) => void} sendJson
 * @param {object} ctx toolRoot/webRoot/fetchJson/…
 * @param {{ topics?: string[], intervalMs?: number, params?: Record<string, unknown> }} opts
 */
export function startAdminFeedsPush(ws, sendJson, ctx, opts = {}) {
  const topics = (opts.topics || [])
    .map((t) => String(t || "").trim())
    .filter((t) => TOPIC_BUILDERS[t]);
  if (!topics.length) {
    sendJson(ws, {
      type: "admin_feed_error",
      message: `No valid topics. Known: ${knownAdminFeedTopics().join(", ")}`,
    });
    return;
  }
  const intervalMs = clampInterval(opts.intervalMs);
  let st = stateByWs.get(ws);
  if (!st) {
    st = { timer: null, topics: new Set(), params: {}, ctx, sendJson };
    stateByWs.set(ws, st);
    ws.on("close", () => stopAdminFeedsPush(ws));
  }
  st.ctx = { ...ctx };
  st.sendJson = sendJson;
  st.params = opts.params && typeof opts.params === "object" ? opts.params : {};
  for (const t of topics) st.topics.add(t);
  clearTimer(st);
  // Immediate snapshot, then steady cadence.
  void tick(ws);
  st.timer = setInterval(() => {
    void tick(ws);
  }, intervalMs);
}

export function updateAdminFeedsParams(ws, params = {}) {
  const st = stateByWs.get(ws);
  if (!st) return;
  st.params = { ...st.params, ...(params && typeof params === "object" ? params : {}) };
  void tick(ws);
}

export function stopAdminFeedsPush(ws, topics = null) {
  const st = stateByWs.get(ws);
  if (!st) return;
  if (Array.isArray(topics) && topics.length) {
    for (const t of topics) st.topics.delete(String(t || "").trim());
    if (st.topics.size === 0) {
      clearTimer(st);
      stateByWs.delete(ws);
    }
    return;
  }
  clearTimer(st);
  stateByWs.delete(ws);
}
