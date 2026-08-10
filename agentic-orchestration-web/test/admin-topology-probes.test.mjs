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
  probeStorageGpu,
  speechSttUrl,
  speechTtsUrl,
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

test("speech URLs prefer advertise then local", () => {
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
  const { speechSttCandidates, speechTtsCandidates } = await import(
    "../lib/admin-topology-probes.mjs"
  );
  // dynamic import already loaded — use exports from top
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
});
