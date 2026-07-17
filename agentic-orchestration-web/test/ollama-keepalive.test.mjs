import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const libUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "ollama-keepalive.mjs"),
);

test("resolvePlannerOllamaModelTag strips ollama prefix", async () => {
  const prev = process.env.AGENTIC_PLANNER_MODEL;
  process.env.AGENTIC_PLANNER_MODEL = "ollama/llama3.2:3b";
  const mod = await import(`${libUrl.href}?t=${Date.now()}`);
  assert.equal(mod.resolvePlannerOllamaModelTag(), "llama3.2:3b");
  if (prev == null) delete process.env.AGENTIC_PLANNER_MODEL;
  else process.env.AGENTIC_PLANNER_MODEL = prev;
});

test("resolveOllamaApiBase normalizes host", async () => {
  const prevA = process.env.OLLAMA_API_BASE;
  const prevH = process.env.OLLAMA_HOST;
  process.env.OLLAMA_API_BASE = "http://host.k3s.internal:11434/";
  delete process.env.OLLAMA_HOST;
  const mod = await import(`${libUrl.href}?t=${Date.now()}-base`);
  assert.equal(mod.resolveOllamaApiBase(), "http://host.k3s.internal:11434");
  if (prevA == null) delete process.env.OLLAMA_API_BASE;
  else process.env.OLLAMA_API_BASE = prevA;
  if (prevH == null) delete process.env.OLLAMA_HOST;
  else process.env.OLLAMA_HOST = prevH;
});

test("ollamaKeepAliveIntervalMs defaults to 60s", async () => {
  const prev = process.env.AGENTIC_OLLAMA_KEEPALIVE_INTERVAL_MS;
  delete process.env.AGENTIC_OLLAMA_KEEPALIVE_INTERVAL_MS;
  const mod = await import(`${libUrl.href}?t=${Date.now()}-iv`);
  assert.equal(mod.ollamaKeepAliveIntervalMs(), 60_000);
  if (prev == null) delete process.env.AGENTIC_OLLAMA_KEEPALIVE_INTERVAL_MS;
  else process.env.AGENTIC_OLLAMA_KEEPALIVE_INTERVAL_MS = prev;
});

test("normalizeOllamaLoopbackBase rewrites localhost", async () => {
  const mod = await import(`${libUrl.href}?t=${Date.now()}-lb`);
  assert.equal(mod.normalizeOllamaLoopbackBase("http://localhost:11434"), "http://127.0.0.1:11434");
});

test("pingOllamaKeepAlive posts generate with keep_alive=-1", async () => {
  const prevModel = process.env.AGENTIC_PLANNER_MODEL;
  const prevKeep = process.env.AGENTIC_OLLAMA_KEEPALIVE;
  const prevBase = process.env.OLLAMA_API_BASE;
  process.env.AGENTIC_PLANNER_MODEL = "ollama/llama3.2:1b";
  process.env.AGENTIC_OLLAMA_KEEPALIVE = "1";
  process.env.OLLAMA_API_BASE = "http://127.0.0.1:11434";

  const calls = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method || "GET", body: init?.body });
    if (url.endsWith("/api/tags")) {
      return new Response("{}", { status: 200 });
    }
    if (url.endsWith("/api/generate")) {
      return new Response("{}", { status: 200 });
    }
    return new Response("nope", { status: 404 });
  };

  try {
    const mod = await import(`${libUrl.href}?t=${Date.now()}-ping`);
    const ok = await mod.pingOllamaKeepAlive();
    assert.equal(ok, true);
    assert.ok(calls.some((c) => c.url.endsWith("/api/tags")));
    const gen = calls.find((c) => c.url.endsWith("/api/generate"));
    assert.ok(gen);
    const body = JSON.parse(String(gen.body));
    assert.equal(body.model, "llama3.2:1b");
    assert.equal(body.keep_alive, -1);
    assert.equal(body.stream, false);
  } finally {
    globalThis.fetch = origFetch;
    if (prevModel == null) delete process.env.AGENTIC_PLANNER_MODEL;
    else process.env.AGENTIC_PLANNER_MODEL = prevModel;
    if (prevKeep == null) delete process.env.AGENTIC_OLLAMA_KEEPALIVE;
    else process.env.AGENTIC_OLLAMA_KEEPALIVE = prevKeep;
    if (prevBase == null) delete process.env.OLLAMA_API_BASE;
    else process.env.OLLAMA_API_BASE = prevBase;
  }
});

test("ollamaKeepAliveDuration coerces numeric env to number", async () => {
  const prev = process.env.AGENTIC_OLLAMA_KEEP_ALIVE;
  process.env.AGENTIC_OLLAMA_KEEP_ALIVE = "-1";
  const mod = await import(`${libUrl.href}?t=${Date.now()}-dur`);
  assert.equal(mod.ollamaKeepAliveDuration(), -1);
  process.env.AGENTIC_OLLAMA_KEEP_ALIVE = "5m";
  const mod2 = await import(`${libUrl.href}?t=${Date.now()}-dur2`);
  assert.equal(mod2.ollamaKeepAliveDuration(), "5m");
  if (prev == null) delete process.env.AGENTIC_OLLAMA_KEEP_ALIVE;
  else process.env.AGENTIC_OLLAMA_KEEP_ALIVE = prev;
});
