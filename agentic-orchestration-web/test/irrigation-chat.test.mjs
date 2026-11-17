import test from "node:test";
import assert from "node:assert/strict";
import {
  applyIrrigationMaxTokens,
  goalRequestsIrrigationMinutesLine,
  messagesLookLikeIrrigation,
  probeOllamaChatCompletionsHealth,
} from "../lib/irrigation-chat.mjs";

test("goalRequestsIrrigationMinutesLine detects HA watering prompt", () => {
  const text =
    "You are the irrigation decision-maker.\nOutput format:\nMINUTES: <integer 0-25>";
  assert.equal(goalRequestsIrrigationMinutesLine(text), true);
});

test("goalRequestsIrrigationMinutesLine ignores generic minutes mention", () => {
  assert.equal(goalRequestsIrrigationMinutesLine("How many minutes should I water?"), false);
});

test("messagesLookLikeIrrigation scans message array", () => {
  assert.equal(
    messagesLookLikeIrrigation([
      { role: "system", content: "irrigation decision-maker\nMINUTES: <integer 0-25>" },
    ]),
    true,
  );
});

test("applyIrrigationMaxTokens caps irrigation payloads", () => {
  const payload = {
    model: "llama3.2:3b",
    max_tokens: 500,
    messages: [{ role: "user", content: "zone profile\nMINUTES: <integer 0-25>" }],
  };
  const out = applyIrrigationMaxTokens(payload, { maxTokens: 400 });
  assert.equal(out.max_tokens, 400);
});

test("applyIrrigationMaxTokens leaves non-irrigation payloads alone", () => {
  const payload = {
    model: "gpt-4o-mini",
    max_tokens: 500,
    messages: [{ role: "user", content: "Hello" }],
  };
  const out = applyIrrigationMaxTokens(payload, { maxTokens: 400 });
  assert.equal(out.max_tokens, 500);
});

test("probeOllamaChatCompletionsHealth never returns exception text", async () => {
  const secret = "SECRET_STACK_TRACE_FRAGMENT_xyz";
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error(secret);
  };
  try {
    const body = await probeOllamaChatCompletionsHealth(() => "http://ollama.test:11434");
    assert.equal(body.ok, false);
    assert.equal(body.ollama, "unreachable");
    assert.equal(body.error, "upstream unreachable");
    assert.equal(JSON.stringify(body).includes(secret), false);
  } finally {
    globalThis.fetch = origFetch;
  }
});
