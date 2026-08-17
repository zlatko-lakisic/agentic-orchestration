/**
 * Keep the planner Ollama model loaded via periodic /api/generate pings.
 */

function envTruthy(name, defaultTruthy = true) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") return defaultTruthy;
  const v = String(raw).trim().toLowerCase();
  return !["0", "false", "no", "off"].includes(v);
}

export function ollamaKeepAliveEnabled() {
  // Resource-sharing broker owns idle unload; forever-keepalive fights that policy.
  const sharing = envTruthy("AGENTIC_OLLAMA_RESOURCE_SHARING", false);
  if (sharing && !envTruthy("AGENTIC_OLLAMA_KEEPALIVE_WITH_SHARING", false)) {
    return false;
  }
  return envTruthy("AGENTIC_OLLAMA_KEEPALIVE", true);
}

export function resolveOllamaApiBase() {
  const raw =
    String(process.env.OLLAMA_API_BASE || "").trim() ||
    String(process.env.OLLAMA_HOST || "").trim() ||
    "http://127.0.0.1:11434";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "");
  }
  return `http://${raw.replace(/\/+$/, "")}`;
}

/** Prefer IPv4 loopback — Node often resolves localhost to ::1 first. */
export function normalizeOllamaLoopbackBase(base) {
  return String(base || "").replace(/:\/\/localhost(?=[:/]|$)/gi, "://127.0.0.1");
}

/** Ollama model tag for /api/generate (no ollama/ prefix). */
export function resolvePlannerOllamaModelTag() {
  const raw = String(process.env.AGENTIC_PLANNER_MODEL || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.startsWith("ollama/")) return raw.slice("ollama/".length).trim();
  if (lower.startsWith("ollama:")) return raw.slice("ollama:".length).trim();
  return "";
}

/** Ollama keep_alive: number seconds, -1 forever, or duration string like "5m". */
export function ollamaKeepAliveDuration() {
  const raw = String(process.env.AGENTIC_OLLAMA_KEEP_ALIVE || "-1").trim();
  const v = raw || "-1";
  // Numeric forever / seconds — must be JSON number (string "-1" → HTTP 400).
  if (/^-?\d+$/.test(v)) return Number(v);
  return v;
}

/** Default 60s — local CPU models unload quickly if idle for minutes. */
export function ollamaKeepAliveIntervalMs() {
  const raw = String(process.env.AGENTIC_OLLAMA_KEEPALIVE_INTERVAL_MS || "60000").trim();
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 15_000) return 60_000;
  return Math.min(n, 3_600_000);
}

export function ollamaKeepAliveMaxAttempts() {
  const raw = String(process.env.AGENTIC_OLLAMA_KEEPALIVE_ATTEMPTS || "3").trim();
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 3;
  return Math.min(Math.floor(n), 8);
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

/** Probe daemon; returns true when /api/tags responds OK. */
export async function pingOllamaTags(opts = {}) {
  const base = normalizeOllamaLoopbackBase(resolveOllamaApiBase());
  const res = await fetch(`${base}/api/tags`, {
    method: "GET",
    signal: opts.signal ?? AbortSignal.timeout(15_000),
  });
  return res.ok;
}

/**
 * Load or refresh model residency. Returns true when Ollama accepted the request.
 * Retries a few times and wakes the daemon via /api/tags first.
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 */
export async function pingOllamaKeepAlive(opts = {}) {
  if (!ollamaKeepAliveEnabled()) return false;
  const model = resolvePlannerOllamaModelTag();
  if (!model) return false;

  const base = normalizeOllamaLoopbackBase(resolveOllamaApiBase());
  const attempts = ollamaKeepAliveMaxAttempts();
  let lastErr = null;

  for (let i = 0; i < attempts; i++) {
    try {
      // Wake daemon (cheap) before generate — helps after sleep/idle.
      await pingOllamaTags({ signal: opts.signal });

      const url = `${base}/api/generate`;
      const body = {
        model,
        prompt: ".",
        stream: false,
        keep_alive: ollamaKeepAliveDuration(),
        options: { num_predict: 1 },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: opts.signal ?? AbortSignal.timeout(120_000),
      });
      if (res.ok) return true;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    if (i + 1 < attempts) {
      await sleep(500 * (i + 1));
    }
  }
  if (lastErr && opts.throwOnError) throw lastErr;
  return false;
}

let _timer = null;
let _inFlight = false;
/** When >0, skip keep-alive pings so chat/orchestrate owns the Ollama slot. */
let _orchestrateBusy = 0;

export function beginOrchestrateOllamaBusy() {
  _orchestrateBusy += 1;
}

export function endOrchestrateOllamaBusy() {
  _orchestrateBusy = Math.max(0, _orchestrateBusy - 1);
}

/** Start warmup + interval keep-alive (no-op when disabled or planner is not Ollama). */
export function startOllamaKeepAliveLoop() {
  if (_timer) return;
  if (!ollamaKeepAliveEnabled()) return;
  const model = resolvePlannerOllamaModelTag();
  if (!model) {
    console.error(
      "[agentic-orchestration-web] Ollama keep-alive skipped (AGENTIC_PLANNER_MODEL is not ollama/...)",
    );
    return;
  }

  const intervalMs = ollamaKeepAliveIntervalMs();
  const base = normalizeOllamaLoopbackBase(resolveOllamaApiBase());
  console.error(
    `[agentic-orchestration-web] Ollama keep-alive: model=${model} base=${base} interval_ms=${intervalMs}`,
  );

  const tick = async () => {
    if (_inFlight || _orchestrateBusy > 0) return;
    _inFlight = true;
    try {
      const ok = await pingOllamaKeepAlive();
      if (!ok) {
        console.error("[agentic-orchestration-web] Ollama keep-alive ping failed");
      }
    } catch (err) {
      console.error(
        `[agentic-orchestration-web] Ollama keep-alive error: ${err instanceof Error ? err.message : err}`,
      );
    } finally {
      _inFlight = false;
    }
  };

  tick();
  _timer = setInterval(tick, intervalMs);
  if (typeof _timer.unref === "function") _timer.unref();
}

export function stopOllamaKeepAliveLoop() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}
