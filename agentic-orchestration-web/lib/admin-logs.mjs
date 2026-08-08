/**
 * Admin live log bus + optional kubectl tails for edge pods.
 * WS protocol:
 *   client → { type: "admin_logs_subscribe", sources?: string[] }
 *   client → { type: "admin_logs_unsubscribe" }
 *   server → { type: "admin_log", source, level, ts, line }
 *   server → { type: "admin_logs_sources", sources: string[] }
 */
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";

const MAX_BUFFER = 500;
const SOURCES = ["web", "coordinator", "engine", "warm-pool", "broker"];

/** @type {{ source: string, level: string, ts: string, line: string }[]} */
const ring = [];
const bus = new EventEmitter();
bus.setMaxListeners(50);

/** @type {Map<string, import('node:child_process').ChildProcess>} */
const kubectlTails = new Map();

let kubectlProbeDone = false;
let kubectlOk = false;

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

  ensureKubectlTails();
  adminLog("web", "Admin log stream subscribed", "info");
}

/** @param {import('ws').WebSocket} ws */
export function stopAdminLogsPush(ws) {
  if (ws._adminLogListener) {
    bus.off("log", ws._adminLogListener);
    ws._adminLogListener = null;
  }
  ws._adminLogSources = null;
}

function ensureKubectlTails() {
  if (kubectlProbeDone && !kubectlOk) return;
  if (!kubectlProbeDone) {
    kubectlProbeDone = true;
    try {
      const probe = spawn("kubectl", ["version", "--client", "--output=json"], {
        stdio: ["ignore", "pipe", "ignore"],
      });
      probe.on("close", (code) => {
        kubectlOk = code === 0;
        if (kubectlOk) startAllKubectlTails();
      });
      probe.on("error", () => {
        kubectlOk = false;
      });
      return;
    } catch {
      kubectlOk = false;
      return;
    }
  }
  if (kubectlOk) startAllKubectlTails();
}

function startAllKubectlTails() {
  const specs = [
    { source: "coordinator", args: ["logs", "-l", "app=agentic-coordinator", "-c", "web", "--tail=80", "-f", "--prefix=false"] },
    { source: "engine", args: ["logs", "-l", "app=agentic-engine", "--tail=80", "-f", "--prefix=false"] },
    { source: "warm-pool", args: ["logs", "-l", "app=agentic-warm-pool", "--tail=40", "-f", "--prefix=false"] },
    { source: "broker", args: ["logs", "-l", "app=agentic-delegation-broker", "--tail=40", "-f", "--prefix=false"] },
  ];
  for (const spec of specs) {
    if (kubectlTails.has(spec.source)) continue;
    startKubectlTail(spec.source, spec.args);
  }
}

function startKubectlTail(source, args) {
  try {
    const child = spawn("kubectl", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    kubectlTails.set(source, child);
    let buf = "";
    const flush = (chunk, level) => {
      buf += String(chunk || "");
      const parts = buf.split("\n");
      buf = parts.pop() || "";
      for (const line of parts) adminLog(source, line, level);
    };
    child.stdout?.on("data", (d) => flush(d, "info"));
    child.stderr?.on("data", (d) => flush(d, "warn"));
    child.on("close", () => {
      kubectlTails.delete(source);
      // Retry later if the stream dies (pod restart).
      setTimeout(() => {
        if (kubectlOk && !kubectlTails.has(source)) startKubectlTail(source, args);
      }, 15000);
    });
    child.on("error", () => {
      kubectlTails.delete(source);
    });
    if (typeof child.unref === "function") child.unref();
  } catch {
    /* ignore */
  }
}

// Seed a couple of lines so the UI is never empty on first open.
adminLog("web", "Admin log bus ready", "info");
