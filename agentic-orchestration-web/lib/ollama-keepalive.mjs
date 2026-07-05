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

/** Ollama model tag for /api/generate (no ollama/ prefix). */
export function resolvePlannerOllamaModelTag() {
  const raw = String(process.env.AGENTIC_PLANNER_MODEL || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.startsWith("ollama/")) return raw.slice("ollama/".length).trim();
  if (lower.startsWith("ollama:")) return raw.slice("ollama:".length).trim();
  return "";
}

export function ollamaKeepAliveDuration() {
  const raw = String(process.env.AGENTIC_OLLAMA_KEEP_ALIVE || "-1").trim();
  return raw || "-1";
}

export function ollamaKeepAliveIntervalMs() {
  const raw = String(process.env.AGENTIC_OLLAMA_KEEPALIVE_INTERVAL_MS || "300000").trim();
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 30_000) return 300_000;
  return Math.min(n, 3_600_000);
}

/**
 * Load or refresh model residency. Returns true when Ollama accepted the request.
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 */
export async function pingOllamaKeepAlive(opts = {}) {
  if (!ollamaKeepAliveEnabled()) return false;
  const model = resolvePlannerOllamaModelTag();
  if (!model) return false;

  const base = resolveOllamaApiBase();
  const url = `${base}/api/generate`;
  const body = {
    model,
    prompt: " ",
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
  return res.ok;
}

let _timer = null;
let _inFlight = false;

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
  const base = resolveOllamaApiBase();
  console.error(
    `[agentic-orchestration-web] Ollama keep-alive: model=${model} base=${base} interval_ms=${intervalMs}`,
  );

  const tick = async () => {
    if (_inFlight) return;
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
