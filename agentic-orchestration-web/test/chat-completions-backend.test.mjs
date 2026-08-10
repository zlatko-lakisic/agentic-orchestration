/**
 * Unit tests for chat completions backend routing (HA / OpenAI SDK vs orchestrate).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  looksLikeOpenAiCloudModel,
  looksLikeOllamaModel,
  modelForOllamaUpstream,
  resolveChatCompletionsBackend,
  createConcurrencyGate,
  ollamaProxyMaxConcurrent,
} from "../lib/chat-completions-backend.mjs";

test("looksLikeOpenAiCloudModel matches gpt / o-series", () => {
  assert.equal(looksLikeOpenAiCloudModel("gpt-4o-mini"), true);
  assert.equal(looksLikeOpenAiCloudModel("openai/gpt-4o"), true);
  assert.equal(looksLikeOpenAiCloudModel("o1-mini"), true);
  assert.equal(looksLikeOpenAiCloudModel("chatgpt-4o-latest"), true);
  assert.equal(looksLikeOpenAiCloudModel("qwen2.5:14b-instruct"), false);
});

test("looksLikeOllamaModel matches tags and families", () => {
  assert.equal(looksLikeOllamaModel("qwen2.5:14b-instruct"), true);
  assert.equal(looksLikeOllamaModel("ollama/llama3.2:3b"), true);
  assert.equal(looksLikeOllamaModel("llama3.2"), true);
  assert.equal(looksLikeOllamaModel("gpt-4o-mini"), false);
});

test("modelForOllamaUpstream strips ollama/ prefix", () => {
  assert.equal(modelForOllamaUpstream("ollama/qwen2.5:14b-instruct"), "qwen2.5:14b-instruct");
  assert.equal(modelForOllamaUpstream("qwen2.5:14b-instruct"), "qwen2.5:14b-instruct");
});

test("auto routes HA vision model to openai and watering to ollama", () => {
  const env = {};
  assert.equal(resolveChatCompletionsBackend("gpt-4o-mini", {}, env), "openai");
  assert.equal(resolveChatCompletionsBackend("qwen2.5:14b-instruct", {}, env), "ollama");
  assert.equal(resolveChatCompletionsBackend("some-custom-agent", {}, env), "orchestrate");
});

test("agentic.runMode dynamic forces orchestrate even for gpt models", () => {
  assert.equal(
    resolveChatCompletionsBackend("gpt-4o-mini", { runMode: "dynamic" }, {}),
    "orchestrate",
  );
  assert.equal(
    resolveChatCompletionsBackend("gpt-4o-mini", { orchestrate: true }, {}),
    "orchestrate",
  );
});

test("AGENTIC_CHAT_COMPLETIONS_BACKEND env overrides auto", () => {
  assert.equal(
    resolveChatCompletionsBackend("gpt-4o-mini", {}, { AGENTIC_CHAT_COMPLETIONS_BACKEND: "orchestrate" }),
    "orchestrate",
  );
  assert.equal(
    resolveChatCompletionsBackend("custom", {}, { AGENTIC_CHAT_COMPLETIONS_BACKEND: "openai" }),
    "openai",
  );
});

test("agentic.backend overrides model heuristics", () => {
  assert.equal(resolveChatCompletionsBackend("gpt-4o-mini", { backend: "ollama" }, {}), "ollama");
  assert.equal(
    resolveChatCompletionsBackend("qwen2.5:14b", { upstream: "openai" }, {}),
    "openai",
  );
});

test("createConcurrencyGate serializes beyond limit", async () => {
  const gate = createConcurrencyGate(1);
  let concurrent = 0;
  let maxSeen = 0;
  const jobs = Array.from({ length: 4 }, () =>
    gate.run(async () => {
      concurrent += 1;
      maxSeen = Math.max(maxSeen, concurrent);
      await new Promise((r) => setTimeout(r, 20));
      concurrent -= 1;
    }),
  );
  await Promise.all(jobs);
  assert.equal(maxSeen, 1);
});

test("ollamaProxyMaxConcurrent defaults and clamps", () => {
  assert.equal(ollamaProxyMaxConcurrent({}), 2);
  assert.equal(ollamaProxyMaxConcurrent({ AGENTIC_CHAT_COMPLETIONS_OLLAMA_MAX_CONCURRENT: "4" }), 4);
  assert.equal(ollamaProxyMaxConcurrent({ AGENTIC_CHAT_COMPLETIONS_OLLAMA_MAX_CONCURRENT: "0" }), 2);
});
