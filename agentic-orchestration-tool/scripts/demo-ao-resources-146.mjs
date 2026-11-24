/**
 * Pre-deploy demo for #146: fetch live engine residents (via mirrord network)
 * and print the Admin ao_resources-shaped merge without deploying web.
 *
 *   mirrord exec -f .mirrord/ada-engine-outgoing.json -- node scripts/demo-ao-resources-146.mjs
 */
import {
  buildAoResourceUsage,
  normalizeGpuResidents,
  normalizeLoadedModels,
} from "../../agentic-orchestration-web/lib/ao-resource-usage.mjs";

const GIB = 1024 ** 3;

async function fetchJson(url, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(t);
  }
}

// Under mirrord outgoing, use in-cluster DNS (127.0.0.1 stays on the laptop).
const engine = (
  process.env.AGENTIC_DEMO_ENGINE ||
  "http://agentic-engine.agentic-orchestration.svc.cluster.local:8765"
).replace(/\/$/, "");
const ollama = (
  process.env.AGENTIC_DEMO_OLLAMA ||
  "http://agentic-ollama.agentic-orchestration.svc.cluster.local:11434"
).replace(/\/$/, "");

const [residentsResp, healthResp, psResp] = await Promise.all([
  fetchJson(`${engine}/api/v1/gpu-residents`),
  fetchJson(`${engine}/health`),
  fetchJson(`${ollama}/api/ps`).catch(() => ({ ok: false })),
]);

const vg =
  healthResp?.ok && healthResp.json?.videoGeneration
    ? healthResp.json.videoGeneration
    : null;
const residents = residentsResp?.ok
  ? normalizeGpuResidents(residentsResp.json, vg)
  : [];
const models = psResp?.ok ? normalizeLoadedModels(psResp.json) : [];

const payload = buildAoResourceUsage({
  processes: [],
  models,
  residents,
  videoGeneration: vg,
  gpu: { vramTotalGb: 20, vramUsedGb: null },
  sources: {
    models: [
      models.length ? "ollama" : null,
      residents.length ? "gpu-residents" : null,
    ]
      .filter(Boolean)
      .join("+") || "none",
  },
});

const rows = (payload.models || []).map((r) => ({
  id: r.id,
  kind: r.kind,
  state: r.state || (r.active ? "active" : undefined),
  ready: r.ready,
  vramGiB: Math.round((r.vramBytes / GIB) * 1000) / 1000,
  ramGiB: Math.round((r.ramBytes / GIB) * 1000) / 1000,
  error: r.error || undefined,
}));

console.log(
  JSON.stringify(
    {
      engine,
      residentsHttp: residentsResp?.status,
      healthHttp: healthResp?.status,
      sources: payload.sources,
      videoGeneration: payload.videoGeneration || vg,
      aoVramGiB: payload.ao?.vramGb,
      rows,
    },
    null,
    2,
  ),
);
