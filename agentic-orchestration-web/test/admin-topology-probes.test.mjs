/**
 * Unit tests for Admin Topology live probes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  ollamaBaseUrl,
  probeCatalogLoad,
  probeEngineEndpoint,
  probeExecutionBackend,
  probeModelBackends,
  probeOllama,
  probePlannerFromEngine,
  probeSpeechStt,
  probeStorageGpu,
  sealTopologyGraphStatuses,
  speechSttCandidates,
  speechSttUrl,
  speechTtsCandidates,
  speechTtsUrl,
  visibleTopologyStatus,
} from "../lib/admin-topology-probes.mjs";

test("ollamaBaseUrl normalizes host without scheme", () => {
  const prevA = process.env.OLLAMA_API_BASE;
  const prevH = process.env.OLLAMA_HOST;
  delete process.env.OLLAMA_API_BASE;
  process.env.OLLAMA_HOST = "127.0.0.1:11434";
  assert.equal(ollamaBaseUrl(), "http://127.0.0.1:11434");
  process.env.OLLAMA_API_BASE = "http://host.k3s.internal:11434/";
  assert.equal(ollamaBaseUrl(), "http://host.k3s.internal:11434");
  if (prevA == null) delete process.env.OLLAMA_API_BASE;
  else process.env.OLLAMA_API_BASE = prevA;
  if (prevH == null) delete process.env.OLLAMA_HOST;
  else process.env.OLLAMA_HOST = prevH;
});

test("speech candidates prefer advertise URL first", () => {
  const prev = {
    aS: process.env.AGENTIC_SPEECH_ADVERTISE_STT_URL,
    aT: process.env.AGENTIC_SPEECH_ADVERTISE_TTS_URL,
    s: process.env.AGENTIC_SPEECH_STT_URL,
    t: process.env.AGENTIC_SPEECH_TTS_URL,
  };
  process.env.AGENTIC_SPEECH_ADVERTISE_STT_URL = "http://10.0.10.16:8090";
  process.env.AGENTIC_SPEECH_ADVERTISE_TTS_URL = "http://10.0.10.16:8091";
  process.env.AGENTIC_SPEECH_STT_URL = "http://127.0.0.1:8090";
  process.env.AGENTIC_SPEECH_TTS_URL = "http://127.0.0.1:8091";
  assert.equal(speechSttCandidates()[0], "http://10.0.10.16:8090");
  assert.equal(speechTtsCandidates()[0], "http://10.0.10.16:8091");
  assert.ok(speechSttCandidates().includes("http://127.0.0.1:8090"));
  assert.equal(speechSttUrl(), "http://10.0.10.16:8090");
  assert.equal(speechTtsUrl(), "http://10.0.10.16:8091");
  for (const [k, v] of Object.entries({
    AGENTIC_SPEECH_ADVERTISE_STT_URL: prev.aS,
    AGENTIC_SPEECH_ADVERTISE_TTS_URL: prev.aT,
    AGENTIC_SPEECH_STT_URL: prev.s,
    AGENTIC_SPEECH_TTS_URL: prev.t,
  })) {
    if (v == null) delete process.env[k];
    else process.env[k] = v;
  }
});

test("probeSpeechStt tries advertise before failing on loopback", async () => {
  process.env.AGENTIC_SPEECH_ENABLED = "1";
  process.env.AGENTIC_SPEECH_ADVERTISE_STT_URL = "http://10.0.10.16:8090";
  process.env.AGENTIC_SPEECH_STT_URL = "http://127.0.0.1:8090";
  const seen = [];
  const r = await probeSpeechStt(async (url) => {
    seen.push(url);
    if (url.includes("10.0.10.16")) {
      return { ok: true, status: 200, json: { ok: true } };
    }
    return { ok: false, error: "ECONNREFUSED" };
  });
  assert.equal(r.ok, true);
  assert.equal(r.base, "http://10.0.10.16:8090");
  assert.ok(seen[0].includes("10.0.10.16"));
});

test("probeOllama skips when unset", async () => {
  const prevA = process.env.OLLAMA_API_BASE;
  const prevH = process.env.OLLAMA_HOST;
  delete process.env.OLLAMA_API_BASE;
  delete process.env.OLLAMA_HOST;
  const r = await probeOllama(async () => ({ ok: true, json: { models: [] } }));
  assert.equal(r.configured, false);
  assert.equal(r.skipped, true);
  if (prevA == null) delete process.env.OLLAMA_API_BASE;
  else process.env.OLLAMA_API_BASE = prevA;
  if (prevH == null) delete process.env.OLLAMA_HOST;
  else process.env.OLLAMA_HOST = prevH;
});

test("probeOllama instruments when configured", async () => {
  const prevA = process.env.OLLAMA_API_BASE;
  process.env.OLLAMA_API_BASE = "http://ollama.test:11434";
  const r = await probeOllama(async (url) => {
    assert.match(url, /\/api\/tags$/);
    return { ok: true, status: 200, json: { models: [{ name: "a" }, { name: "b" }] } };
  });
  assert.equal(r.configured, true);
  assert.equal(r.ok, true);
  assert.equal(r.modelCount, 2);
  if (prevA == null) delete process.env.OLLAMA_API_BASE;
  else process.env.OLLAMA_API_BASE = prevA;
});

test("probeCatalogLoad reports healthy with entries", () => {
  const r = probeCatalogLoad({ entries: [{ id: "a" }, { id: "b" }] }, "agent");
  assert.equal(r.instrumented, true);
  assert.equal(r.status, "healthy");
  assert.equal(r.count, 2);
});

test("probePlannerFromEngine uses warm catalogs", () => {
  const ok = probePlannerFromEngine({
    ok: true,
    json: { catalogs: { ok: true, agentProviders: 12 } },
  });
  assert.equal(ok.status, "healthy");
  assert.equal(ok.instrumented, true);
  const bad = probePlannerFromEngine({ ok: false });
  assert.equal(bad.status, "failed");
});

test("probeModelBackends never instruments remote-only as remote health", () => {
  const remoteOnly = probeModelBackends({
    ollama: { configured: false },
    remoteConfigured: true,
  });
  assert.equal(remoteOnly.instrumented, true);
  assert.equal(remoteOnly.status, "healthy");
  assert.match(remoteOnly.reason, /remote keys/);
});

test("probeExecutionBackend kubernetes needs cluster", () => {
  const r = probeExecutionBackend({
    backend: "kubernetes",
    engineOk: true,
    k8sReachable: false,
    workerStatus: "unknown",
    workerPods: 0,
  });
  assert.equal(r.status, "failed");
  const inproc = probeExecutionBackend({
    backend: "inprocess",
    engineOk: true,
    k8sReachable: false,
  });
  assert.equal(inproc.status, "healthy");
});

test("probeStorageGpu uses engine hardware", () => {
  const r = probeStorageGpu({
    ok: true,
    json: {
      hardware: {
        gpu: { name: "NVIDIA RTX", vramFreeGb: 4.5 },
        vramGbAvailable: 4.5,
      },
    },
  });
  assert.equal(r.instrumented, true);
  assert.equal(r.status, "healthy");
});

test("probeEngineEndpoint derives from engine probe", () => {
  const on = probeEngineEndpoint({
    engineOk: true,
    deployed: true,
    label: "session_overlay",
  });
  assert.equal(on.instrumented, true);
  assert.equal(on.status, "healthy");
  const off = probeEngineEndpoint({
    engineOk: true,
    deployed: false,
    label: "hello.speech",
  });
  assert.equal(off.instrumented, false);
  assert.equal(off.sublabel, "off");
  assert.equal(off.status, "offline");
});

test("visibleTopologyStatus never returns unknown", () => {
  assert.equal(visibleTopologyStatus("unknown", true), "healthy");
  assert.equal(visibleTopologyStatus("unknown", false), "offline");
  assert.equal(visibleTopologyStatus("", true), "healthy");
  assert.equal(visibleTopologyStatus("healthy"), "healthy");
  assert.equal(visibleTopologyStatus("failed"), "failed");
  assert.equal(visibleTopologyStatus("degraded"), "degraded");
  assert.equal(visibleTopologyStatus("offline"), "offline");
});

test("seal remaps idle SessionBridge unknown to healthy", () => {
  const g = sealTopologyGraphStatuses({
    nodes: [
      { id: "reach/session-bridge", status: "unknown", deployed: true },
      { id: "reach/overlay-packer", status: "unknown", deployed: false },
    ],
    edges: [{ id: "e1", status: "unknown", instrumented: false }],
  });
  assert.equal(g.nodes[0].status, "healthy");
  assert.equal(g.nodes[1].status, "offline");
  assert.equal(g.edges[0].status, "idle");
  for (const n of g.nodes) {
    assert.notEqual(n.status, "unknown");
  }
});
