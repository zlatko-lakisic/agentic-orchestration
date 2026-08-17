/**
 * Host CPU / memory / GPU sampling for the web UI.
 * Set AGENTIC_HOST_METRICS_PROC_ROOT=/host/proc when the coordinator mounts the node /proc.
 * GPU (shared dir /host/agentic-metrics): nvidia-metrics.json, jtop-metrics.json, amd-metrics.json.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROC_ROOT = String(process.env.AGENTIC_HOST_METRICS_PROC_ROOT || "/proc").trim() || "/proc";
const HOST_SCOPE = PROC_ROOT !== "/proc";
const JTOP_METRICS_PATH = String(process.env.AGENTIC_JETSON_JTOP_METRICS_PATH || "").trim();
const HOST_SNAPSHOT_MAX_AGE_MS = 15000;

let _prevCpu = null;

function procFile(name) {
  return path.join(PROC_ROOT, name);
}

function readTextSync(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function metricsDirHint() {
  if (JTOP_METRICS_PATH) return path.dirname(JTOP_METRICS_PATH);
  const nvidia = String(process.env.AGENTIC_NVIDIA_HOST_METRICS_PATH || "").trim();
  if (nvidia) return path.dirname(nvidia);
  const amd = String(process.env.AGENTIC_AMD_HOST_METRICS_PATH || "").trim();
  if (amd) return path.dirname(amd);
  return "";
}

function nvidiaHostMetricsPath() {
  const explicit = String(process.env.AGENTIC_NVIDIA_HOST_METRICS_PATH || "").trim();
  if (explicit) return explicit;
  const dir = metricsDirHint();
  return dir ? path.join(dir, "nvidia-metrics.json") : "";
}

function amdHostMetricsPath() {
  const explicit = String(process.env.AGENTIC_AMD_HOST_METRICS_PATH || "").trim();
  if (explicit) return explicit;
  const dir = metricsDirHint();
  return dir ? path.join(dir, "amd-metrics.json") : "";
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

function cpuModel() {
  try {
    const cpus = os.cpus();
    const model = String(cpus[0]?.model || "").trim();
    return model || null;
  } catch {
    return null;
  }
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

function metricsScope(hasJetson, hasHostGpu) {
  if (hasJetson) return "jetson";
  if (hasHostGpu || HOST_SCOPE) return "host";
  if (process.platform === "linux" && fs.existsSync("/.dockerenv")) return "container";
  return "runtime";
}

function readJsonSnapshot(filePath, maxAgeMs = null) {
  if (!filePath) return null;
  try {
    const raw = JSON.parse(readTextSync(filePath));
    if (!raw || typeof raw !== "object") return null;
    const ts = raw.ts ? Date.parse(String(raw.ts)) : NaN;
    const ageMs = Number.isFinite(ts) ? Date.now() - ts : null;
    if (maxAgeMs != null && ageMs != null && ageMs > maxAgeMs) return null;
    return { ...raw, ageMs };
  } catch {
    return null;
  }
}

function readJetsonJtopSnapshot() {
  return readJsonSnapshot(JTOP_METRICS_PATH);
}

function asTempC(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= -100 || n >= 200) return null;
  return Math.round(n * 10) / 10;
}

function tempFromMap(temps, preferred) {
  if (!temps || typeof temps !== "object") return null;
  const lowered = Object.fromEntries(
    Object.entries(temps).map(([k, v]) => [String(k).toLowerCase(), v]),
  );
  for (const key of preferred) {
    const raw = lowered[String(key).toLowerCase()];
    const hit = asTempC(raw);
    if (hit != null) return hit;
    if (raw && typeof raw === "object") {
      const nested = asTempC(raw.temp ?? raw.tempC);
      if (nested != null) return nested;
    }
  }
  for (const raw of Object.values(temps)) {
    const hit = asTempC(raw);
    if (hit != null) return hit;
    if (raw && typeof raw === "object") {
      const nested = asTempC(raw.temp ?? raw.tempC);
      if (nested != null) return nested;
    }
  }
  return null;
}

function sampleCpuTempC() {
  if (process.platform !== "linux") return null;
  // Read /sys/class/thermal when visible inside the process (often absent in k8s).
  try {
    const root = "/sys/class/thermal";
    if (!fs.existsSync(root)) return null;
    const preferred = [
      "x86_pkg_temp",
      "cpu-thermal",
      "cpu_thermal",
      "soc_thermal",
      "cpu-therm",
      "cpu",
    ];
    const byType = new Map();
    let first = null;
    for (const name of fs.readdirSync(root)) {
      if (!name.startsWith("thermal_zone")) continue;
      try {
        const ztype = fs
          .readFileSync(path.join(root, name, "type"), "utf8")
          .trim()
          .toLowerCase();
        const milli = Number(
          fs.readFileSync(path.join(root, name, "temp"), "utf8").trim().split(/\s+/)[0],
        );
        if (!Number.isFinite(milli)) continue;
        const celsius = milli / 1000;
        if (celsius <= 0 || celsius >= 150) continue;
        byType.set(ztype, celsius);
        if (first == null) first = celsius;
      } catch {
        /* skip zone */
      }
    }
    for (const pref of preferred) {
      if (byType.has(pref)) return Math.round(byType.get(pref) * 10) / 10;
      for (const [ztype, val] of byType) {
        if (ztype.includes(pref)) return Math.round(val * 10) / 10;
      }
    }
    return first == null ? null : Math.round(first * 10) / 10;
  } catch {
    return null;
  }
}

function normalizeGpuBlock(gpu, source, extras = {}) {
  if (!gpu || typeof gpu !== "object") return null;
  const percent = typeof gpu.percent === "number" ? gpu.percent : null;
  const vramTotalGb = typeof gpu.vramTotalGb === "number" ? gpu.vramTotalGb : null;
  const vramUsedGb = typeof gpu.vramUsedGb === "number" ? gpu.vramUsedGb : null;
  const vramFreeGb = typeof gpu.vramFreeGb === "number" ? gpu.vramFreeGb : null;
  let vramUsedPercent = null;
  if (vramTotalGb != null && vramTotalGb > 0 && vramUsedGb != null) {
    vramUsedPercent = Math.round((vramUsedGb / vramTotalGb) * 1000) / 10;
  }
  const name = gpu.name ? String(gpu.name).trim() : null;
  const tempC = asTempC(gpu.tempC);
  if (
    percent == null &&
    vramTotalGb == null &&
    vramUsedGb == null &&
    vramFreeGb == null &&
    !name
  ) {
    return null;
  }
  return {
    percent,
    vramTotalGb,
    vramUsedGb,
    vramFreeGb,
    vramUsedPercent,
    vramSource: gpu.vramSource || source || null,
    vendor: gpu.vendor || extras.vendor || null,
    backend: gpu.backend || extras.backend || source || null,
    name: name || null,
    freqMhz: typeof gpu.freqMhz === "number" ? gpu.freqMhz : null,
    tempC,
  };
}

function readHostFileSnapshot(filePath) {
  return readJsonSnapshot(filePath, HOST_SNAPSHOT_MAX_AGE_MS);
}

function readHostFileGpu(filePath, defaultSource, vendor, backend) {
  const snap = readHostFileSnapshot(filePath);
  if (!snap) return null;
  const gpu = snap.gpu && typeof snap.gpu === "object" ? snap.gpu : null;
  return normalizeGpuBlock(gpu, snap.source || defaultSource, { vendor, backend });
}

function cpuTempFromHostSnapshots() {
  for (const filePath of [
    nvidiaHostMetricsPath(),
    amdHostMetricsPath(),
    JTOP_METRICS_PATH,
  ]) {
    const snap = readHostFileSnapshot(filePath);
    if (!snap) continue;
    const cpu = snap.cpu && typeof snap.cpu === "object" ? snap.cpu : {};
    const direct = asTempC(cpu.tempC);
    if (direct != null) return direct;
    const temps =
      snap.temperature && typeof snap.temperature === "object" ? snap.temperature : null;
    const fromMap = tempFromMap(temps, ["cpu", "CPU", "tj", "Tj"]);
    if (fromMap != null) return fromMap;
  }
  return null;
}

function readNvidiaHostGpu() {
  return readHostFileGpu(
    nvidiaHostMetricsPath(),
    "nvidia-smi",
    "nvidia",
    "nvidia-host-file",
  );
}

function readAmdHostGpu() {
  return readHostFileGpu(
    amdHostMetricsPath(),
    "amdgpu-sysfs",
    "amd",
    "amd-host-file",
  );
}

export function mergeJetsonIntoMetrics(base, jtop) {
  if (!jtop) return base;
  const gpu = jtop.gpu && typeof jtop.gpu === "object" ? jtop.gpu : {};
  const temp =
    jtop.temperature && typeof jtop.temperature === "object" ? jtop.temperature : {};
  const source = jtop.source || "jtop";
  const jetson = {
    source,
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
  const cpuOut = { ...(out.cpu || {}) };
  if (typeof jtop.cpu?.percent === "number" && jtop.cpu.percent >= 0) {
    cpuOut.percent = jtop.cpu.percent;
    cpuOut.source = source;
  }
  const cpuTemp =
    asTempC(jtop.cpu?.tempC) || tempFromMap(temp, ["cpu", "CPU", "tj", "Tj"]);
  if (cpuTemp != null) cpuOut.tempC = cpuTemp;
  out.cpu = cpuOut;

  const gpuTemp =
    asTempC(gpu.tempC) || tempFromMap(temp, ["gpu", "GPU", "tj", "Tj", "cpu"]);

  // Promote jtop GPU into the portable top-level gpu block when host GPU file is absent.
  if (!out.gpu) {
    const gpuName =
      (typeof gpu.name === "string" && gpu.name.trim()) || "Jetson GPU";
    const fromJtop = normalizeGpuBlock(
      {
        percent: jetson.gpu.percent,
        freqMhz: jetson.gpu.freqMhz,
        name: gpuName,
        vramSource: source,
        vendor: "nvidia",
        backend: source,
        tempC: gpuTemp,
      },
      source,
      { vendor: "nvidia", backend: source },
    );
    if (fromJtop && jtop.ramText) {
      const m = String(jtop.ramText).match(
        /([\d.]+)\s*(?:[GM]i?B?)?\s*\/\s*([\d.]+)\s*(?:[GM]i?B?)?/i,
      );
      if (m) {
        const used = Number(m[1]);
        const total = Number(m[2]);
        if (Number.isFinite(used) && Number.isFinite(total) && total > 0) {
          fromJtop.vramUsedGb = used;
          fromJtop.vramTotalGb = total;
          fromJtop.vramFreeGb = Math.max(0, total - used);
          fromJtop.vramUsedPercent = Math.round((used / total) * 1000) / 10;
        }
      }
    }
    if (fromJtop) out.gpu = fromJtop;
  } else if (gpuTemp != null && out.gpu.tempC == null) {
    out.gpu = { ...out.gpu, tempC: gpuTemp };
  }
  return out;
}

/**
 * Memory + GPU only, without touching the CPU delta state.
 *
 * `sampleCpuPercent()` is a delta against `_prevCpu`, so callers outside the ~2s
 * push cadence (AO footprint feed) must not run it or the CPU series goes noisy.
 * @returns {{ scope: string, memory: Record<string, number>, gpu: Record<string, unknown>|null }}
 */
export function sampleMemoryAndGpu() {
  const nvidiaGpu = readNvidiaHostGpu();
  const amdGpu = nvidiaGpu ? null : readAmdHostGpu();
  const hostGpu = nvidiaGpu || amdGpu;
  const jtop = readJetsonJtopSnapshot();
  let gpu = hostGpu;
  if (!gpu && jtop) {
    gpu = mergeJetsonIntoMetrics({ gpu: null }, jtop).gpu || null;
  }
  return {
    scope: metricsScope(Boolean(jtop), Boolean(hostGpu)),
    memory: sampleMemory(),
    gpu: gpu || null,
  };
}

/** @returns {Promise<Record<string, unknown>>} */
export async function sampleHostMetrics() {
  const cpuPercent = sampleCpuPercent();
  const memory = sampleMemory();
  const loadAvg = os.loadavg();
  const nvidiaGpu = readNvidiaHostGpu();
  const amdGpu = nvidiaGpu ? null : readAmdHostGpu();
  const hostGpu = nvidiaGpu || amdGpu;
  const jtop = readJetsonJtopSnapshot();
  const cpuTemp = sampleCpuTempC() || cpuTempFromHostSnapshots();
  const cpu = {
    percent: cpuPercent,
    cores: os.cpus().length,
    model: cpuModel(),
  };
  if (cpuTemp != null) cpu.tempC = cpuTemp;
  const base = {
    ts: new Date().toISOString(),
    hostname: os.hostname(),
    platform: process.platform,
    arch: os.arch(),
    scope: metricsScope(Boolean(jtop), Boolean(hostGpu)),
    uptimeSec: Math.round(os.uptime()),
    loadAvg: loadAvg.map((n) => Math.round(n * 100) / 100),
    cpu,
    memory,
    gpu: hostGpu,
  };
  return mergeJetsonIntoMetrics(base, jtop);
}
