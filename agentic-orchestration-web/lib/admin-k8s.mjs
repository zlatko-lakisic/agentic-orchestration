/**
 * In-cluster Kubernetes helpers for Admin (logs + topology).
 * Uses the pod service account when running inside the cluster.
 */
import fs from "node:fs";
import https from "node:https";

const SA_DIR = "/var/run/secrets/kubernetes.io/serviceaccount";

/** Known AO workloads (label app.kubernetes.io/name). */
export const K8S_WORKLOAD_SPECS = [
  {
    name: "agentic-coordinator",
    label: "Coordinator",
    role: "coordinator",
    logSource: "coordinator",
    group: "platform",
  },
  {
    name: "agentic-engine",
    label: "Engine",
    role: "engine",
    logSource: "engine",
    group: "platform",
  },
  {
    name: "agentic-warm-pool",
    label: "Warm pool",
    role: "worker",
    logSource: "warm-pool",
    group: "workers",
  },
  {
    name: "agentic-delegation-broker",
    label: "Delegation broker",
    role: "broker",
    logSource: "broker",
    group: "platform",
  },
  {
    name: "agentic-mcp-fetch",
    label: "MCP fetch",
    role: "mcp-sidecar",
    logSource: "web",
    group: "sidecars",
  },
  {
    name: "agentic-mcp-filesystem",
    label: "MCP filesystem",
    role: "mcp-sidecar",
    logSource: "web",
    group: "sidecars",
  },
  {
    name: "agentic-orchestrator-worker",
    label: "Worker jobs",
    role: "worker-job",
    logSource: "warm-pool",
    group: "workers",
  },
];

/** @type {{ at: number, value: object } | null} */
let _cache = null;
const CACHE_MS = 3000;

/**
 * @returns {{ token: string, namespace: string, ca: Buffer, host: string, port: string } | null}
 */
export function readServiceAccount() {
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

/**
 * @param {NonNullable<ReturnType<typeof readServiceAccount>>} sa
 * @param {string} path
 * @param {{ timeoutMs?: number }} [opts]
 */
export function k8sRequest(sa, path, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 15000;
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: sa.host,
        port: sa.port,
        path,
        method: "GET",
        ca: sa.ca,
        headers: { Authorization: `Bearer ${sa.token}` },
        timeout: timeoutMs,
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

/**
 * @param {NonNullable<ReturnType<typeof readServiceAccount>>} sa
 * @param {string} path
 * @param {{ onData: (chunk: string) => void, onEnd: () => void, onError: (err: Error) => void }} handlers
 */
export function k8sStream(sa, path, { onData, onEnd, onError }) {
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

/**
 * @param {NonNullable<ReturnType<typeof readServiceAccount>>} sa
 * @param {string} [labelSelector]
 */
export async function listPods(sa, labelSelector) {
  let path = `/api/v1/namespaces/${encodeURIComponent(sa.namespace)}/pods`;
  if (labelSelector) {
    path += `?labelSelector=${encodeURIComponent(labelSelector)}`;
  }
  const body = await k8sRequest(sa, path, { timeoutMs: 8000 });
  const json = JSON.parse(body);
  return Array.isArray(json.items) ? json.items : [];
}

/**
 * @param {object} pod
 */
export function summarizePod(pod) {
  const name = String(pod?.metadata?.name || "");
  const phase = String(pod?.status?.phase || "Unknown");
  const nodeName = pod?.status?.nodeName || null;
  const containers = [];
  let ready = true;
  let restarts = 0;
  const statuses = pod?.status?.containerStatuses || [];
  const specs = pod?.spec?.containers || [];
  for (const spec of specs) {
    const st = statuses.find((s) => s.name === spec.name) || {};
    const isReady = Boolean(st.ready);
    if (!isReady && phase === "Running") ready = false;
    const rc = Number(st.restartCount || 0);
    restarts += rc;
    containers.push({
      name: spec.name,
      ready: isReady,
      restartCount: rc,
      state: st.state ? Object.keys(st.state)[0] : null,
    });
  }
  if (!statuses.length && phase !== "Succeeded") ready = phase === "Running";
  return {
    name,
    phase,
    ready: phase === "Running" ? ready : phase === "Succeeded",
    restarts,
    nodeName,
    containers,
    labels: pod?.metadata?.labels || {},
  };
}

/**
 * @param {ReturnType<typeof summarizePod>[]} pods
 */
export function statusFromPods(pods) {
  if (!pods.length) return { status: "unknown", reason: "no pods" };
  const failed = pods.some(
    (p) =>
      p.phase === "Failed" ||
      p.containers.some((c) => c.state === "waiting" && /crash|error/i.test(String(c.state))),
  );
  // CrashLoopBackOff lives in waiting.reason — re-check raw
  const crash = pods.some((p) =>
    (p.containers || []).some((c) => /crash|error|imagepull/i.test(String(c.state || ""))),
  );
  if (failed || crash) return { status: "failed", reason: "pod failed or crashloop" };
  const pending = pods.some((p) => p.phase === "Pending");
  if (pending) return { status: "starting", reason: "pod pending" };
  const notReady = pods.some((p) => p.phase === "Running" && !p.ready);
  if (notReady) return { status: "degraded", reason: "container not ready" };
  const allOk = pods.every(
    (p) => p.phase === "Running" || p.phase === "Succeeded",
  );
  if (allOk) return { status: "healthy", reason: "pods ready" };
  return { status: "unknown", reason: `phases: ${pods.map((p) => p.phase).join(",")}` };
}

/**
 * Probe AO namespace pods and group by known workloads.
 * Cached briefly so topology WS ticks do not hammer the API.
 *
 * @returns {Promise<{
 *   reachable: boolean,
 *   namespace: string | null,
 *   probedAt: string,
 *   note?: string,
 *   workloads: Array<object>,
 *   totals: { pods: number, ready: number, workers: number, sidecars: number },
 * }>}
 */
export async function probeK8sTopology() {
  const now = Date.now();
  if (_cache && now - _cache.at < CACHE_MS) {
    return _cache.value;
  }

  const sa = readServiceAccount();
  const probedAt = new Date().toISOString();
  if (!sa) {
    const value = {
      reachable: false,
      namespace: null,
      probedAt,
      note: "not in-cluster (no service account)",
      workloads: [],
      totals: { pods: 0, ready: 0, workers: 0, sidecars: 0 },
    };
    _cache = { at: now, value };
    return value;
  }

  try {
    // List namespace pods (coordinator SA already has get/list/watch).
    const items = await listPods(sa);

    /** @type {Map<string, object[]>} */
    const byName = new Map();
    for (const pod of items) {
      const labels = pod?.metadata?.labels || {};
      const appName =
        labels["app.kubernetes.io/name"] ||
        labels.app ||
        labels["job-name"] ||
        "other";
      if (!byName.has(appName)) byName.set(appName, []);
      byName.get(appName).push(pod);
    }

    const workloads = [];
    const seen = new Set();

    for (const spec of K8S_WORKLOAD_SPECS) {
      const podsRaw = byName.get(spec.name) || [];
      seen.add(spec.name);
      const pods = podsRaw.map(summarizePod);
      const { status, reason } = statusFromPods(pods);
      const readyCount = pods.filter((p) => p.ready).length;
      workloads.push({
        id: `k8s/workload/${spec.name}`,
        name: spec.name,
        label: spec.label,
        role: spec.role,
        group: spec.group,
        logSource: spec.logSource,
        deployed: pods.length > 0,
        count: pods.length,
        ready: readyCount,
        status: pods.length ? status : "unknown",
        statusReason: pods.length ? reason : "no pods for this workload",
        instrumented: true,
        pods,
      });
    }

    // Surface unexpected labeled workloads (DaemonSets, extras).
    for (const [name, podsRaw] of byName) {
      if (seen.has(name)) continue;
      if (!String(name).startsWith("agentic-")) continue;
      const pods = podsRaw.map(summarizePod);
      const { status, reason } = statusFromPods(pods);
      workloads.push({
        id: `k8s/workload/${name}`,
        name,
        label: name.replace(/^agentic-/, ""),
        role: "other",
        group: "platform",
        logSource: "web",
        deployed: true,
        count: pods.length,
        ready: pods.filter((p) => p.ready).length,
        status,
        statusReason: reason,
        instrumented: true,
        pods,
      });
    }

    const allPods = workloads.flatMap((w) => w.pods);
    const value = {
      reachable: true,
      namespace: sa.namespace,
      probedAt,
      workloads,
      totals: {
        pods: allPods.length,
        ready: allPods.filter((p) => p.ready).length,
        workers: workloads
          .filter((w) => w.group === "workers" && w.deployed)
          .reduce((n, w) => n + w.count, 0),
        sidecars: workloads
          .filter((w) => w.group === "sidecars" && w.deployed)
          .reduce((n, w) => n + w.count, 0),
      },
    };
    _cache = { at: now, value };
    return value;
  } catch (err) {
    const value = {
      reachable: false,
      namespace: sa.namespace,
      probedAt,
      note: String(err?.message || err),
      workloads: [],
      totals: { pods: 0, ready: 0, workers: 0, sidecars: 0 },
    };
    _cache = { at: now, value };
    return value;
  }
}
