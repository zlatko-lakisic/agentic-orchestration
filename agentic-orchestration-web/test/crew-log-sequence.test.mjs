import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const modUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "crew-log-sequence.js"),
);

const { parseCrewLogSequenceEvent } = await import(modUrl);

test("parseCrewLogSequenceEvent maps plan and step lines", () => {
  const plan = parseCrewLogSequenceEvent("(dynamic) plan: Single agent handles request.");
  assert.equal(plan?.from, "planner");
  assert.equal(plan?.to, "orchestrator");

  const step = parseCrewLogSequenceEvent(
    "(dynamic) step 1/1: step_1 -> agent_provider 'ollama_llama3_2_3b'",
  );
  assert.equal(step?.from, "orchestrator");
  assert.equal(step?.to, "agent:ollama_llama3_2_3b");
});

test("parseCrewLogSequenceEvent maps warm pool coordinator JSON", () => {
  const line = JSON.stringify({
    component: "coordinator",
    message: "warm pool enqueued run__step_1.json",
  });
  const ev = parseCrewLogSequenceEvent(line);
  assert.equal(ev?.from, "coordinator");
  assert.equal(ev?.to, "worker");
  assert.equal(ev?.kind, "async");
});

test("parseCrewLogSequenceEvent skips noisy catalog lines", () => {
  assert.equal(
    parseCrewLogSequenceEvent(
      "workflow mcp catalog: skipping MCP provider 'search_brave': missing credentials",
    ),
    null,
  );
});
