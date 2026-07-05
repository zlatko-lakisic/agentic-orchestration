/**
 * Host CPU / memory sampling for the web UI (reads /proc on Linux when available).
 * Set AGENTIC_HOST_METRICS_PROC_ROOT=/host/proc when the coordinator mounts the node /proc.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROC_ROOT = String(process.env.AGENTIC_HOST_METRICS_PROC_ROOT || "/proc").trim() || "/proc";
const HOST_SCOPE = PROC_ROOT !== "/proc";
const JTOP_METRICS_PATH = String(process.env.AGENTIC_JETSON_JTOP_METRICS_PATH || "").trim();

let _prevCpu = null;

function procFile(name) {
  return path.join(PROC_ROOT, name);
}

function readTextSync(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function sampleCpuFromProc() {
  const raw = readTextSync(procFile("stat"));
  const line = raw.split("\n").find((l) => l.startsWith("cpu "));
  if (!line) return null;
  const parts = line.trim().split(/\s+/).slice(1).map(Number);
  const idle = parts[3] + (parts[4] || 0);
  const total = parts.reduce((a, b) => a + b, 0);
  const sample = { idle, total };
  let percent = null;
  if (_prevCpu) {
    const dt = sample.total - _prevCpu.total;
    const di = sample.idle - _prevCpu.idle;
    percent = dt > 0 ? Math.round((1 - di / dt) * 1000) / 10 : 0;
  }
  _prevCpu = sample;
  return percent;
}

function sampleCpuFromOsCpus() {
  const cpus = os.cpus();
  if (!cpus.length) return null;
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const v of Object.values(cpu.times)) {
      total += v;
    }
    idle += cpu.times.idle;
  }
  const sample = { idle, total };
  let percent = null;
  if (_prevCpu) {
    const dt = sample.total - _prevCpu.total;
    const di = sample.idle - _prevCpu.idle;
    percent = dt > 0 ? Math.round((1 - di / dt) * 1000) / 10 : 0;
  }
  _prevCpu = sample;
  return percent;
}

function sampleCpuPercent() {
  if (process.platform === "linux") {
    try {
      return sampleCpuFromProc();
    } catch {
      /* fall through */
    }
  }
  return sampleCpuFromOsCpus();
}

function sampleMemory() {
  const totalBytes = os.totalmem();
  let availableBytes = os.freemem();
  if (process.platform === "linux") {
    try {
      const meminfo = readTextSync(procFile("meminfo"));
      const m = meminfo.match(/^MemAvailable:\s+(\d+)/m);
      if (m) availableBytes = Number(m[1]) * 1024;
    } catch {
      /* ignore */
    }
  }
  const usedBytes = Math.max(0, totalBytes - availableBytes);
  const usedPercent =
    totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0;
  return {
    totalBytes,
    usedBytes,
    availableBytes,
    usedPercent,
  };
}

function metricsScope() {
  if (JTOP_METRICS_PATH) return "jetson";
  if (HOST_SCOPE) return "host";
  if (process.platform === "linux" && fs.existsSync("/.dockerenv")) return "container";
  return "runtime";
}

function readJetsonJtopSnapshot() {
  if (!JTOP_METRICS_PATH) return null;
  try {
    const raw = JSON.parse(readTextSync(JTOP_METRICS_PATH));
    if (!raw || typeof raw !== "object") return null;
    const ts = raw.ts ? Date.parse(String(raw.ts)) : NaN;
    const ageMs = Number.isFinite(ts) ? Date.now() - ts : null;
    return { ...raw, ageMs };
  } catch {
    return null;
  }
}

export function mergeJetsonIntoMetrics(base, jtop) {
  if (!jtop) return base;
  const gpu = jtop.gpu && typeof jtop.gpu === "object" ? jtop.gpu : {};
  const temp =
    jtop.temperature && typeof jtop.temperature === "object" ? jtop.temperature : {};
  const jetson = {
    source: "jtop",
    ageMs: jtop.ageMs ?? null,
    gpu: {
      percent: typeof gpu.percent === "number" ? gpu.percent : null,
      freqMhz: typeof gpu.freqMhz === "number" ? gpu.freqMhz : null,
    },
    temperature: temp,
    powerW: typeof jtop.powerW === "number" ? jtop.powerW : null,
    ramText: jtop.ramText || null,
  };
  const out = { ...base, jetson, scope: "jetson" };
  if (typeof jtop.cpu?.percent === "number" && jtop.cpu.percent >= 0) {
    out.cpu = { ...out.cpu, percent: jtop.cpu.percent, source: "jtop" };
  }
  return out;
}

/** @returns {Promise<Record<string, unknown>>} */
export async function sampleHostMetrics() {
  const cpuPercent = sampleCpuPercent();
  const memory = sampleMemory();
  const loadAvg = os.loadavg();
  const base = {
    ts: new Date().toISOString(),
    hostname: os.hostname(),
    platform: process.platform,
    arch: os.arch(),
    scope: metricsScope(),
    uptimeSec: Math.round(os.uptime()),
    loadAvg: loadAvg.map((n) => Math.round(n * 100) / 100),
    cpu: {
      percent: cpuPercent,
      cores: os.cpus().length,
    },
    memory,
  };
  return mergeJetsonIntoMetrics(base, readJetsonJtopSnapshot());
}
