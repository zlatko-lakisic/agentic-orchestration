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
