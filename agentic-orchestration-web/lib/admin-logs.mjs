/**
 * Admin live log bus + in-cluster Kubernetes pod log tails.
 * WS protocol:
 *   client → { type: "admin_logs_subscribe", sources?: string[] }
 *   client → { type: "admin_logs_unsubscribe" }
 *   server → { type: "admin_log", source, level, ts, line }
 *   server → { type: "admin_logs_sources", sources: string[] }
 */
import fs from "node:fs";
import https from "node:https";
import { EventEmitter } from "node:events";

const MAX_BUFFER = 500;
const SOURCES = ["web", "coordinator", "engine", "warm-pool", "broker", "worker"];
const SA_DIR = "/var/run/secrets/kubernetes.io/serviceaccount";
const TAIL_SPECS = [
  {
    source: "coordinator",
    labelSelector: "app.kubernetes.io/name=agentic-coordinator",
    container: "coordinator",
    tailLines: 80,
  },
  {
    source: "engine",
    labelSelector: "app.kubernetes.io/name=agentic-engine",
    container: null,
    tailLines: 80,
  },
  {
    source: "warm-pool",
    labelSelector: "app.kubernetes.io/name=agentic-warm-pool",
    container: null,
    tailLines: 40,
  },
  {
    source: "broker",
    labelSelector: "app.kubernetes.io/name=agentic-delegation-broker",
    container: null,
    tailLines: 40,
  },
];

/** @type {{ source: string, level: string, ts: string, line: string }[]} */
const ring = [];
const bus = new EventEmitter();
bus.setMaxListeners(50);

/** @type {Map<string, { req: import('http').ClientRequest, abort: () => void }>} */
const activeTails = new Map();

let k8sReady = null;
let ensureStarted = false;

export function adminLogSources() {
  return [...SOURCES];
}

/**
 * @param {string} source
 * @param {string} line
 * @param {string} [level]
 */
export function adminLog(source, line, level = "info") {
  const text = String(line || "").replace(/\r/g, "").trimEnd();
  if (!text) return;
  const entry = {
    source: String(source || "web"),
    level: String(level || "info"),
    ts: new Date().toISOString(),
    line: text.length > 4000 ? `${text.slice(0, 4000)}…` : text,
  };
  ring.push(entry);
  if (ring.length > MAX_BUFFER) ring.splice(0, ring.length - MAX_BUFFER);
  bus.emit("log", entry);
}

/** @param {string[] | null | undefined} sources */
export function adminLogHistory(sources) {
  const allow = normalizeSources(sources);
  return ring.filter((e) => allow.has(e.source));
}

function normalizeSources(sources) {
  if (!Array.isArray(sources) || !sources.length) return new Set(SOURCES);
  return new Set(sources.map((s) => String(s || "").trim()).filter(Boolean));
}

/**
 * @param {import('ws').WebSocket} ws
 * @param {(obj: object) => void} sendJson
 * @param {{ sources?: string[] }} [opts]
 */
export function startAdminLogsPush(ws, sendJson, opts = {}) {
  stopAdminLogsPush(ws);
  const allow = normalizeSources(opts.sources);
  ws._adminLogSources = allow;

  sendJson(ws, { type: "admin_logs_sources", sources: SOURCES });

  for (const entry of adminLogHistory([...allow])) {
    sendJson(ws, { type: "admin_log", ...entry });
  }

  const onLog = (entry) => {
    if (ws.readyState !== 1) return;
    if (!ws._adminLogSources?.has(entry.source)) return;
    sendJson(ws, { type: "admin_log", ...entry });
  };
  bus.on("log", onLog);
  ws._adminLogListener = onLog;

  void ensureK8sLogTails();
  adminLog("web", "Admin log stream subscribed", "info");
}

/**
 * On-demand: follow worker Job pods labeled ``agentic.run_id`` for a correlation id.
 * @param {string} runId
 */
export function followWorkerLogsForRun(runId) {
  const rid = String(runId || "").trim();
  if (!rid) return;
  void (async () => {
    await ensureK8sLogTails();
    const sa = readSa();
    if (!sa) {
      adminLog("web", `Cannot follow worker logs for run_id=${rid} (not in-cluster)`, "warn");
      return;
    }
    const label = sanitizeK8sLabel(rid);
    try {
      const pods = await listPods(sa, `agentic.run_id=${label}`);
      if (!pods.length) {
        adminLog(
          "worker",
          `no worker pods with agentic.run_id=${label} (run_id=${rid})`,
          "warn",
        );
        return;
      }
      adminLog("worker", `following ${pods.length} worker pod(s) for run_id=${rid}`, "info");
      for (const item of pods) {
        const name = item?.metadata?.name;
        if (!name) continue;
        const sourceKey = `worker:${name}`;
        void followPodLogs(sa, name, {
          source: "worker",
          container: null,
          tailLines: 120,
          _key: sourceKey,
          _linePrefix: `[${rid}/${name}] `,
        }).catch((err) => {
          adminLog("worker", `tail ${name}: ${err?.message || err}`, "warn");
        });
      }
    } catch (err) {
      adminLog("worker", `follow run ${rid}: ${err?.message || err}`, "warn");
    }
  })();
}

function sanitizeK8sLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63) || "x";
}

/** @param {import('ws').WebSocket} ws */
export function stopAdminLogsPush(ws) {
  if (ws._adminLogListener) {
    bus.off("log", ws._adminLogListener);
    ws._adminLogListener = null;
  }
  ws._adminLogSources = null;
}

function readSa() {
  try {
    const token = fs.readFileSync(`${SA_DIR}/token`, "utf8").trim();
    const namespace = fs.readFileSync(`${SA_DIR}/namespace`, "utf8").trim();
    const ca = fs.readFileSync(`${SA_DIR}/ca.crt`);
    const host = process.env.KUBERNETES_SERVICE_HOST;
    const port = process.env.KUBERNETES_SERVICE_PORT || "443";
    if (!token || !namespace || !host) return null;
    return { token, namespace, ca, host, port: String(port) };
  } catch {
    return null;
  }
}

async function ensureK8sLogTails() {
  if (ensureStarted) return;
  ensureStarted = true;
  const sa = readSa();
  if (!sa) {
    adminLog(
      "web",
      "Live pod logs unavailable (not in-cluster); web console only",
      "warn",
    );
    k8sReady = false;
    return;
  }
  k8sReady = true;
  adminLog("web", "Starting in-cluster pod log tails", "info");
  for (const spec of TAIL_SPECS) {
    void maintainTail(sa, spec);
  }
}

/**
 * @param {ReturnType<typeof readSa>} sa
 * @param {(typeof TAIL_SPECS)[number]} spec
 */
async function maintainTail(sa, spec) {
  if (!sa) return;
  while (k8sReady) {
    try {
      const pods = await listPods(sa, spec.labelSelector);
      const pod = pickNewestPod(pods);
      if (!pod) {
        adminLog(spec.source, `no pods for ${spec.labelSelector}`, "warn");
        await sleep(15000);
        continue;
      }
      adminLog(spec.source, `tailing pod/${pod}…`, "info");
      await followPodLogs(sa, pod, spec);
    } catch (err) {
      adminLog(
        spec.source,
        `log tail error: ${err?.message || err}`,
        "warn",
      );
    }
    await sleep(5000);
  }
}

function pickNewestPod(items) {
  if (!Array.isArray(items) || !items.length) return null;
  const sorted = [...items].sort((a, b) => {
    const ta = Date.parse(a?.metadata?.creationTimestamp || 0);
    const tb = Date.parse(b?.metadata?.creationTimestamp || 0);
    return tb - ta;
  });
  return sorted[0]?.metadata?.name || null;
}

function listPods(sa, labelSelector) {
  const path = `/api/v1/namespaces/${encodeURIComponent(sa.namespace)}/pods?labelSelector=${encodeURIComponent(labelSelector)}`;
  return k8sRequest(sa, path).then((body) => {
    const json = JSON.parse(body);
    return json.items || [];
  });
}

/**
 * @param {ReturnType<typeof readSa>} sa
 * @param {string} podName
 * @param {(typeof TAIL_SPECS)[number]} spec
 */
function followPodLogs(sa, podName, spec) {
  return new Promise((resolve, reject) => {
    const key = spec._key || spec.source;
    stopTail(key);

    const qs = new URLSearchParams({
      follow: "true",
      timestamps: "false",
      tailLines: String(spec.tailLines || 80),
    });
    if (spec.container) qs.set("container", spec.container);
    const path = `/api/v1/namespaces/${encodeURIComponent(sa.namespace)}/pods/${encodeURIComponent(podName)}/log?${qs}`;
    const prefix = spec._linePrefix || "";

    let buf = "";
    const req = k8sStream(sa, path, {
      onData: (chunk) => {
        buf += String(chunk || "");
        const parts = buf.split("\n");
        buf = parts.pop() || "";
        for (const line of parts) adminLog(spec.source, `${prefix}${line}`, "info");
      },
      onEnd: () => {
        activeTails.delete(key);
        if (buf.trim()) adminLog(spec.source, `${prefix}${buf}`, "info");
        resolve();
      },
      onError: (err) => {
        activeTails.delete(key);
        reject(err);
      },
    });
    activeTails.set(key, {
      req,
      abort: () => {
        try {
          req.destroy();
        } catch {
          /* ignore */
        }
      },
    });
  });
}

function stopTail(source) {
  const cur = activeTails.get(source);
  if (!cur) return;
  activeTails.delete(source);
  cur.abort();
}

function k8sRequest(sa, path) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: sa.host,
        port: sa.port,
        path,
        method: "GET",
        ca: sa.ca,
        headers: { Authorization: `Bearer ${sa.token}` },
        timeout: 15000,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () => {
          if ((res.statusCode || 500) >= 300) {
            reject(new Error(`k8s ${res.statusCode}: ${body.slice(0, 200)}`));
            return;
          }
          resolve(body);
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("k8s request timeout"));
    });
    req.end();
  });
}

function k8sStream(sa, path, { onData, onEnd, onError }) {
  const req = https.request(
    {
      host: sa.host,
      port: sa.port,
      path,
      method: "GET",
      ca: sa.ca,
      headers: { Authorization: `Bearer ${sa.token}` },
      timeout: 0,
    },
    (res) => {
      if ((res.statusCode || 500) >= 300) {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () => {
          onError(new Error(`k8s ${res.statusCode}: ${body.slice(0, 240)}`));
        });
        return;
      }
      res.setEncoding("utf8");
      res.on("data", onData);
      res.on("end", onEnd);
      res.on("error", onError);
    },
  );
  req.on("error", onError);
  req.end();
  return req;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Seed so the UI is never empty on first open.
adminLog("web", "Admin log bus ready", "info");
