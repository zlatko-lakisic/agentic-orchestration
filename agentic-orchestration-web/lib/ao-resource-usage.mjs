/**
 * AO memory footprint — how much of the host RAM / GPU VRAM this deployment owns,
 * split by application (process group) and by resident Ollama model.
 *
 * RAM comes from `/proc/<pid>/status` VmRSS for processes whose cmdline matches an AO
 * component. Set AGENTIC_HOST_METRICS_PROC_ROOT=/host/proc (same knob host-metrics.mjs
 * uses) so a containerized web process sees the whole node instead of just itself.
 *
 * VRAM comes from Ollama `/api/ps` (`size_vram`); the CPU-resident remainder of a
 * partially offloaded model (`size - size_vram`) is reported as that model's RAM, so
 * runner processes are never counted twice.
 */
import fs from "node:fs";
import path from "node:path";

const RSS_SOURCE = "proc-vmrss";

/** Applications AO can run, in match order (first hit wins). */
const APP_MATCHERS = [
  {
    id: "ollama-broker",
    label: "Ollama resource broker",
    test: (c) => c.includes("orchestration.ollama_resource_broker"),
  },
  {
    id: "engine",
    label: "Engine API daemon",
    test: (c) => c.includes("orchestration.serve"),
  },
  {
    id: "warm-pool",
    label: "Warm pool worker",
    test: (c) => c.includes("--warm-pool-worker") || c.includes("kubernetes_warm_pool"),
  },
  {
    id: "step-worker",
    label: "Step worker",
    test: (c) => c.includes("--execute-step") || c.includes("execute_step"),
  },
  {
    id: "delegation-broker",
    label: "Delegation broker",
    test: (c) => c.includes("--delegation-broker") || c.includes("delegation_broker"),
  },
  {
    id: "mcp-tunnel",
    label: "MCP tunnel",
    test: (c) => c.includes("mcp_tunnel"),
  },
  {
    id: "metrics-writer",
    label: "Host metrics writer",
    test: (c) => c.includes("host-metrics-writer") || c.includes("jtop-metrics-writer"),
  },
  {
    id: "coordinator",
    label: "Coordinator (CLI)",
    test: (c) => c.includes("main.py"),
  },
  {
    id: "web",
    label: "Web / chat UI",
    test: (c) => c.includes("server.mjs"),
  },
];

/**
 * Classify one process command line as an AO component.
 * @param {string} cmdline NUL- or space-separated argv
 * @returns {{ id: string, label: string, kind: "application"|"runner" }|null}
 */
export function classifyAoProcess(cmdline) {
  const c = String(cmdline || "")
    .replace(/\0/g, " ")
    .trim()
    .toLowerCase();
  if (!c) return null;
  // Ollama model runners are attributed per model via /api/ps, not per process.
  if (/(^|[\s/])ollama[\s/]/.test(c) || c.includes("ollama serve")) {
    if (c.includes("runner") || c.includes("--model")) {
      return { id: "ollama-runner", label: "Ollama model runner", kind: "runner" };
    }
    if (c.includes("serve") || c.includes("ollama_llama_server")) {
      return { id: "ollama", label: "Ollama daemon", kind: "application" };
    }
  }
  for (const m of APP_MATCHERS) {
    if (m.test(c)) return { id: m.id, label: m.label, kind: "application" };
  }
  return null;
}

/**
 * Resident set size in bytes from `/proc/<pid>/status`.
 * @param {string} statusText
 * @returns {number|null}
 */
export function parseVmRssBytes(statusText) {
  const m = String(statusText || "").match(/^VmRSS:\s+(\d+)\s*kB/m);
  if (!m) return null;
  const kb = Number(m[1]);
  return Number.isFinite(kb) ? kb * 1024 : null;
}

function procRoot(env = process.env) {
  return String(env.AGENTIC_HOST_METRICS_PROC_ROOT || "/proc").trim() || "/proc";
}

/**
 * Scan a proc filesystem for AO processes.
 * @returns {{ processes: Array<{pid:number, app:string, label:string, kind:string, ramBytes:number}>, ok: boolean }}
 */
export function readAoProcesses({ root = null, env = process.env } = {}) {
  const dir = root || procRoot(env);
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return { processes: [], ok: false };
  }
  const processes = [];
  for (const name of names) {
    if (!/^\d+$/.test(name)) continue;
    let cmdline = "";
    try {
      cmdline = fs.readFileSync(path.join(dir, name, "cmdline"), "utf8");
    } catch {
      continue;
    }
    const hit = classifyAoProcess(cmdline);
    if (!hit) continue;
    let ramBytes = null;
    try {
      ramBytes = parseVmRssBytes(fs.readFileSync(path.join(dir, name, "status"), "utf8"));
    } catch {
      ramBytes = null;
    }
    processes.push({
      pid: Number(name),
      app: hit.id,
      label: hit.label,
      kind: hit.kind,
      ramBytes: ramBytes ?? 0,
    });
  }
  return { processes, ok: true };
}

function bytesFrom(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Strip the implicit `:latest` so tags line up with catalog model names. */
export function normalizeModelTag(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s.endsWith(":latest") ? s.slice(0, -":latest".length) : s;
}

/**
 * Normalize Ollama `/api/ps` rows into per-model RAM / VRAM.
 * `size_vram` is the offloaded part; the remainder of `size` stays in host RAM.
 * @param {unknown} raw parsed /api/ps body
 */
export function normalizeLoadedModels(raw) {
  const models =
    raw && typeof raw === "object" && Array.isArray(/** @type {any} */ (raw).models)
      ? /** @type {any} */ (raw).models
      : [];
  const out = [];
  for (const item of models) {
    if (!item || typeof item !== "object") continue;
    const name = normalizeModelTag(item.name || item.model || "");
    if (!name) continue;
    const total = bytesFrom(item.size);
    const vram = bytesFrom(item.size_vram);
    out.push({
      model: name,
      vramBytes: vram,
      ramBytes: Math.max(0, total - vram),
      totalBytes: total || vram,
      expiresAt: item.expires_at ? String(item.expires_at) : null,
    });
  }
  return out;
}

/**
 * Map model tag → agent provider ids that declare it.
 * @param {Array<{id?: string, model?: string|null}>} agents catalog entries
 */
export function agentsByModel(agents) {
  const map = new Map();
  for (const a of agents || []) {
    const model = normalizeModelTag(a?.model);
    const id = String(a?.id || "").trim();
    if (!model || !id) continue;
    const key = model.toLowerCase();
    if (!map.has(key)) map.set(key, []);
    const list = map.get(key);
    if (!list.includes(id)) list.push(id);
  }
  return map;
}

function percentOf(part, whole) {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

const GIB = 1024 ** 3;

/**
 * Fold processes + resident models into the Admin payload.
 *
 * Ollama runner RSS is dropped when `/api/ps` answered, because the model rows already
 * carry the CPU-resident share; without model data the runners are kept as one row so
 * the total stays honest.
 */
export function buildAoResourceUsage({
  processes = [],
  models = [],
  agents = [],
  memory = null,
  gpu = null,
  scope = "runtime",
  sources = {},
  activeModels = [],
  ts = new Date().toISOString(),
} = {}) {
  const haveModels = models.length > 0 || sources.models === "ollama";
  const byApp = new Map();
  let runnerRamBytes = 0;
  let runnerCount = 0;
  for (const p of processes) {
    if (p.kind === "runner") {
      runnerRamBytes += bytesFrom(p.ramBytes);
      runnerCount += 1;
      continue;
    }
    const prev = byApp.get(p.app) || {
      id: p.app,
      label: p.label,
      kind: "application",
      ramBytes: 0,
      vramBytes: 0,
      processes: 0,
    };
    prev.ramBytes += bytesFrom(p.ramBytes);
    prev.processes += 1;
    byApp.set(p.app, prev);
  }
  if (runnerCount > 0 && !haveModels) {
    byApp.set("ollama-runner", {
      id: "ollama-runner",
      label: "Ollama model runners",
      kind: "application",
      ramBytes: runnerRamBytes,
      vramBytes: 0,
      processes: runnerCount,
    });
  }

  const agentMap = agentsByModel(agents);
  const active = new Set(
    (activeModels || []).map((m) => normalizeModelTag(m).toLowerCase()),
  );
  const modelRows = models
    .map((m) => ({
      id: `model:${m.model}`,
      label: m.model,
      kind: "model",
      ramBytes: bytesFrom(m.ramBytes),
      vramBytes: bytesFrom(m.vramBytes),
      agents: agentMap.get(m.model.toLowerCase()) || [],
      active: active.has(m.model.toLowerCase()),
      expiresAt: m.expiresAt || null,
    }))
    .sort((a, b) => b.vramBytes + b.ramBytes - (a.vramBytes + a.ramBytes));

  const applications = [...byApp.values()].sort((a, b) => b.ramBytes - a.ramBytes);

  const aoRamBytes =
    applications.reduce((sum, a) => sum + a.ramBytes, 0) +
    modelRows.reduce((sum, m) => sum + m.ramBytes, 0);
  const aoVramBytes = modelRows.reduce((sum, m) => sum + m.vramBytes, 0);

  const hostRamTotal = bytesFrom(memory?.totalBytes);
  const hostRamUsed = bytesFrom(memory?.usedBytes);
  const vramTotalGb = Number.isFinite(Number(gpu?.vramTotalGb))
    ? Number(gpu.vramTotalGb)
    : null;
  const vramUsedGb = Number.isFinite(Number(gpu?.vramUsedGb))
    ? Number(gpu.vramUsedGb)
    : null;

  return {
    ts,
    scope,
    sources: {
      ram: sources.ram || RSS_SOURCE,
      models: sources.models || "none",
      ...(sources.reason ? { reason: sources.reason } : {}),
    },
    host: {
      ramTotalBytes: hostRamTotal || null,
      ramUsedBytes: hostRamUsed || null,
      vramTotalGb,
      vramUsedGb,
    },
    ao: {
      ramBytes: aoRamBytes,
      ramPercentOfHost: percentOf(aoRamBytes, hostRamTotal),
      ramPercentOfUsed: percentOf(aoRamBytes, hostRamUsed),
      vramBytes: aoVramBytes,
      vramGb: Math.round((aoVramBytes / GIB) * 100) / 100,
      vramPercentOfTotal:
        vramTotalGb != null ? percentOf(aoVramBytes / GIB, vramTotalGb) : null,
      processes: processes.length,
      models: modelRows.length,
    },
    applications,
    models: modelRows,
  };
}

/**
 * Sample the live AO footprint.
 *
 * @param {object} ctx
 * @param {string} ctx.ollamaBase base URL of the Ollama broker/daemon
 * @param {(url: string, timeoutMs?: number) => Promise<{ok: boolean, json?: unknown}>} ctx.fetchJson
 * @param {() => {scope?: string, memory?: unknown, gpu?: unknown}} ctx.sampleHost memory + GPU totals
 * @param {Array<{id?: string, model?: string|null}>} [ctx.agents]
 */
export async function sampleAoResources({
  ollamaBase = null,
  fetchJson = null,
  sampleHost = null,
  agents = [],
  env = process.env,
} = {}) {
  const host = sampleHost ? await sampleHost() : {};
  const { processes, ok } = readAoProcesses({ env });
  let models = [];
  let activeModels = [];
  let modelSource = "none";
  if (ollamaBase && fetchJson) {
    const ps = await fetchJson(`${ollamaBase}/api/ps`, 2500);
    if (ps?.ok && ps.json) {
      models = normalizeLoadedModels(ps.json);
      modelSource = "ollama";
    }
    const status = await fetchJson(
      `${ollamaBase}/api/agentic/resource-status`,
      2000,
    );
    const activeMap = status?.ok && status.json ? status.json.active : null;
    if (activeMap && typeof activeMap === "object") {
      activeModels = Object.keys(activeMap);
    }
  }
  return buildAoResourceUsage({
    processes,
    models,
    activeModels,
    agents,
    memory: host?.memory || null,
    gpu: host?.gpu || null,
    scope: String(host?.scope || "runtime"),
    sources: {
      ram: ok ? RSS_SOURCE : "unavailable",
      models: modelSource,
      ...(ok
        ? {}
        : { reason: "proc filesystem not readable — set AGENTIC_HOST_METRICS_PROC_ROOT" }),
    },
  });
}
