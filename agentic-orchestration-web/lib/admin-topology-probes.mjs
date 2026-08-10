/**
 * Live Topology node probes (Admin).
 *
 * Each helper returns a real check result — callers set instrumented:true only
 * when a probe actually ran. Remote LLM providers are intentionally omitted
 * (credential presence ≠ health; no outbound paid-API pings).
 */

function truthy(v) {
  return ["1", "true", "yes", "on"].includes(String(v || "").trim().toLowerCase());
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

export function speechSttUrl() {
  const explicit = String(process.env.AGENTIC_SPEECH_STT_URL || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const host = String(process.env.AGENTIC_SPEECH_STT_HOST || "127.0.0.1").trim();
  const port = Number(process.env.AGENTIC_SPEECH_STT_PORT || 8090);
  return `http://${host}:${port}`;
}

export function speechTtsUrl() {
  const explicit = String(process.env.AGENTIC_SPEECH_TTS_URL || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const host = String(process.env.AGENTIC_SPEECH_TTS_HOST || "127.0.0.1").trim();
  const port = Number(process.env.AGENTIC_SPEECH_TTS_PORT || 8091);
  return `http://${host}:${port}`;
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

/** GET {ollama}/api/tags — only when OLLAMA_* is configured. */
export async function probeOllama(fetchJson) {
  const base = ollamaBaseUrl();
  if (!base) {
    return { configured: false, ok: false, skipped: true, reason: "OLLAMA_HOST not configured" };
  }
  const result = await probeHttpOk(fetchJson, `${base}/api/tags`, 2000, false);
  const models = Array.isArray(result.json?.models) ? result.json.models.length : null;
  return {
    configured: true,
    skipped: false,
    ok: result.ok,
    status: result.status,
    error: result.error,
    latencyMs: result.latencyMs,
    base,
    modelCount: models,
    reason: result.ok
      ? models != null
        ? `${models} model${models === 1 ? "" : "s"} via ${base}`
        : `reachable ${base}`
      : result.error || `HTTP ${result.status || "down"} at ${base}/api/tags`,
  };
}

/** GET speech STT /health when AGENTIC_SPEECH_ENABLED. */
export async function probeSpeechStt(fetchJson, { enabled } = {}) {
  const on = enabled ?? truthy(process.env.AGENTIC_SPEECH_ENABLED);
  if (!on) {
    return { configured: false, ok: false, skipped: true, reason: "speech disabled" };
  }
  const base = speechSttUrl();
  const result = await probeHttpOk(fetchJson, `${base}/health`, 2000, false);
  return {
    configured: true,
    skipped: false,
    ok: result.ok,
    status: result.status,
    error: result.error,
    latencyMs: result.latencyMs,
    base,
    reason: result.ok
      ? `reachable ${base}`
      : result.error || `HTTP ${result.status || "down"} at ${base}/health`,
  };
}

/** GET speech TTS /health when AGENTIC_SPEECH_ENABLED. */
export async function probeSpeechTts(fetchJson, { enabled } = {}) {
  const on = enabled ?? truthy(process.env.AGENTIC_SPEECH_ENABLED);
  if (!on) {
    return { configured: false, ok: false, skipped: true, reason: "speech disabled" };
  }
  const base = speechTtsUrl();
  const result = await probeHttpOk(fetchJson, `${base}/health`, 2000, false);
  return {
    configured: true,
    skipped: false,
    ok: result.ok,
    status: result.status,
    error: result.error,
    latencyMs: result.latencyMs,
    base,
    reason: result.ok
      ? `reachable ${base}`
      : result.error || `HTTP ${result.status || "down"} at ${base}/health`,
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
      status: "unknown",
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
    const st = workerStatus || (workerPods ? "healthy" : "unknown");
    return {
      ok: st === "healthy" || st === "degraded" || st === "starting",
      status: st === "unknown" && !workerPods ? "degraded" : st,
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
      status: "unknown",
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
      status: "unknown",
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
