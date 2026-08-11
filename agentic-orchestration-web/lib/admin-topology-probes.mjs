import fs from "node:fs";

/**
 * Live Topology node probes (Admin).
 *
 * Each helper returns a real check result — callers set instrumented:true only
 * when a probe actually ran. Remote LLM providers are not HTTP-probed
 * (credential presence ≠ provider health; no outbound paid-API pings) — they
 * still get a visible status (healthy when keys are set, offline when not).
 */

/** Operational statuses the Topology canvas may show. Never `unknown`. */
const VISIBLE_NODE_STATUSES = new Set([
  "healthy",
  "degraded",
  "failed",
  "starting",
  "draining",
  "offline",
]);

/**
 * Map a probe/graph status onto a visible node status.
 * Idle / present-but-unprobed → healthy; disabled / unset / not deployed → offline.
 */
export function visibleTopologyStatus(status, deployed = true) {
  const s = String(status || "").trim().toLowerCase();
  if (VISIBLE_NODE_STATUSES.has(s)) return s;
  return deployed === false ? "offline" : "healthy";
}

/** Rewrite any leftover `unknown` (or blank) on a built graph. */
export function sealTopologyGraphStatuses(graph) {
  for (const n of graph?.nodes || []) {
    n.status = visibleTopologyStatus(n.status, n.deployed !== false);
  }
  for (const e of graph?.edges || []) {
    const s = String(e.status || "").trim().toLowerCase();
    if (s === "unknown" || !s) {
      e.status = e.instrumented ? "ok" : "idle";
    }
  }
  return graph;
}

function truthy(v) {
  return ["1", "true", "yes", "on"].includes(String(v || "").trim().toLowerCase());
}

function inCluster() {
  try {
    return fs.existsSync("/var/run/secrets/kubernetes.io/serviceaccount/token");
  } catch {
    return false;
  }
}

function stripSlash(u) {
  return String(u || "").trim().replace(/\/+$/, "");
}

function isLoopbackUrl(url) {
  try {
    const u = new URL(url);
    return ["127.0.0.1", "localhost", "::1"].includes(u.hostname);
  } catch {
    return /127\.0\.0\.1|localhost/i.test(String(url));
  }
}

/** Rewrite loopback → host.k3s.internal so in-cluster pods can reach host sidecars. */
export function rewriteLoopbackForCluster(url) {
  const s = stripSlash(url);
  if (!s || !inCluster() || !isLoopbackUrl(s)) return s;
  try {
    const u = new URL(s);
    u.hostname = "host.k3s.internal";
    return stripSlash(u.toString());
  } catch {
    return s.replace(/127\.0\.0\.1|localhost/gi, "host.k3s.internal");
  }
}

/** Normalize Ollama base URL from env (scheme optional). */
export function ollamaBaseUrl() {
  const raw = String(
    process.env.OLLAMA_API_BASE || process.env.OLLAMA_HOST || "",
  ).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, "");
  return `http://${raw.replace(/\/+$/, "")}`;
}

/**
 * Speech STT base URL candidates (first reachable wins).
 * Prefer advertise (client-facing) then local bind, with in-cluster rewrite.
 */
export function speechSttCandidates() {
  const advertise = stripSlash(process.env.AGENTIC_SPEECH_ADVERTISE_STT_URL || "");
  const local = stripSlash(process.env.AGENTIC_SPEECH_STT_URL || "") ||
    (() => {
      const host = String(process.env.AGENTIC_SPEECH_STT_HOST || "127.0.0.1").trim();
      const port = Number(process.env.AGENTIC_SPEECH_STT_PORT || 8090);
      return `http://${host}:${port}`;
    })();
  const out = [];
  const push = (u) => {
    if (!u) return;
    const rewritten = rewriteLoopbackForCluster(u);
    for (const x of [u, rewritten]) {
      if (x && !out.includes(x)) out.push(x);
    }
  };
  push(advertise);
  push(local);
  return out;
}

export function speechTtsCandidates() {
  const advertise = stripSlash(process.env.AGENTIC_SPEECH_ADVERTISE_TTS_URL || "");
  const local = stripSlash(process.env.AGENTIC_SPEECH_TTS_URL || "") ||
    (() => {
      const host = String(process.env.AGENTIC_SPEECH_TTS_HOST || "127.0.0.1").trim();
      const port = Number(process.env.AGENTIC_SPEECH_TTS_PORT || 8091);
      return `http://${host}:${port}`;
    })();
  const out = [];
  const push = (u) => {
    if (!u) return;
    const rewritten = rewriteLoopbackForCluster(u);
    for (const x of [u, rewritten]) {
      if (x && !out.includes(x)) out.push(x);
    }
  };
  push(advertise);
  push(local);
  return out;
}

/** @deprecated single-URL helper — prefer speechSttCandidates */
export function speechSttUrl() {
  return speechSttCandidates()[0] || "http://127.0.0.1:8090";
}

/** @deprecated single-URL helper — prefer speechTtsCandidates */
export function speechTtsUrl() {
  return speechTtsCandidates()[0] || "http://127.0.0.1:8091";
}

/**
 * @param {Function} fetchJson
 * @param {string} url
 * @param {number} [timeoutMs]
 * @param {boolean} [tlsInsecure]
 */
export async function probeHttpOk(fetchJson, url, timeoutMs = 2000, tlsInsecure = false) {
  const started = Date.now();
  try {
    const result = await fetchJson(url, timeoutMs, tlsInsecure);
    return {
      ok: Boolean(result?.ok),
      status: result?.status ?? null,
      error: result?.error || null,
      json: result?.json ?? null,
      latencyMs: Date.now() - started,
      url,
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err?.message || String(err),
      json: null,
      latencyMs: Date.now() - started,
      url,
    };
  }
}

async function probeFirstHttpOk(fetchJson, bases, path = "/health") {
  const tried = [];
  let last = null;
  for (const base of bases) {
    const result = await probeHttpOk(fetchJson, `${base}${path}`, 2000, false);
    tried.push(base);
    last = { ...result, base };
    if (result.ok) return { ...last, tried };
  }
  return {
    ok: false,
    status: last?.status ?? null,
    error: last?.error || null,
    json: null,
    latencyMs: last?.latencyMs ?? 0,
    url: last?.url || null,
    base: bases[0] || null,
    tried,
  };
}

/** GET {ollama}/api/tags — only when OLLAMA_* is configured. */
export async function probeOllama(fetchJson) {
  const base = ollamaBaseUrl();
  if (!base) {
    return { configured: false, ok: false, skipped: true, reason: "OLLAMA_HOST not configured" };
  }
  // Prefer configured URL; if loopback in-cluster, also try host.k3s.internal.
  const bases = [base];
  const rewritten = rewriteLoopbackForCluster(base);
  if (rewritten && rewritten !== base) bases.push(rewritten);
  const result = await probeFirstHttpOk(fetchJson, bases, "/api/tags");
  const models = Array.isArray(result.json?.models) ? result.json.models.length : null;
  const used = result.ok ? result.base : base;
  return {
    configured: true,
    skipped: false,
    ok: result.ok,
    status: result.status,
    error: result.error,
    latencyMs: result.latencyMs,
    base: used,
    modelCount: models,
    reason: result.ok
      ? models != null
        ? `${models} model${models === 1 ? "" : "s"} via ${used}`
        : `reachable ${used}`
      : result.error || `HTTP ${result.status || "down"} at ${bases.join(" | ")}/api/tags`,
  };
}

/** GET speech STT /health when AGENTIC_SPEECH_ENABLED. */
export async function probeSpeechStt(fetchJson, { enabled } = {}) {
  const on = enabled ?? truthy(process.env.AGENTIC_SPEECH_ENABLED);
  if (!on) {
    return { configured: false, ok: false, skipped: true, reason: "speech disabled" };
  }
  const bases = speechSttCandidates();
  const result = await probeFirstHttpOk(fetchJson, bases, "/health");
  return {
    configured: true,
    skipped: false,
    ok: result.ok,
    status: result.status,
    error: result.error,
    latencyMs: result.latencyMs,
    base: result.ok ? result.base : bases[0],
    reason: result.ok
      ? `reachable ${result.base}`
      : result.error ||
        `HTTP ${result.status || "down"} (tried ${bases.join(", ")})`,
  };
}

/** GET speech TTS /health when AGENTIC_SPEECH_ENABLED. */
export async function probeSpeechTts(fetchJson, { enabled } = {}) {
  const on = enabled ?? truthy(process.env.AGENTIC_SPEECH_ENABLED);
  if (!on) {
    return { configured: false, ok: false, skipped: true, reason: "speech disabled" };
  }
  const bases = speechTtsCandidates();
  const result = await probeFirstHttpOk(fetchJson, bases, "/health");
  return {
    configured: true,
    skipped: false,
    ok: result.ok,
    status: result.status,
    error: result.error,
    latencyMs: result.latencyMs,
    base: result.ok ? result.base : bases[0],
    reason: result.ok
      ? `reachable ${result.base}`
      : result.error ||
        `HTTP ${result.status || "down"} (tried ${bases.join(", ")})`,
  };
}

/**
 * Catalog load probe — success of buildCatalogs for one kind.
 * @param {{ entries?: unknown[], error?: string, ok?: boolean } | null} catalog
 */
export function probeCatalogLoad(catalog, kindLabel) {
  const entries = catalog?.entries || catalog?.items || (Array.isArray(catalog) ? catalog : []);
  const count = Array.isArray(entries) ? entries.length : 0;
  const failed = Boolean(catalog?.ok === false || catalog?.error);
  if (failed) {
    return {
      ok: false,
      status: "failed",
      instrumented: true,
      count,
      reason: catalog?.error || `${kindLabel} catalog failed to load`,
    };
  }
  if (!catalog) {
    return {
      ok: false,
      status: "failed",
      instrumented: true,
      count: 0,
      reason: `${kindLabel} catalog unavailable`,
    };
  }
  return {
    ok: true,
    status: count > 0 ? "healthy" : "degraded",
    instrumented: true,
    count,
    reason:
      count > 0
        ? `loaded ${count} ${kindLabel} entr${count === 1 ? "y" : "ies"}`
        : `${kindLabel} catalog empty`,
  };
}

/**
 * Planner readiness from engine /health warm catalogs + process reachability.
 * @param {{ ok?: boolean, json?: object }} engineHealth
 */
export function probePlannerFromEngine(engineHealth) {
  if (!engineHealth?.ok) {
    return {
      ok: false,
      status: "failed",
      instrumented: true,
      reason: "engine unreachable — planner not probed",
    };
  }
  const catalogs = engineHealth.json?.catalogs || {};
  if (catalogs.ok === false) {
    return {
      ok: false,
      status: "degraded",
      instrumented: true,
      reason: catalogs.error || "engine warm catalogs failed",
    };
  }
  return {
    ok: true,
    status: "healthy",
    instrumented: true,
    reason:
      catalogs.agentProviders != null
        ? `engine warm · ${catalogs.agentProviders} agent providers`
        : "engine /health reachable (planner path live)",
  };
}

/**
 * Model-backends aggregate (ollama live + remote keys present).
 * Remote LLMs themselves stay uninstrumented — keys alone don't prove health.
 */
export function probeModelBackends({ ollama, remoteConfigured }) {
  const parts = [];
  if (ollama?.configured) {
    parts.push(ollama.ok ? "ollama ok" : "ollama down");
  }
  if (remoteConfigured) parts.push("remote keys set");
  if (!parts.length) {
    return {
      ok: false,
      status: "offline",
      instrumented: false,
      reason: "no model backends configured",
    };
  }
  if (ollama?.configured && !ollama.ok && !remoteConfigured) {
    return {
      ok: false,
      status: "failed",
      instrumented: true,
      reason: ollama.reason || "ollama unreachable",
    };
  }
  if (ollama?.configured && !ollama.ok && remoteConfigured) {
    return {
      ok: false,
      status: "degraded",
      instrumented: true,
      reason: `ollama down; remote keys present (remote not probed)`,
    };
  }
  return {
    ok: true,
    status: "healthy",
    instrumented: true,
    reason: parts.join(" · "),
  };
}

/**
 * Execution backend from env + optional k8s worker probe.
 */
export function probeExecutionBackend({
  backend,
  engineOk,
  k8sReachable,
  workerStatus,
  workerPods,
}) {
  const name = String(backend || "inprocess");
  if (name === "kubernetes" || name === "k8s") {
    if (!k8sReachable) {
      return {
        ok: false,
        status: "failed",
        instrumented: true,
        reason: "kubernetes backend but cluster API unreachable",
      };
    }
    const st = workerStatus || (workerPods ? "healthy" : "offline");
    return {
      ok: st === "healthy" || st === "degraded" || st === "starting",
      status:
        (st === "unknown" || st === "offline") && !workerPods
          ? "degraded"
          : visibleTopologyStatus(st),
      instrumented: true,
      reason: workerPods
        ? `kubernetes · ${workerPods} worker pod(s)`
        : "kubernetes backend · no worker pods",
    };
  }
  // inprocess / subprocess — live when engine answers
  if (!engineOk) {
    return {
      ok: false,
      status: "failed",
      instrumented: true,
      reason: `${name} backend — engine unreachable`,
    };
  }
  return {
    ok: true,
    status: "healthy",
    instrumented: true,
    reason: `${name} backend · engine reachable`,
  };
}

/**
 * Storage / GPU from engine /health hardware snapshot.
 * @param {{ ok?: boolean, json?: object }} engineHealth
 */
export function probeStorageGpu(engineHealth) {
  if (!engineHealth?.ok) {
    return {
      ok: false,
      status: "offline",
      instrumented: false,
      reason: "engine unreachable — hardware not probed",
    };
  }
  const hw = engineHealth.json?.hardware || {};
  const gpu = hw.gpu || {};
  const vram =
    hw.vramGbAvailable ??
    gpu.vramFreeGb ??
    gpu.vramTotalGb ??
    null;
  const name = gpu.name || hw.platform || null;
  if (!name && vram == null) {
    return {
      ok: true,
      status: "healthy",
      instrumented: true,
      reason: "engine hardware snapshot present (no GPU detail)",
      sublabel: "host",
    };
  }
  const bits = [];
  if (name) bits.push(String(name).slice(0, 28));
  if (vram != null) bits.push(`${Number(vram).toFixed(0)}GB free`);
  return {
    ok: true,
    status: "healthy",
    instrumented: true,
    reason: bits.join(" · ") || "hardware from engine /health",
    sublabel: vram != null ? `${Number(vram).toFixed(0)}GB` : "gpu",
  };
}

/**
 * Engine endpoint derived from parent engine probe + feature flags.
 * Honest: same probe tick as engine /health (no separate HTTP per route).
 */
export function probeEngineEndpoint({ engineOk, deployed, label, detail }) {
  if (!deployed) {
    return {
      ok: false,
      status: "offline",
      instrumented: false,
      reason: `${label} disabled`,
      sublabel: "off",
    };
  }
  if (!engineOk) {
    return {
      ok: false,
      status: "failed",
      instrumented: true,
      reason: `engine down — ${label} unavailable`,
      sublabel: "on",
    };
  }
  return {
    ok: true,
    status: "healthy",
    instrumented: true,
    reason: detail || `engine /health · ${label} enabled`,
    sublabel: "on",
  };
}
