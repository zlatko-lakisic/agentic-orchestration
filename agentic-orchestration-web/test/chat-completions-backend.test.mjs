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
  ollamaProxyFallbackModel,
  isOllamaModelNotFound,
  messagesHaveImageParts,
  modelSupportsImages,
} from "../lib/chat-completions-backend.mjs";

test("messagesHaveImageParts detects chat and responses image parts", () => {
  assert.equal(
    messagesHaveImageParts([
      { role: "user", content: [{ type: "text", text: "what is this" }] },
    ]),
    false,
  );
  assert.equal(
    messagesHaveImageParts([
      {
        role: "user",
        content: [
          { type: "text", text: "what is this" },
          { type: "image_url", image_url: { url: "data:image/jpeg;base64,AAAA" } },
        ],
      },
    ]),
    true,
  );
  assert.equal(
    messagesHaveImageParts([{ role: "user", content: [{ type: "input_image" }] }]),
    true,
  );
  assert.equal(messagesHaveImageParts([{ role: "user", content: "plain string" }]), false);
  assert.equal(messagesHaveImageParts(undefined), false);
});

test("modelSupportsImages gates text-only models out of image requests", () => {
  assert.equal(modelSupportsImages("gpt-4o-mini"), true);
  assert.equal(modelSupportsImages("openai/gpt-4.1"), true);
  assert.equal(modelSupportsImages("llava:13b"), true);
  assert.equal(modelSupportsImages("qwen2.5vl:latest"), true);
  assert.equal(modelSupportsImages("gemma4:12b"), true);
  assert.equal(modelSupportsImages("ollama/gemma4:26b"), true);
  assert.equal(modelSupportsImages("qwen3.5:9b"), true);
  assert.equal(modelSupportsImages("qwen2.5:14b-instruct"), false);
  assert.equal(modelSupportsImages("llama3.2:3b"), false);
  assert.equal(modelSupportsImages("gemma3n:e2b"), false);
  assert.equal(modelSupportsImages(""), false);
});

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

test("ollamaProxyFallbackModel prefers explicit then planner", () => {
  assert.equal(
    ollamaProxyFallbackModel({ AGENTIC_CHAT_COMPLETIONS_OLLAMA_FALLBACK_MODEL: "llama3.2:3b" }),
    "llama3.2:3b",
  );
  assert.equal(
    ollamaProxyFallbackModel({ AGENTIC_PLANNER_MODEL: "ollama/llama3.2:3b" }),
    "llama3.2:3b",
  );
});

test("isOllamaModelNotFound detects missing model", () => {
  assert.equal(isOllamaModelNotFound(404, 'model "qwen" not found'), true);
  assert.equal(isOllamaModelNotFound(200, "ok"), false);
});
